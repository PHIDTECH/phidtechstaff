"use client";
export const dynamic = "force-dynamic";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, Download, TrendingUp, DollarSign, Users,
  CheckSquare, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";

const SESSION_KEY = "phidtech_session";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#3b82f6","#10b981","#f97316","#8b5cf6","#ec4899","#06b6d4","#f59e0b","#ef4444"];

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface StaffUser {
  id: string; name: string; companyId: string; status: string;
  department?: string; position?: string; salary?: number; branchId?: string | null;
  createdAt?: string;
}
interface Sale { id: string; companyId: string; date: string; amount: number; paid: number; balance: number; customerName?: string; status?: string; }
interface Expense { id: string; companyId: string; amount: number; category: string; status: string; submittedAt?: string; }
interface OfficeExpense { id: string; companyId: string; amount: number; category: string; status: string; date?: string; }
interface PayrollEntry { id: string; companyId: string; staffId: string; month: string; year: number; netSalary: number; status: string; generatedAt?: string; }
interface Task { id: string; companyId: string; status: string; priority: string; assignedTo: string; department?: string; dueDate?: string; createdAt?: string; }
interface LeaveReq { id: string; companyId: string; staffId: string; type?: string; status: string; startDate?: string; endDate?: string; }
interface AttendanceRecord { id: string; companyId?: string; staffId: string; date: string; status: string; }
interface KPI { id: string; companyId: string; status: string; target: number; actual: number; }
interface Customer { id: string; companyId: string; createdAt?: string; type?: string; }
interface Invoice { id: string; companyId: string; total: number; status: string; issuedAt?: string; }

type Period = "monthly" | "quarterly" | "yearly";

function getMonthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function lastN(n: number, period: Period): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    if (period === "monthly") d.setMonth(d.getMonth() - i);
    else if (period === "quarterly") d.setMonth(d.getMonth() - i * 3);
    else d.setFullYear(d.getFullYear() - i);
    keys.push(period === "yearly" ? String(d.getFullYear()) : getMonthKey(d));
  }
  return keys;
}
function labelFor(k: string, period: Period) {
  if (period === "yearly") return k;
  const [y, m] = k.split("-");
  return `${MONTHS_SHORT[Number(m) - 1]} ${y.slice(2)}`;
}
function saleKey(date: string, period: Period) {
  if (!date) return "";
  if (period === "yearly") return date.slice(0, 4);
  if (period === "quarterly") {
    const [y, m] = date.split("-");
    const q = Math.ceil(Number(m) / 3);
    return `${y}-Q${q}`;
  }
  return date.slice(0, 7);
}

