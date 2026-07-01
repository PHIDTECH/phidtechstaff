"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, RefreshCw, Download, Upload, AlertCircle, CheckCircle, Clock, TrendingUp, Bell } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY     = "phidtech_group_company";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }

interface DebtorRow {
  customerId: string;
  customerName: string;
  customerPhone: string;
  companyId: string;
  totalSales: number;
  totalPaid: number;
  balance: number;
  lastDate: string;
  daysSince: number;
  aging: "current" | "30" | "60" | "90" | "90+";
  source: "sale" | "invoice";
  transactions: { id: string; date: string; amount: number; paid: number; balance: number; status: string; source: string }[];
}

function agingBucket(days: number): DebtorRow["aging"] {
  if (days <= 30)  return "current";
  if (days <= 60)  return "30";
  if (days <= 90)  return "60";
  if (days <= 120) return "90";
  return "90+";
}

function agingLabel(a: DebtorRow["aging"]) {
  if (a === "current") return "0–30 days";
  if (a === "30")      return "31–60 days";
  if (a === "60")      return "61–90 days";
  if (a === "90")      return "91–120 days";
  return "120+ days";
}

function agingColor(a: DebtorRow["aging"]) {
  if (a === "current") return "bg-green-100 text-green-800";
  if (a === "30")      return "bg-yellow-100 text-yellow-800";
  if (a === "60")      return "bg-orange-100 text-orange-800";
  if (a === "90")      return "bg-red-100 text-red-800";
  return "bg-red-200 text-red-900 font-bold";
}

