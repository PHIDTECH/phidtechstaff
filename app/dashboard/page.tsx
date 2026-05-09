"use client";
export const dynamic = "force-dynamic";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/shared/StatCard";
import {
  Users, DollarSign, CheckSquare, AlertCircle,
  Calendar, ArrowRight, Building2, TrendingUp,
  BarChart3, ShoppingCart, Briefcase,
  ArrowLeftRight, Crown, UserCheck, Receipt, Clock, Banknote
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { usePermissionGuard } from "@/lib/usePermissionGuard";

const SESSION_KEY    = "phidtech_session";
const COMPANIES_KEY  = "phidtech_companies";
const ACTIVE_KEY     = "phidtech_active_company";
const USERS_KEY      = "phidtech_users";
const TASKS_KEY      = "phidtech_tasks";
const LEAVE_KEY      = "phidtech_leave";
const SALES_KEY      = "phidtech_accounting_sales";
const EXPENSES_KEY   = "phidtech_expenses";

const GROUP_ID = "group";
const GROUP_NAME = "PHIDTECH GROUP OF COMPANIES LIMITED";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = ""): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface Company { id: string; name: string; industry?: string; }
interface StaffUser { id: string; companyId: string; branchId?: string | null; status: string; name: string; role?: string; }
interface Branch { id: string; companyId: string; name: string; location: string; managerId: string; }
interface Task { id: string; companyId: string; status: string; title?: string; priority?: string; }
interface LeaveReq { id: string; companyId: string; status: string; userName?: string; employeeName?: string; staffName?: string; type?: string; days?: number; duration?: string; }
interface Sale { id: string; companyId: string; paid: number; amount: number; }
interface Expense { id: string; companyId: string; amount: number; status: string; }

