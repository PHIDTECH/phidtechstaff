"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Search, DollarSign, CheckCircle, Clock, AlertCircle, Edit, Trash2, Eye, X, BookOpen, Printer, Download, Upload } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const ACTIVE_KEY    = "phidtech_active_company";
const SALES_KEY     = "phidtech_accounting_sales";
const CUSTOMERS_KEY = "phidtech_customers";
const COMPANIES_KEY = "phidtech_companies";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface Customer {
  id: string; name: string; companyId: string;
  phone?: string; address?: string; email?: string;
  company?: string; serviceProduct?: string; status?: string;
  totalRevenue?: number; _source?: string;
}
interface SaleItem { description: string; quantity: number; unitPrice: number; total: number; }
interface Sale {
  id: string; companyId: string; date: string;
  customerId: string; customerName: string; customerPhone: string; customerAddress: string;
  items: SaleItem[]; subtotal: number; tax: number; amount: number;
  paid: number; balance: number;
  status: "paid" | "partial" | "unpaid";
  paymentPlan?: "once" | "monthly" | "3months" | "6months" | "yearly";
  dueDate?: string;
  notes: string; createdAt: string;
}

const emptyItem = (): SaleItem => ({ description: "", quantity: 1, unitPrice: 0, total: 0 });
const emptyForm = () => ({
  customerId: "", date: new Date().toISOString().slice(0, 10),
  items: [emptyItem()], paid: "", notes: "", saleCompanyId: "",
  paymentPlan: "once" as Sale["paymentPlan"],
  dueDate: "",
});

const statusColors: Record<string, string> = {
  paid:    "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  unpaid:  "bg-red-100 text-red-800",
};

const MONTHS: Record<string,string> = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
const parseFlexDate = (s: string): string => {
  // Handle "09 May 2026" or "May 09, 2026" etc.
  const m = s.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i) || s.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const isFirst = /^\d/.test(m[1]);
    const day = isFirst ? m[1].padStart(2,"0") : m[2].padStart(2,"0");
    const mon = MONTHS[(isFirst ? m[2] : m[1]).slice(0,3).toLowerCase()] || "01";
    const year = isFirst ? m[3] : m[3];
    return `${year}-${mon}-${day}`;
  }
  // Fallback: try native Date parsing
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0,10) : d.toISOString().slice(0,10);
};

