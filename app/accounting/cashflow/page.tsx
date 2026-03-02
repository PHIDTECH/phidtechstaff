"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

const SESSION_KEY = "phidtech_session";
const ACTIVE_KEY  = "phidtech_active_company";
const SALES_KEY   = "phidtech_accounting_sales";
const EXP_KEY     = "phidtech_expenses";
const PETTY_KEY   = "phidtech_petty_cash";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; isSuperAdmin: boolean; companyId: string; }
interface Sale    { id: string; companyId: string; date: string; paid: number; amount: number; customerName: string; }
interface Expense { id: string; companyId: string; amount: number; category: string; status: string; submittedAt: string; title: string; }
interface PettyCash { id: string; companyId: string; amount: number; type: string; date?: string; description?: string; }

type Period = "daily" | "monthly" | "yearly";

export default function CashFlowPage() {
  const [sales, setSales]       = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [petty, setPetty]       = useState<PettyCash[]>([]);
  const [cid, setCid]           = useState("");
  const cidRef                  = useRef("");
  const [period, setPeriod]     = useState<Period>("monthly");

  useEffect(() => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const c    = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setCid(c); cidRef.current = c;
    setSales(lsGet<Sale[]>(SALES_KEY, []));
    setExpenses(lsGet<Expense[]>(EXP_KEY, []));
    setPetty(lsGet<PettyCash[]>(PETTY_KEY, []));
  }, []);

  const co  = cidRef.current || cid;
  const coS = co ? sales.filter(s => s.companyId === co) : sales;
  const coE = co ? expenses.filter(e => e.companyId === co && (e.status === "paid" || e.status === "approved")) : expenses.filter(e => e.status === "paid" || e.status === "approved");
  const coP = co ? petty.filter(p => p.companyId === co) : petty;

  // Totals
  const totalInflows  = coS.reduce((s,e) => s + e.paid, 0)
                      + coP.filter(p => p.type === "income" || p.type === "credit").reduce((s,p) => s + p.amount, 0);
  const totalOutflows = coE.reduce((s,e) => s + e.amount, 0)
                      + coP.filter(p => p.type === "expense" || p.type === "debit").reduce((s,p) => s + p.amount, 0);
  const netCashFlow   = totalInflows - totalOutflows;

  // Build chart periods
  const buildChart = () => {
    const now = new Date();
    const count = period === "daily" ? 14 : period === "monthly" ? 12 : 5;

    return Array.from({ length: count }, (_, i) => {
      const d = new Date(now);
      if (period === "daily")   d.setDate(d.getDate() - (count - 1 - i));
      else if (period === "monthly") d.setMonth(d.getMonth() - (count - 1 - i));
      else d.setFullYear(d.getFullYear() - (count - 1 - i));

      const key = period === "daily" ? d.toISOString().slice(0,10)
                : period === "monthly" ? d.toISOString().slice(0,7)
                : d.getFullYear().toString();
      const label = period === "daily"
        ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : period === "monthly"
        ? d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
        : d.getFullYear().toString();

      const inflow = coS.filter(s => {
        const k = period === "daily" ? s.date : period === "monthly" ? s.date.slice(0,7) : s.date.slice(0,4);
        return k === key;
      }).reduce((s,e) => s + e.paid, 0)
      + coP.filter(p => {
        const pd = (p.date ?? "").slice(0, period === "daily" ? 10 : period === "monthly" ? 7 : 4);
        return pd === key && (p.type === "income" || p.type === "credit");
      }).reduce((s,p) => s + p.amount, 0);

      const outflow = coE.filter(e => {
        const k = period === "daily" ? (e.submittedAt||"").slice(0,10) : period === "monthly" ? (e.submittedAt||"").slice(0,7) : (e.submittedAt||"").slice(0,4);
        return k === key;
      }).reduce((s,e) => s + e.amount, 0)
      + coP.filter(p => {
        const pd = (p.date ?? "").slice(0, period === "daily" ? 10 : period === "monthly" ? 7 : 4);
        return pd === key && (p.type === "expense" || p.type === "debit");
      }).reduce((s,p) => s + p.amount, 0);

      return { label, inflow, outflow, net: inflow - outflow };
    });
  };

  const chartData = buildChart();

  // Running balance (cumulative net)
  let running = 0;
  const runningData = chartData.map(d => {
    running += d.net;
    return { ...d, balance: running };
  });

  // Recent transactions feed
  const allTx = [
    ...coS.map(s => ({ date: s.date, label: s.customerName || "Sale", amount: s.paid, type: "inflow" as const, cat: "Sales Revenue" })),
    ...coE.map(e => ({ date: (e.submittedAt||"").slice(0,10), label: e.title || e.category, amount: e.amount, type: "outflow" as const, cat: e.category })),
    ...coP.filter(p => p.type === "income" || p.type === "credit").map(p => ({ date: (p.date||"").slice(0,10), label: p.description || "Petty Cash In", amount: p.amount, type: "inflow" as const, cat: "Petty Cash" })),
    ...coP.filter(p => p.type === "expense" || p.type === "debit").map(p => ({ date: (p.date||"").slice(0,10), label: p.description || "Petty Cash Out", amount: p.amount, type: "outflow" as const, cat: "Petty Cash" })),
  ].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 20);

  const periodLabel = period === "daily" ? "Last 14 Days" : period === "monthly" ? "Last 12 Months" : "Last 5 Years";

  return (
    <MainLayout>
      <PageHeader
        title="Cash Flow Statement"
        subtitle="Inflows, outflows and net cash position over time"
        icon={Activity}
        actions={
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total Inflows</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalInflows)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-green-600"><ArrowUpRight className="w-3 h-3" />Cash received</div>
        </div>
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total Outflows</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutflows)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-red-500"><ArrowDownRight className="w-3 h-3" />Cash paid out</div>
        </div>
        <div className={`bg-white rounded-xl border shadow-sm p-5 ${netCashFlow >= 0 ? "border-blue-100" : "border-orange-100"}`}>
          <p className="text-xs text-gray-500 mb-1">Net Cash Flow</p>
          <p className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-blue-700" : "text-orange-600"}`}>{formatCurrency(netCashFlow)}</p>
          <div className="text-xs text-gray-400 mt-1">Inflows − Outflows</div>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Transactions</p>
          <p className="text-2xl font-bold text-purple-700">{allTx.length}</p>
          <div className="text-xs text-gray-400 mt-1">All recorded</div>
        </div>
      </div>

      {/* Cash Flow Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Cash Inflow vs Outflow — {periodLabel}</h3>
            <p className="text-xs text-gray-400">Positive net = cash surplus</p>
          </div>
        </div>
        {chartData.every(d => d.inflow === 0 && d.outflow === 0) ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">No cash flow data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="inflow"  fill="#10b981" radius={[4,4,0,0]} name="Inflow" />
              <Bar dataKey="outflow" fill="#ef4444" radius={[4,4,0,0]} name="Outflow" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Running Balance Area Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">Cumulative Cash Balance</h3>
        <p className="text-xs text-gray-400 mb-4">Running net cash position over time</p>
        {runningData.every(d => d.balance === 0) ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">No data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={runningData}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="balance" stroke="#3b82f6" fill="url(#balGrad)" strokeWidth={2} name="Cash Balance" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Transaction Feed */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Transaction Feed</h3>
          <p className="text-xs text-gray-400">Recent cash movements (most recent first)</p>
        </div>
        {allTx.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">No transactions recorded.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allTx.map((tx, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tx.type === "inflow" ? "bg-green-50" : "bg-red-50"}`}>
                    {tx.type === "inflow"
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <TrendingDown className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tx.label}</p>
                    <p className="text-xs text-gray-400">{tx.cat} · {tx.date ? formatDate(tx.date) : "—"}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${tx.type === "inflow" ? "text-green-700" : "text-red-600"}`}>
                  {tx.type === "inflow" ? "+" : "−"}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
