"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { BarChart3, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SESSION_KEY = "phidtech_session";
const ACTIVE_KEY  = "phidtech_active_company";
const SALES_KEY   = "phidtech_accounting_sales";
const EXP_KEY     = "phidtech_expenses";
const INV_KEY     = "phidtech_invoices";
const PETTY_KEY   = "phidtech_petty_cash";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; isSuperAdmin: boolean; companyId: string; }
interface Sale    { id: string; companyId: string; paid: number; balance: number; amount: number; }
interface Expense { id: string; companyId: string; amount: number; status: string; }
interface Invoice { id: string; companyId: string; total: number; status: string; }
interface PettyCash { id: string; companyId: string; amount: number; type: string; }

const COLORS = ["#3b82f6","#10b981","#f97316","#8b5cf6","#ec4899","#06b6d4","#f59e0b"];

export default function BalanceSheetPage() {
  const [sales, setSales]       = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [petty, setPetty]       = useState<PettyCash[]>([]);
  const [cid, setCid]           = useState("");
  const cidRef                  = useRef("");

  useEffect(() => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const c    = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setCid(c); cidRef.current = c;
    setSales(lsGet<Sale[]>(SALES_KEY, []));
    setExpenses(lsGet<Expense[]>(EXP_KEY, []));
    setInvoices(lsGet<Invoice[]>(INV_KEY, []));
    setPetty(lsGet<PettyCash[]>(PETTY_KEY, []));
  }, []);

  const co = cidRef.current || cid;
  const coS = co ? sales.filter(s => s.companyId === co) : sales;
  const coE = co ? expenses.filter(e => e.companyId === co) : expenses;
  const coI = co ? invoices.filter(i => i.companyId === co) : invoices;
  const coP = co ? petty.filter(p => p.companyId === co) : petty;

  // ── ASSETS ──
  const cashFromSales     = coS.reduce((s,e) => s + e.paid, 0);
  const pettyCashIn       = coP.filter(p => p.type === "income" || p.type === "credit").reduce((s,p) => s + p.amount, 0);
  const totalCash         = cashFromSales + pettyCashIn;

  const accountsReceivable = coS.reduce((s,e) => s + e.balance, 0)
                           + coI.filter(i => i.status !== "paid").reduce((s,i) => s + i.total, 0);

  const totalCurrentAssets = totalCash + accountsReceivable;

  // ── LIABILITIES ──
  const accountsPayable    = coE.filter(e => e.status === "pending" || e.status === "approved").reduce((s,e) => s + e.amount, 0);
  const pettyCashOut       = coP.filter(p => p.type === "expense" || p.type === "debit").reduce((s,p) => s + p.amount, 0);
  const totalCurrentLiab   = accountsPayable + pettyCashOut;

  // ── EQUITY ──
  const totalExpPaid       = coE.filter(e => e.status === "paid").reduce((s,e) => s + e.amount, 0);
  const retainedEarnings   = cashFromSales - totalExpPaid;
  const totalEquity        = retainedEarnings;

  const totalAssets = totalCurrentAssets;
  const totalLiabEquity = totalCurrentLiab + totalEquity;
  const balanced = Math.abs(totalAssets - totalLiabEquity) < 1;

  const assetPie = [
    { name: "Cash (Collected)",        value: totalCash },
    { name: "Accounts Receivable",     value: accountsReceivable },
  ].filter(d => d.value > 0);

  const liabPie = [
    { name: "Accounts Payable",    value: accountsPayable },
    { name: "Petty Cash Outflow",  value: pettyCashOut },
    { name: "Retained Earnings",   value: Math.max(0, retainedEarnings) },
  ].filter(d => d.value > 0);

  const Section = ({ title, color, children }: { title: string; color: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <div className={`px-4 py-2 rounded-t-lg font-bold text-sm uppercase tracking-wider ${color}`}>{title}</div>
      <div className="border border-t-0 border-gray-100 rounded-b-lg overflow-hidden">{children}</div>
    </div>
  );

  const Row = ({ label, value, bold, indent }: { label: string; value: number; bold?: boolean; indent?: boolean }) => (
    <div className={`flex justify-between px-4 py-2 border-b border-gray-50 last:border-0 ${bold ? "bg-gray-50 font-bold" : ""}`}>
      <span className={`text-sm text-gray-700 ${indent ? "pl-4" : ""}`}>{label}</span>
      <span className={`text-sm font-semibold ${value < 0 ? "text-red-600" : bold ? "text-gray-900" : "text-gray-700"}`}>
        {value < 0 ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value)}
      </span>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader
        title="Balance Sheet"
        subtitle="Assets, liabilities and equity position"
        icon={BarChart3}
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total Assets</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total Liabilities</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCurrentLiab)}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total Equity</p>
          <p className={`text-2xl font-bold ${totalEquity >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(totalEquity)}</p>
        </div>
        <div className={`bg-white rounded-xl border shadow-sm p-5 ${balanced ? "border-green-200" : "border-yellow-200"}`}>
          <p className="text-xs text-gray-500 mb-1">Balance Check</p>
          <div className={`flex items-center gap-2 ${balanced ? "text-green-700" : "text-yellow-600"}`}>
            <Scale className="w-5 h-5" />
            <span className="font-bold text-lg">{balanced ? "Balanced" : "Check Data"}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Assets = Liab + Equity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Sheet Statement */}
        <div>
          <Section title="Assets" color="bg-blue-50 text-blue-800">
            <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Assets</div>
            <Row label="Cash & Collections"    value={totalCash}           indent />
            <Row label="Accounts Receivable"   value={accountsReceivable}  indent />
            <Row label="Total Current Assets"  value={totalCurrentAssets}  bold />
            <Row label="TOTAL ASSETS"          value={totalAssets}         bold />
          </Section>

          <Section title="Liabilities" color="bg-red-50 text-red-800">
            <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Liabilities</div>
            <Row label="Accounts Payable (Pending)"  value={accountsPayable}  indent />
            <Row label="Petty Cash Outflows"          value={pettyCashOut}     indent />
            <Row label="Total Current Liabilities"   value={totalCurrentLiab} bold />
          </Section>

          <Section title="Equity" color="bg-emerald-50 text-emerald-800">
            <Row label="Retained Earnings"    value={retainedEarnings}  indent />
            <Row label="Total Equity"         value={totalEquity}       bold />
          </Section>

          <div className={`flex justify-between px-5 py-3 rounded-xl font-bold text-sm mt-2 ${balanced ? "bg-green-50 border border-green-200 text-green-800" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}>
            <span>TOTAL LIABILITIES + EQUITY</span>
            <span>{formatCurrency(totalLiabEquity)}</span>
          </div>
        </div>

        {/* Pie Charts */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Asset Composition</h3>
            {assetPie.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">No asset data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={assetPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ percent }: { percent?: number }) => `${((percent ?? 0)*100).toFixed(0)}%`} labelLine={false}>
                    {assetPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(Number(v ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Liabilities + Equity Composition</h3>
            {liabPie.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={liabPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ percent }: { percent?: number }) => `${((percent ?? 0)*100).toFixed(0)}%`} labelLine={false}>
                    {liabPie.map((_, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(Number(v ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