export default function DebtorsPage() {
  usePermissionGuard("accounting");
  const [debtors, setDebtors]       = useState<DebtorRow[]>([]);
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [cid, setCid]               = useState("");
  const [groupCid, setGroupCid]     = useState("");
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [agingFilter, setAgingFilter] = useState("all");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [importing, setImporting]   = useState(false);
  const [importMsg, setImportMsg]   = useState<{type:"success"|"error";text:string}|null>(null);
  const [remindersToday, setRemindersToday] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const runReminders = async () => {
    try {
      const r = await fetch("/api/debt-reminders", { method: "POST" });
      if (r.ok) { const d = await r.json(); setRemindersToday(d.reminders ?? 0); }
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const sess = lsGet<Session>(SESSION_KEY, null as never);
      const activeCid = getActiveCid(sess);
      setCid(activeCid);
      const cos = lsGet<Company[]>(COMPANIES_KEY, []);
      setCompanies(cos);
      setGroupCid(lsGet<string>(GROUP_KEY, ""));

      const [sr, ir] = await Promise.allSettled([
        fetch("/api/accounting/sales", { cache: "no-store" }),
        fetch("/api/invoices",         { cache: "no-store" }),
      ]);
      const sales:   Record<string,unknown>[] = sr.status === "fulfilled" && sr.value.ok ? await sr.value.json() : [];
      const invoices: Record<string,unknown>[] = ir.status === "fulfilled" && ir.value.ok ? await ir.value.json() : [];

      const today = Date.now();
      const map = new Map<string, DebtorRow>();

      const upsert = (key: string, name: string, phone: string, coId: string, tx: DebtorRow["transactions"][0]) => {
        if (!map.has(key)) {
          map.set(key, { customerId: key, customerName: name, customerPhone: phone, companyId: coId,
            totalSales: 0, totalPaid: 0, balance: 0, lastDate: tx.date, daysSince: 0, aging: "current", source: tx.source as "sale"|"invoice", transactions: [] });
        }
        const d = map.get(key)!;
        d.totalSales += tx.amount;
        d.totalPaid  += tx.paid;
        d.balance    += tx.balance;
        if (tx.date > d.lastDate) d.lastDate = tx.date;
        d.transactions.push(tx);
      };

      // Sales with outstanding balance
      for (const s of sales) {
        const bal = Number(s.balance || 0);
        if (bal <= 0) continue;
        const key = String(s.customerId || s.customerName || "unknown");
        const txDate = String(s.date || s.createdAt || "");
        upsert(key, String(s.customerName || ""), String(s.customerPhone || ""), String(s.companyId || ""), {
          id: String(s.id), date: txDate, amount: Number(s.amount || 0),
          paid: Number(s.paid || 0), balance: bal, status: String(s.status || ""), source: "sale",
        });
      }
      // Invoices with outstanding balance
      for (const inv of invoices) {
        const total = Number(inv.amount || inv.total || 0);
        const paid  = Number(inv.paid || 0);
        const bal   = total - paid;
        if (bal <= 0) continue;
        const key = `inv_${String(inv.customerId || inv.customerName || "unknown")}`;
        const txDate = String(inv.date || inv.invoiceDate || inv.createdAt || "");
        upsert(key, String(inv.customerName || ""), String(inv.customerPhone || ""), String(inv.companyId || ""), {
          id: String(inv.id || inv.invoiceNumber || ""), date: txDate, amount: total,
          paid, balance: bal, status: String(inv.status || ""), source: "invoice",
        });
      }

      // Compute aging from lastDate
      const rows: DebtorRow[] = [];
      for (const d of map.values()) {
        if (d.balance <= 0) continue;
        const daysSince = d.lastDate ? Math.floor((today - new Date(d.lastDate).getTime()) / 86400000) : 0;
        d.daysSince = daysSince;
        d.aging     = agingBucket(daysSince);
        rows.push(d);
      }
      rows.sort((a, b) => b.balance - a.balance);
      setDebtors(rows);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); runReminders(); }, []);

  const isGroupView = !cid || cid === groupCid;
  const filtered = debtors
    .filter(d => isGroupView || d.companyId === cid)
    .filter(d => agingFilter === "all" || d.aging === agingFilter)
    .filter(d => !search || d.customerName.toLowerCase().includes(search.toLowerCase()) || d.customerPhone.includes(search));

  const totalBalance  = filtered.reduce((s, d) => s + d.balance, 0);
  const totalDebtors  = filtered.length;
  const overdue30     = filtered.filter(d => d.aging !== "current").reduce((s, d) => s + d.balance, 0);
  const critical      = filtered.filter(d => d.aging === "90+").reduce((s, d) => s + d.balance, 0);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg(null);
    try {
      let cos = companies;
      if (cos.length === 0) { const cr = await fetch("/api/companies", { cache: "no-store" }); if (cr.ok) cos = await cr.json(); }
      const validCos = cos.filter(c => c.id && c.id !== "group");
      const targetCid = cid || validCos[0]?.id || "";
      if (!targetCid) throw new Error("No company found. Switch to a specific company first.");
      const text = await file.text();
      const allLines = text.trim().split(/\r?\n/);
      if (allLines.length < 2) throw new Error("No data rows found in CSV");
      const hdrs = (allLines[0].match(/("([^"]*)"|[^,]*)/g) || []).map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
      const col = (n: string) => hdrs.findIndex(h => h.includes(n));
      const iCust = col("customer"); const iPhone = col("phone"); const iTotal = col("total"); const iPaid = col("paid"); const iBalance = col("balance"); const iDate = col("last");
      let imported = 0; let lastError = "";
      for (const line of allLines.slice(1)) {
        if (!line.trim()) continue;
        const vals = line.match(/("([^"]*)"|[^,]*)/g) || [];
        const clean = (i: number) => i >= 0 ? (vals[i] || "").replace(/^"|"$/g, "").trim() : "";
        const amount = Number(clean(iTotal).replace(/[^0-9.-]/g, "")) || 0;
        const paid   = Number(clean(iPaid).replace(/[^0-9.-]/g, ""))  || 0;
        const balance = iBalance >= 0 ? Number(clean(iBalance).replace(/[^0-9.-]/g, "")) : amount - paid;
        const sale = {
          id: `imp_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
          companyId: targetCid,
          date: clean(iDate) || new Date().toISOString().slice(0,10),
          customerId: "", customerName: clean(iCust) || "Unknown", customerPhone: clean(iPhone), customerAddress: "",
          items: [{ description: "Imported Debtor", quantity: 1, unitPrice: amount, total: amount }],
          subtotal: amount, tax: 0, amount, paid, balance,
          status: paid >= amount && amount > 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
          notes: "", createdAt: new Date().toISOString(),
        };
        const res = await fetch("/api/accounting/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sale) });
        if (res.ok) imported++;
        else { const err = await res.json().catch(() => ({})); lastError = err.error || res.statusText; }
      }
      if (imported === 0 && lastError) throw new Error(lastError);
      setImportMsg({ type: "success", text: `Imported ${imported} debtor records` });
      await loadData();
    } catch (err) {
      setImportMsg({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setImportMsg(null), 5000);
    }
  };

  const downloadCSV = () => {
    const header = "Customer,Phone,Company,Total Sales,Total Paid,Balance,Last Transaction,Days Since,Aging";
    const rows = filtered.map(d => {
      const coName = companies.find(c => c.id === d.companyId)?.name || d.companyId;
      return `"${d.customerName}","${d.customerPhone}","${coName}","${d.totalSales}","${d.totalPaid}","${d.balance}","${d.lastDate}","${d.daysSince}","${agingLabel(d.aging)}"`;
    }).join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Debtors_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      {importMsg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${importMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {importMsg.text}
        </div>
      )}
      <PageHeader
        title="Debtors"
        subtitle="Accounts receivable — customers with outstanding balances"
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
            {remindersToday > 0 && (
              <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-orange-200">
                <Bell className="w-3.5 h-3.5" />{remindersToday} reminder{remindersToday !== 1 ? "s" : ""} sent today
              </span>
            )}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className={`w-4 h-4 mr-2 ${importing ? "animate-pulse" : ""}`} />{importing ? "Importing..." : "Import CSV"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Debtors"     value={String(totalDebtors)}          icon={Users}       iconBg="bg-blue-50"   iconColor="text-blue-600"   subtitle="with outstanding balance" />
        <StatCard title="Total Receivable"  value={formatCurrency(totalBalance)}   icon={TrendingUp}  iconBg="bg-green-50"  iconColor="text-green-600"  subtitle="accounts receivable" />
        <StatCard title="Overdue (>30 days)"value={formatCurrency(overdue30)}      icon={Clock}       iconBg="bg-yellow-50" iconColor="text-yellow-600" subtitle="past 30 days" />
        <StatCard title="Critical (>120d)"  value={formatCurrency(critical)}       icon={AlertCircle} iconBg="bg-red-50"    iconColor="text-red-600"    subtitle="120+ days overdue" />
      </div>

      {/* Aging summary bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Aging Analysis</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(["current","30","60","90","90+"] as const).map(a => {
            const total = filtered.filter(d => d.aging === a).reduce((s,d) => s + d.balance, 0);
            const count = filtered.filter(d => d.aging === a).length;
            return (
              <button key={a} onClick={() => setAgingFilter(agingFilter === a ? "all" : a)}
                className={`rounded-lg p-3 text-left border transition-all ${agingFilter === a ? "ring-2 ring-blue-400" : ""} ${agingColor(a)} bg-opacity-50`}>
                <p className="text-xs font-semibold">{agingLabel(a)}</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(total)}</p>
                <p className="text-xs">{count} debtor{count !== 1 ? "s" : ""}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-gray-50">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={agingFilter} onValueChange={setAgingFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Aging" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Aging</SelectItem>
              <SelectItem value="current">0–30 days</SelectItem>
              <SelectItem value="30">31–60 days</SelectItem>
              <SelectItem value="60">61–90 days</SelectItem>
              <SelectItem value="90">91–120 days</SelectItem>
              <SelectItem value="90+">120+ days</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-400">{filtered.length} debtors · {formatCurrency(totalBalance)} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading debtors...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle className="w-12 h-12 text-green-200" />
            <p className="font-semibold text-gray-600">No outstanding debtors</p>
            <p className="text-sm text-gray-400">All accounts are fully settled.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                {isGroupView && <TableHead>Company</TableHead>}
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Last Transaction</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d, i) => {
                const coName = companies.find(c => c.id === d.companyId)?.name || d.companyId;
                const isExpanded = expanded === d.customerId;
                return (
                  <>
                    <TableRow key={d.customerId} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : d.customerId)}>
                      <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {d.customerName.slice(0,2).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{d.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{d.customerPhone || "—"}</TableCell>
                      {isGroupView && <TableCell className="text-gray-500 text-sm">{coName}</TableCell>}
                      <TableCell className="text-right font-medium">{formatCurrency(d.totalSales)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(d.totalPaid)}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(d.balance)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(d.lastDate)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${agingColor(d.aging)}`}>
                          {agingLabel(d.aging)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-blue-500 cursor-pointer">{isExpanded ? "▲ Hide" : "▼ Details"}</span>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${d.customerId}_exp`}>
                        <TableCell colSpan={isGroupView ? 10 : 9} className="bg-blue-50 p-0">
                          <div className="p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Transactions</p>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-gray-400 border-b border-blue-100">
                                  <th className="text-left py-1">ID / Ref</th>
                                  <th className="text-left py-1">Date</th>
                                  <th className="text-left py-1">Source</th>
                                  <th className="text-right py-1">Amount</th>
                                  <th className="text-right py-1">Paid</th>
                                  <th className="text-right py-1">Balance</th>
                                  <th className="text-left py-1">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.transactions.map((tx, ti) => (
                                  <tr key={ti} className="border-b border-blue-50 last:border-0">
                                    <td className="py-1 font-mono text-xs text-gray-500">{tx.id.slice(0,16)}</td>
                                    <td className="py-1">{formatDate(tx.date)}</td>
                                    <td className="py-1 capitalize">{tx.source}</td>
                                    <td className="py-1 text-right">{formatCurrency(tx.amount)}</td>
                                    <td className="py-1 text-right text-green-600">{formatCurrency(tx.paid)}</td>
                                    <td className="py-1 text-right font-semibold text-red-600">{formatCurrency(tx.balance)}</td>
                                    <td className="py-1"><span className="text-xs px-1.5 py-0.5 rounded bg-white border">{tx.status}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Books of Accounts note */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>Books of Accounts:</strong> The total receivable of <strong>{formatCurrency(totalBalance)}</strong> is recorded as <em>Accounts Receivable (Trade Debtors)</em> in the Balance Sheet under Current Assets, and as outstanding revenue in Profit &amp; Loss.
      </div>
    </MainLayout>
  );
}
