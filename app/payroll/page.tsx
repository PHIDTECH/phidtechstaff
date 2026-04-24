"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, Search, CheckCircle, Download, Eye, FileText, AlertCircle, Building2, Edit, Trash2, Printer, Sheet } from "lucide-react";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ACTIVE_KEY      = "phidtech_active_company";
const USERS_KEY       = "phidtech_users";
const PAYROLL_KEY     = "phidtech_payroll";
const COMPANIES_KEY   = "phidtech_companies";
const SESSION_KEY     = "phidtech_session";
const COMMISSIONS_KEY = "phidtech_commissions";
const GROUP_KEY       = "phidtech_group_company";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function lsStr(key: string, fallback = "") {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

interface Session {
  id: string; name: string; role: string; position: string;
  isSuperAdmin: boolean; companyId: string; branchId?: string | null;
}
interface StaffUser {
  id: string; name: string; email: string; position: string;
  department: string; salary: number; status: string; companyId: string;
  branchId?: string | null;
  allowances?: { name: string; amount: number }[];
}
interface Allowance { name: string; amount: number; }
interface Deduction { name: string; amount: number; }
interface StoredCommission {
  id: string; staffId: string; companyId: string;
  month: string; year: number; commissionAmount: number; status: string;
}
interface EmployerCost { name: string; amount: number; }
interface PayrollEntry {
  id: string; staffId: string; companyId: string;
  month: string; year: number;
  basicSalary: number; allowances: Allowance[]; deductions: Deduction[];
  employerCosts?: EmployerCost[];
  grossSalary: number; netSalary: number;
  status: "draft" | "paid";
  generatedAt: string;
}
interface SalaryAdvance {
  id: string; staffId: string; companyId: string;
  amount: number; reason: string; requestDate: string;
  repaymentDate: string; status: "pending" | "approved" | "rejected";
}

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

// ── Tanzania Statutory Deductions (TRA / NSSF Act 2018) ────────────────────
// NSSF: Employee 10% of gross salary (deducted first, before PAYE)
// NSSF total remitted = 20% (employer 10% + employee 10%) per nssf.go.tz
function calcNSSF_employee(gross: number): number { return Math.round(gross * 0.10); }
// NSSF: Employer 10% of gross (employer cost only, NOT deducted from employee)
function calcNSSF_employer(gross: number): number { return Math.round(gross * 0.10); }
// SDL: Skills & Development Levy — 3.5% of gross, employer only (NOT deducted from employee)
function calcSDL(gross: number): number { return Math.round(gross * 0.035); }
// WCF: Workers Compensation Fund — 0.5% of gross, employer only (NOT deducted from employee)
function calcWCF(gross: number): number { return Math.round(gross * 0.005); }

// PAYE: Progressive TRA bands applied on TAXABLE income = gross - NSSF_employee
// Monthly bands (Tanzania Mainland, 2024/2025):
//   0        – 270,000  →  0%
//   270,001  – 520,000  →  8%   of excess over 270,000
//   520,001  – 760,000  →  20,000 + 20% of excess over 520,000
//   760,001  – 1,000,000 → 68,000 + 25% of excess over 760,000
//   1,000,001+           → 128,000 + 30% of excess over 1,000,000
function calcPAYE(gross: number): number {
  const taxable = gross - calcNSSF_employee(gross); // NSSF is deducted before PAYE
  if (taxable <= 270000)  return 0;
  if (taxable <= 520000)  return Math.round((taxable - 270000) * 0.08);
  if (taxable <= 760000)  return Math.round(20000 + (taxable - 520000) * 0.20);
  if (taxable <= 1000000) return Math.round(68000 + (taxable - 760000) * 0.25);
  return Math.round(128000 + (taxable - 1000000) * 0.30);
}

export default function PayrollPage() {
  usePermissionGuard("payroll");
  const now = new Date();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [activeCompanyName, setActiveCompanyName] = useState("");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [allStaffList, setAllStaffList] = useState<StaffUser[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [showSlipDialog, setShowSlipDialog] = useState<PayrollEntry | null>(null);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [advForm, setAdvForm] = useState({ staffId: "", amount: "", reason: "", repaymentDate: "" });
  const [advError, setAdvError] = useState("");
  const [runConfirm, setRunConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<PayrollEntry | null>(null);
  const [editForm, setEditForm] = useState<{ basicSalary: string; allowances: Allowance[] } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [groupCompanyId, setGroupCompanyId] = useState("");

  const GENERAL_ROLES_PAYROLL = ["admin","accountant","hr","group_ceo","group_cfo","group_manager","group_controller","group_hr","group_it","group_auditor","group_legal"];

  const fetchAdvances = () => {
    fetch("/api/advances")
      .then(r => r.json())
      .then((data: SalaryAdvance[]) => setAdvances(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const loadSession = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = getActiveCid(sess);
    setActiveCompanyId(cid);
    const companies = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    setActiveCompanyName(companies.find(c => c.id === cid)?.name ?? "");
    const gc = lsStr(GROUP_KEY) || (companies[0]?.id ?? "");
    setGroupCompanyId(gc);
    // Load staff from server API for fresh data
    let allStaff: StaffUser[] = [];
    try {
      const r = await fetch("/api/users", { cache: "no-store" });
      if (r.ok) {
        allStaff = await r.json();
        try { localStorage.setItem(USERS_KEY, JSON.stringify(allStaff)); } catch {}
      } else { allStaff = lsGet<StaffUser[]>(USERS_KEY, []); }
    } catch { allStaff = lsGet<StaffUser[]>(USERS_KEY, []); }
    setAllStaffList(allStaff);
    const effectiveCid = cid || "group";
    setActiveCompanyId(effectiveCid);
    const isBM = !!sess && !sess.isSuperAdmin && !!sess.branchId && !GENERAL_ROLES_PAYROLL.includes(sess.position ?? sess.role ?? "");
    setStaffList(allStaff.filter(u => u.companyId === effectiveCid && (!isBM || u.branchId === sess?.branchId)));
  };

  const fetchPayroll = async () => {
    try {
      const res = await fetch("/api/payroll", { cache: "no-store" });
      if (res.ok) {
        const data: PayrollEntry[] = await res.json();
        setPayrollEntries(Array.isArray(data) ? data : []);
        const local = lsGet<PayrollEntry[]>(PAYROLL_KEY, []);
        if (local.length > 0) {
          const serverIds = new Set(data.map(p => p.id));
          const toMigrate = local.filter(p => !serverIds.has(p.id));
          if (toMigrate.length > 0) {
            await fetch("/api/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toMigrate) });
            const r2 = await fetch("/api/payroll", { cache: "no-store" });
            if (r2.ok) setPayrollEntries(await r2.json());
          }
          lsSet(PAYROLL_KEY, []);
        }
      }
    } catch { setPayrollEntries(lsGet<PayrollEntry[]>(PAYROLL_KEY, [])); }
  };

  const reload = () => { loadSession(); fetchPayroll(); fetchAdvances(); };

  useEffect(() => {
    loadSession();
    fetchPayroll();
    fetchAdvances();
    window.addEventListener("phidtech_companies_updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("phidtech_companies_updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const monthKey = `${selectedMonth}-${selectedYear}`;
  const effectiveCompanyId = activeCompanyId || "group";
  const companyEntries = payrollEntries.filter(
    p => p.companyId === effectiveCompanyId && p.month === selectedMonth && p.year === selectedYear
  );
  const filtered = companyEntries.filter(p => {
    const emp = staffList.find(u => u.id === p.staffId);
    return emp?.name.toLowerCase().includes(search.toLowerCase()) ?? false;
  });

  const totalGross = companyEntries.reduce((s, p) => s + p.grossSalary, 0);
  const totalNet = companyEntries.reduce((s, p) => s + p.netSalary, 0);
  const totalDeductions = totalGross - totalNet;
  const paidCount = companyEntries.filter(p => p.status === "paid").length;

  const alreadyRun = companyEntries.length > 0;

  const runPayroll = async () => {
    const activeStaff = staffList.filter(u => (u.status === "active") && u.salary > 0);
    if (activeStaff.length === 0) { setRunConfirm(false); return; }
    let allCommissions: StoredCommission[] = [];
    try {
      const cr = await fetch("/api/commissions", { cache: "no-store" });
      if (cr.ok) allCommissions = await cr.json();
    } catch { allCommissions = lsGet<StoredCommission[]>(COMMISSIONS_KEY, []); }
    const newEntries: PayrollEntry[] = activeStaff.map(emp => {
      const basic = emp.salary;
      // Use staff's manually set allowances; fall back to empty if none set
      const staffAllowances = (emp.allowances ?? []).filter(a => a.name.trim() && a.amount > 0);
      // Add commissions for this staff for the selected month/year
      const empCommissions = allCommissions.filter(
        c => c.staffId === emp.id && c.companyId === activeCompanyId &&
             c.month === selectedMonth && c.year === selectedYear
      );
      const totalCommAmt = empCommissions.reduce((s, c) => s + c.commissionAmount, 0);
      const commissionAllowances: Allowance[] = totalCommAmt > 0
        ? [{ name: `Sales Commission (${selectedMonth})`, amount: totalCommAmt }]
        : [];
      const combinedAllowances = [...staffAllowances, ...commissionAllowances];
      const totalAllowanceAmt = combinedAllowances.reduce((s, a) => s + a.amount, 0);
      const gross = basic + totalAllowanceAmt;
      const paye      = calcPAYE(gross);
      const nssf_emp  = calcNSSF_employee(gross);
      const nssf_er   = calcNSSF_employer(gross);
      const sdl       = calcSDL(gross);
      const wcf       = calcWCF(gross);
      const totalDed  = paye + nssf_emp;
      const net       = gross - totalDed;
      return {
        id: `pr-${emp.id}-${monthKey}-${Date.now()}`,
        staffId: emp.id, companyId: activeCompanyId,
        month: selectedMonth, year: selectedYear,
        basicSalary: basic,
        allowances: combinedAllowances,
        deductions: [
          { name: "PAYE", amount: paye },
          { name: "NSSF (Employee 10%)", amount: nssf_emp },
        ],
        employerCosts: [
          { name: "NSSF (Employer 10%)", amount: nssf_er },
          { name: "SDL (3.5%)", amount: sdl },
          { name: "WCF (0.5%)", amount: wcf },
        ],
        grossSalary: gross, netSalary: net,
        status: "draft",
        generatedAt: new Date().toISOString(),
      };
    });
    // Delete existing entries for this company/month/year, then post new ones
    await fetch(`/api/payroll?companyId=${activeCompanyId}&month=${encodeURIComponent(selectedMonth)}&year=${selectedYear}`, { method: "DELETE" });
    await fetch("/api/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newEntries) });
    await fetchPayroll();
    setRunConfirm(false);
  };

  const markPaid = async (id: string) => {
    await fetch("/api/payroll", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "paid" }) });
    await fetchPayroll();
  };

  const markAllPaid = async () => {
    const toMark = payrollEntries.filter(p =>
      p.companyId === activeCompanyId && p.month === selectedMonth && p.year === selectedYear && p.status !== "paid"
    );
    for (const p of toMark) {
      await fetch("/api/payroll", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: "paid" }) });
    }
    await fetchPayroll();
  };

  const saveAdvance = (staffIdOverride?: string) => {
    const sid = staffIdOverride ?? advForm.staffId;
    if (!sid) { setAdvError("Select an employee."); return; }
    if (!advForm.amount || isNaN(Number(advForm.amount)) || Number(advForm.amount) <= 0) {
      setAdvError("Enter a valid amount."); return;
    }
    if (!advForm.reason.trim()) { setAdvError("Enter a reason."); return; }
    const adv: SalaryAdvance = {
      id: `adv-${Date.now()}`,
      staffId: sid, companyId: activeCompanyId,
      amount: Number(advForm.amount), reason: advForm.reason.trim(),
      requestDate: new Date().toISOString().slice(0, 10),
      repaymentDate: advForm.repaymentDate,
      status: "pending",
    };
    fetch("/api/advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adv),
    })
      .then(() => { fetchAdvances(); })
      .catch(() => {});
    setAdvForm({ staffId: "", amount: "", reason: "", repaymentDate: "" });
    setAdvError("");
    setShowAdvanceDialog(false);
  };

  const deletePayrollEntry = async (id: string) => {
    await fetch(`/api/payroll?id=${id}`, { method: "DELETE" });
    setDeleteConfirmId(null);
    await fetchPayroll();
  };

  const openEditEntry = (entry: PayrollEntry) => {
    setEditEntry(entry);
    setEditForm({
      basicSalary: String(entry.basicSalary),
      allowances: entry.allowances.map(a => ({ ...a })),
    });
  };

  const saveEditEntry = async () => {
    if (!editEntry || !editForm) return;
    const basic = Number(editForm.basicSalary) || 0;
    const alws = editForm.allowances.filter(a => a.name.trim() && a.amount > 0);
    const totalAlw = alws.reduce((s, a) => s + a.amount, 0);
    const gross = basic + totalAlw;
    const paye     = calcPAYE(gross);
    const nssf_emp = calcNSSF_employee(gross);
    const nssf_er  = calcNSSF_employer(gross);
    const sdl      = calcSDL(gross);
    const wcf      = calcWCF(gross);
    const net      = gross - paye - nssf_emp;
    await fetch("/api/payroll", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      id: editEntry.id,
      basicSalary: basic,
      allowances: alws,
      deductions: [
        { name: "PAYE", amount: paye },
        { name: "NSSF (Employee 10%)", amount: nssf_emp },
      ],
      employerCosts: [
        { name: "NSSF (Employer 10%)", amount: nssf_er },
        { name: "SDL (3.5%)", amount: sdl },
        { name: "WCF (0.5%)", amount: wcf },
      ],
      grossSalary: gross,
      netSalary: net,
    }) });
    setEditEntry(null);
    setEditForm(null);
    await fetchPayroll();
  };

  const exportCSV = () => {
    const rows: string[][] = [
      ["Employee", "Position", "Department", "Basic Salary", "Total Allowances", "Gross Salary", "PAYE", "NSSF (10%)", "SDL (4%)", "Total Deductions", "Net Salary", "Status"],
    ];
    companyEntries.forEach(p => {
      const emp = staffList.find(u => u.id === p.staffId);
      const totalAlw = p.allowances.reduce((s, a) => s + a.amount, 0);
      const totalDed = p.deductions.reduce((s, d) => s + d.amount, 0);
      const paye  = p.deductions.find(d => d.name === "PAYE")?.amount ?? 0;
      const nssf  = p.deductions.find(d => d.name.startsWith("NSSF"))?.amount ?? 0;
      const sdl   = p.deductions.find(d => d.name.startsWith("SDL"))?.amount ?? 0;
      rows.push([
        emp?.name ?? "Unknown",
        emp?.position ?? "",
        emp?.department ?? "",
        String(p.basicSalary),
        String(totalAlw),
        String(p.grossSalary),
        String(paye),
        String(nssf),
        String(sdl),
        String(totalDed),
        String(p.netSalary),
        p.status,
      ]);
    });
    // Totals row
    rows.push([
      `TOTAL (${companyEntries.length} staff)`, "", "",
      String(companyEntries.reduce((s, p) => s + p.basicSalary, 0)),
      String(companyEntries.reduce((s, p) => s + p.allowances.reduce((x, a) => x + a.amount, 0), 0)),
      String(totalGross),
      "", "", "",
      String(totalDeductions),
      String(totalNet),
      "",
    ]);
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payroll_${activeCompanyName.replace(/\s+/g, "_")}_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const rows = companyEntries.map(p => {
      const emp = staffList.find(u => u.id === p.staffId);
      const totalAlw = p.allowances.reduce((s, a) => s + a.amount, 0);
      const totalDed = p.deductions.reduce((s, d) => s + d.amount, 0);
      return `<tr>
        <td>${emp?.name ?? "Unknown"}</td>
        <td>${emp?.position ?? ""}</td>
        <td style="text-align:right">${p.basicSalary.toLocaleString()}</td>
        <td style="text-align:right;color:#16a34a">+${totalAlw.toLocaleString()}</td>
        <td style="text-align:right;font-weight:600">${p.grossSalary.toLocaleString()}</td>
        <td style="text-align:right;color:#dc2626">-${totalDed.toLocaleString()}</td>
        <td style="text-align:right;font-weight:700;color:#1d4ed8">${p.netSalary.toLocaleString()}</td>
        <td style="text-align:center"><span style="padding:2px 8px;border-radius:20px;font-size:11px;background:${p.status === "paid" ? "#dcfce7" : "#fef9c3"};color:${p.status === "paid" ? "#15803d" : "#a16207"}">${p.status}</span></td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Payroll Report — ${selectedMonth} ${selectedYear}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 20px; }
        h1 { font-size: 18px; margin: 0 0 2px; } h2 { font-size: 13px; color: #555; font-weight: normal; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #1e3a8a; color: #fff; padding: 7px 10px; text-align: left; font-size: 11px; }
        th:nth-child(n+3) { text-align: right; }
        td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
        tfoot td { font-weight: 700; background: #f1f5f9; border-top: 2px solid #1e3a8a; }
        .summary { display: flex; gap: 30px; margin-top: 16px; padding: 10px 14px; background: #eff6ff; border-radius: 8px; }
        .summary span { font-size: 11px; color: #555; } .summary strong { display: block; font-size: 14px; }
        @media print { button { display: none; } }
      </style></head><body>
      <h1>${activeCompanyName}</h1>
      <h2>Payroll Register — ${selectedMonth} ${selectedYear} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}</h2>
      <div class="summary">
        <div><span>Total Gross</span><strong>TZS ${totalGross.toLocaleString()}</strong></div>
        <div><span>Total Deductions</span><strong style="color:#dc2626">TZS ${totalDeductions.toLocaleString()}</strong></div>
        <div><span>Total Net Pay</span><strong style="color:#1d4ed8">TZS ${totalNet.toLocaleString()}</strong></div>
        <div><span>Staff Count</span><strong>${companyEntries.length}</strong></div>
        <div><span>Paid</span><strong style="color:#16a34a">${paidCount} / ${companyEntries.length}</strong></div>
      </div>
      <table><thead><tr>
        <th>Employee</th><th>Position</th><th>Basic Salary</th><th>Allowances</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th>
      </tr></thead><tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="2">TOTAL (${companyEntries.length} employees)</td>
        <td style="text-align:right">${companyEntries.reduce((s,p)=>s+p.basicSalary,0).toLocaleString()}</td>
        <td style="text-align:right">${companyEntries.reduce((s,p)=>s+p.allowances.reduce((x,a)=>x+a.amount,0),0).toLocaleString()}</td>
        <td style="text-align:right">${totalGross.toLocaleString()}</td>
        <td style="text-align:right;color:#dc2626">-${totalDeductions.toLocaleString()}</td>
        <td style="text-align:right;color:#1d4ed8">${totalNet.toLocaleString()}</td>
        <td></td>
      </tr></tfoot></table>
      <p style="margin-top:24px;font-size:10px;color:#9ca3af">PHIDTECH Management System — Confidential</p>
      <script>window.onload=()=>window.print();</script>
      </body></html>`;

    const w = window.open("", "_blank", "width=1000,height=750");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const updateAdvStatus = (id: string, status: "approved" | "rejected") => {
    fetch("/api/advances", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
      .then(() => fetchAdvances())
      .catch(() => {});
  };

  const deleteAdvance = (id: string) => {
    fetch(`/api/advances?id=${id}`, { method: "DELETE" })
      .then(() => fetchAdvances())
      .catch(() => {});
  };

  const years = [now.getFullYear(), now.getFullYear() - 1];

  // Group company context
  const isGroupUser = !!groupCompanyId && session?.companyId === groupCompanyId;
  const isGroupManager = isGroupUser && (
    session?.role?.toLowerCase() === "admin" ||
    session?.role?.toLowerCase() === "manager" ||
    session?.isSuperAdmin
  );

  // Role check: superadmin, admin, accountant, or manager can manage payroll
  const canManage = session?.isSuperAdmin === true ||
    isGroupManager ||
    session?.role?.toLowerCase() === "admin" ||
    session?.role?.toLowerCase().includes("accountant") ||
    session?.position?.toLowerCase().includes("accountant") ||
    session?.role?.toLowerCase() === "manager" ||
    session?.position?.toLowerCase().includes("manager");

  // Staff personal data
  const myEntry = companyEntries.find(p => p.staffId === session?.id);
  const myAdvances = advances.filter(a => a.staffId === session?.id && a.companyId === activeCompanyId);
  const myStaff = staffList.find(u => u.id === session?.id);

  // ─────────────────────────────────────────────
  // STAFF VIEW (non-admin, non-accountant)
  // ─────────────────────────────────────────────
  if (session && !canManage) {
    return (
      <MainLayout>
        <PageHeader
          title="My Payslip"
          subtitle="View your salary details and apply for advances"
          icon={DollarSign}
          actions={
            <Button size="sm" onClick={() => { setAdvForm({ staffId: session.id, amount: "", reason: "", repaymentDate: "" }); setAdvError(""); setShowAdvanceDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Apply Salary Advance
            </Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard title="My Net Salary" value={myEntry ? formatCurrency(myEntry.netSalary) : "—"} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle={`${selectedMonth} ${selectedYear}`} />
          <StatCard title="Payslip Status" value={myEntry?.status === "paid" ? "Paid" : myEntry ? "Pending" : "Not Run"} icon={CheckCircle} iconBg={myEntry?.status === "paid" ? "bg-green-50" : "bg-yellow-50"} iconColor={myEntry?.status === "paid" ? "text-green-600" : "text-yellow-600"} subtitle="This month" />
          <StatCard title="Salary Advances" value={myAdvances.length} icon={FileText} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="All time" />
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2 mb-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent position="popper">{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent position="popper">{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="payslip">
          <TabsList className="mb-4">
            <TabsTrigger value="payslip">My Payslip</TabsTrigger>
            <TabsTrigger value="advances">My Advances</TabsTrigger>
          </TabsList>

          <TabsContent value="payslip">
            {!myEntry ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center gap-3">
                <FileText className="w-10 h-10 text-gray-300" />
                <p className="font-medium text-gray-600">No payslip for {selectedMonth} {selectedYear}</p>
                <p className="text-sm text-gray-400">Payroll has not been processed yet for this month.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm max-w-xl mx-auto">
                {/* Payslip header */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{myStaff?.name ?? session.name}</p>
                      <p className="text-sm text-gray-500">{myStaff?.position} · {myStaff?.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Company</p>
                      <p className="font-semibold text-gray-800 text-sm">{activeCompanyName}</p>
                      <p className="text-xs text-gray-500">{myEntry.month} {myEntry.year}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                        myEntry.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>{myEntry.status}</span>
                    </div>
                  </div>
                </div>
                {/* Earnings & Deductions */}
                <div className="px-6 py-4 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Earnings</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Basic Salary</span>
                        <span className="font-medium">{formatCurrency(myEntry.basicSalary)}</span>
                      </div>
                      {myEntry.allowances.map(a => (
                        <div key={a.name} className="flex justify-between text-sm">
                          <span className="text-gray-500">{a.name}</span>
                          <span className="text-green-700">+{formatCurrency(a.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1">
                        <span>Gross</span>
                        <span>{formatCurrency(myEntry.grossSalary)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Deductions</p>
                    <div className="space-y-2">
                      {myEntry.deductions.map(d => (
                        <div key={d.name} className="flex justify-between text-sm">
                          <span className="text-gray-500">{d.name}</span>
                          <span className="text-red-600">-{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1">
                        <span>Total</span>
                        <span className="text-red-600">-{formatCurrency(myEntry.deductions.reduce((s,d)=>s+d.amount,0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Net pay */}
                <div className="mx-6 mb-4 p-4 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Net Pay</span>
                  <span className="text-2xl font-bold text-green-700">{formatCurrency(myEntry.netSalary)}</span>
                </div>
                {/* Employer costs */}
                {(() => {
                  const ec = (myEntry.employerCosts && myEntry.employerCosts.length > 0)
                    ? myEntry.employerCosts
                    : [
                        { name: "NSSF (Employer 10%)", amount: calcNSSF_employer(myEntry.grossSalary) },
                        { name: "SDL (3.5%)",           amount: calcSDL(myEntry.grossSalary) },
                        { name: "WCF (0.5%)",           amount: calcWCF(myEntry.grossSalary) },
                      ];
                  return (
                    <div className="mx-6 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Employer Statutory Costs <span className="normal-case font-normal text-slate-400">(not deducted from your salary)</span></p>
                      <div className="space-y-2">
                        {ec.map(c => (
                          <div key={c.name} className="flex justify-between text-sm">
                            <span className="text-slate-500">{c.name}</span>
                            <span className="text-slate-700">{formatCurrency(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <p className="text-center text-xs text-gray-400 pb-4">Generated by PHIDTECH MS · {new Date(myEntry.generatedAt).toLocaleDateString()}</p>
                {/* Actions */}
                <div className="px-6 pb-5 flex justify-end">
                  <Button onClick={() => {
                    const ec = (myEntry.employerCosts && myEntry.employerCosts.length > 0)
                      ? myEntry.employerCosts
                      : [
                          { name: "NSSF (Employer 10%)", amount: calcNSSF_employer(myEntry.grossSalary) },
                          { name: "SDL (3.5%)",           amount: calcSDL(myEntry.grossSalary) },
                          { name: "WCF (0.5%)",           amount: calcWCF(myEntry.grossSalary) },
                        ];
                    const tec = ec.reduce((s,c) => s+c.amount, 0);
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px;max-width:600px}.hdr{display:flex;justify-content:space-between;background:#1e3a8a;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0}.hdr h1{font-size:15px;margin:0 0 3px;color:#fff}.hdr p{font-size:11px;margin:2px 0;opacity:.85}.body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px}.stitle{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}.row{display:flex;justify-content:space-between;padding:3px 0;font-size:11.5px}.row.tot{font-weight:700;border-top:1px solid #e5e7eb;margin-top:4px;padding-top:5px}.net{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin:12px 0}.net .lbl{font-weight:700;font-size:14px}.net .val{font-weight:800;font-size:20px;color:#15803d}.employer{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-top:10px;font-size:11px}.emp-title{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px}.footer{text-align:center;font-size:10px;color:#9ca3af;margin-top:16px;border-top:1px solid #f3f4f6;padding-top:10px}@media print{@page{margin:12mm}}</style></head><body>
<div class="hdr"><div><h1>${activeCompanyName}</h1><p>Payslip — ${myEntry.month} ${myEntry.year}</p></div><div style="text-align:right"><p style="font-size:13px;font-weight:700;margin:0">${myStaff?.name ?? session?.name ?? ""}</p><p>${myStaff?.position ?? ""}</p><p>${myStaff?.department ?? ""}</p></div></div>
<div class="body"><div class="grid"><div><div class="stitle">Earnings</div><div class="row"><span>Basic Salary</span><span>TZS ${myEntry.basicSalary.toLocaleString()}</span></div>${myEntry.allowances.map(a=>`<div class="row"><span>${a.name}</span><span style="color:#16a34a">+TZS ${a.amount.toLocaleString()}</span></div>`).join("")}<div class="row tot"><span>Gross Salary</span><span>TZS ${myEntry.grossSalary.toLocaleString()}</span></div></div><div><div class="stitle">Employee Deductions</div>${myEntry.deductions.map(d=>`<div class="row"><span>${d.name}</span><span style="color:#dc2626">-TZS ${d.amount.toLocaleString()}</span></div>`).join("")}<div class="row tot"><span>Total Deductions</span><span style="color:#dc2626">-TZS ${myEntry.deductions.reduce((s,d)=>s+d.amount,0).toLocaleString()}</span></div></div></div><div class="net"><span class="lbl">NET PAY</span><span class="val">TZS ${myEntry.netSalary.toLocaleString()}</span></div>${ec.length>0?`<div class="employer"><div class="emp-title">Employer Statutory Costs (not deducted from employee)</div>${ec.map(c=>`<div class="row"><span>${c.name}</span><span>TZS ${c.amount.toLocaleString()}</span></div>`).join("")}<div class="row tot"><span>Total</span><span>TZS ${tec.toLocaleString()}</span></div></div>`:""}<div class="footer">PHIDTECH Management System | CONFIDENTIAL | Tanzania Labour Laws Compliant</div></div>
<script>window.onload=()=>window.print();</script></body></html>`;
                    const w = window.open("", "_blank", "width=720,height=900");
                    if (w) { w.document.write(html); w.document.close(); }
                  }}>
                    <Download className="w-4 h-4 mr-2" /> Download / Print PDF
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="advances">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {myAdvances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <AlertCircle className="w-10 h-10 text-gray-300" />
                  <p className="text-sm text-gray-500">No salary advances requested</p>
                  <Button size="sm" variant="outline" onClick={() => { setAdvForm({ staffId: session.id, amount: "", reason: "", repaymentDate: "" }); setAdvError(""); setShowAdvanceDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1.5" /> Apply Now
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Repayment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myAdvances.map(adv => (
                      <TableRow key={adv.id}>
                        <TableCell className="font-semibold text-gray-900">{formatCurrency(adv.amount)}</TableCell>
                        <TableCell className="text-sm text-gray-500">{adv.reason}</TableCell>
                        <TableCell className="text-sm text-gray-600">{adv.requestDate}</TableCell>
                        <TableCell className="text-sm text-gray-600">{adv.repaymentDate || "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            adv.status === "approved" ? "bg-green-100 text-green-700" :
                            adv.status === "rejected" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                          }`}>{adv.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Staff Advance Request Dialog */}
        <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for Salary Advance</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {advError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{advError}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS)</label>
                <Input type="number" placeholder="e.g. 200000" value={advForm.amount} onChange={e => setAdvForm(f => ({...f, amount: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Repayment Date</label>
                <Input type="date" value={advForm.repaymentDate} onChange={e => setAdvForm(f => ({...f, repaymentDate: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reason</label>
                <Input placeholder="Reason for advance" value={advForm.reason} onChange={e => setAdvForm(f => ({...f, reason: e.target.value}))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdvanceDialog(false)}>Cancel</Button>
              <Button onClick={() => saveAdvance(session.id)}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  // ─────────────────────────────────────────────
  // ADMIN / ACCOUNTANT VIEW
  // ─────────────────────────────────────────────
  return (
    <MainLayout>
      <PageHeader
        title="Payroll & Salary"
        subtitle="Manage payroll processing, salary advances, and payslips"
        icon={DollarSign}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => { setAdvForm({ staffId: "", amount: "", reason: "", repaymentDate: "" }); setAdvError(""); setShowAdvanceDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Salary Advance
            </Button>
            {alreadyRun && (
              <>
                <Button variant="outline" size="sm" onClick={exportCSV} title="Export to CSV/Excel">
                  <Sheet className="w-4 h-4 mr-2" /> Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={printReport} title="Print / Save as PDF">
                  <Printer className="w-4 h-4 mr-2" /> Print PDF
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => setRunConfirm(true)} disabled={staffList.filter(u=>u.status==="active").length === 0}>
              <FileText className="w-4 h-4 mr-2" /> Run Payroll
            </Button>
          </>
        }
      />
      {/* Access notice */}
      <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-sm text-blue-700">
        <Building2 className="w-4 h-4 shrink-0" />
        <span>You are viewing as <strong>{session?.isSuperAdmin ? "Super Admin" : "Accountant"}</strong> — full payroll access for <strong>{activeCompanyName}</strong></span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Gross" value={formatCurrency(totalGross)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle={`${selectedMonth} ${selectedYear}`} />
        <StatCard title="Total Net Pay" value={formatCurrency(totalNet)} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" subtitle="After deductions" />
        <StatCard title="Total Deductions" value={formatCurrency(totalDeductions)} icon={DollarSign} iconBg="bg-red-50" iconColor="text-red-500" subtitle="PAYE + NSSF (employee)" />
        <StatCard title="Paid Staff" value={`${paidCount}/${companyEntries.length}`} icon={CheckCircle} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="This month" />
      </div>

      <Tabs defaultValue="payroll">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="payroll">Payroll Register</TabsTrigger>
            <TabsTrigger value="advances">Salary Advances</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent position="popper">{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent position="popper">{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="payroll">
          {!alreadyRun ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <FileText className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">No payroll for {selectedMonth} {selectedYear}</p>
                <p className="text-sm text-gray-400 mt-1">Click <strong>Run Payroll</strong> to generate payslips for all active staff.</p>
              </div>
              <Button onClick={() => setRunConfirm(true)} disabled={staffList.filter(u=>u.status==="active").length === 0}>
                <FileText className="w-4 h-4 mr-2" /> Run Payroll
              </Button>
              {staffList.filter(u=>u.status==="active").length === 0 && (
                <p className="text-xs text-red-500">
                  {staffList.length === 0
                    ? "No staff found for this company. Add staff first."
                    : "No active staff with salary set. Set a salary for staff members first."}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-700">{activeCompanyName} — {selectedMonth} {selectedYear}</span>
                </div>
                {paidCount < companyEntries.length && (
                  <Button size="sm" variant="outline" onClick={markAllPaid} className="text-green-700 border-green-200 hover:bg-green-50">
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Mark All Paid
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((payroll) => {
                    const emp = staffList.find(u => u.id === payroll.staffId);
                    const totalAllowances = payroll.allowances.reduce((s, a) => s + a.amount, 0);
                    const totalDeducAmt = payroll.deductions.reduce((s, d) => s + d.amount, 0);
                    return (
                      <TableRow key={payroll.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{getInitials(emp?.name ?? "?")}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{emp?.name ?? "Unknown"}</p>
                              <p className="text-xs text-gray-400">{emp?.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-800">{formatCurrency(payroll.basicSalary)}</TableCell>
                        <TableCell className="text-green-700 font-medium">+{formatCurrency(totalAllowances)}</TableCell>
                        <TableCell className="font-semibold text-gray-900">{formatCurrency(payroll.grossSalary)}</TableCell>
                        <TableCell className="text-red-600 font-medium">-{formatCurrency(totalDeducAmt)}</TableCell>
                        <TableCell className="font-bold text-blue-700">{formatCurrency(payroll.netSalary)}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            payroll.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>{payroll.status}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setShowSlipDialog(payroll)} title="View Payslip">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </Button>
                            {payroll.status === "draft" && (
                              <Button variant="ghost" size="sm" className="text-green-600 text-xs h-7 px-2" onClick={() => markPaid(payroll.id)}>
                                Pay
                              </Button>
                            )}
                            {session?.isSuperAdmin && (
                              <>
                                <Button variant="ghost" size="icon" title="Edit Entry" onClick={() => openEditEntry(payroll)}>
                                  <Edit className="w-4 h-4 text-blue-400" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Delete Entry" onClick={() => setDeleteConfirmId(payroll.id)}>
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Totals ({companyEntries.length} employees)</span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600">Gross: <strong className="text-gray-900">{formatCurrency(totalGross)}</strong></span>
                  <span className="text-gray-600">Deductions: <strong className="text-red-600">-{formatCurrency(totalDeductions)}</strong></span>
                  <span className="text-gray-600">Net: <strong className="text-blue-700">{formatCurrency(totalNet)}</strong></span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advances">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {advances.filter(a => a.companyId === activeCompanyId).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No salary advances yet</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowAdvanceDialog(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Advance
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Repayment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.filter(a => a.companyId === activeCompanyId).map((adv) => {
                    const emp = allStaffList.find(u => u.id === adv.staffId);
                    return (
                      <TableRow key={adv.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{getInitials(emp?.name ?? "?")}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-gray-900 text-sm">{emp?.name ?? "Unknown"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">{formatCurrency(adv.amount)}</TableCell>
                        <TableCell className="text-sm text-gray-500">{adv.reason}</TableCell>
                        <TableCell className="text-sm text-gray-600">{adv.requestDate}</TableCell>
                        <TableCell className="text-sm text-gray-600">{adv.repaymentDate || "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            adv.status === "approved" ? "bg-green-100 text-green-700" :
                            adv.status === "rejected" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                          }`}>{adv.status}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {adv.status === "pending" && (
                              <>
                                <Button variant="ghost" size="sm" className="text-green-600 text-xs" onClick={() => updateAdvStatus(adv.id, "approved")}>Approve</Button>
                                <Button variant="ghost" size="sm" className="text-red-500 text-xs" onClick={() => updateAdvStatus(adv.id, "rejected")}>Reject</Button>
                              </>
                            )}
                            {(session?.isSuperAdmin || isGroupManager) && (
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 text-xs px-1" onClick={() => deleteAdvance(adv.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Admin Salary Advance Dialog (select employee) ── */}
      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Salary Advance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {advError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{advError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Employee</label>
              <Select value={advForm.staffId} onValueChange={v => setAdvForm(f => ({...f, staffId: v}))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {staffList.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} — {u.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS)</label>
              <Input type="number" placeholder="e.g. 200000" value={advForm.amount} onChange={e => setAdvForm(f => ({...f, amount: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Repayment Date</label>
              <Input type="date" value={advForm.repaymentDate} onChange={e => setAdvForm(f => ({...f, repaymentDate: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reason</label>
              <Input placeholder="Reason for advance" value={advForm.reason} onChange={e => setAdvForm(f => ({...f, reason: e.target.value}))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvanceDialog(false)}>Cancel</Button>
            <Button onClick={() => saveAdvance()}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Payroll Confirm */}
      <Dialog open={runConfirm} onOpenChange={setRunConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Run Payroll — {selectedMonth} {selectedYear}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-gray-600">This will generate payslips for <strong>{staffList.filter(u=>u.status==="active").length} active staff</strong> in <strong>{activeCompanyName}</strong>.</p>
            {alreadyRun && (
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">Payroll already exists for this month. Running again will <strong>replace</strong> existing entries.</p>
              </div>
            )}
            <p className="text-xs text-gray-400">Employee deductions: PAYE (TRA rates) + NSSF 10%. Employer costs: NSSF 10%, SDL 3.5%, WCF 0.5%.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunConfirm(false)}>Cancel</Button>
            <Button onClick={runPayroll}><FileText className="w-4 h-4 mr-2" />Confirm & Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Dialog */}
      <Dialog open={!!showSlipDialog} onOpenChange={() => setShowSlipDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip — {showSlipDialog?.month} {showSlipDialog?.year}</DialogTitle>
          </DialogHeader>
          {showSlipDialog && (() => {
            const emp = staffList.find(u => u.id === showSlipDialog.staffId);
            const empCosts = (showSlipDialog.employerCosts && showSlipDialog.employerCosts.length > 0)
              ? showSlipDialog.employerCosts
              : [
                  { name: "NSSF (Employer 10%)", amount: calcNSSF_employer(showSlipDialog.grossSalary) },
                  { name: "SDL (3.5%)",           amount: calcSDL(showSlipDialog.grossSalary) },
                  { name: "WCF (0.5%)",           amount: calcWCF(showSlipDialog.grossSalary) },
                ];
            const totalEmpCost = empCosts.reduce((s, c) => s + c.amount, 0);
            const printSlip = () => {
              const coName = activeCompanyName;
              const slipHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Payslip</title><style>
body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px;max-width:600px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;background:#1e3a8a;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0}
.hdr h1{font-size:15px;margin:0 0 3px;color:#fff}.hdr p{font-size:11px;margin:2px 0;opacity:.85}
.body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 18px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px}
.stitle{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
.row{display:flex;justify-content:space-between;padding:3px 0;font-size:11.5px}
.row.tot{font-weight:700;border-top:1px solid #e5e7eb;margin-top:4px;padding-top:5px}
.net{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin:12px 0}
.net .lbl{font-weight:700;font-size:14px}.net .val{font-weight:800;font-size:20px;color:#15803d}
.employer{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-top:10px;font-size:11px}
.emp-title{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px}
.footer{text-align:center;font-size:10px;color:#9ca3af;margin-top:16px;border-top:1px solid #f3f4f6;padding-top:10px}
@media print{@page{margin:12mm}}
</style></head><body>
<div class="hdr">
  <div><h1>${coName}</h1><p>Payslip — ${showSlipDialog.month} ${showSlipDialog.year}</p><p>Generated: ${new Date(showSlipDialog.generatedAt).toLocaleDateString()}</p></div>
  <div style="text-align:right"><p style="font-size:13px;font-weight:700;margin:0">${emp?.name ?? "Unknown"}</p><p>${emp?.position ?? ""}</p><p>${emp?.department ?? ""}</p><p style="margin-top:4px;padding:2px 8px;background:${showSlipDialog.status==="paid"?"#22c55e":"#eab308"};color:#fff;border-radius:4px;font-size:10px;display:inline-block">${showSlipDialog.status.toUpperCase()}</p></div>
</div>
<div class="body">
  <div class="grid">
    <div>
      <div class="stitle">Earnings</div>
      <div class="row"><span>Basic Salary</span><span>TZS ${showSlipDialog.basicSalary.toLocaleString()}</span></div>
      ${showSlipDialog.allowances.map(a => `<div class="row"><span>${a.name}</span><span style="color:#16a34a">+TZS ${a.amount.toLocaleString()}</span></div>`).join("")}
      <div class="row tot"><span>Gross Salary</span><span>TZS ${showSlipDialog.grossSalary.toLocaleString()}</span></div>
    </div>
    <div>
      <div class="stitle">Employee Deductions</div>
      ${showSlipDialog.deductions.map(d => `<div class="row"><span>${d.name}</span><span style="color:#dc2626">-TZS ${d.amount.toLocaleString()}</span></div>`).join("")}
      <div class="row tot"><span>Total Deductions</span><span style="color:#dc2626">-TZS ${showSlipDialog.deductions.reduce((s,d)=>s+d.amount,0).toLocaleString()}</span></div>
    </div>
  </div>
  <div class="net"><span class="lbl">NET PAY</span><span class="val">TZS ${showSlipDialog.netSalary.toLocaleString()}</span></div>
  ${empCosts.length > 0 ? `<div class="employer">
    <div class="emp-title">Employer Statutory Costs (paid by employer, not deducted from employee)</div>
    ${empCosts.map(c => `<div class="row"><span>${c.name}</span><span>TZS ${c.amount.toLocaleString()}</span></div>`).join("")}
    <div class="row tot"><span>Total Employer Cost</span><span>TZS ${totalEmpCost.toLocaleString()}</span></div>
  </div>` : ""}
  <div class="footer">PHIDTECH Management System &nbsp;|&nbsp; CONFIDENTIAL &nbsp;|&nbsp; Tanzania Labour Laws Compliant</div>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
              const w = window.open("", "_blank", "width=720,height=900");
              if (w) { w.document.write(slipHtml); w.document.close(); }
            };
            return (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-bold text-gray-900">{emp?.name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-500">{emp?.position} · {emp?.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Company</p>
                    <p className="font-semibold text-gray-800 text-sm">{activeCompanyName}</p>
                    <p className="text-xs text-gray-500">{showSlipDialog.month} {showSlipDialog.year}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                      showSlipDialog.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{showSlipDialog.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Earnings</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Basic Salary</span>
                        <span className="font-medium">{formatCurrency(showSlipDialog.basicSalary)}</span>
                      </div>
                      {showSlipDialog.allowances.map(a => (
                        <div key={a.name} className="flex justify-between text-sm">
                          <span className="text-gray-500">{a.name}</span>
                          <span className="text-green-700">+{formatCurrency(a.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5 mt-1">
                        <span>Gross Salary</span>
                        <span>{formatCurrency(showSlipDialog.grossSalary)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Employee Deductions</p>
                    <div className="space-y-1.5">
                      {showSlipDialog.deductions.map(d => (
                        <div key={d.name} className="flex justify-between text-sm">
                          <span className="text-gray-500">{d.name}</span>
                          <span className="text-red-600">-{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5 mt-1">
                        <span>Total Deductions</span>
                        <span className="text-red-600">-{formatCurrency(showSlipDialog.deductions.reduce((s,d)=>s+d.amount,0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Net Pay</span>
                  <span className="text-xl font-bold text-green-700">{formatCurrency(showSlipDialog.netSalary)}</span>
                </div>
                {empCosts.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Employer Statutory Costs <span className="normal-case font-normal text-slate-400">(not deducted from employee)</span></p>
                    <div className="space-y-1.5">
                      {empCosts.map(c => (
                        <div key={c.name} className="flex justify-between text-sm">
                          <span className="text-slate-500">{c.name}</span>
                          <span className="text-slate-700">{formatCurrency(c.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                        <span>Total Employer Cost</span>
                        <span className="text-slate-800">{formatCurrency(totalEmpCost)}</span>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-center text-xs text-gray-400">Generated by PHIDTECH MS · {new Date(showSlipDialog.generatedAt).toLocaleDateString()}</p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlipDialog(null)}>Close</Button>
            <Button onClick={() => {
              if (!showSlipDialog) return;
              const emp = staffList.find(u => u.id === showSlipDialog.staffId);
              const empCosts = showSlipDialog.employerCosts ?? [];
              const totalEmpCost = empCosts.reduce((s, c) => s + c.amount, 0);
              const slipHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px;max-width:600px}.hdr{display:flex;justify-content:space-between;background:#1e3a8a;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0}.hdr h1{font-size:15px;margin:0 0 3px;color:#fff}.hdr p{font-size:11px;margin:2px 0;opacity:.85}.body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px}.stitle{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}.row{display:flex;justify-content:space-between;padding:3px 0;font-size:11.5px}.row.tot{font-weight:700;border-top:1px solid #e5e7eb;margin-top:4px;padding-top:5px}.net{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin:12px 0}.net .lbl{font-weight:700;font-size:14px}.net .val{font-weight:800;font-size:20px;color:#15803d}.employer{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-top:10px;font-size:11px}.emp-title{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px}.footer{text-align:center;font-size:10px;color:#9ca3af;margin-top:16px;border-top:1px solid #f3f4f6;padding-top:10px}@media print{@page{margin:12mm}}</style></head><body>
<div class="hdr"><div><h1>${activeCompanyName}</h1><p>Payslip — ${showSlipDialog.month} ${showSlipDialog.year}</p><p>Generated: ${new Date(showSlipDialog.generatedAt).toLocaleDateString()}</p></div><div style="text-align:right"><p style="font-size:13px;font-weight:700;margin:0">${emp?.name ?? "Unknown"}</p><p>${emp?.position ?? ""}</p><p>${emp?.department ?? ""}</p></div></div>
<div class="body"><div class="grid"><div><div class="stitle">Earnings</div><div class="row"><span>Basic Salary</span><span>TZS ${showSlipDialog.basicSalary.toLocaleString()}</span></div>${showSlipDialog.allowances.map(a=>`<div class="row"><span>${a.name}</span><span style="color:#16a34a">+TZS ${a.amount.toLocaleString()}</span></div>`).join("")}<div class="row tot"><span>Gross Salary</span><span>TZS ${showSlipDialog.grossSalary.toLocaleString()}</span></div></div><div><div class="stitle">Employee Deductions</div>${showSlipDialog.deductions.map(d=>`<div class="row"><span>${d.name}</span><span style="color:#dc2626">-TZS ${d.amount.toLocaleString()}</span></div>`).join("")}<div class="row tot"><span>Total Deductions</span><span style="color:#dc2626">-TZS ${showSlipDialog.deductions.reduce((s,d)=>s+d.amount,0).toLocaleString()}</span></div></div></div><div class="net"><span class="lbl">NET PAY</span><span class="val">TZS ${showSlipDialog.netSalary.toLocaleString()}</span></div>${empCosts.length>0?`<div class="employer"><div class="emp-title">Employer Statutory Costs (not deducted from employee)</div>${empCosts.map(c=>`<div class="row"><span>${c.name}</span><span>TZS ${c.amount.toLocaleString()}</span></div>`).join("")}<div class="row tot"><span>Total Employer Cost</span><span>TZS ${totalEmpCost.toLocaleString()}</span></div></div>`:""}<div class="footer">PHIDTECH Management System | CONFIDENTIAL | Tanzania Labour Laws Compliant</div></div>
<script>window.onload=()=>window.print();</script></body></html>`;
              const w = window.open("", "_blank", "width=720,height=900");
              if (w) { w.document.write(slipHtml); w.document.close(); }
            }}>
              <Download className="w-4 h-4 mr-2" />Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Payroll Entry Dialog (superadmin only) ── */}
      <Dialog open={!!editEntry} onOpenChange={() => { setEditEntry(null); setEditForm(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payroll Entry</DialogTitle>
          </DialogHeader>
          {editEntry && editForm && (() => {
            const emp = staffList.find(u => u.id === editEntry.staffId);
            const previewBasic = Number(editForm.basicSalary) || 0;
            const previewAlwTotal = editForm.allowances.reduce((s, a) => s + (a.amount || 0), 0);
            const previewGross = previewBasic + previewAlwTotal;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="text-xs">{getInitials(emp?.name ?? "?")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{emp?.name}</p>
                    <p className="text-xs text-gray-500">{emp?.position} · {editEntry.month} {editEntry.year}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Basic Salary (TZS)</label>
                  <Input
                    type="number"
                    value={editForm.basicSalary}
                    onChange={e => setEditForm(f => f ? { ...f, basicSalary: e.target.value } : f)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Allowances</p>
                    <Button size="sm" variant="outline" type="button"
                      onClick={() => setEditForm(f => f ? { ...f, allowances: [...f.allowances, { name: "", amount: 0 }] } : f)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                  {editForm.allowances.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No allowances.</p>
                  ) : (
                    <div className="space-y-2">
                      {editForm.allowances.map((alw, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            placeholder="Name (e.g. Transport)"
                            value={alw.name}
                            onChange={e => setEditForm(f => f ? { ...f, allowances: f.allowances.map((a, i) => i === idx ? { ...a, name: e.target.value } : a) } : f)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={alw.amount || ""}
                            onChange={e => setEditForm(f => f ? { ...f, allowances: f.allowances.map((a, i) => i === idx ? { ...a, amount: Number(e.target.value) } : a) } : f)}
                            className="w-32"
                          />
                          <button type="button"
                            onClick={() => setEditForm(f => f ? { ...f, allowances: f.allowances.filter((_, i) => i !== idx) } : f)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live preview */}
                {(() => {
                  const nssfEmp = calcNSSF_employee(previewGross);
                  const taxable = previewGross - nssfEmp;
                  const paye = calcPAYE(previewGross);
                  const net = previewGross - nssfEmp - paye;
                  return (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Gross Salary</span>
                      <span className="font-medium">{formatCurrency(previewGross)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>NSSF Employee (10%)</span>
                      <span className="text-red-500">-{formatCurrency(nssfEmp)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>Taxable Income (after NSSF)</span>
                      <span>{formatCurrency(taxable)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>PAYE (on taxable income)</span>
                      <span className="text-red-500">-{formatCurrency(paye)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
                      <span>Net Pay</span>
                      <span className="text-green-700">{formatCurrency(net)}</span>
                    </div>
                    <div className="border-t border-dashed border-gray-200 pt-2 mt-1">
                      <p className="text-xs text-gray-400 font-semibold mb-1">Employer Costs (not deducted from employee)</p>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>NSSF Employer (10%)</span>
                        <span>{formatCurrency(calcNSSF_employer(previewGross))}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>SDL (3.5%)</span>
                        <span>{formatCurrency(calcSDL(previewGross))}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>WCF (0.5%)</span>
                        <span>{formatCurrency(calcWCF(previewGross))}</span>
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditEntry(null); setEditForm(null); }}>Cancel</Button>
            <Button onClick={saveEditEntry}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog (superadmin only) ── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Payroll Entry</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">Are you sure you want to delete this payroll entry? This action <strong>cannot be undone</strong>.</p>
            {deleteConfirmId && (() => {
              const entry = payrollEntries.find(p => p.id === deleteConfirmId);
              const emp = staffList.find(u => u.id === entry?.staffId);
              return entry ? (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 text-sm">
                  <p className="font-semibold text-red-800">{emp?.name ?? "Unknown"}</p>
                  <p className="text-red-600">{entry.month} {entry.year} — Net: {formatCurrency(entry.netSalary)}</p>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deletePayrollEntry(deleteConfirmId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
}
