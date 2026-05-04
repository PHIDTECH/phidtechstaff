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
import { ShoppingCart, Plus, Search, DollarSign, CheckCircle, Clock, AlertCircle, Edit, Trash2, Eye, X, BookOpen } from "lucide-react";
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
  totalRevenue?: number;
}
interface SaleItem { description: string; quantity: number; unitPrice: number; total: number; }
interface Sale {
  id: string; companyId: string; date: string;
  customerId: string; customerName: string; customerPhone: string; customerAddress: string;
  items: SaleItem[]; subtotal: number; tax: number; amount: number;
  paid: number; balance: number;
  status: "paid" | "partial" | "unpaid";
  notes: string; createdAt: string;
}

const emptyItem = (): SaleItem => ({ description: "", quantity: 1, unitPrice: 0, total: 0 });
const emptyForm = () => ({
  customerId: "", date: new Date().toISOString().slice(0, 10),
  items: [emptyItem()], paid: "", notes: "", saleCompanyId: "",
});

const statusColors: Record<string, string> = {
  paid:    "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  unpaid:  "bg-red-100 text-red-800",
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

  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const c = getActiveCid(sess);
    setCid(c); cidRef.current = c;
    setCompanies(lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []));
    // Load customers from server API
    try {
      const cr = await fetch("/api/customers", { cache: "no-store" });
      if (cr.ok) { const d: Customer[] = await cr.json(); setCustomers(Array.isArray(d) ? d : []); }
      else setCustomers(lsGet<Customer[]>(CUSTOMERS_KEY, []));
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

  const save = async (list: Sale[]) => {
    setSales(list);
    lsSet(SALES_KEY, list); // local fallback
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
    setForm({ customerId: s.customerId, date: s.date, items: s.items.length ? s.items : [emptyItem()], paid: String(s.paid), notes: s.notes, saleCompanyId: s.companyId });
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
        items: filled, subtotal, tax, amount, paid, balance, status, notes: form.notes };
      await fetch("/api/accounting/sales", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    } else {
      const saleNum = `SAL-${Date.now().toString().slice(-6)}`;
      const newSale: Sale = {
        id: saleNum, companyId: form.saleCompanyId || cidRef.current || cid,
        date: form.date, customerId: form.customerId,
        customerName: cust?.name ?? "", customerPhone: cust?.phone ?? "",
        customerAddress: cust?.address ?? "",
        items: filled, subtotal, tax, amount, paid, balance, status,
        notes: form.notes, createdAt: new Date().toISOString(),
      };
      await fetch("/api/accounting/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSale) });
    }
    setShowDialog(false);
    await reload();
  };

  const previewCalc = recalc(form.items, form.paid);

  return (
    <MainLayout>
      <PageHeader
        title="Customer Sales"
        subtitle="Record sales, track payments and outstanding balances"
        icon={ShoppingCart}
        actions={
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />New Sale</Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today&apos;s Revenue" value={formatCurrency(dailyRev)}   icon={DollarSign}   iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Monthly Revenue"  value={formatCurrency(monthRev)}   icon={CheckCircle}  iconBg="bg-green-50"  iconColor="text-green-600"  subtitle="This month" />
        <StatCard title="Total Revenue"    value={formatCurrency(totalRev)}   icon={ShoppingCart} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Outstanding"      value={formatCurrency(totalRev - totalPaid)} icon={Clock} iconBg="bg-red-50"    iconColor="text-red-500"    subtitle="Unpaid" />
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
                  setSelCustomer(c); sf({ customerId: v });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select customer from list" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {(() => {
                      const formCo = form.saleCompanyId || cid;
                      const visibleCusts = formCo ? customers.filter(c => c.companyId === formCo) : customers;
                      if (visibleCusts.length === 0) return (
                        <div className="px-3 py-4 text-center text-sm text-gray-400">{isGroupHQ && !form.saleCompanyId ? "Select a company first" : "No customers found"}</div>
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
                                {c.company && <span className="text-gray-400 text-xs ml-1">· {c.company}</span>}
                                {c.phone   && <span className="text-gray-400 text-xs ml-1">· {c.phone}</span>}
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
