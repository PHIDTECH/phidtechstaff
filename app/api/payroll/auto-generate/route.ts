/**
 * POST /api/payroll/auto-generate
 * Auto-generates DRAFT payroll for every month from January of the current year
 * up to and including the current month, for every active staff member who has a salary set.
 * Safe to call on every page load — skips any month/staff that already has an entry.
 * Does NOT overwrite existing entries (paid or draft) — only fills gaps.
 */

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
export const dynamic = "force-dynamic";

interface StaffUser {
  id: string; name: string; salary: number; status: string; companyId: string;
  allowances?: { name: string; amount: number }[];
  [key: string]: unknown;
}
interface Allowance { name: string; amount: number; }
interface Deduction { name: string; amount: number; }
interface EmployerCost { name: string; amount: number; }
interface PayrollEntry {
  id: string; staffId: string; companyId: string;
  employeeName?: string;
  month: string; year: number;
  basicSalary: number; allowances: Allowance[]; deductions: Deduction[];
  employerCosts?: EmployerCost[];
  grossSalary: number; netSalary: number;
  status: "draft" | "paid";
  generatedAt: string;
}

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

// ── Tanzania statutory deductions ──────────────────────────────────────────
function calcNSSF_employee(gross: number) { return Math.round(gross * 0.10); }
function calcNSSF_employer(gross: number) { return Math.round(gross * 0.10); }
function calcSDL(gross: number)           { return Math.round(gross * 0.035); }
function calcWCF(gross: number)           { return Math.round(gross * 0.005); }
function calcPAYE(gross: number): number {
  const taxable = gross - calcNSSF_employee(gross);
  if (taxable <= 270000)  return 0;
  if (taxable <= 520000)  return Math.round((taxable - 270000) * 0.08);
  if (taxable <= 760000)  return Math.round(20000 + (taxable - 520000) * 0.20);
  if (taxable <= 1000000) return Math.round(68000 + (taxable - 760000) * 0.25);
  return Math.round(128000 + (taxable - 1000000) * 0.30);
}

function buildEntry(emp: StaffUser, month: string, year: number): PayrollEntry {
  const basic = Number(emp.salary);
  const staffAllowances = (emp.allowances ?? []).filter(a => a.name?.trim() && a.amount > 0);
  const totalAllowanceAmt = staffAllowances.reduce((s: number, a: Allowance) => s + a.amount, 0);
  const gross   = basic + totalAllowanceAmt;
  const paye    = calcPAYE(gross);
  const nssf_e  = calcNSSF_employee(gross);
  const nssf_er = calcNSSF_employer(gross);
  const sdl     = calcSDL(gross);
  const wcf     = calcWCF(gross);
  const totalDed = paye + nssf_e;
  const net = gross - totalDed;
  return {
    id: `pr-${emp.id}-${month}-${year}-auto`,
    staffId: emp.id, companyId: emp.companyId,
    employeeName: emp.name,
    month, year,
    basicSalary: basic,
    allowances: staffAllowances,
    deductions: [
      { name: "PAYE", amount: paye },
      { name: "NSSF (Employee 10%)", amount: nssf_e },
    ],
    employerCosts: [
      { name: "NSSF (Employer 10%)", amount: nssf_er },
      { name: "SDL (3.5%)",          amount: sdl },
      { name: "WCF (0.5%)",          amount: wcf },
    ],
    grossSalary: gross, netSalary: net,
    status: "draft",
    generatedAt: new Date().toISOString(),
  };
}

export async function POST() {
  try {
    const now          = new Date();
    const currentMonth = now.getMonth();     // 0-indexed
    const currentYear  = now.getFullYear();
    const startYear    = currentYear;        // auto-generate from January of current year

    interface Exclusion { staffId: string; month: string; year: number; }
    const allStaff   = readDb<StaffUser[]>("users", []);
    const existing   = readDb<PayrollEntry[]>("payroll", []);
    const exclusions = readDb<Exclusion[]>("payroll_exclusions", []);

    // Build lookup: "staffId|month|year" → true (existing entries)
    const existingKeys = new Set(existing.map(p => `${p.staffId}|${p.month}|${p.year}`));
    // Build exclusion lookup: entries manually deleted by user — never recreate
    const excludedKeys = new Set(exclusions.map(e => `${e.staffId}|${e.month}|${e.year}`));

    const newEntries: PayrollEntry[] = [];

    // Iterate months Jan → currentMonth of currentYear
    for (let m = 0; m <= currentMonth; m++) {
      const month = MONTHS[m];
      const year  = startYear;

      for (const emp of allStaff) {
        if ((emp.status ?? "").toLowerCase() !== "active") continue;
        if (!Number(emp.salary)) continue;
        const key = `${emp.id}|${month}|${year}`;
        if (existingKeys.has(key)) continue;  // already has entry — skip
        if (excludedKeys.has(key)) continue;  // manually deleted — never recreate

        const entry = buildEntry(emp, month, year);
        newEntries.push(entry);
        existingKeys.add(key); // prevent duplicates within this run
      }
    }

    if (newEntries.length > 0) {
      const updated = [...existing, ...newEntries];
      writeDb("payroll", updated);
    }

    return NextResponse.json({
      generated: newEntries.length,
      months: Array.from(new Set(newEntries.map(e => `${e.month} ${e.year}`))),
    });
  } catch (e) {
    console.error("[payroll/auto-generate]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET: just return how many months have been auto-generated this year
export async function GET() {
  const now = new Date();
  const year = now.getFullYear();
  const all  = readDb<PayrollEntry[]>("payroll", []);
  const thisYear = all.filter(p => p.year === year);
  const monthsPresent = Array.from(new Set(thisYear.map(p => p.month)));
  return NextResponse.json({ year, monthsWithData: monthsPresent, totalEntries: thisYear.length });
}
