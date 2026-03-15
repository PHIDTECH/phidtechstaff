"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
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
const ADVANCES_KEY    = "phidtech_advances";
const COMPANIES_KEY   = "phidtech_companies";
const SESSION_KEY     = "phidtech_session";
const COMMISSIONS_KEY = "phidtech_commissions";

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
  isSuperAdmin: boolean; companyId: string;
}
interface StaffUser {
  id: string; name: string; email: string; position: string;
  department: string; salary: number; status: string; companyId: string;
  allowances?: { name: string; amount: number }[];
}
interface Allowance { name: string; amount: number; }
interface Deduction { name: string; amount: number; }
interface StoredCommission {
  id: string; staffId: string; companyId: string;
  month: string; year: number; commissionAmount: number; status: string;
}
interface PayrollEntry {
  id: string; staffId: string; companyId: string;
  month: string; year: number;
  basicSalary: number; allowances: Allowance[]; deductions: Deduction[];
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

function calcPAYE(gross: number): number {
  if (gross <= 270000) return 0;
  if (gross <= 520000) return (gross - 270000) * 0.09;
  if (gross <= 760000) return 22500 + (gross - 520000) * 0.20;
  if (gross <= 1000000) return 70500 + (gross - 760000) * 0.25;
  return 130500 + (gross - 1000000) * 0.30;
}
function calcNSSF(gross: number): number { return Math.round(gross * 0.10); }
function calcSDL(gross: number): number { return Math.round(gross * 0.04); }

export default function PayrollPage() {
  usePermissionGuard("payroll");
  const now = new Date();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [activeCompanyName, setActiveCompanyName] = useState("");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
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

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setActiveCompanyId(cid);
    const companies = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    setActiveCompanyName(companies.find(c => c.id === cid)?.name ?? "");
    const allStaff = lsGet<StaffUser[]>(USERS_KEY, []);
    setStaffList(allStaff.filter(u => u.companyId === cid));
    setPayrollEntries(lsGet<PayrollEntry[]>(PAYROLL_KEY, []));
    setAdvances(lsGet<SalaryAdvance[]>(ADVANCES_KEY, []));
  };

  useEffect(() => {
    reload();
    window.addEventListener("phidtech_companies_updated", reload);
    return () => window.removeEventListener("phidtech_companies_updated", reload);
  }, []);

