"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";

const SESSION_KEY = "phidtech_session";
const ACTIVE_KEY  = "phidtech_active_company";
const SALES_KEY   = "phidtech_accounting_sales";
const EXP_KEY     = "phidtech_expenses";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; isSuperAdmin: boolean; companyId: string; }
interface Sale { id: string; companyId: string; date: string; amount: number; paid: number; subtotal: number; tax: number; }
interface Expense { id: string; companyId: string; amount: number; category: string; status: string; submittedAt: string; }

type Period = "daily" | "weekly" | "monthly" | "yearly";

function buildRows(sales: Sale[], expenses: Expense[], period: Period) {
  const now = new Date();
  let count = 0;
  let getKey: (d: Date) => string;
  let getLabel: (k: string) => string;

  if (period === "daily") {
    count = 14;
    getKey   = (d) => d.toISOString().slice(0, 10);
    getLabel = (k) => new Date(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } else if (period === "weekly") {
    count = 8;
    getKey = (d) => {
      const s = new Date(d); s.setDate(s.getDate() - s.getDay());
      return s.toISOString().slice(0, 10);
    };
    getLabel = (k) => `Wk ${new Date(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  } else if (period === "monthly") {
    count = 12;
    getKey   = (d) => d.toISOString().slice(0, 7);
    getLabel = (k) => new Date(k + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  } else {
    count = 5;
    getKey   = (d) => d.getFullYear().toString();
    getLabel = (k) => k;
  }

  // Generate keys for the last N periods
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (period === "daily")   d.setDate(d.getDate() - i);
    else if (period === "weekly") d.setDate(d.getDate() - i * 7);
    else if (period === "monthly") d.setMonth(d.getMonth() - i);
    else d.setFullYear(d.getFullYear() - i);
    const k = getKey(d);
    if (!keys.includes(k)) keys.push(k);
  }

  return keys.map(k => {
    const rev = sales.filter(s => {
      const sk = period === "daily"   ? s.date :
                 period === "weekly"  ? getKey(new Date(s.date)) :
                 period === "monthly" ? s.date.slice(0, 7) : s.date.slice(0, 4);
      return sk === k;
    }).reduce((acc, s) => acc + s.paid, 0);

    const exp = expenses.filter(e => {
      const ek = period === "daily"   ? (e.submittedAt || "").slice(0, 10) :
                 period === "weekly"  ? getKey(new Date((e.submittedAt || "").slice(0, 10))) :
                 period === "monthly" ? (e.submittedAt || "").slice(0, 7) : (e.submittedAt || "").slice(0, 4);
      return ek === k && (e.status === "paid" || e.status === "approved");
    }).reduce((acc, e) => acc + e.amount, 0);

    return { label: getLabel(k), revenue: rev, expenses: exp, profit: rev - exp };
  });
}

export default function ProfitLossPage() {
  const [sales, setSales]       = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cid, setCid]           = useState("");
  const cidRef                  = useRef("");
  const [period, setPeriod]     = useState<Period>("monthly");

  useEffect(() => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const c    = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setCid(c); cidRef.current = c;
    setSales(lsGet<Sale[]>(SALES_KEY, []));
    setExpenses(lsGet<Expense[]>(EXP_KEY, []));
  }, []);

  const co    = cidRef.current || cid;
  const coS   = co ? sales.filter(s => s.companyId === co) : sales;
  const coE   = co ? expenses.filter(e => e.companyId === co) : expenses;

  const rows  = buildRows(coS, coE, period);

  const totalRev = coS.reduce((s, e) => s + e.paid, 0);
  const totalExp = coE.filter(e => e.status === "paid" || e.status === "approved").reduce((s,e) => s + e.amount, 0);
  const grossProfit = coS.reduce((s, e) => s + (e.subtotal ?? e.paid), 0);
  const taxTotal    = coS.reduce((s, e) => s + (e.tax ?? 0), 0);
  const netProfit   = totalRev - totalExp;
  const margin      = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : "0.0";

  // Category breakdown for expenses
  const expByCategory: Record<string, number> = {};
  coE.filter(e => e.status === "paid" || e.status === "approved").forEach(e => {
    expByCategory[e.category] = (expByCategory[e.category] ?? 0) + e.amount;
  });
  const expCategories = Object.entries(expByCategory).sort((a,b) => b[1]-a[1]);

  const periodLabel = period === "daily" ? "Last 14 Days" : period === "weekly" ? "Last 8 Weeks" : period === "monthly" ? "Last 12 Months" : "Last 5 Years";

  return (
    <MainLayout>
      <PageHeader
        title="Profit & Loss"
        subtitle="Income, expenses and net profit — daily, weekly, monthly, yearly"
        icon={TrendingUp}
        actions={
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalRev)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-green-600"><ArrowUpRight className="w-3 h-3" />Collected</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExp)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-red-500"><ArrowDownRight className="w-3 h-3" />Approved/Paid</div>
        </div>
        <div className={`bg-white rounded-xl border shadow-sm p-5 ${netProfit >= 0 ? "border-green-200" : "border-red-200"}`}>
          <p className="text-xs text-gray-500 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(netProfit)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">Margin: {margin}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Tax Collected</p>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(taxTotal)}</p>
          <div className="text-xs text-gray-400 mt-1">18% VAT on sales</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">P&amp;L Overview — {periodLabel}</h3>
            <p className="text-xs text-gray-400">Revenue vs Expenses vs Net Profit</p>
          </div>
        </div>
        {rows.every(r => r.revenue === 0 && r.expenses === 0) ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">No data for this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="revenue"  fill="#3b82f6" radius={[4,4,0,0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#f97316" radius={[4,4,0,0]} name="Expenses" />
              <Bar dataKey="profit"   fill="#10b981" radius={[4,4,0,0]} name="Net Profit" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P&L Statement */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
            <h3 className="font-bold text-gray-900">Income Statement</h3>
            <p className="text-xs text-gray-400">All-time summary</p>
          </div>
          <div className="p-5 space-y-1">
            {/* Revenue section */}
            <div className="flex justify-between py-1.5 font-semibold text-sm text-gray-700 border-b border-gray-100">
              <span>Revenue</span><span className="text-blue-700">{formatCurrency(totalRev)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-gray-500 pl-4">
              <span>Gross Sales</span><span>{formatCurrency(grossProfit)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-gray-500 pl-4">
              <span>VAT (18%)</span><span>{formatCurrency(taxTotal)}</span>
            </div>
            {/* Expenses section */}
            <div className="flex justify-between py-1.5 font-semibold text-sm text-gray-700 border-b border-gray-100 mt-2">
              <span>Operating Expenses</span><span className="text-orange-600">({formatCurrency(totalExp)})</span>
            </div>
            {expCategories.slice(0,6).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between py-1 text-sm text-gray-500 pl-4">
                <span>{cat}</span><span>({formatCurrency(amt)})</span>
              </div>
            ))}
            {/* Net Profit */}
            <div className={`flex justify-between py-2.5 font-bold text-sm mt-2 border-t-2 ${netProfit >= 0 ? "border-emerald-200 text-emerald-700" : "border-red-200 text-red-600"}`}>
              <span>Net Profit / (Loss)</span>
              <span>{netProfit >= 0 ? "" : "("}{formatCurrency(Math.abs(netProfit))}{netProfit < 0 ? ")" : ""}</span>
            </div>
            <div className="flex justify-between py-1 text-xs text-gray-400">
              <span>Profit Margin</span><span>{margin}%</span>
            </div>
          </div>
        </div>

        {/* Period table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
            <h3 className="font-bold text-gray-900">{periodLabel} Breakdown</h3>
            <p className="text-xs text-gray-400">Revenue, expenses and profit per period</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold">Period</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Revenue</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Expenses</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Profit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700 font-medium">{r.label}</td>
                    <td className="px-4 py-2 text-right text-blue-700 font-semibold">{formatCurrency(r.revenue)}</td>
                    <td className="px-4 py-2 text-right text-orange-600">{formatCurrency(r.expenses)}</td>
                    <td className={`px-4 py-2 text-right font-bold ${r.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-2 font-bold text-gray-900">Total</td>
                  <td className="px-4 py-2 text-right font-bold text-blue-700">{formatCurrency(rows.reduce((s,r)=>s+r.revenue,0))}</td>
                  <td className="px-4 py-2 text-right font-bold text-orange-600">{formatCurrency(rows.reduce((s,r)=>s+r.expenses,0))}</td>
                  <td className={`px-4 py-2 text-right font-bold ${rows.reduce((s,r)=>s+r.profit,0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatCurrency(rows.reduce((s,r)=>s+r.profit,0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
