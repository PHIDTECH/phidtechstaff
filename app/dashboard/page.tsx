"use client";
export const dynamic = "force-dynamic";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/shared/StatCard";
import {
  Users, DollarSign, CheckSquare, AlertCircle,
  Calendar, ArrowRight, Building2, TrendingUp,
  Globe, BarChart3, ShoppingCart, Briefcase,
  ArrowLeftRight, Crown, UserCheck
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

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
interface StaffUser { id: string; companyId: string; status: string; name: string; role?: string; }
interface Task { id: string; companyId: string; status: string; }
interface LeaveReq { id: string; companyId: string; status: string; }
interface Sale { id: string; companyId: string; paid: number; amount: number; }
interface Expense { id: string; companyId: string; amount: number; status: string; }

export default function DashboardPage() {
  const [session, setSession] = useState<{name:string;isSuperAdmin:boolean;companyId:string|null;role?:string} | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [staffUsers, setStaffUsers]   = useState<StaffUser[]>([]);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [leaves, setLeaves]           = useState<LeaveReq[]>([]);
  const [sales, setSales]             = useState<Sale[]>([]);
  const [expenses, setExpenses]       = useState<Expense[]>([]);

  const reload = () => {
    const sess = lsGet<{name:string;isSuperAdmin:boolean;companyId:string|null;role?:string}>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = lsStr(ACTIVE_KEY);
    setActiveCompanyId(cid);
    setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
    setStaffUsers(lsGet<StaffUser[]>(USERS_KEY, []));
    setTasks(lsGet<Task[]>(TASKS_KEY, []));
    setLeaves(lsGet<LeaveReq[]>(LEAVE_KEY, []));
    setSales(lsGet<Sale[]>(SALES_KEY, []));
    setExpenses(lsGet<Expense[]>(EXPENSES_KEY, []));
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
  // Group mode = superadmin with no active company, OR group-role user
  const isGroupRole  = session?.role === "group_manager" || session?.role === "group_controller";
  const isGroupMode  = (isSuperAdmin && !activeCompanyId) || isGroupRole;

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

  // Single-company stats
  const coStaff    = staffUsers.filter(u => u.companyId === activeCompanyId);
  const coSales    = sales.filter(s => s.companyId === activeCompanyId);
  const coExp      = expenses.filter(e => e.companyId === activeCompanyId && (e.status === "paid" || e.status === "approved"));
  const coRevenue  = coSales.reduce((s, e) => s + e.paid, 0);
  const coExpAmt   = coExp.reduce((s, e) => s + e.amount, 0);
  const coProfit   = coRevenue - coExpAmt;
  const coTasks    = tasks.filter(t => t.companyId === activeCompanyId);
  const coLeave    = leaves.filter(l => l.companyId === activeCompanyId && l.status === "pending");

  const switchToGroup = () => {
    lsSet(ACTIVE_KEY, "");
    setActiveCompanyId("");
    window.dispatchEvent(new Event("phidtech_companies_updated"));
  };

  const switchToCompany = (id: string) => {
    lsSet(ACTIVE_KEY, id);
    setActiveCompanyId(id);
    window.dispatchEvent(new Event("phidtech_companies_updated"));
  };

  // ── GROUP HQ DASHBOARD ────────────────────────────────────────────────────
  if (isGroupMode) {
    return (
      <MainLayout>
        {/* Group Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center shadow-md">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{GROUP_NAME}</h1>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">Group HQ</span>
                </div>
                <p className="text-sm text-gray-500">
                  {getGreeting()}{firstName ? `, ${firstName}` : ""} · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            {isSuperAdmin && (
              <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                👑 Super Admin · Switch to a company to manage it
              </div>
            )}
          </div>
        </div>

        {/* Group KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Companies</p>
            <p className="text-2xl font-bold text-blue-700">{companies.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Subsidiaries</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Total Staff</p>
            <p className="text-2xl font-bold text-gray-900">{groupStaff}</p>
            <p className="text-xs text-gray-400 mt-0.5">All companies</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Group HQ Staff</p>
            <p className="text-2xl font-bold text-indigo-700">{groupStaff_HQ}</p>
            <p className="text-xs text-gray-400 mt-0.5">Group controllers</p>
          </div>
          <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Group Revenue</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(groupRevenue)}</p>
            <p className="text-xs text-gray-400 mt-0.5">All collected</p>
          </div>
          <div className={`bg-white rounded-xl border shadow-sm p-4 ${groupProfit >= 0 ? "border-emerald-100" : "border-red-100"}`}>
            <p className="text-xs text-gray-500">Group Profit</p>
            <p className={`text-lg font-bold ${groupProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(groupProfit)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Net P&amp;L</p>
          </div>
          <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Pending Leave</p>
            <p className="text-2xl font-bold text-orange-600">{groupLeave}</p>
            <p className="text-xs text-gray-400 mt-0.5">Needs approval</p>
          </div>
        </div>

        {/* Company Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-base">Subsidiary Companies</h2>
            {isSuperAdmin && (
              <Link href="/admin">
                <Button size="sm" variant="outline"><Building2 className="w-4 h-4 mr-2" />Manage Companies</Button>
              </Link>
            )}
          </div>
          {companies.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No subsidiary companies yet</p>
              {isSuperAdmin && <Link href="/admin"><Button size="sm" className="mt-3">Add Company</Button></Link>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {companyStats.map(co => (
                <div key={co.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Company header */}
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {co.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{co.name}</p>
                        <p className="text-xs text-gray-400">{co.industry}</p>
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2.5" onClick={() => switchToCompany(co.id)}>
                        <ArrowLeftRight className="w-3 h-3 mr-1.5" />Switch
                      </Button>
                    )}
                  </div>
                  {/* Metrics */}
                  <div className="px-5 py-3 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{co.staff}</p>
                      <p className="text-xs text-gray-400">Staff</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-700">{formatCurrency(co.revenue)}</p>
                      <p className="text-xs text-gray-400">Revenue</p>
                    </div>
                    <div className={`text-center`}>
                      <p className={`text-lg font-bold ${co.profit >= 0 ? "text-emerald-700" : "text-red-500"}`}>{formatCurrency(co.profit)}</p>
                      <p className="text-xs text-gray-400">Profit</p>
                    </div>
                  </div>
                  <div className="px-5 py-2 bg-gray-50 flex justify-between text-xs text-gray-500">
                    <span>📋 {co.tasks} tasks</span>
                    <span>📅 {co.pendingLeave} pending leave</span>
                    <span className="text-green-600 font-medium">✓ {co.activeStaff} active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group HQ Staff + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Group HQ Staff */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Group HQ Staff</h3>
                <p className="text-xs text-gray-400">Managers &amp; controllers across all subsidiaries</p>
              </div>
              <Link href="/users"><Button size="sm" variant="ghost" className="text-xs">View All</Button></Link>
            </div>
            {staffUsers.filter(u => u.companyId === GROUP_ID).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <UserCheck className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">No Group HQ staff yet</p>
                <Link href="/users"><Button size="sm" variant="outline" className="text-xs">Add Group Staff</Button></Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {staffUsers.filter(u => u.companyId === GROUP_ID).slice(0, 6).map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{(u.role ?? "staff").replace("_", " ")}</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{u.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Group Controls</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Users & Roles",       href: "/users",       icon: Users,       color: "blue" },
                { label: "Accounting",           href: "/accounting",  icon: BarChart3,   color: "green" },
                { label: "All Tasks",            href: "/tasks",       icon: CheckSquare, color: "purple" },
                { label: "Leave Requests",       href: "/leave",       icon: Calendar,    color: "orange" },
                { label: "Sales Reports",        href: "/accounting/sales", icon: ShoppingCart, color: "teal" },
                { label: "Admin Panel",          href: "/admin",       icon: Building2,   color: "red" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={item.href}>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${item.color}-50`}>
                        <Icon className={`w-4 h-4 text-${item.color}-600`} />
                      </div>
                      <p className="text-xs font-medium text-gray-700">{item.label}</p>
                    </div>
                  </Link>
                );
              })}
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
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {getGreeting()}{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="text-sm text-gray-500">{activeComp?.name || "No company selected"} · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          {isSuperAdmin && (
            <Button size="sm" variant="outline" onClick={switchToGroup}>
              <Crown className="w-4 h-4 mr-2 text-indigo-600" />Back to Group HQ
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Staff"     value={coStaff.length}                                       icon={Users}       iconColor="text-blue-600"   iconBg="bg-blue-50"   subtitle="Registered employees" />
        <StatCard title="Active Staff"    value={coStaff.filter(u => u.status === "active").length}    icon={UserCheck}   iconColor="text-green-600"  iconBg="bg-green-50"  subtitle="Currently active" />
        <StatCard title="Revenue"         value={formatCurrency(coRevenue)}                            icon={TrendingUp}  iconColor="text-purple-600" iconBg="bg-purple-50" subtitle="Collected" />
        <StatCard title="Pending Leave"   value={coLeave.length}                                       icon={Calendar}    iconColor="text-orange-600" iconBg="bg-orange-50" subtitle="Needs approval" />
      </div>

      {/* Financial row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Revenue</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(coRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Total collected payments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Expenses</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(coExpAmt)}</p>
          <p className="text-xs text-gray-400 mt-1">Approved &amp; paid out</p>
        </div>
        <div className={`bg-white rounded-xl border shadow-sm p-5 ${coProfit >= 0 ? "border-green-100" : "border-red-100"}`}>
          <p className="text-xs text-gray-500 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${coProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(coProfit)}</p>
          <p className="text-xs text-gray-400 mt-1">Revenue minus expenses</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Users & Roles",    href: "/users",      icon: Users,       color: "blue" },
          { label: "Attendance",       href: "/attendance", icon: CheckSquare, color: "green" },
          { label: "Leave Management", href: "/leave",      icon: Calendar,    color: "yellow" },
          { label: "Payroll & Salary", href: "/payroll",    icon: DollarSign,  color: "purple" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${item.color}-50`}>
                  <Icon className={`w-5 h-5 text-${item.color}-600`} />
                </div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Switch company (superadmin only) */}
      {isSuperAdmin && companies.length > 1 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-semibold text-indigo-900">Switch to another subsidiary</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {companies.filter(c => c.id !== activeCompanyId).map(c => (
              <Button key={c.id} size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-100" onClick={() => switchToCompany(c.id)}>
                <ArrowLeftRight className="w-3 h-3 mr-1.5" />{c.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