export default function DashboardPage() {
  usePermissionGuard("dashboard");
  const [session, setSession] = useState<{name:string;isSuperAdmin:boolean;companyId:string|null;role?:string;position?:string;branchId?:string|null} | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [branches, setBranches]       = useState<Branch[]>([]);
  const [staffUsers, setStaffUsers]   = useState<StaffUser[]>([]);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [leaves, setLeaves]           = useState<LeaveReq[]>([]);
  const [sales, setSales]             = useState<Sale[]>([]);
  const [expenses, setExpenses]       = useState<Expense[]>([]);

  const reload = async () => {
    const sess = lsGet<{name:string;isSuperAdmin:boolean;companyId:string|null;role?:string;position?:string;branchId?:string|null}>(SESSION_KEY, null as never);
    setSession(sess);
    let cid = "";
    try { const raw = localStorage.getItem(ACTIVE_KEY); cid = raw && raw !== '""' ? raw.replace(/^"|"$/g, "") : ""; } catch {}
    setActiveCompanyId(cid);
    // Load all data in parallel for faster dashboard
    const safe = async <T,>(url: string, fallback: T): Promise<T> => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        return r.ok ? await r.json() : fallback;
      } catch { return fallback; }
    };
    const [companies, users, branches, taskList, leaveList, salesList, expList] = await Promise.all([
      safe<Company[]>("/api/companies", lsGet<Company[]>(COMPANIES_KEY, [])),
      safe<StaffUser[]>("/api/users", lsGet<StaffUser[]>(USERS_KEY, [])),
      safe<Branch[]>("/api/branches", []),
      safe<Task[]>("/api/tasks", lsGet<Task[]>(TASKS_KEY, [])),
      safe<LeaveReq[]>("/api/leave", lsGet<LeaveReq[]>(LEAVE_KEY, [])),
      safe<Sale[]>("/api/accounting/sales", lsGet<Sale[]>(SALES_KEY, [])),
      safe<Expense[]>("/api/expenses", lsGet<Expense[]>(EXPENSES_KEY, [])),
    ]);
    setCompanies(companies);
    try { localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies)); } catch {}
    setStaffUsers(users);
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch {}
    setBranches(branches);
    setTasks(taskList);
    setLeaves(leaveList);
    setSales(salesList);
    setExpenses(expList);
  };

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener("phidtech_companies_updated", onUpdate);
    window.addEventListener("phidtech_session_updated", onUpdate);
    return () => {
      window.removeEventListener("phidtech_companies_updated", onUpdate);
      window.removeEventListener("phidtech_session_updated", onUpdate);
    };
  }, []);

  const isSuperAdmin = session?.isSuperAdmin === true;
  // Group mode = superadmin with no/group active company, OR ANY group-role user
  const ALL_GROUP_ROLES = ["group_ceo","group_cfo","group_manager","group_controller","group_hr","group_auditor","group_legal","group_it","group_accountant"];
  const _dr = (session?.role ?? "").toLowerCase();
  const _dp = (session?.position ?? "").toLowerCase();
  const isGroupRole  = session?.companyId === GROUP_ID || ALL_GROUP_ROLES.includes(_dr) || ALL_GROUP_ROLES.includes(_dp);
  // Group HQ mode only when no specific company is selected — respects the company switcher for both SA and group staff
  const isGroupMode  = (isSuperAdmin || isGroupRole) && (!activeCompanyId || activeCompanyId === GROUP_ID);

  // Branch scope detection
  const GENERAL_ROLES_DASH = ["admin","accountant","hr","group_ceo","group_cfo","group_manager","group_controller","group_hr","group_it","group_auditor","group_legal","group_accountant"];
  const isBranchManagerDash = !!session && !session.isSuperAdmin && !!session.branchId &&
    !GENERAL_ROLES_DASH.includes(session.position ?? session.role ?? "");
  // General Manager = has no branchId, not superadmin, not group role — sees all branches of the company
  const isGeneralManagerDash = !!session && !session.isSuperAdmin && !isGroupRole &&
    !session.branchId && GENERAL_ROLES_DASH.includes(session.position ?? session.role ?? "");

  const firstName  = session?.name?.split(" ")[0] ?? "";
  const activeComp = companies.find(c => c.id === activeCompanyId);

  // Per-company stats for group dashboard
  const companyStats = companies.map(co => {
    const coStaff   = staffUsers.filter(u => u.companyId === co.id);
    const coSales   = sales.filter(s => s.companyId === co.id);
    const coExp     = expenses.filter(e => e.companyId === co.id && (e.status === "paid" || e.status === "approved"));
    const revenue   = coSales.reduce((s, e) => s + e.paid, 0);
    const expAmt    = coExp.reduce((s, e) => s + e.amount, 0);
    return {
      id: co.id, name: co.name, industry: co.industry ?? "—",
      staff: coStaff.length, activeStaff: coStaff.filter(u => u.status === "active").length,
      revenue, expenses: expAmt, profit: revenue - expAmt,
      tasks: tasks.filter(t => t.companyId === co.id).length,
      pendingLeave: leaves.filter(l => l.companyId === co.id && l.status === "pending").length,
    };
  });

  // Group-wide totals
  const groupStaff   = staffUsers.filter(u => u.companyId !== GROUP_ID).length;
  const groupRevenue = sales.reduce((s, e) => s + e.paid, 0);
  const groupExp     = expenses.filter(e => e.status === "paid" || e.status === "approved").reduce((s, e) => s + e.amount, 0);
  const groupProfit  = groupRevenue - groupExp;
  const groupTasks   = tasks.length;
  const groupLeave   = leaves.filter(l => l.status === "pending").length;
  const groupStaff_HQ = staffUsers.filter(u => u.companyId === GROUP_ID).length;

  // Single-company stats (branch-scoped when applicable)
  const allCoStaff = staffUsers.filter(u => u.companyId === activeCompanyId);
  const coStaff    = isBranchManagerDash && session?.branchId
    ? allCoStaff.filter(u => u.branchId === session.branchId)
    : allCoStaff;
  const coSales    = sales.filter(s => s.companyId === activeCompanyId);
  const coExp      = expenses.filter(e => e.companyId === activeCompanyId && (e.status === "paid" || e.status === "approved"));
  const coRevenue  = coSales.reduce((s, e) => s + e.paid, 0);
  const coExpAmt   = coExp.reduce((s, e) => s + e.amount, 0);
  const coProfit   = coRevenue - coExpAmt;
  const coTasks    = tasks.filter(t => t.companyId === activeCompanyId);
  const coLeave    = leaves.filter(l => l.companyId === activeCompanyId && l.status === "pending");

  // Branch overview data (for general managers)
  const companyBranches = branches.filter(b => b.companyId === activeCompanyId);
  const branchStats = companyBranches.map(b => ({
    ...b,
    staffCount: allCoStaff.filter(u => u.branchId === b.id).length,
    activeCount: allCoStaff.filter(u => u.branchId === b.id && u.status === "active").length,
  }));
  const headOfficeStaff = allCoStaff.filter(u => !u.branchId);

  // Current branch name for branch manager
  const myBranch = session?.branchId ? branches.find(b => b.id === session.branchId) : null;

  const switchToGroup = () => {
    try { localStorage.removeItem(ACTIVE_KEY); } catch {}
    setActiveCompanyId("");
    window.dispatchEvent(new Event("phidtech_companies_updated"));
  };

  const switchToCompany = (id: string) => {
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
    setActiveCompanyId(id);
    window.dispatchEvent(new Event("phidtech_companies_updated"));
  };

  // ── GROUP HQ DASHBOARD ────────────────────────────────────────────────────
  const totalGroupTasks = companyStats.reduce((s, c) => s + c.tasks, 0);
  const totalGroupLeaveP = companyStats.reduce((s, c) => s + c.pendingLeave, 0);

  if (isGroupMode) {
    const industryColors: Record<string, string> = {
      Technology: "from-blue-500 to-indigo-600",
      Finance: "from-emerald-500 to-teal-600",
      "Media and Broadcasting": "from-purple-500 to-pink-600",
      Healthcare: "from-red-500 to-rose-600",
      "ICT and Business Solutions": "from-cyan-500 to-blue-600",
      Manufacturing: "from-orange-500 to-amber-600",
      default: "from-gray-500 to-slate-600",
    };
    return (
      <MainLayout>
        {/* ── Hero Banner ── */}
        <div className="mb-6 rounded-2xl overflow-hidden relative bg-gradient-to-br from-[#0c1b5e] via-[#163087] to-[#0f2060] shadow-xl">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 50%, #fff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6ee7f7 0%, transparent 40%)"}} />
          <div className="relative px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg shrink-0">
                <Crown className="w-7 h-7 text-yellow-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">{GROUP_NAME}</h1>
                  <span className="text-[10px] px-2.5 py-0.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-full font-semibold tracking-wide">GROUP HQ</span>
                </div>
                <p className="text-blue-200 text-sm mt-0.5">{getGreeting()}{firstName ? `, ${firstName}` : ""} &mdash; {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isSuperAdmin && (
                <div className="text-xs bg-white/10 border border-white/20 text-blue-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-yellow-300" /> Super Admin &mdash; switch to manage a subsidiary
                </div>
              )}
              <Link href="/accounting/sales">
                <button className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5" /> New Sale
                </button>
              </Link>
            </div>
          </div>
          {/* Mini KPI strip */}
          <div className="relative grid grid-cols-3 sm:grid-cols-6 border-t border-white/10">
            {[
              { label: "Subsidiaries",   value: companies.length,              color: "text-blue-200" },
              { label: "Total Staff",    value: groupStaff,                    color: "text-white" },
              { label: "HQ Staff",       value: groupStaff_HQ,                 color: "text-indigo-200" },
              { label: "Group Revenue",  value: formatCurrency(groupRevenue),  color: "text-emerald-300" },
              { label: "Net P&L",        value: formatCurrency(groupProfit),   color: groupProfit >= 0 ? "text-green-300" : "text-red-300" },
              { label: "Pending Leave",  value: totalGroupLeaveP,              color: "text-orange-300" },
            ].map((k, i) => (
              <div key={i} className="px-5 py-3 border-r border-white/10 last:border-r-0 text-center">
                <p className={`text-base sm:text-lg font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-blue-300/70 uppercase tracking-wider mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Staff Reminder Banner ── */}
        <div className="mb-5 rounded-xl bg-yellow-50 border border-yellow-300 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 font-medium leading-relaxed">
            Ndugu wafanyakazi, pole na majukumu. Mnakumbusha kujaza <strong>maudhurio</strong> kila siku kuondoa usumbufu.
            Pia tujaze <strong>wateja</strong>, <strong>task</strong>, <strong>report za masoko</strong> na <strong>expenses</strong> kulingana na majukumu yako.
          </p>
        </div>

        {/* ── Main Grid: Companies (left) + Sidebar (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Subsidiary Cards - 2 cols */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-900">Subsidiary Companies</h2>
                <p className="text-xs text-gray-400">{companies.length} companies · Click Switch to manage</p>
              </div>
              {isSuperAdmin && (
                <Link href="/admin">
                  <Button size="sm" variant="outline" className="text-xs"><Building2 className="w-3.5 h-3.5 mr-1.5" />Manage</Button>
                </Link>
              )}
            </div>
            {companies.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">No subsidiary companies yet</p>
                {isSuperAdmin && <Link href="/admin"><Button size="sm" className="mt-3">Add Company</Button></Link>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companyStats.map(co => {
                  const grad = industryColors[co.industry ?? ""] ?? industryColors.default;
                  return (
                    <div key={co.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                      {/* Colored top band */}
                      <div className={`bg-gradient-to-r ${grad} px-5 py-3.5 flex items-center justify-between`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {co.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm leading-tight line-clamp-1">{co.name}</p>
                            <p className="text-white/70 text-[10px]">{co.industry ?? "—"}</p>
                          </div>
                        </div>
                        {isSuperAdmin && (
                          <button onClick={() => switchToCompany(co.id)}
                            className="shrink-0 text-[11px] bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg px-2.5 py-1 font-medium flex items-center gap-1 transition-colors">
                            <ArrowLeftRight className="w-3 h-3" />Switch
                          </button>
                        )}
                      </div>
                      {/* Metrics */}
                      <div className="grid grid-cols-3 divide-x divide-gray-100">
                        <div className="px-4 py-3 text-center">
                          <p className="text-lg font-bold text-gray-900">{co.staff}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Staff</p>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <p className="text-sm font-bold text-emerald-700">{formatCurrency(co.revenue)}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Revenue</p>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <p className={`text-sm font-bold ${co.profit >= 0 ? "text-blue-700" : "text-red-500"}`}>{formatCurrency(co.profit)}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Profit</p>
                        </div>
                      </div>
                      {/* Footer badges */}
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-gray-500"><CheckSquare className="w-3 h-3" />{co.tasks} tasks</span>
                        <span className="flex items-center gap-1 text-orange-500"><Calendar className="w-3 h-3" />{co.pendingLeave} leave</span>
                        <span className="flex items-center gap-1 text-green-600 ml-auto font-medium">● {co.activeStaff} active</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Group Summary Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Group Financial Summary</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Total Revenue",  value: formatCurrency(groupRevenue), color: "text-emerald-600" },
                  { label: "Total Expenses", value: formatCurrency(groupExp),     color: "text-red-500" },
                  { label: "Net Profit",     value: formatCurrency(groupProfit),  color: groupProfit >= 0 ? "text-blue-700 font-bold" : "text-red-600 font-bold" },
                  { label: "Open Tasks",     value: String(totalGroupTasks),      color: "text-purple-600" },
                  { label: "Pending Leave",  value: String(totalGroupLeaveP),     color: "text-orange-500" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-xs text-gray-500">{row.label}</p>
                    <p className={`text-sm ${row.color}`}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Group HQ Staff */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Group HQ Staff</p>
                <Link href="/users"><button className="text-xs text-blue-600 hover:underline">View all</button></Link>
              </div>
              {staffUsers.filter(u => u.companyId === GROUP_ID).length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2 text-center">
                  <UserCheck className="w-7 h-7 text-gray-200" />
                  <p className="text-xs text-gray-400">No HQ staff yet</p>
                  <Link href="/users"><Button size="sm" variant="outline" className="text-xs h-7">Add Staff</Button></Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {staffUsers.filter(u => u.companyId === GROUP_ID).slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center gap-2.5 px-4 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{u.name.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{(u.role ?? "staff").replace(/_/g, " ")}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{u.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Users",        href: "/users",            icon: Users,       bg: "bg-blue-50",   ic: "text-blue-600" },
                  { label: "Accounting",   href: "/accounting",       icon: BarChart3,   bg: "bg-green-50",  ic: "text-green-600" },
                  { label: "Tasks",        href: "/tasks",            icon: CheckSquare, bg: "bg-purple-50", ic: "text-purple-600" },
                  { label: "Leave",        href: "/leave",            icon: Calendar,    bg: "bg-orange-50", ic: "text-orange-500" },
                  { label: "Sales",        href: "/accounting/sales", icon: ShoppingCart,bg: "bg-emerald-50",ic: "text-emerald-600" },
                  { label: "Admin",        href: "/admin",            icon: Building2,   bg: "bg-red-50",    ic: "text-red-500" },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label} href={item.href}>
                      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.bg}`}>
                          <Icon className={`w-3.5 h-3.5 ${item.ic}`} />
                        </div>
                        <p className="text-xs font-medium text-gray-700">{item.label}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── SINGLE COMPANY DASHBOARD ──────────────────────────────────────────────
  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isBranchManagerDash ? "bg-purple-600" : "bg-blue-600"}`}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {getGreeting()}{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="text-sm text-gray-500">
                {activeComp?.name || "No company selected"}
                {isBranchManagerDash && myBranch && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold">
                    {myBranch.name} Branch
                  </span>
                )}
                {isGeneralManagerDash && companyBranches.length > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                    {companyBranches.length} Branches
                  </span>
                )}
                {" · "}{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          {isSuperAdmin && (
            <Button size="sm" variant="outline" onClick={switchToGroup}>
              <Crown className="w-4 h-4 mr-2 text-indigo-600" />Back to Group HQ
            </Button>
          )}
        </div>
      </div>

      {/* ── Staff Reminder Banner ── */}
      <div className="mb-5 rounded-xl bg-yellow-50 border border-yellow-300 px-4 py-3 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800 font-medium leading-relaxed">
          Ndugu wafanyakazi, pole na majukumu. Mnakumbusha kujaza <strong>maudhurio</strong> kila siku kuondoa usumbufu.
          Pia tujaze <strong>wateja</strong>, <strong>task</strong>, <strong>report za masoko</strong> na <strong>expenses</strong> kulingana na majukumu yako.
        </p>
      </div>

      {/* Stats Grid */}
      {(() => {
        const pendingExp   = expenses.filter(e => e.companyId === activeCompanyId && e.status === "pending").length;
        const pendingExpAmt= expenses.filter(e => e.companyId === activeCompanyId && e.status === "pending").reduce((s,e) => s + e.amount, 0);
        const openTasks    = coTasks.filter(t => t.status === "pending" || t.status === "in-progress").length;
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <StatCard
                title={isBranchManagerDash ? "Branch Staff" : "Total Staff"}
                value={coStaff.length}
                icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50"
                subtitle={isBranchManagerDash ? (myBranch?.name ?? "Your branch") : `${coStaff.filter(u => u.status === "active").length} active`}
              />
              <StatCard title="Revenue"           value={formatCurrency(coRevenue)}    icon={TrendingUp}  iconColor="text-emerald-600" iconBg="bg-emerald-50" subtitle={`Profit: ${formatCurrency(coProfit)}`} />
              <StatCard title="Pending Expenses"  value={pendingExp}                   icon={Receipt}     iconColor="text-red-600"     iconBg="bg-red-50"     subtitle={formatCurrency(pendingExpAmt)} />
              <StatCard title="Open Tasks"        value={openTasks}                    icon={CheckSquare} iconColor="text-purple-600" iconBg="bg-purple-50"  subtitle={`${coLeave.length} leave pending`} />
            </div>
            {/* Pending Approvals Alert Strip */}
            {(pendingExp > 0 || coLeave.length > 0) && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-semibold text-amber-800">Pending Approvals</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {pendingExp > 0 && (
                    <Link href="/expenses">
                      <span className="inline-flex items-center gap-1.5 bg-white border border-amber-200 text-amber-800 rounded-lg px-3 py-1.5 font-medium hover:bg-amber-100 transition-colors">
                        <Receipt className="w-3.5 h-3.5" /> {pendingExp} Expense Claim{pendingExp !== 1 ? "s" : ""} ({formatCurrency(pendingExpAmt)})
                      </span>
                    </Link>
                  )}
                  {coLeave.length > 0 && (
                    <Link href="/leave">
                      <span className="inline-flex items-center gap-1.5 bg-white border border-amber-200 text-amber-800 rounded-lg px-3 py-1.5 font-medium hover:bg-amber-100 transition-colors">
                        <Calendar className="w-3.5 h-3.5" /> {coLeave.length} Leave Request{coLeave.length !== 1 ? "s" : ""}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Branch Overview — visible to General Managers (not branch-scoped) */}
      {isGeneralManagerDash && companyBranches.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-gray-900 text-base">Branch Performance Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {branchStats.map(b => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.location}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-gray-900">{b.staffCount}</p>
                    <p className="text-xs text-gray-500">Total Staff</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-green-700">{b.activeCount}</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                </div>
              </div>
            ))}
            {headOfficeStaff.length > 0 && (
              <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Head Office</p>
                    <p className="text-xs text-gray-400">No branch assigned</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-gray-900">{headOfficeStaff.length}</p>
                    <p className="text-xs text-gray-500">Total Staff</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-green-700">{headOfficeStaff.filter(u => u.status === "active").length}</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Financial Summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Financial Summary</p>
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Revenue</span><span className="font-semibold text-emerald-700">{formatCurrency(coRevenue)}</span></div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{width: coRevenue > 0 ? "100%" : "0%"}} /></div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Expenses</span><span className="font-semibold text-red-500">{formatCurrency(coExpAmt)}</span></div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{width: coRevenue > 0 ? `${Math.min(100, Math.round((coExpAmt/coRevenue)*100))}%` : "0%"}} /></div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Net Profit</span>
              <span className={`text-lg font-bold ${coProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(coProfit)}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{coProfit >= 0 ? "Profitable" : "Loss"} · Revenue minus expenses</p>
          </div>
          <Link href="/accounting/sales">
            <button className="w-full mt-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg px-3 py-2 font-medium transition-colors flex items-center justify-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" /> Record New Sale
            </button>
          </Link>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Recent Tasks</p>
            <Link href="/tasks"><button className="text-xs text-blue-600 hover:underline">View all</button></Link>
          </div>
          {coTasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-center">
              <CheckSquare className="w-7 h-7 text-gray-200" />
              <p className="text-xs text-gray-400">No tasks yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {coTasks.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.status === "completed" ? "bg-green-500" : t.status === "in-progress" ? "bg-blue-500" : t.status === "cancelled" ? "bg-gray-400" : "bg-yellow-400"}`} />
                  <p className="text-xs text-gray-800 flex-1 truncate">{t.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t.priority === "critical" ? "bg-red-100 text-red-700" : t.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>{t.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Leave */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Pending Leave</p>
            <Link href="/leave"><button className="text-xs text-blue-600 hover:underline">View all</button></Link>
          </div>
          {coLeave.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-center">
              <Calendar className="w-7 h-7 text-gray-200" />
              <p className="text-xs text-gray-400">No pending leave requests</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {coLeave.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-orange-600">{(l.userName ?? "?").charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{l.userName ?? "—"}</p>
                    <p className="text-[10px] text-gray-400">{l.type} · {l.days ?? "—"} days</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: "Staff",      href: "/users",            icon: Users,       bg: "bg-blue-50",    ic: "text-blue-600" },
          { label: "Attendance", href: "/attendance",       icon: Clock,       bg: "bg-green-50",   ic: "text-green-600" },
          { label: "Leave",      href: "/leave",            icon: Calendar,    bg: "bg-yellow-50",  ic: "text-yellow-600" },
          { label: "Expenses",   href: "/expenses",         icon: Receipt,     bg: "bg-red-50",     ic: "text-red-500" },
          { label: "Payroll",    href: "/payroll",          icon: DollarSign,  bg: "bg-purple-50",  ic: "text-purple-600" },
          { label: "Tasks",      href: "/tasks",            icon: CheckSquare, bg: "bg-indigo-50",  ic: "text-indigo-600" },
          { label: "Sales",      href: "/accounting/sales", icon: ShoppingCart,bg: "bg-emerald-50", ic: "text-emerald-600" },
          { label: "Customers",  href: "/customers",        icon: UserCheck,   bg: "bg-teal-50",    ic: "text-teal-600" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-1.5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer text-center">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${item.ic}`} />
                </div>
                <p className="text-[11px] font-medium text-gray-700">{item.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

    </MainLayout>
  );
}
