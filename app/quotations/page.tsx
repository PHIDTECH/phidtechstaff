"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Download, Eye, Search, DollarSign, CheckCircle, Clock, Send, Trash2, AlertCircle, X } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { getActiveCid } from "@/lib/getActiveCid";

const SESSION_KEY   = "phidtech_session";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface LineItem { description: string; qty: number; unitPrice: number; }
interface Quotation {
  id: string; quoteNumber: string; companyId: string;
  clientName: string; clientEmail?: string; clientPhone?: string; clientAddress?: string;
  validUntil: string; items: LineItem[];
  discount: number; taxRate: number;
  subtotal: number; taxAmount: number; total: number;
  notes?: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  createdAt: string;
}

const emptyItem = (): LineItem => ({ description: "", qty: 1, unitPrice: 0 });
const emptyForm = () => ({
  clientName: "", clientEmail: "", clientPhone: "", clientAddress: "",
  validUntil: "", items: [emptyItem()],
  discount: 0, taxRate: 0, notes: "",
});

function calcTotals(items: LineItem[], discount: number, taxRate: number) {
  const subtotal  = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const afterDisc = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(afterDisc * (taxRate / 100));
  const total     = afterDisc + taxAmount;
  return { subtotal, taxAmount, total };
}

export default function QuotationsPage() {
  const [session, setSession]       = useState<{id:string;name:string;isSuperAdmin:boolean;companyId:string}|null>(null);
  const [quotes, setQuotes]         = useState<Quotation[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem]     = useState<Quotation | null>(null);
  const [viewQuote, setViewQuote]   = useState<Quotation | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [formError, setFormError]   = useState("");

  const reload = async () => {
    const sess = lsGet<{id:string;name:string;isSuperAdmin:boolean;companyId:string}>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = getActiveCid(sess);
    setActiveCompanyId(cid);
    try {
      const r = await fetch("/api/quotations", { cache: "no-store" });
      if (r.ok) setQuotes(await r.json());
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  const cid = activeCompanyId;
  const companyQuotes = cid ? quotes.filter(q => q.companyId === cid) : quotes;
  const filtered = companyQuotes.filter(q => {
    const ms = q.clientName.toLowerCase().includes(search.toLowerCase()) ||
               q.quoteNumber.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === "all" || q.status === statusFilter;
    return ms && mf;
  });

  const totalValue = companyQuotes.reduce((s, q) => s + q.total, 0);
  const accepted   = companyQuotes.filter(q => q.status === "accepted").length;
  const pending    = companyQuotes.filter(q => q.status === "sent").length;

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const updateItem = (i: number, f: Partial<LineItem>) =>
    sf({ items: form.items.map((it, idx) => idx === i ? { ...it, ...f } : it) });
  const addItem    = () => sf({ items: [...form.items, emptyItem()] });
  const removeItem = (i: number) => sf({ items: form.items.filter((_, idx) => idx !== i) });

  const { subtotal, taxAmount, total } = calcTotals(form.items, form.discount, form.taxRate);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (q: Quotation) => {
    setEditItem(q);
    setForm({
      clientName: q.clientName, clientEmail: q.clientEmail ?? "",
      clientPhone: q.clientPhone ?? "", clientAddress: q.clientAddress ?? "",
      validUntil: q.validUntil, items: q.items.map(i => ({ ...i })),
      discount: q.discount, taxRate: q.taxRate, notes: q.notes ?? "",
    });
    setFormError("");
    setShowDialog(true);
  };

  const saveQuote = async (status: "draft" | "sent") => {
    if (!form.clientName.trim()) { setFormError("Client name is required."); return; }
    if (!form.validUntil)        { setFormError("Valid Until date is required."); return; }
    if (form.items.every(i => !i.description.trim())) { setFormError("Add at least one line item."); return; }
    const { subtotal, taxAmount, total } = calcTotals(form.items, form.discount, form.taxRate);
    const now = new Date().toISOString();
    if (editItem) {
      const body = {
        ...editItem, clientName: form.clientName.trim(), clientEmail: form.clientEmail,
        clientPhone: form.clientPhone, clientAddress: form.clientAddress,
        validUntil: form.validUntil, items: form.items, discount: form.discount,
        taxRate: form.taxRate, subtotal, taxAmount, total, notes: form.notes, status,
      };
      await fetch("/api/quotations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      const seq = (quotes.filter(q => q.companyId === cid).length + 1).toString().padStart(4, "0");
      const body: Quotation = {
        id: `q-${Date.now()}`, quoteNumber: `QT-${seq}`, companyId: cid,
        clientName: form.clientName.trim(), clientEmail: form.clientEmail,
        clientPhone: form.clientPhone, clientAddress: form.clientAddress,
        validUntil: form.validUntil, items: form.items,
        discount: form.discount, taxRate: form.taxRate,
        subtotal, taxAmount, total, notes: form.notes,
        status, createdAt: now,
      };
      await fetch("/api/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    await reload();
    setShowDialog(false);
  };

  const markStatus = async (id: string, status: Quotation["status"]) => {
    const q = quotes.find(x => x.id === id);
    if (!q) return;
    await fetch("/api/quotations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...q, status }) });
    await reload();
    if (viewQuote?.id === id) setViewQuote(v => v ? { ...v, status } : v);
  };

  const deleteQuote = async (id: string) => {
    await fetch(`/api/quotations?id=${id}`, { method: "DELETE" });
    await reload();
    setDeleteId(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Quotations"
        subtitle="Create and manage sales quotations and proposals"
        icon={FileText}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> New Quotation
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Quoted"  value={formatCurrency(totalValue)}     icon={DollarSign}  iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Accepted"      value={accepted}                        icon={CheckCircle} iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatCard title="Sent / Pending" value={pending}                        icon={Clock}       iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Total Quotes"  value={companyQuotes.length}            icon={FileText}    iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search client or quote #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <FileText className="w-10 h-10 text-gray-200" />
            <p className="font-semibold text-gray-700">No quotations found</p>
            <p className="text-sm text-gray-400">Click "New Quotation" to create your first one.</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />New Quotation</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(q => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-blue-50/30" onClick={() => setViewQuote(q)}>
                  <TableCell className="font-mono font-medium text-blue-700">{q.quoteNumber}</TableCell>
                  <TableCell className="font-medium text-gray-800">{q.clientName}</TableCell>
                  <TableCell className="text-sm text-gray-500">{q.items.filter(i=>i.description).length} items</TableCell>
                  <TableCell className="text-gray-700">{formatCurrency(q.subtotal)}</TableCell>
                  <TableCell className="text-orange-600">{q.discount > 0 ? `-${formatCurrency(q.discount)}` : "—"}</TableCell>
                  <TableCell className="font-bold text-gray-900">{formatCurrency(q.total)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(q.validUntil)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(q.status)}`}>
                      {q.status}
                    </span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="View" onClick={() => setViewQuote(q)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(q)}>
                        <FileText className="w-4 h-4 text-blue-400" />
                      </Button>
                      {q.status === "draft" && (
                        <Button variant="ghost" size="icon" title="Mark as Sent" onClick={() => markStatus(q.id, "sent")}>
                          <Send className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteId(q.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? `Edit ${editItem.quoteNumber}` : "Create New Quotation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            {/* Client details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Client Details</p>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Client / Company Name <span className="text-red-500">*</span></label>
                <Input
                  placeholder="e.g. Acme Corporation"
                  value={form.clientName}
                  onChange={e => sf({ clientName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                  <Input type="email" placeholder="client@email.com" value={form.clientEmail} onChange={e => sf({ clientEmail: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                  <Input type="tel" placeholder="+255 7xx xxx xxx" value={form.clientPhone} onChange={e => sf({ clientPhone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Address</label>
                <Input placeholder="Client address (optional)" value={form.clientAddress} onChange={e => sf({ clientAddress: e.target.value })} />
              </div>
            </div>

            {/* Valid Until */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Valid Until <span className="text-red-500">*</span></label>
              <Input type="date" value={form.validUntil} onChange={e => sf({ validUntil: e.target.value })} />
            </div>

            {/* Line Items */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Line Items</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-3 text-right">Unit Price</span>
                  <span className="col-span-1 text-right">Total</span>
                  <span className="col-span-1"></span>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 items-center">
                    <Input
                      placeholder="Item description"
                      value={item.description}
                      onChange={e => updateItem(i, { description: e.target.value })}
                      className="col-span-5 text-sm h-8"
                    />
                    <Input
                      type="number" min="1" placeholder="1"
                      value={item.qty || ""}
                      onChange={e => updateItem(i, { qty: Number(e.target.value) || 1 })}
                      className="col-span-2 text-sm h-8 text-right"
                    />
                    <Input
                      type="number" min="0" placeholder="0"
                      value={item.unitPrice || ""}
                      onChange={e => updateItem(i, { unitPrice: Number(e.target.value) || 0 })}
                      className="col-span-3 text-sm h-8 text-right"
                    />
                    <span className="col-span-1 text-xs font-medium text-gray-700 text-right">
                      {(item.qty * item.unitPrice).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeItem(i)}
                      disabled={form.items.length === 1}
                      className="col-span-1 flex justify-center text-red-400 hover:text-red-600 disabled:opacity-20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="px-3 py-2 border-t border-gray-100">
                  <Button variant="ghost" size="sm" className="text-blue-600 text-xs h-7" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" /> Add Line Item
                  </Button>
                </div>
              </div>
            </div>

            {/* Discount / Tax / Totals */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Discount (TZS)</label>
                <Input type="number" min="0" placeholder="0"
                  value={form.discount || ""}
                  onChange={e => sf({ discount: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tax Rate (%)</label>
                <Input type="number" min="0" max="100" placeholder="0"
                  value={form.taxRate || ""}
                  onChange={e => sf({ taxRate: Number(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Live totals */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              {form.discount > 0 && <div className="flex justify-between text-orange-600"><span>Discount</span><span>-{formatCurrency(form.discount)}</span></div>}
              {form.taxRate > 0 && <div className="flex justify-between text-gray-600"><span>Tax ({form.taxRate}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
              <div className="flex justify-between font-bold text-blue-900 border-t border-blue-200 pt-1.5">
                <span>Total</span><span className="text-lg">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes / Terms</label>
              <Textarea placeholder="Payment terms, special conditions..." rows={2}
                value={form.notes} onChange={e => sf({ notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => saveQuote("draft")}>
              <FileText className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button onClick={() => saveQuote("sent")}>
              <Send className="w-4 h-4 mr-2" /> Create & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Quotation {viewQuote?.quoteNumber}</span>
              {viewQuote && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(viewQuote.status)}`}>
                  {viewQuote.status.toUpperCase()}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1 font-medium">PREPARED FOR</p>
                  <p className="font-bold text-gray-900">{viewQuote.clientName}</p>
                  {viewQuote.clientEmail    && <p className="text-xs text-gray-500 mt-0.5">✉ {viewQuote.clientEmail}</p>}
                  {viewQuote.clientPhone    && <p className="text-xs text-gray-500">📞 {viewQuote.clientPhone}</p>}
                  {viewQuote.clientAddress  && <p className="text-xs text-gray-500">📍 {viewQuote.clientAddress}</p>}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1 font-medium">QUOTE DETAILS</p>
                  <p className="text-xs text-gray-600">Quote No: <strong>{viewQuote.quoteNumber}</strong></p>
                  <p className="text-xs text-gray-600">Valid Until: <strong>{formatDate(viewQuote.validUntil)}</strong></p>
                  <p className="text-xs text-gray-600">Created: <strong>{formatDate(viewQuote.createdAt)}</strong></p>
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
                  {viewQuote.items.filter(i => i.description).map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.qty * item.unitPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(viewQuote.subtotal)}</span></div>
                  {viewQuote.discount > 0 && <div className="flex justify-between text-orange-600"><span>Discount</span><span>-{formatCurrency(viewQuote.discount)}</span></div>}
                  {viewQuote.taxRate > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax ({viewQuote.taxRate}%)</span><span>{formatCurrency(viewQuote.taxAmount)}</span></div>}
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-1.5 text-blue-800">
                    <span>Total</span><span className="text-lg">{formatCurrency(viewQuote.total)}</span>
                  </div>
                </div>
              </div>
              {viewQuote.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">NOTES / TERMS</p>
                  <p className="text-sm text-gray-700">{viewQuote.notes}</p>
                </div>
              )}
              {/* Quick status actions */}
              {viewQuote.status !== "accepted" && viewQuote.status !== "rejected" && (
                <div className="flex gap-2 pt-1">
                  {viewQuote.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => markStatus(viewQuote.id, "sent")}>
                      <Send className="w-4 h-4 mr-1" /> Mark as Sent
                    </Button>
                  )}
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => markStatus(viewQuote.id, "accepted")}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => markStatus(viewQuote.id, "rejected")}>
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewQuote(null)}>Close</Button>
            {viewQuote && (
              <Button variant="outline" onClick={() => { openEdit(viewQuote); setViewQuote(null); }}>
                <FileText className="w-4 h-4 mr-2" /> Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Quotation</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this quotation? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteQuote(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
