"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Search, Download, Eye, CheckCircle, Clock, AlertCircle, Edit, Trash2, X } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const ACTIVE_KEY    = "phidtech_active_company";
const INVOICES_KEY  = "phidtech_invoices";
const CUSTOMERS_KEY = "phidtech_customers";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface Customer { id: string; name: string; companyId: string; email?: string; address?: string; phone?: string; }
interface LineItem { description: string; quantity: number; unitPrice: number; total: number; }
interface Invoice {
  id: string; companyId: string; invoiceNumber: string; customerId: string;
  issueDate: string; dueDate: string;
  items: LineItem[]; subtotal: number; tax: number; total: number;
  status: "draft" | "sent" | "paid" | "overdue";
  createdAt: string;
}

const TAX_RATE = 0.18;
const emptyLine = (): LineItem => ({ description: "", quantity: 1, unitPrice: 0, total: 0 });
const emptyForm = () => ({
  customerId: "", issueDate: "", dueDate: "",
  status: "draft" as Invoice["status"],
  items: [emptyLine()],
});

export default function InvoicesPage() {
  usePermissionGuard("invoices");
  const [invoices, setInvoices]           = useState<Invoice[]>([]);
  const [customers, setCustomers]         = useState<Customer[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [showDialog, setShowDialog]       = useState(false);
  const [editItem, setEditItem]           = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice]     = useState<Invoice | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setActiveCompanyId(cid);
    cidRef.current = cid;
    setInvoices(lsGet<Invoice[]>(INVOICES_KEY, []));
    setCustomers(lsGet<Customer[]>(CUSTOMERS_KEY, []));
  };

  useEffect(() => { reload(); }, []);

  const cid              = cidRef.current || activeCompanyId;
  const companyInvoices  = cid ? invoices.filter(i => i.companyId === cid) : invoices;
  const companyCustomers = cid ? customers.filter(c => c.companyId === cid) : customers;

  const filtered = companyInvoices.filter(i => {
    const cust        = companyCustomers.find(c => c.id === i.customerId);
    const matchSearch = i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (cust?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paid     = companyInvoices.filter(i => i.status === "paid");
  const unpaid   = companyInvoices.filter(i => i.status === "sent");
  const overdue  = companyInvoices.filter(i => i.status === "overdue");
  const totalRevenue     = paid.reduce((s, i) => s + i.total, 0);
  const totalOutstanding = [...unpaid, ...overdue].reduce((s, i) => s + i.total, 0);

  const save = (list: Invoice[]) => { lsSet(INVOICES_KEY, list); setInvoices(list); };

  const recalc = (items: LineItem[]) => {
    const sub  = items.reduce((s, it) => s + it.total, 0);
    const tax  = Math.round(sub * TAX_RATE);
    return { subtotal: sub, tax, total: sub + tax };
  };

  const updateLine = (idx: number, field: keyof LineItem, val: string) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: field === "description" ? val : Number(val) || 0 };
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    });
    setForm(p => ({ ...p, items }));
  };

  const addLine    = () => setForm(p => ({ ...p, items: [...p.items, emptyLine()] }));
  const removeLine = (idx: number) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditItem(inv);
    setForm({
      customerId: inv.customerId, issueDate: inv.issueDate, dueDate: inv.dueDate,
      status: inv.status, items: inv.items.length ? inv.items : [emptyLine()],
    });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = (status: Invoice["status"]) => {
    if (!form.customerId)  { setFormError("Select a customer."); return; }
    if (!form.issueDate)   { setFormError("Select an issue date."); return; }
    if (!form.dueDate)     { setFormError("Select a due date."); return; }
    const filledItems = form.items.filter(it => it.description.trim());
    if (filledItems.length === 0) { setFormError("Add at least one line item."); return; }

    const { subtotal, tax, total } = recalc(filledItems);
    const invNum = editItem?.invoiceNumber ?? `INV-${Date.now().toString().slice(-6)}`;

    if (editItem) {
      const updated = invoices.map(i => i.id === editItem.id ? {
        ...i, customerId: form.customerId, issueDate: form.issueDate,
        dueDate: form.dueDate, items: filledItems, subtotal, tax, total, status,
      } : i);
      save(updated);
    } else {
      const newInv: Invoice = {
        id: `inv-${Date.now()}`,
        companyId: cidRef.current || activeCompanyId,
        invoiceNumber: invNum, customerId: form.customerId,
        issueDate: form.issueDate, dueDate: form.dueDate,
        items: filledItems, subtotal, tax, total, status,
        createdAt: new Date().toISOString(),
      };
      save([...invoices, newInv]);
    }
    setShowDialog(false);
  };

  const deleteInvoice = (id: string) => { save(invoices.filter(i => i.id !== id)); setDeleteId(null); };

  const { subtotal: previewSub, tax: previewTax, total: previewTotal } = recalc(form.items);

  return (
    <MainLayout>
      <PageHeader
        title="Invoices"
        subtitle="Manage client invoices and payments"
        icon={FileText}
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Invoiced"  value={formatCurrency(companyInvoices.reduce((s,i)=>s+i.total,0))} icon={FileText}     iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Collected"       value={formatCurrency(totalRevenue)}     icon={CheckCircle} iconBg="bg-green-50"  iconColor="text-green-600"  subtitle={`${paid.length} invoices`} />
        <StatCard title="Outstanding"     value={formatCurrency(totalOutstanding)} icon={Clock}       iconBg="bg-yellow-50" iconColor="text-yellow-600" subtitle={`${unpaid.length} pending`} />
        <StatCard title="Overdue"         value={formatCurrency(overdue.reduce((s,i)=>s+i.total,0))} icon={AlertCircle}   iconBg="bg-red-50"    iconColor="text-red-500"    subtitle={`${overdue.length} invoices`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Invoice Register</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <FileText className="w-7 h-7 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-700">No invoices yet</p>
            <p className="text-sm text-gray-400">Click &quot;New Invoice&quot; to create the first one.</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Tax (18%)</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => {
                const cust = companyCustomers.find(c => c.id === inv.customerId);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium text-blue-700">{inv.invoiceNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-800">{cust?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{cust?.address ?? cust?.phone ?? ""}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDate(inv.issueDate)}</TableCell>
                    <TableCell className={`text-sm ${inv.status === "overdue" ? "text-red-600 font-medium" : "text-gray-600"}`}>
                      {formatDate(inv.dueDate)}
                    </TableCell>
                    <TableCell className="text-gray-700">{formatCurrency(inv.subtotal)}</TableCell>
                    <TableCell className="text-gray-500">{formatCurrency(inv.tax)}</TableCell>
                    <TableCell className="font-bold text-gray-900">{formatCurrency(inv.total)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(inv.status)}`}>{inv.status}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(inv)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(inv.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Invoice {viewInvoice?.invoiceNumber}</DialogTitle></DialogHeader>
          {viewInvoice && (() => {
            const cust = companyCustomers.find(c => c.id === viewInvoice.customerId);
            return (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Bill To</p>
                    <p className="font-bold text-gray-900">{cust?.name ?? "—"}</p>
                    {cust?.email   && <p className="text-sm text-gray-500">{cust.email}</p>}
                    {cust?.phone   && <p className="text-sm text-gray-500">{cust.phone}</p>}
                    {cust?.address && <p className="text-sm text-gray-500">{cust.address}</p>}
                  </div>
                  <div className="text-right">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(viewInvoice.status)}`}>
                      {viewInvoice.status.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">Issued: {formatDate(viewInvoice.issueDate)}</p>
                    <p className="text-xs text-gray-400">Due: {formatDate(viewInvoice.dueDate)}</p>
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
                    {viewInvoice.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end">
                  <div className="w-56 space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(viewInvoice.subtotal)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Tax (18%)</span><span>{formatCurrency(viewInvoice.tax)}</span></div>
                    <div className="flex justify-between font-bold border-t border-gray-200 pt-1.5">
                      <span>Total</span><span className="text-blue-700">{formatCurrency(viewInvoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewInvoice(null)}>Close</Button>
            <Button onClick={() => { if (viewInvoice) { openEdit(viewInvoice); setViewInvoice(null); } }}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Invoice" : "Create New Invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            {/* Customer selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Customer</label>
              <Select value={form.customerId} onValueChange={v => setForm(p => ({ ...p, customerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {companyCustomers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-medium">{c.name}</span>
                      {(c.phone || c.address) && (
                        <span className="text-gray-400 text-xs ml-2">{c.phone ?? c.address}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Show selected customer details */}
              {form.customerId && (() => {
                const c = companyCustomers.find(cu => cu.id === form.customerId);
                if (!c) return null;
                return (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-0.5">
                    {c.phone   && <p>📞 {c.phone}</p>}
                    {c.address && <p>📍 {c.address}</p>}
                    {c.email   && <p>✉ {c.email}</p>}
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Issue Date</label>
                <Input type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as Invoice["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Line Items</p>
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-3 text-right">Unit Price</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1" />
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-5 text-sm" placeholder="Item description"
                    value={item.description} onChange={e => updateLine(idx, "description", e.target.value)} />
                  <Input className="col-span-2 text-sm text-center" type="number" placeholder="1"
                    value={item.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)} />
                  <Input className="col-span-3 text-sm text-right" type="number" placeholder="0"
                    value={item.unitPrice} onChange={e => updateLine(idx, "unitPrice", e.target.value)} />
                  <span className="col-span-1 text-xs font-semibold text-gray-700 text-right">{formatCurrency(item.total)}</span>
                  <Button variant="ghost" size="icon" className="col-span-1 h-7 w-7" onClick={() => removeLine(idx)}>
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={addLine}>+ Add Line Item</Button>
              {/* Totals preview */}
              <div className="border-t border-gray-100 pt-2 flex justify-end">
                <div className="w-48 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(previewSub)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Tax (18%)</span><span>{formatCurrency(previewTax)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1"><span>Total</span><span>{formatCurrency(previewTotal)}</span></div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => saveForm("draft")}>Save Draft</Button>
            <Button onClick={() => saveForm("sent")}>Create &amp; Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Invoice</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteInvoice(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