  const monthKey = `${selectedMonth}-${selectedYear}`;
  const companyEntries = payrollEntries.filter(
    p => p.companyId === activeCompanyId && p.month === selectedMonth && p.year === selectedYear
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

  const runPayroll = () => {
    const activeStaff = staffList.filter(u => u.status === "active" && u.salary > 0);
    if (activeStaff.length === 0) { setRunConfirm(false); return; }
    const allCommissions = lsGet<StoredCommission[]>(COMMISSIONS_KEY, []);
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
      const paye = Math.round(calcPAYE(gross));
      const nssf = calcNSSF(gross);
      const sdl  = calcSDL(gross);
      const totalDed = paye + nssf + sdl;
      const net = gross - totalDed;
      return {
        id: `pr-${emp.id}-${monthKey}-${Date.now()}`,
        staffId: emp.id, companyId: activeCompanyId,
        month: selectedMonth, year: selectedYear,
        basicSalary: basic,
        allowances: combinedAllowances,
        deductions: [
          { name: "PAYE", amount: paye },
          { name: "NSSF (10%)", amount: nssf },
          { name: "SDL (4%)", amount: sdl },
        ],
        grossSalary: gross, netSalary: net,
        status: "draft",
        generatedAt: new Date().toISOString(),
      };
    });
    const other = payrollEntries.filter(
      p => !(p.companyId === activeCompanyId && p.month === selectedMonth && p.year === selectedYear)
    );
    const updated = [...other, ...newEntries];
    lsSet(PAYROLL_KEY, updated);
    setPayrollEntries(updated);
    setRunConfirm(false);
  };

  const markPaid = (id: string) => {
    const updated = payrollEntries.map(p => p.id === id ? { ...p, status: "paid" as const } : p);
    lsSet(PAYROLL_KEY, updated);
    setPayrollEntries(updated);
  };

  const markAllPaid = () => {
    const updated = payrollEntries.map(p =>
      p.companyId === activeCompanyId && p.month === selectedMonth && p.year === selectedYear
        ? { ...p, status: "paid" as const } : p
    );
    lsSet(PAYROLL_KEY, updated);
    setPayrollEntries(updated);
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
    const updated = [...advances, adv];
    lsSet(ADVANCES_KEY, updated);
    setAdvances(updated);
    setAdvForm({ staffId: "", amount: "", reason: "", repaymentDate: "" });
    setAdvError("");
    setShowAdvanceDialog(false);
  };

  const deletePayrollEntry = (id: string) => {
    const updated = payrollEntries.filter(p => p.id !== id);
    lsSet(PAYROLL_KEY, updated);
    setPayrollEntries(updated);
    setDeleteConfirmId(null);
  };

  const openEditEntry = (entry: PayrollEntry) => {
    setEditEntry(entry);
    setEditForm({
      basicSalary: String(entry.basicSalary),
      allowances: entry.allowances.map(a => ({ ...a })),
    });
  };

  const saveEditEntry = () => {
    if (!editEntry || !editForm) return;
    const basic = Number(editForm.basicSalary) || 0;
    const alws = editForm.allowances.filter(a => a.name.trim() && a.amount > 0);
    const totalAlw = alws.reduce((s, a) => s + a.amount, 0);
    const gross = basic + totalAlw;
    const paye = Math.round(calcPAYE(gross));
    const nssf = calcNSSF(gross);
    const sdl  = calcSDL(gross);
    const net  = gross - paye - nssf - sdl;
    const updated = payrollEntries.map(p => p.id === editEntry.id ? {
      ...p,
      basicSalary: basic,
      allowances: alws,
      deductions: [
        { name: "PAYE", amount: paye },
        { name: "NSSF (10%)", amount: nssf },
        { name: "SDL (4%)", amount: sdl },
      ],
      grossSalary: gross,
      netSalary: net,
    } : p);
    lsSet(PAYROLL_KEY, updated);
    setPayrollEntries(updated);
    setEditEntry(null);
    setEditForm(null);
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
    const updated = advances.map(a => a.id === id ? { ...a, status } : a);
    lsSet(ADVANCES_KEY, updated);
    setAdvances(updated);
  };

  const years = [now.getFullYear(), now.getFullYear() - 1];

  // Role check: superadmin or accountant (position/role contains "accountant")
  const canManage = session?.isSuperAdmin === true ||
    session?.role?.toLowerCase().includes("accountant") ||
    session?.position?.toLowerCase().includes("accountant");

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
                <p className="text-center text-xs text-gray-400 pb-4">Generated by PHIDTECH MS · {new Date(myEntry.generatedAt).toLocaleDateString()}</p>
                {/* Actions */}
                <div className="px-6 pb-5 flex justify-end">
                  <Button onClick={() => window.print()}>
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
        <StatCard title="Total Deductions" value={formatCurrency(totalDeductions)} icon={DollarSign} iconBg="bg-red-50" iconColor="text-red-500" subtitle="PAYE, NSSF, SDL" />
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
                <p className="text-xs text-red-500">No active staff found for this company. Add staff first.</p>
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
                    const emp = staffList.find(u => u.id === adv.staffId);
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
            <p className="text-xs text-gray-400">Deductions applied: PAYE (Tanzania rates), NSSF 10%, SDL 4%</p>
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
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-bold text-gray-900">{emp?.name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-500">{emp?.position} · {emp?.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Company</p>
                    <p className="font-semibold text-gray-800 text-sm">{activeCompanyName}</p>
                    <p className="text-xs text-gray-500">{showSlipDialog.month} {showSlipDialog.year}</p>
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
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Deductions</p>
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
                <p className="text-center text-xs text-gray-400">Generated by PHIDTECH MS · {new Date(showSlipDialog.generatedAt).toLocaleDateString()}</p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlipDialog(null)}>Close</Button>
            <Button onClick={() => window.print()}>
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
            const previewNet = previewGross - Math.round(calcPAYE(previewGross)) - calcNSSF(previewGross) - calcSDL(previewGross);
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
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Gross Salary</span>
                    <span className="font-medium">{formatCurrency(previewGross)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>PAYE</span>
                    <span className="text-red-500">-{formatCurrency(Math.round(calcPAYE(previewGross)))}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>NSSF (10%)</span>
                    <span className="text-red-500">-{formatCurrency(calcNSSF(previewGross))}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SDL (4%)</span>
                    <span className="text-red-500">-{formatCurrency(calcSDL(previewGross))}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
                    <span>Net Pay</span>
                    <span className="text-green-700">{formatCurrency(previewNet)}</span>
                  </div>
                </div>
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