export default function AccountingSalesPage() {
  const [sales, setSales]           = useState<Sale[]>([]);
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [companies, setCompanies]   = useState<{id:string;name:string}[]>([]);
  const [cid, setCid]               = useState("");
  const cidRef                      = useRef("");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem]     = useState<Sale | null>(null);
  const [viewItem, setViewItem]     = useState<Sale | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [formError, setFormError]   = useState("");
  const [selCustomer, setSelCustomer] = useState<Customer | null>(null);
  const [custSearch, setCustSearch]   = useState("");

  const [loading, setLoading]       = useState(true);
  const [statPeriod, setStatPeriod] = useState<"daily"|"weekly"|"monthly"|"all">("daily");
  const [statDate, setStatDate]     = useState(new Date().toISOString().slice(0,10));
  const [importing, setImporting]   = useState(false);
  const [importMsg, setImportMsg]   = useState<{type:"success"|"error";text:string}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const c = getActiveCid(sess);
    setCid(c); cidRef.current = c;
    setCompanies(lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []));
    // Load customers from ALL registries in parallel
    try {
      const [r0,r1,r2,r3,r4,r5,r6,r7,r8] = await Promise.allSettled([
        fetch("/api/customers",              { cache: "no-store" }),
        fetch("/api/marketing-customers",    { cache: "no-store" }),
        fetch("/api/microfinance-customers", { cache: "no-store" }),
        fetch("/api/media-customers",        { cache: "no-store" }),
        fetch("/api/business-customers",     { cache: "no-store" }),
        fetch("/api/licence-customers",      { cache: "no-store" }),
        fetch("/api/entertainment-customers",{ cache: "no-store" }),
        fetch("/api/movies-customers",       { cache: "no-store" }),
        fetch("/api/pending-payments",       { cache: "no-store" }),
      ]);
      const norm = (arr: Record<string,unknown>[], src: string): Customer[] =>
        arr.map(x => ({ id: String(x.id), name: String(x.customerName ?? x.name ?? ""),
          companyId: String(x.companyId ?? ""), phone: String(x.phone ?? ""),
          email: String(x.email ?? ""), address: String(x.address ?? ""),
          _source: src }));
      const get = async (r: PromiseSettledResult<Response>, src: string): Promise<Customer[]> => {
        if (r.status !== "fulfilled" || !r.value.ok) return [];
        const d = await r.value.json(); return Array.isArray(d) ? norm(d as Record<string,unknown>[], src) : [];
      };
      const [main, mkt, mf, med, biz, lic, ent, mov, pp] = await Promise.all([
        get(r0,"Customer"), get(r1,"Marketing"), get(r2,"Microfinance"),
        get(r3,"Media"),    get(r4,"Business"),  get(r5,"Licence"),
        get(r6,"Entertainment"), get(r7,"Movies"), get(r8,"Pending Pmt"),
      ]);
      // Merge; deduplicate by phone (keep first occurrence)
      const seen = new Set<string>();
      const merged: Customer[] = [];
      for (const c of [...main,...mkt,...mf,...med,...biz,...lic,...ent,...mov,...pp]) {
        const key = c.phone?.trim() || c.id;
        if (!seen.has(key)) { seen.add(key); merged.push(c); }
      }
      setCustomers(merged.length > 0 ? merged : lsGet<Customer[]>(CUSTOMERS_KEY, []));
    } catch { setCustomers(lsGet<Customer[]>(CUSTOMERS_KEY, [])); }
    // Load sales from server API
    try {
      setLoading(true);
      const sr = await fetch("/api/accounting/sales", { cache: "no-store" });
      if (sr.ok) {
        const d: Sale[] = await sr.json();
        setSales(Array.isArray(d) ? d : []);
        // Migrate local-only sales
        const local = lsGet<Sale[]>(SALES_KEY, []);
        if (local.length > 0) {
          const srvIds = new Set(d.map(s => s.id));
          const toMigrate = local.filter(s => !srvIds.has(s.id));
          if (toMigrate.length > 0) {
            await fetch("/api/accounting/sales", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toMigrate) });
            const r2 = await fetch("/api/accounting/sales", { cache: "no-store" });
            if (r2.ok) setSales(await r2.json());
          }
          lsSet(SALES_KEY, []);
        }
      } else setSales(lsGet<Sale[]>(SALES_KEY, []));
    } catch { setSales(lsGet<Sale[]>(SALES_KEY, [])); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);  // eslint-disable-line

  const co        = cidRef.current || cid;
  const coSales   = (co ? sales.filter(s => s.companyId === co) : sales).sort((a,b) => b.date.localeCompare(a.date));
  const coCusts   = co ? customers.filter(c => c.companyId === co) : customers;

  const filtered  = coSales.filter(s => {
    const ms = s.customerName.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === "all" || s.status === statusFilter;
    return ms && mf;
  });

  const today    = new Date().toISOString().slice(0,10);
  const thisMonth = today.slice(0,7);
  const totalRev  = coSales.reduce((s,e) => s + e.amount, 0);
  const totalPaid = coSales.reduce((s,e) => s + e.paid, 0);
  const dailyRev  = coSales.filter(s => s.date === today).reduce((s,e) => s + e.amount, 0);
  const monthRev  = coSales.filter(s => s.date.startsWith(thisMonth)).reduce((s,e) => s + e.amount, 0);

  const getWeekStart = (d: string) => {
    const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay() + 1); return dt.toISOString().slice(0,10);
  };
  const getWeekEnd = (d: string) => {
    const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay() + 7); return dt.toISOString().slice(0,10);
  };
  const periodSales = coSales.filter(s => {
    if (statPeriod === "daily")   return s.date === statDate;
    if (statPeriod === "weekly")  return s.date >= getWeekStart(statDate) && s.date <= getWeekEnd(statDate);
    if (statPeriod === "monthly") return s.date.startsWith(statDate.slice(0,7));
    return true;
  });
  const periodRev  = periodSales.reduce((s,e) => s + e.amount, 0);
  const periodPaid = periodSales.reduce((s,e) => s + e.paid, 0);
  const periodOut  = periodRev - periodPaid;

  const save = async (list: Sale[]) => {
    setSales(list);
    lsSet(SALES_KEY, list); // local fallback
  };

  const downloadCSV = () => {
    const header = "Date,Customer,Amount,Paid,Balance,Status,Notes";
    const rows = coSales.map(s =>
      `"${s.date}","${s.customerName}","${s.amount}","${s.paid}","${s.balance}","${s.status}","${(s.notes || "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Sales_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg(null);
    try {
      // Fetch fresh companies list to ensure we have valid companyId
      let cos = companies;
      if (cos.length === 0) {
        const cr = await fetch("/api/companies", { cache: "no-store" });
        if (cr.ok) cos = await cr.json();
      }
      // Get companyId - use active company or fall back to first non-group company
      const validCos = cos.filter(c => c.id && c.id !== "group");
      const targetCid = cid || cidRef.current || validCos[0]?.id || "";
      if (!targetCid) {
        throw new Error("No company available. Please switch to a specific company first.");
      }
      const text = await file.text();
      const allLines = text.trim().split(/\r?\n/);
      if (allLines.length < 2) throw new Error("No data rows found in CSV");
      // Parse header to find column indices
      const headerLine = allLines[0];
      const headers = (headerLine.match(/("([^"]*)"|[^,]*)/g) || []).map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
      const col = (name: string) => headers.findIndex(h => h.includes(name));
      const iCustomer = col("customer"); const iDate = col("date"); const iAmount = col("amount");
      const iPaid = col("paid"); const iBalance = col("balance"); const iStatus = col("status"); const iNotes = col("note");
      const lines = allLines.slice(1);
      let imported = 0;
      let lastError = "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const vals = line.match(/("([^"]*)"|[^,]*)/g) || [];
        const clean = (i: number) => i >= 0 ? (vals[i] || "").replace(/^"|"$/g, "").trim() : "";
        const customerName = clean(iCustomer) || "Unknown Customer";
        const rawDate = clean(iDate);
        const date = rawDate ? (rawDate.includes("-") ? rawDate : parseFlexDate(rawDate)) : new Date().toISOString().slice(0,10);
        const amount = Number(clean(iAmount).replace(/[^0-9.-]/g, "")) || 0;
        const paid = Number(clean(iPaid).replace(/[^0-9.-]/g, "")) || 0;
        const balance = amount - paid;
        const status: Sale["status"] = paid >= amount && amount > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
        const notes = clean(iNotes);
        const newSale: Sale = {
          id: `imp_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
          companyId: targetCid,
          date, customerId: "", customerName, customerPhone: "", customerAddress: "",
          items: [{ description: "Imported Sale", quantity: 1, unitPrice: amount, total: amount }],
          subtotal: amount, tax: 0, amount, paid, balance, status, notes, createdAt: new Date().toISOString(),
        };
        const res = await fetch("/api/accounting/sales", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSale),
        });
        if (res.ok) imported++;
        else { const err = await res.json().catch(() => ({})); lastError = err.error || res.statusText; }
      }
      if (imported === 0 && lastError) throw new Error(lastError);
      // Verify data was persisted by re-fetching
      const verify = await fetch("/api/accounting/sales", { cache: "no-store" });
      const savedCount = verify.ok ? ((await verify.json()) as Sale[]).length : 0;
      setImportMsg({ type: "success", text: `Imported ${imported} of ${lines.length} sales (${savedCount} total on server)` });
      await reload();
    } catch (err) {
      setImportMsg({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setImportMsg(null), 5000);
    }
  };

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const updateItem = (idx: number, field: keyof SaleItem, val: string) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      const u = { ...it, [field]: field === "description" ? val : Number(val) || 0 };
      u.total = u.quantity * u.unitPrice;
      return u;
    });
    sf({ items });
  };

  const recalc = (items: SaleItem[], paidStr: string) => {
    const sub   = items.reduce((s, it) => s + it.total, 0);
    const total = sub;
    const paid  = Math.min(Number(paidStr) || 0, total);
    const bal   = total - paid;
    const status: Sale["status"] = paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
    return { subtotal: sub, tax: 0, amount: total, paid, balance: bal, status };
  };

  const openAdd = () => {
    setEditItem(null); setSelCustomer(null);
    setForm(emptyForm()); setFormError("");
    setShowDialog(true);
  };

  const openEdit = (s: Sale) => {
    setEditItem(s);
    const c = customers.find(cu => cu.id === s.customerId) ?? null;
    setSelCustomer(c);
    setForm({ customerId: s.customerId, date: s.date, items: s.items.length ? s.items : [emptyItem()], paid: String(s.paid), notes: s.notes, saleCompanyId: s.companyId, paymentPlan: s.paymentPlan ?? "once", dueDate: s.dueDate ?? "" });
    setFormError(""); setShowDialog(true);
  };

  const isGroupHQ = !cidRef.current && !cid;

  const saveForm = async () => {
    if (!form.customerId) { setFormError("Select a customer."); return; }
    if (isGroupHQ && !form.saleCompanyId) { setFormError("Select which company this sale belongs to."); return; }
    const filled = form.items.filter(it => it.description.trim());
    if (filled.length === 0) { setFormError("Add at least one item."); return; }
    const cust   = customers.find(c => c.id === form.customerId);
    const { subtotal, tax, amount, paid, balance, status } = recalc(filled, form.paid);
    if (editItem) {
      const updated = { ...editItem, date: form.date, customerId: form.customerId,
        customerName: cust?.name ?? editItem.customerName,
        customerPhone: cust?.phone ?? editItem.customerPhone,
        customerAddress: cust?.address ?? editItem.customerAddress,
        items: filled, subtotal, tax, amount, paid, balance, status, notes: form.notes,
        paymentPlan: form.paymentPlan, dueDate: form.dueDate || undefined };
      await fetch("/api/accounting/sales", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    } else {
      const saleNum = `SAL-${Date.now().toString().slice(-6)}`;
      const newSale: Sale = {
        id: saleNum, companyId: form.saleCompanyId || cidRef.current || cid,
        date: form.date, customerId: form.customerId,
        customerName: cust?.name ?? "", customerPhone: cust?.phone ?? "",
        customerAddress: cust?.address ?? "",
        items: filled, subtotal, tax, amount, paid, balance, status,
        notes: form.notes, paymentPlan: form.paymentPlan, dueDate: form.dueDate || undefined,
        createdAt: new Date().toISOString(),
      };
      await fetch("/api/accounting/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSale) });
    }
    setShowDialog(false);
    await reload();
  };

  const previewCalc = recalc(form.items, form.paid);

  const printReceipt = (s: Sale) => {
    const coName = companies.find(c => c.id === s.companyId)?.name ?? s.companyId ?? "";
    const itemRows = s.items.map(it =>
      `<tr><td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${it.description}</td><td style="text-align:center;padding:5px 8px;border-bottom:1px solid #f3f4f6">${it.quantity}</td><td style="text-align:right;padding:5px 8px;border-bottom:1px solid #f3f4f6">${it.unitPrice.toLocaleString()}</td><td style="text-align:right;padding:5px 8px;border-bottom:1px solid #f3f4f6;font-weight:600">${it.total.toLocaleString()}</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${s.id}</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:20px;max-width:520px}
.hdr{background:#1e3a8a;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0}
.hdr h1{margin:0 0 2px;font-size:15px;color:#fff}.hdr p{margin:2px 0;font-size:11px;opacity:.85}
.body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 20px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;font-size:11.5px}
.lbl{font-size:10px;color:#9ca3af;text-transform:uppercase;margin-bottom:2px}
 table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:12px}
th{background:#f8fafc;padding:6px 8px;text-align:left;font-size:10.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.03em}
th:nth-child(n+2){text-align:right}th:nth-child(2){text-align:center}
.total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11.5px}
.net{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin:10px 0}
.net .lbl2{font-weight:700;font-size:13px}.net .val{font-weight:800;font-size:18px;color:#15803d}
.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${s.status==='paid'?'#dcfce7':s.status==='partial'?'#fef9c3':'#fee2e2'};color:${s.status==='paid'?'#15803d':s.status==='partial'?'#a16207':'#dc2626'}}
.footer{text-align:center;font-size:10px;color:#9ca3af;margin-top:14px;border-top:1px solid #f3f4f6;padding-top:10px}
@media print{@page{margin:10mm}}
</style></head><body>
<div class="hdr"><h1>${coName || 'PHIDTECH'}</h1><p>Payment Receipt &nbsp;|&nbsp; ${s.id}</p><p>Date: ${s.date} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}</p></div>
<div class="body">
<div class="info">
  <div><div class="lbl">Customer</div><strong>${s.customerName}</strong>${s.customerPhone?`<br>${s.customerPhone}`:''}</div>
  <div style="text-align:right"><div class="lbl">Status</div><span class="badge">${s.status.toUpperCase()}</span></div>
</div>
<table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th>Unit Price (TZS)</th><th>Total (TZS)</th></tr></thead><tbody>${itemRows}</tbody></table>
<div style="max-width:240px;margin-left:auto">
  <div class="total-row"><span>Subtotal</span><span>${s.subtotal.toLocaleString()}</span></div>
  <div class="total-row" style="color:#dc2626"><span>Balance Due</span><span>${s.balance.toLocaleString()}</span></div>
</div>
<div class="net"><span class="lbl2">Total Invoice</span><span class="val">TZS ${s.amount.toLocaleString()}</span></div>
<div style="display:flex;justify-content:space-between;font-size:11.5px;background:#f0fdf4;border-radius:6px;padding:8px 14px">
  <span style="color:#15803d;font-weight:700">Amount Paid</span><span style="color:#15803d;font-weight:700">TZS ${s.paid.toLocaleString()}</span>
</div>
${s.notes?`<p style="font-size:11px;color:#6b7280;margin-top:10px">Note: ${s.notes}</p>`:''}
<div class="footer">${coName} &nbsp;|&nbsp; PHIDTECH Management System &nbsp;|&nbsp; Ref: ${s.id}</div>
</div>
<script>window.onload=()=>window.print();</script></body></html>`;
    const w = window.open("", "_blank", "width=620,height=820");
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Customer Sales"
        subtitle="Record sales, track payments and outstanding balances"
        icon={ShoppingCart}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className={`w-4 h-4 mr-2 ${importing ? "animate-pulse" : ""}`} />{importing ? "Importing..." : "Import CSV"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />New Sale</Button>
          </div>
        }
      />
      {importMsg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${importMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {importMsg.text}
        </div>
      )}

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["daily","weekly","monthly","all"] as const).map(p => (
          <button key={p} onClick={() => setStatPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              statPeriod === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}>
            {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : p === "monthly" ? "Monthly" : "All Time"}
          </button>
        ))}
        {statPeriod !== "all" && (
          <input type={statPeriod === "monthly" ? "month" : "date"}
            value={statPeriod === "monthly" ? statDate.slice(0,7) : statDate}
            onChange={e => setStatDate(statPeriod === "monthly" ? e.target.value + "-01" : e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue" value={formatCurrency(periodRev)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600"
          subtitle={statPeriod === "daily" ? statDate : statPeriod === "weekly" ? `${getWeekStart(statDate)} – ${getWeekEnd(statDate)}` : statPeriod === "monthly" ? statDate.slice(0,7) : "All time"} />
        <StatCard title="Amount Paid" value={formatCurrency(periodPaid)} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600"
          subtitle={`${periodSales.filter(s=>s.status==="paid").length} fully paid`} />
        <StatCard title="Outstanding" value={formatCurrency(periodOut)} icon={Clock} iconBg="bg-red-50" iconColor="text-red-500"
          subtitle={`${periodSales.filter(s=>s.status!=="paid").length} pending`} />
        <StatCard title="Total Revenue" value={formatCurrency(totalRev)} icon={ShoppingCart} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="All time" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Sales Register</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-200" />
            <p className="font-semibold text-gray-600">No sales yet</p>
            <p className="text-sm text-gray-400">Click &quot;New Sale&quot; to record the first sale.</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />New Sale</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs text-blue-700 font-semibold">{s.id}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(s.date)}</TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-800">{s.customerName}</p>
                    {s.customerAddress && <p className="text-xs text-gray-400 truncate max-w-[140px]">{s.customerAddress}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{s.customerPhone || "—"}</TableCell>
                  <TableCell className="text-right font-bold text-gray-900">{formatCurrency(s.amount)}</TableCell>
                  <TableCell className="text-right text-green-700 font-semibold">{formatCurrency(s.paid)}</TableCell>
                  <TableCell className="text-right text-red-600 font-semibold">{formatCurrency(s.balance)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[s.status]}`}>{s.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewItem(s)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" title="Print Receipt" onClick={() => printReceipt(s)}><Printer className="w-4 h-4 text-green-500" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Sale {viewItem?.id}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Customer</p>
                  <p className="font-bold text-gray-900 text-lg">{viewItem.customerName}</p>
                  {viewItem.customerPhone   && <p className="text-sm text-gray-500">📞 {viewItem.customerPhone}</p>}
                  {viewItem.customerAddress && <p className="text-sm text-gray-500">📍 {viewItem.customerAddress}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColors[viewItem.status]}`}>{viewItem.status.toUpperCase()}</span>
                  <p className="text-xs text-gray-400 mt-2">Date: {formatDate(viewItem.date)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewItem.items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell>{it.description}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(it.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="w-56 space-y-1.5 text-sm">
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-1.5"><span>Total</span><span className="text-blue-700">{formatCurrency(viewItem.amount)}</span></div>
                  <div className="flex justify-between text-green-700 font-semibold"><span>Paid</span><span>{formatCurrency(viewItem.paid)}</span></div>
                  <div className="flex justify-between text-red-600 font-semibold"><span>Balance</span><span>{formatCurrency(viewItem.balance)}</span></div>
                </div>
              </div>
              {viewItem.notes && <p className="text-sm text-gray-500 italic border-t border-gray-100 pt-3">Note: {viewItem.notes}</p>}
              {/* Accounting Ledger Entry */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Accounting Ledger Entry
                </p>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-slate-400">Dr</span>
                    <span className="flex-1 text-slate-700">{viewItem.paid > 0 ? "Cash / Bank" : "Accounts Receivable"}</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(viewItem.amount)}</span>
                  </div>
                  {viewItem.balance > 0 && viewItem.paid > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-slate-400">Dr</span>
                      <span className="flex-1 text-slate-700">Accounts Receivable (outstanding)</span>
                      <span className="font-bold text-orange-600">{formatCurrency(viewItem.balance)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 border-t border-slate-200 pt-1">
                    <span className="w-4 text-slate-400">Cr</span>
                    <span className="flex-1 text-slate-700 pl-4">Sales Revenue</span>
                    <span className="font-bold text-blue-700">{formatCurrency(viewItem.amount)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <p className="text-[10px] text-green-700 font-medium">Posted to revenue ledger · Ref: {viewItem.id}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
            <Button variant="outline" onClick={() => { if (viewItem) printReceipt(viewItem); }}><Printer className="w-4 h-4 mr-2" />Print Receipt</Button>
            <Button onClick={() => { if (viewItem) { openEdit(viewItem); setViewItem(null); } }}><Edit className="w-4 h-4 mr-2" />Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editItem ? <><Edit className="w-4 h-4" /> Edit Sale</> : <><BookOpen className="w-4 h-4 text-emerald-600" /> Record Sale in Books</>}
            </DialogTitle>
            {!editItem && (
              <p className="text-xs text-gray-500 mt-0.5">This sale will be posted as a revenue entry in the accounting ledger.</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {isGroupHQ && !editItem && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company *</label>
                  <Select value={form.saleCompanyId} onValueChange={v => sf({ saleCompanyId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select company for this sale" /></SelectTrigger>
                    <SelectContent>
                      {companies.map(co => <SelectItem key={co.id} value={co.id}>{co.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Customer *</label>
                <Select value={form.customerId} onValueChange={v => {
                  const c = customers.find(cu => cu.id === v) ?? null;
                  setSelCustomer(c); sf({ customerId: v }); setCustSearch("");
                }}>
                  <SelectTrigger><SelectValue placeholder="Select customer from list" /></SelectTrigger>
                  <SelectContent className="max-h-72 p-0">
                    {/* Search box — stopPropagation prevents Select hijacking keystrokes */}
                    <div className="px-2 pt-2 pb-1 border-b border-gray-100" onKeyDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                      <Input
                        placeholder="Search customer..."
                        value={custSearch}
                        onChange={e => setCustSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="overflow-y-auto max-h-52">
                    {(() => {
                      const formCo = form.saleCompanyId || cid;
                      const base = (isGroupHQ || !formCo)
                        ? customers
                        : customers.filter(c => c.companyId === formCo || c.companyId === "group" || !c.companyId);
                      const visibleCusts = custSearch
                        ? base.filter(c =>
                            c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
                            (c.company ?? "").toLowerCase().includes(custSearch.toLowerCase()) ||
                            (c.phone ?? "").includes(custSearch)
                          )
                        : base;
                      if (customers.length === 0) return (
                        <div className="px-3 py-4 text-center text-sm text-gray-400">No customers found. Add customers first.</div>
                      );
                      if (visibleCusts.length === 0) return (
                        <div className="px-3 py-4 text-center text-sm text-gray-400">No match for "{custSearch}"</div>
                      );
                      return visibleCusts.map(c => {
                        const custSales = sales.filter(s => s.customerId === c.id);
                        const custPaid  = custSales.reduce((s, x) => s + x.paid, 0);
                        const custBal   = custSales.reduce((s, x) => s + x.balance, 0);
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center justify-between gap-3 w-full">
                              <div>
                                <span className="font-medium">{c.name}</span>
                                {c.phone && <span className="text-gray-400 text-xs ml-1">· {c.phone}</span>}
                                {c._source && c._source !== "Customer" && (
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{c._source}</span>
                                )}
                              </div>
                              {custSales.length > 0 && (
                                <div className="text-xs shrink-0">
                                  <span className="text-green-600 font-medium">{formatCurrency(custPaid)}</span>
                                  {custBal > 0 && <span className="text-red-500 ml-1">/ {formatCurrency(custBal)} due</span>}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        );
                      });
                    })()}
                    </div>
                  </SelectContent>
                </Select>
                {selCustomer && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-0.5">
                    {selCustomer.phone   && <p>📞 {selCustomer.phone}</p>}
                    {selCustomer.address && <p>📍 {selCustomer.address}</p>}
                    {selCustomer.email   && <p>✉ {selCustomer.email}</p>}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date *</label>
                <Input type="date" value={form.date} onChange={e => sf({ date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount Paid (TZS)</label>
                <Input type="number" placeholder="0" value={form.paid} onChange={e => sf({ paid: e.target.value })} />
              </div>
            </div>

            {/* Accounting Entry Preview */}
            {previewCalc.amount > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Accounting Journal Entry Preview
                </p>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-slate-400">Dr</span>
                    <span className="flex-1 text-slate-700">{previewCalc.paid > 0 ? "Cash / Bank" : "Accounts Receivable"}</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(previewCalc.amount)}</span>
                  </div>
                  {previewCalc.balance > 0 && previewCalc.paid > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-slate-400">Dr</span>
                      <span className="flex-1 text-slate-700">Accounts Receivable (balance)</span>
                      <span className="font-bold text-orange-600">{formatCurrency(previewCalc.balance)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 border-t border-slate-200 pt-1">
                    <span className="w-4 text-slate-400">Cr</span>
                    <span className="flex-1 text-slate-700 pl-4">Sales Revenue</span>
                    <span className="font-bold text-blue-700">{formatCurrency(previewCalc.amount)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">This entry will be recorded in the revenue ledger upon saving.</p>
              </div>
            )}

            {/* Line Items */}
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Items / Services</p>
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-3 text-right">Unit Price</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1" />
              </div>
              {form.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-5 text-sm" placeholder="Item description" value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                  <Input className="col-span-2 text-sm text-center" type="number" value={it.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} />
                  <Input className="col-span-3 text-sm text-right" type="number" value={it.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)} />
                  <span className="col-span-1 text-xs font-semibold text-gray-700 text-right">{formatCurrency(it.total)}</span>
                  <Button variant="ghost" size="icon" className="col-span-1 h-7 w-7" onClick={() => sf({ items: form.items.filter((_,i) => i !== idx) })}>
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={() => sf({ items: [...form.items, emptyItem()] })}>+ Add Item</Button>
              <div className="border-t border-gray-100 pt-2 flex justify-end">
                <div className="w-52 space-y-1 text-sm">
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1"><span>Total</span><span>{formatCurrency(previewCalc.amount)}</span></div>
                  <div className="flex justify-between text-green-700"><span>Paid</span><span>{formatCurrency(previewCalc.paid)}</span></div>
                  <div className="flex justify-between text-red-600 font-semibold"><span>Balance Due</span><span>{formatCurrency(previewCalc.balance)}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Status</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${statusColors[previewCalc.status]}`}>{previewCalc.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Payment Plan</label>
                <Select value={form.paymentPlan ?? "once"} onValueChange={v => sf({ paymentPlan: v as Sale["paymentPlan"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time Payment</SelectItem>
                    <SelectItem value="monthly">Monthly Installments</SelectItem>
                    <SelectItem value="3months">Every 3 Months</SelectItem>
                    <SelectItem value="6months">Every 6 Months</SelectItem>
                    <SelectItem value="yearly">Annual Payment</SelectItem>
                  </SelectContent>
                </Select>
                {form.paymentPlan !== "once" && (
                  <p className="text-xs text-blue-600 mt-1">
                    {form.paymentPlan === "monthly" ? "Reminders sent on 25th, 27th, 30th each month" :
                     form.paymentPlan === "3months" ? "Reminders 3 days before each quarterly due date" :
                     form.paymentPlan === "6months" ? "Reminders 3 days before each semi-annual due date" :
                     "Reminders 3 days before annual due date"}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={e => sf({ dueDate: e.target.value })} />
                <p className="text-xs text-gray-400 mt-1">
                  {form.paymentPlan === "once" ? "Date full payment is expected" : "First payment due date"}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
              <Textarea placeholder="Optional notes..." value={form.notes} onChange={e => sf({ notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Save Sale"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Sale</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) {
                await fetch(`/api/accounting/sales?id=${deleteId}`, { method: "DELETE" });
                setDeleteId(null);
                await reload();
              }
            }}>
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
