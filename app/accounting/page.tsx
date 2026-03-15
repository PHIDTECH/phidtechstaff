"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen, TrendingUp, TrendingDown, DollarSign, BarChart3,
  ShoppingCart, ArrowRight, CreditCard, Activity,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

const SESSION_KEY  = "phidtech_session";
const ACTIVE_KEY   = "phidtech_active_company";
const SALES_KEY    = "phidtech_accounting_sales";
const EXP_KEY      = "phidtech_expenses";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface SaleEntry { id: string; companyId: string; date: string; customerId: string; customerName: string; amount: number; paid: number; status: "paid"|"partial"|"unpaid"; }
interface ExpenseEntry { id: string; companyId: string; amount: number; status: string; submittedAt: string; }

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}
function dayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const ACCENT = ["#3b82f6","#10b981","#f97316","#8b5cf6","#ec4899","#06b6d4","#f59e0b","#14b8a6","#6366f1","#84cc16","#f43f5e","#22d3ee"];

export default function AccountingPage() {
  usePermissionGuard("accounting");
  const [sales, setSales]           = useState<SaleEntry[]>([]);
  const [expenses, setExpenses]     = useState<ExpenseEntry[]>([]);
  const [cid, setCid]               = useState("");
  const cidRef                      = useRef("");
  const [period, setPeriod]         = useState<"daily"|"monthly"|"yearly">("monthly");

  useEffect(() => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const c    = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setCid(c); cidRef.current = c;
    setSales(lsGet<SaleEntry[]>(SALES_KEY, []));
    setExpenses(lsGet<ExpenseEntry[]>(EXP_KEY, []));
  }, []);

  const co = cidRef.current || cid;
  const coSales = co ? sales.filter(s => s.companyId === co) : sales;
  const coExp   = co ? expenses.filter(e => e.companyId === co) : expenses;

  const today     = new Date().toISOString().slice(0,10);
  const thisMonth = today.slice(0,7);
  const thisYear  = today.slice(0,4);

  const totalRevenue   = coSales.reduce((s,e) => s + e.amount, 0);
  const totalPaid      = coSales.reduce((s,e) => s + e.paid, 0);
  const totalUnpaid    = totalRevenue - totalPaid;
  const totalExpAmt    = coExp.filter(e => e.status === "paid" || e.status === "approved").reduce((s,e) => s + e.amount, 0);
  const netProfit      = totalPaid - totalExpAmt;

  const dailySales    = coSales.filter(s => s.date === today).reduce((s,e) => s + e.amount, 0);
  const monthlySales  = coSales.filter(s => s.date.startsWith(thisMonth)).reduce((s,e) => s + e.amount, 0);
  const yearlySales   = coSales.filter(s => s.date.startsWith(thisYear)).reduce((s,e) => s + e.amount, 0);

  // Build chart data
  const buildChart = () => {
    if (period === "daily") {
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        const ds = d.toISOString().slice(0,10);
        const rev = coSales.filter(s => s.date === ds).reduce((s,e) => s + e.amount, 0);
        const exp = coExp.filter(e => e.submittedAt?.slice(0,10) === ds && (e.status==="paid"||e.status==="approved")).reduce((s,e) => s + e.amount, 0);
        return { label: dayLabel(ds), revenue: rev, expenses: exp, profit: rev - exp };
      });
      return days;
    }
    if (period === "monthly") {
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
        const ms = d.toISOString().slice(0,7);
        const rev = coSales.filter(s => s.date.startsWith(ms)).reduce((s,e) => s + e.amount, 0);
        const exp = coExp.filter(e => e.submittedAt?.startsWith(ms) && (e.status==="paid"||e.status==="approved")).reduce((s,e) => s + e.amount, 0);
        return { label: d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"}), revenue: rev, expenses: exp, profit: rev - exp };
      });
      return months;
    }
    // yearly: last 5 years
    const years = Array.from({ length: 5 }, (_, i) => {
      const yr = (new Date().getFullYear() - (4 - i)).toString();
      const rev = coSales.filter(s => s.date.startsWith(yr)).reduce((s,e) => s + e.amount, 0);
      const exp = coExp.filter(e => e.submittedAt?.startsWith(yr) && (e.status==="paid"||e.status==="approved")).reduce((s,e) => s + e.amount, 0);
      return { label: yr, revenue: rev, expenses: exp, profit: rev - exp };
    });
    return years;
  };

  const chartData = buildChart();

  // Recent sales
  const recentSales = [...coSales].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);

  const statusColors: Record<string,string> = {
    paid:    "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    unpaid:  "bg-red-100 text-red-800",
  };

  const nav = [
    { href: "/accounting/sales",         label: "Customer Sales",     icon: ShoppingCart, color: "bg-blue-50 text-blue-700 border-blue-200" },
    { href: "/accounting/profit-loss",   label: "Profit & Loss",      icon: TrendingUp,   color: "bg-green-50 text-green-700 border-green-200" },
    { href: "/accounting/balance-sheet", label: "Balance Sheet",      icon: BarChart3,    color: "bg-purple-50 text-purple-700 border-purple-200" },
    { href: "/accounting/cashflow",      label: "Cash Flow",          icon: Activity,     color: "bg-orange-50 text-orange-700 border-orange-200" },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Accounting Dashboard"
        subtitle="Financial overview — revenue, profit & loss, cash position"
        icon={BookOpen}
        actions={
          <Link href="/accounting/sales">
            <Button size="sm"><ShoppingCart className="w-4 h-4 mr-2" />New Sale</Button>
          </Link>
        }
      />

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {nav.map(n => {
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href}>
              <div className={`flex items-center gap-3 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${n.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{n.label}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today&apos;s Sales"  value={formatCurrency(dailySales)}   icon={DollarSign}   iconBg="bg-blue-50"   iconColor="text-blue-600"   subtitle="Revenue" />
        <StatCard title="Monthly Revenue" value={formatCurrency(monthlySales)} icon={TrendingUp}   iconBg="bg-green-50"  iconColor="text-green-600"  subtitle="This month" />
        <StatCard title="Yearly Revenue"  value={formatCurrency(yearlySales)}  icon={BarChart3}    iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="This year" />
        <StatCard title="Net Profit (All)" value={formatCurrency(netProfit)}   icon={CreditCard}   iconBg={netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"} iconColor={netProfit >= 0 ? "text-emerald-600" : "text-red-600"} subtitle="Collected − Expenses" />
      </div>

      {/* Revenue vs Expenses chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-semibold text-gray-900">Revenue vs Expenses</h3>
            <p className="text-xs text-gray-400">Profit = Revenue − Expenses</p>
          </div>
          <Select value={period} onValueChange={v => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Last 14 Days</SelectItem>
              <SelectItem value="monthly">Last 12 Months</SelectItem>
              <SelectItem value="yearly">Last 5 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {chartData.every(d => d.revenue === 0 && d.expenses === 0) ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
            <BarChart3 className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">No financial data yet. Add customer sales to see charts.</p>
            <Link href="/accounting/sales"><Button size="sm" variant="outline">Add Sale</Button></Link>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
              <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="revenue"  fill="#3b82f6" radius={[4,4,0,0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#f97316" radius={[4,4,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Profit trend + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Profit line */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Profit Trend</h3>
          <p className="text-xs text-gray-400 mb-4">Net profit over time</p>
          {chartData.every(d => d.profit === 0) ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profitGrad)" strokeWidth={2} name="Net Profit" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary box */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-900">Financial Summary</h3>
          {[
            { label: "Total Revenue",      value: totalRevenue,  color: "text-blue-700" },
            { label: "Total Collected",    value: totalPaid,     color: "text-green-700" },
            { label: "Outstanding (Unpaid)", value: totalUnpaid, color: "text-red-600" },
            { label: "Total Expenses",     value: totalExpAmt,   color: "text-orange-600" },
            { label: "Net Profit",         value: netProfit,     color: netProfit >= 0 ? "text-emerald-700" : "text-red-600" },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-600">{r.label}</span>
              <span className={`font-bold text-sm ${r.color}`}>{formatCurrency(r.value)}</span>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Link href="/accounting/profit-loss" className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs">P&amp;L Report</Button>
            </Link>
            <Link href="/accounting/balance-sheet" className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs">Balance Sheet</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Sales</h3>
          <Link href="/accounting/sales"><Button variant="ghost" size="sm" className="text-blue-600 text-xs">View All <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
        </div>
        {recentSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">No sales recorded yet.</p>
            <Link href="/accounting/sales"><Button size="sm">Record Sale</Button></Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentSales.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {(s.customerName||"?").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.customerName || "—"}</p>
                    <p className="text-xs text-gray-400">{s.date}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[s.status]}`}>{s.status}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(s.amount)}</p>
                    <p className="text-xs text-green-600">Paid: {formatCurrency(s.paid)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