export default function ReportsPage() {
  usePermissionGuard("reports");
  const [period, setPeriod] = useState<Period>("monthly");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [officeExp, setOfficeExp] = useState<OfficeExpense[]>([]);
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaves, setLeaves] = useState<LeaveReq[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cid, setCid] = useState("");
  const cidRef = useRef("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const sess = lsGet<{id:string;isSuperAdmin:boolean;companyId:string}>(SESSION_KEY, null as never);
    const c = getActiveCid(sess);
    setCid(c); cidRef.current = c;

    const safe = async <T,>(url: string, lsKey?: string): Promise<T[]> => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.ok) return await r.json();
        return lsKey ? lsGet<T[]>(lsKey, []) : [];
      } catch { return lsKey ? lsGet<T[]>(lsKey, []) : []; }
    };

    const [s, sal, ex, oex, pay, tsk, lv, att, kp, cust, inv] = await Promise.all([
      safe<StaffUser>("/api/users", "phidtech_users"),
      safe<Sale>("/api/accounting/sales", "phidtech_accounting_sales"),
      safe<Expense>("/api/expenses", "phidtech_expenses"),
      safe<OfficeExpense>("/api/office-expenses", "phidtech_office_expenses"),
      safe<PayrollEntry>("/api/payroll", "phidtech_payroll"),
      safe<Task>("/api/tasks", "phidtech_tasks"),
      safe<LeaveReq>("/api/leave", "phidtech_leave"),
      safe<AttendanceRecord>("/api/attendance", "phidtech_attendance"),
      safe<KPI>("/api/kpis", "phidtech_kpis"),
      safe<Customer>("/api/customers", "phidtech_customers"),
      safe<Invoice>("/api/invoices", "phidtech_invoices"),
    ]);
    setStaff(s); setSales(sal); setExpenses(ex); setOfficeExp(oex);
    setPayroll(pay); setTasks(tsk); setLeaves(lv); setAttendance(att);
    setKpis(kp); setCustomers(cust); setInvoices(inv);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    window.addEventListener("phidtech_companies_updated", reload);
    return () => window.removeEventListener("phidtech_companies_updated", reload);
  }, []); // eslint-disable-line

  const co = cidRef.current || cid;
  const flt = <T extends { companyId: string }>(arr: T[]) => co ? arr.filter(x => x.companyId === co) : arr;

  const coStaff   = flt(staff);
  const coSales   = flt(sales);
  const coExp     = flt(expenses);
  const coOExp    = flt(officeExp);
  const coPay     = flt(payroll);
  const coTasks   = flt(tasks);
  const coLeaves  = flt(leaves);
  const coAtt     = attendance.filter(a => !co || !a.companyId || a.companyId === co);
  const coKpis    = flt(kpis);
  const coCust    = flt(customers);
  const coInv     = flt(invoices);

  // ── FINANCIAL KPIs ──────────────────────────────────────────────────────
  const totalRevenue  = coSales.reduce((s, e) => s + e.paid, 0);
  const totalBalance  = coSales.reduce((s, e) => s + (e.amount - e.paid), 0);
  const totalExpClaim = coExp.filter(e => e.status === "paid" || e.status === "approved").reduce((s,e) => s + e.amount, 0);
  const totalOffExp   = coOExp.filter(e => e.status === "paid" || e.status === "approved").reduce((s,e) => s + e.amount, 0);
  const totalSalaries = coPay.filter(p => p.status === "paid").reduce((s,p) => s + p.netSalary, 0);
  const totalExpenses = totalExpClaim + totalOffExp + totalSalaries;
  const netProfit     = totalRevenue - totalExpenses;
  const margin        = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  // ── REVENUE CHART ────────────────────────────────────────────────────────
  const nPeriods = period === "monthly" ? 12 : period === "quarterly" ? 8 : 5;
  const keys = lastN(nPeriods, period);
  const revenueChart = keys.map(k => {
    const label = labelFor(k, period);
    const rev = coSales.filter(s => saleKey(s.date, period) === k).reduce((s,e) => s + e.paid, 0);
    const exp = coExp.filter(e => saleKey((e.submittedAt||"").slice(0,10), period) === k && (e.status==="paid"||e.status==="approved")).reduce((s,e) => s + e.amount, 0)
              + coOExp.filter(e => saleKey((e.date||""), period) === k && (e.status==="paid"||e.status==="approved")).reduce((s,e) => s + e.amount, 0);
    return { label, revenue: rev, expenses: exp, profit: rev - exp };
  });

  // ── EXPENSE BREAKDOWN ────────────────────────────────────────────────────
  const expBreakdown: Record<string, number> = {};
  coExp.filter(e => e.status === "paid" || e.status === "approved").forEach(e => {
    expBreakdown[e.category] = (expBreakdown[e.category] ?? 0) + e.amount;
  });
  coOExp.filter(e => e.status === "paid" || e.status === "approved").forEach(e => {
    expBreakdown[e.category] = (expBreakdown[e.category] ?? 0) + e.amount;
  });
  if (totalSalaries > 0) expBreakdown["Staff Salaries"] = totalSalaries;
  const expPie = Object.entries(expBreakdown).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,value]) => ({ name, value }));

  // ── SALES KPIs ────────────────────────────────────────────────────────────
  const totalSales       = coSales.length;
  const totalCustomers   = coCust.length;
  const newCustomersThisMo = coCust.filter(c => (c.createdAt||"").startsWith(new Date().toISOString().slice(0,7))).length;
  const paidInvoices     = coInv.filter(i => i.status === "paid").length;
  const unpaidInvoices   = coInv.filter(i => i.status !== "paid").length;
  const invoiceRevenue   = coInv.filter(i => i.status === "paid").reduce((s,i) => s + i.total, 0);

  // Sales by customer (top 8)
  const salesByCustomer: Record<string, number> = {};
  coSales.forEach(s => { if (s.customerName) salesByCustomer[s.customerName] = (salesByCustomer[s.customerName] ?? 0) + s.paid; });
  const topCustomers = Object.entries(salesByCustomer).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,value]) => ({ name, value }));

  // Sales trend
  const salesTrend = keys.map(k => ({
    label: labelFor(k, period),
    sales: coSales.filter(s => saleKey(s.date, period) === k).length,
    revenue: coSales.filter(s => saleKey(s.date, period) === k).reduce((s,e) => s + e.paid, 0),
  }));

  // ── HR KPIs ──────────────────────────────────────────────────────────────
  const activeStaff  = coStaff.filter(u => u.status === "active").length;
  const totalStaff   = coStaff.length;
  const pendingLeave = coLeaves.filter(l => l.status === "pending").length;
  const approvedLeave = coLeaves.filter(l => l.status === "approved").length;

  // Staff by department
  const deptBreakdown: Record<string, number> = {};
  coStaff.forEach(u => { const d = u.department || "Other"; deptBreakdown[d] = (deptBreakdown[d] ?? 0) + 1; });
  const deptPie = Object.entries(deptBreakdown).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,value]) => ({ name, value }));

  // Payroll trend
  const payrollTrend = keys.map(k => {
    const gross = coPay.filter(p => {
      const pk = period === "yearly" ? String(p.year) : `${p.year}-${String(["January","February","March","April","May","June","July","August","September","October","November","December"].indexOf(p.month)+1).padStart(2,"0")}`;
      return pk === k && p.status === "paid";
    }).reduce((s,p) => s + p.netSalary, 0);
    return { label: labelFor(k, period), salaries: gross };
  });

  // Leave by type
  const leaveTypes: Record<string, number> = {};
  coLeaves.forEach(l => { const t = l.type || "Other"; leaveTypes[t] = (leaveTypes[t] ?? 0) + 1; });
  const leaveTypePie = Object.entries(leaveTypes).map(([name, value]) => ({ name, value }));

  // Attendance rates
  const presentCount  = coAtt.filter(a => a.status === "present").length;
  const totalAttDays  = coAtt.length;
  const attendanceRate = totalAttDays > 0 ? ((presentCount / totalAttDays) * 100).toFixed(1) : "0.0";

  // ── PRODUCTIVITY KPIs ─────────────────────────────────────────────────────
  const completedTasks  = coTasks.filter(t => t.status === "completed").length;
  const pendingTasks    = coTasks.filter(t => t.status === "pending").length;
  const inProgressTasks = coTasks.filter(t => t.status === "in-progress").length;
  const cancelledTasks  = coTasks.filter(t => t.status === "cancelled").length;
  const totalTasks      = coTasks.length;
  const completionRate  = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0.0";
  const onTrackKpis     = coKpis.filter(k => k.status === "on-track").length;
  const atRiskKpis      = coKpis.filter(k => k.status === "at-risk").length;
  const offTrackKpis    = coKpis.filter(k => k.status === "off-track").length;

  // Tasks by priority
  const priorityData = ["critical","high","medium","low"].map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: coTasks.filter(t => t.priority === p).length,
  })).filter(d => d.value > 0);

  // Tasks by department
  const taskDeptBreakdown: Record<string, { completed: number; total: number }> = {};
  coTasks.forEach(t => {
    const d = t.department || "General";
    if (!taskDeptBreakdown[d]) taskDeptBreakdown[d] = { completed: 0, total: 0 };
    taskDeptBreakdown[d].total++;
    if (t.status === "completed") taskDeptBreakdown[d].completed++;
  });
  const taskDeptData = Object.entries(taskDeptBreakdown)
    .sort((a,b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([dept, v]) => ({ dept, completed: v.completed, pending: v.total - v.completed }));

  // Tasks trend
  const tasksTrend = keys.map(k => ({
    label: labelFor(k, period),
    created:   coTasks.filter(t => saleKey((t.createdAt||"").slice(0,10), period) === k).length,
    completed: coTasks.filter(t => t.status === "completed" && saleKey((t.createdAt||"").slice(0,10), period) === k).length,
  }));

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
      <h3 className="font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );

  const EmptyChart = ({ h = 200 }: { h?: number }) => (
    <div className="flex items-center justify-center text-sm text-gray-400" style={{ height: h }}>
      No data available yet
    </div>
  );

  return (
    <MainLayout>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive business performance reports across all modules"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={v => setPeriod(v as Period)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" /> Print / Export
            </Button>
          </div>
        }
      />

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin shrink-0" />
          Loading report data from all modules…
        </div>
      )}

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue"   value={formatCurrency(totalRevenue)}  icon={DollarSign}  iconBg="bg-green-50"  iconColor="text-green-600"  subtitle="Collected payments" />
        <StatCard title="Net Profit"      value={formatCurrency(netProfit)}     icon={TrendingUp}  iconBg={netProfit>=0?"bg-blue-50":"bg-red-50"}   iconColor={netProfit>=0?"text-blue-600":"text-red-500"} subtitle={`Margin: ${margin}%`} />
        <StatCard title="Active Staff"    value={activeStaff}                   icon={Users}       iconBg="bg-purple-50" iconColor="text-purple-600" subtitle={`${totalStaff} total`} />
        <StatCard title="Tasks Completed" value={`${completedTasks}/${totalTasks}`} icon={CheckSquare} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle={`${completionRate}% completion`} />
      </div>

      <Tabs defaultValue="financial">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="sales">Sales & CRM</TabsTrigger>
          <TabsTrigger value="hr">HR & Payroll</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
        </TabsList>

        {/* ── FINANCIAL TAB ── */}
        <TabsContent value="financial" className="space-y-5">
          {/* Financial KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600"><ArrowUpRight className="w-3 h-3" />Collected</div>
            </div>
            <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-red-500"><ArrowDownRight className="w-3 h-3" />Approved/Paid</div>
            </div>
            <div className={`bg-white rounded-xl border shadow-sm p-5 ${netProfit >= 0 ? "border-blue-100" : "border-red-100"}`}>
              <p className="text-xs text-gray-500 mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-blue-700" : "text-red-600"}`}>{formatCurrency(netProfit)}</p>
              <div className="text-xs text-gray-400 mt-1">Margin: {margin}%</div>
            </div>
            <div className="bg-white rounded-xl border border-yellow-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(totalBalance)}</p>
              <div className="text-xs text-gray-400 mt-1">Uncollected</div>
            </div>
          </div>

          {/* Revenue vs Expenses chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader title="Revenue vs Expenses vs Profit" subtitle={`${period === "monthly" ? "Last 12 months" : period === "quarterly" ? "Last 8 quarters" : "Last 5 years"}`} />
            <div className="p-5">
              {revenueChart.every(r => r.revenue === 0 && r.expenses === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueChart} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="revenue"  fill="#10b981" radius={[4,4,0,0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="#f97316" radius={[4,4,0,0]} name="Expenses" />
                    <Bar dataKey="profit"   fill="#3b82f6" radius={[4,4,0,0]} name="Net Profit" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Expense breakdown + Income statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Expense Breakdown" subtitle="By category (approved/paid)" />
              <div className="p-5">
                {expPie.length === 0 ? <EmptyChart h={180} /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ percent }: {percent?:number}) => `${((percent??0)*100).toFixed(0)}%`} labelLine={false}>
                        {expPie.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Income Statement Summary" subtitle="All-time totals" />
              <div className="p-5 space-y-2">
                {[
                  { label: "Gross Revenue",       value: totalRevenue,  color: "text-green-700", bold: true },
                  { label: "  Expense Claims",    value: -totalExpClaim, color: "text-orange-600" },
                  { label: "  Office Expenses",   value: -totalOffExp,   color: "text-orange-600" },
                  { label: "  Staff Salaries",    value: -totalSalaries, color: "text-orange-600" },
                  { label: "Total Expenses",      value: -totalExpenses, color: "text-red-600", bold: true },
                  { label: "Net Profit / (Loss)", value: netProfit,      color: netProfit>=0?"text-emerald-700":"text-red-600", bold: true, border: true },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between py-1.5 text-sm ${row.border ? "border-t-2 border-gray-200 pt-2.5 mt-1" : ""}`}>
                    <span className={`${row.bold ? "font-bold text-gray-800" : "text-gray-500 pl-3"}`}>{row.label}</span>
                    <span className={`font-semibold ${row.color}`}>
                      {row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 text-xs text-gray-400">Profit Margin: <strong>{margin}%</strong></div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── SALES TAB ── */}
        <TabsContent value="sales" className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-blue-700">{totalSales}</p>
              <div className="text-xs text-gray-400 mt-1">All recorded</div>
            </div>
            <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Customers</p>
              <p className="text-2xl font-bold text-purple-700">{totalCustomers}</p>
              <div className="text-xs text-gray-400 mt-1">{newCustomersThisMo} new this month</div>
            </div>
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Paid Invoices</p>
              <p className="text-2xl font-bold text-green-700">{paidInvoices}</p>
              <div className="text-xs text-gray-400 mt-1">{formatCurrency(invoiceRevenue)} collected</div>
            </div>
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-red-600">{unpaidInvoices}</p>
              <div className="text-xs text-gray-400 mt-1">Awaiting payment</div>
            </div>
          </div>

          {/* Sales trend */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader title="Sales Revenue Trend" subtitle="Revenue over time" />
            <div className="p-5">
              {salesTrend.every(s => s.revenue === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={salesTrend}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top customers */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader title="Top Customers by Revenue" subtitle="Based on collected payments" />
            <div className="p-5">
              {topCustomers.length === 0 ? <EmptyChart h={160} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topCustomers} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── HR TAB ── */}
        <TabsContent value="hr" className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{totalStaff}</p>
              <div className="text-xs text-green-600 mt-1 font-medium">{activeStaff} active</div>
            </div>
            <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Pending Leave</p>
              <p className="text-2xl font-bold text-orange-600">{pendingLeave}</p>
              <div className="text-xs text-gray-400 mt-1">{approvedLeave} approved</div>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Attendance Rate</p>
              <p className="text-2xl font-bold text-blue-700">{attendanceRate}%</p>
              <div className="text-xs text-gray-400 mt-1">{presentCount}/{totalAttDays} days present</div>
            </div>
            <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Total Payroll</p>
              <p className="text-xl font-bold text-purple-700">{formatCurrency(totalSalaries)}</p>
              <div className="text-xs text-gray-400 mt-1">Paid salaries</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Staff by department */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Staff by Department" subtitle="Headcount distribution" />
              <div className="p-5">
                {deptPie.length === 0 ? <EmptyChart h={180} /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={deptPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }: {name?:string;percent?:number}) => `${(name||"").split(" ")[0]}: ${((percent??0)*100).toFixed(0)}%`} labelLine={true}>
                        {deptPie.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Leave by type */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Leave Requests by Type" subtitle="All recorded leave requests" />
              <div className="p-5">
                {leaveTypePie.length === 0 ? <EmptyChart h={180} /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={leaveTypePie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }: {name?:string;percent?:number}) => `${name??""}: ${((percent??0)*100).toFixed(0)}%`} labelLine={true}>
                        {leaveTypePie.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Payroll trend */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader title="Payroll Trend" subtitle="Net salaries paid over time" />
            <div className="p-5">
              {payrollTrend.every(p => p.salaries === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="salaries" fill="#8b5cf6" radius={[4,4,0,0]} name="Salaries Paid" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Staff table */}
          {coStaff.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Staff Overview" subtitle={`${totalStaff} total · ${activeStaff} active`} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Status","Active","Inactive","Leave Pending"].map(h => (
                        <th key={h} className="px-5 py-2.5 text-left text-xs text-gray-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(deptBreakdown).sort((a,b) => b[1]-a[1]).map(([dept, count]) => {
                      const dStaff = coStaff.filter(u => (u.department||"Other") === dept);
                      const dActive = dStaff.filter(u => u.status === "active").length;
                      const dLeave  = coLeaves.filter(l => l.status === "pending" && dStaff.some(u => u.id === l.staffId)).length;
                      return (
                        <tr key={dept} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-5 py-2.5 font-medium text-gray-800">{dept}</td>
                          <td className="px-5 py-2.5 text-green-700 font-semibold">{dActive}</td>
                          <td className="px-5 py-2.5 text-gray-400">{count - dActive}</td>
                          <td className="px-5 py-2.5 text-orange-600">{dLeave}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── PRODUCTIVITY TAB ── */}
        <TabsContent value="productivity" className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Completed Tasks</p>
              <p className="text-2xl font-bold text-green-700">{completedTasks}</p>
              <div className="text-xs text-gray-400 mt-1">{completionRate}% completion</div>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-blue-700">{inProgressTasks}</p>
              <div className="text-xs text-gray-400 mt-1">{pendingTasks} pending</div>
            </div>
            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">KPIs On-Track</p>
              <p className="text-2xl font-bold text-emerald-700">{onTrackKpis}</p>
              <div className="text-xs text-gray-400 mt-1">{atRiskKpis} at risk · {offTrackKpis} off-track</div>
            </div>
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{cancelledTasks}</p>
              <div className="text-xs text-gray-400 mt-1">of {totalTasks} total tasks</div>
            </div>
          </div>

          {/* Tasks trend */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader title="Tasks Created vs Completed" subtitle="Productivity over time" />
            <div className="p-5">
              {tasksTrend.every(t => t.created === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={tasksTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line type="monotone" dataKey="created"   stroke="#94a3b8" strokeWidth={2} dot={false} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke="#10b981"  strokeWidth={2} dot={false} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tasks by department */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Tasks by Department" subtitle="Completed vs pending breakdown" />
              <div className="p-5">
                {taskDeptData.length === 0 ? <EmptyChart h={180} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={taskDeptData} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="completed" fill="#10b981" radius={[0,3,3,0]} name="Completed" stackId="a" />
                      <Bar dataKey="pending"   fill="#e5e7eb" radius={[0,3,3,0]} name="Pending"   stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tasks by priority */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Tasks by Priority" subtitle="Distribution across priority levels" />
              <div className="p-5">
                {priorityData.length === 0 ? <EmptyChart h={180} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={priorityData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }: {name?:string;percent?:number}) => `${name??""}: ${((percent??0)*100).toFixed(0)}%`} labelLine={true}>
                        {priorityData.map((_, i) => (
                          <Cell key={i} fill={["#ef4444","#f97316","#f59e0b","#10b981"][i % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* KPI Summary */}
          {coKpis.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="KPI Summary" subtitle="Performance against targets" />
              <div className="p-5 grid grid-cols-3 gap-4">
                {[
                  { label: "On-Track",  value: onTrackKpis,  color: "text-green-700",  bg: "bg-green-50",  bar: "bg-green-500" },
                  { label: "At Risk",   value: atRiskKpis,   color: "text-yellow-700", bg: "bg-yellow-50", bar: "bg-yellow-500" },
                  { label: "Off-Track", value: offTrackKpis, color: "text-red-600",    bg: "bg-red-50",    bar: "bg-red-500" },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl p-4 ${item.bg} text-center`}>
                    <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.label}</p>
                    <p className="text-xs text-gray-400">{coKpis.length > 0 ? `${((item.value/coKpis.length)*100).toFixed(0)}% of KPIs` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
