"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, Edit, Trash2, Download, RefreshCw, CreditCard, Search, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY     = "phidtech_group_company";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

interface Session  { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface Company  { id: string; name: string; }
interface Creditor {
  id: string; companyId: string;
  name: string; contact?: string; email?: string; phone?: string;
  category: string; description?: string;
  amount: number; amountPaid: number; balance: number;
  dueDate?: string; status: "pending" | "partial" | "paid" | "overdue";
  notes?: string; createdAt: string; updatedAt: string;
}

const CATEGORIES = [
  "Supplier","Bank Loan","Government Tax","Utilities","Rent","Salary Arrears",
  "Equipment Finance","Insurance","Professional Services","Other",
];
const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800",
  partial:  "bg-blue-100 text-blue-700",
  paid:     "bg-green-100 text-green-700",
  overdue:  "bg-red-100 text-red-700",
};

const emptyForm = () => ({
  name: "", contact: "", email: "", phone: "",
  category: "", description: "", amount: "",
  amountPaid: "0", dueDate: "", status: "pending" as Creditor["status"],
  notes: "", saleCompanyId: "",
});

export default function CreditorsPage() {
  usePermissionGuard("accounting");
  const [creditors,  setCreditors]  = useState<Creditor[]>([]);
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [session,    setSession]    = useState<Session | null>(null);
  const [cid,        setCid]        = useState("");
  const [groupCid,   setGroupCid]   = useState("");
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem,   setEditItem]   = useState<Creditor | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState(emptyForm());
  const [formError,  setFormError]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const sf = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));

  const loadData = async () => {
    setLoading(true);
    try {
      const sess = lsGet<Session>(SESSION_KEY, null as never);
      setSession(sess);
      const activeCid = getActiveCid(sess);
      setCid(activeCid);
      setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
      setGroupCid(lsGet<string>(GROUP_KEY, ""));
      const r = await fetch("/api/creditors", { cache: "no-store" });
      if (r.ok) setCreditors(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isGroupView = !cid || cid === groupCid;
  const today = new Date().toISOString().slice(0, 10);

  // Auto-flag overdue
  const enriched: Creditor[] = creditors.map(c => ({
    ...c,
    status: c.status !== "paid" && c.dueDate && c.dueDate < today ? "overdue" : c.status,
  }));

  const displayed = enriched
    .filter(c => isGroupView || c.companyId === cid)
    .filter(c => statusFilter === "all" || c.status === statusFilter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.category ?? "").toLowerCase().includes(search.toLowerCase()));

  const totalOwed    = displayed.filter(c => c.status !== "paid").reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalPaid    = displayed.reduce((s, c) => s + (c.amountPaid ?? 0), 0);
  const overdueCnt   = displayed.filter(c => c.status === "overdue").length;
  const pendingCnt   = displayed.filter(c => c.status === "pending" || c.status === "partial").length;

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError(""); setShowDialog(true);
  };
  const openEdit = (c: Creditor) => {
    setEditItem(c);
    setForm({ name: c.name, contact: c.contact ?? "", email: c.email ?? "", phone: c.phone ?? "", category: c.category, description: c.description ?? "", amount: String(c.amount), amountPaid: String(c.amountPaid), dueDate: c.dueDate ?? "", status: c.status, notes: c.notes ?? "", saleCompanyId: c.companyId });
    setFormError(""); setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.name.trim())    { setFormError("Enter creditor name."); return; }
    if (!form.category)       { setFormError("Select a category."); return; }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { setFormError("Enter a valid amount."); return; }
    setSaving(true);
    const activeCid = form.saleCompanyId || cid || session?.companyId || groupCid || "group";
    const payload = {
      name: form.name.trim(), contact: form.contact, email: form.email, phone: form.phone,
      category: form.category, description: form.description,
      amount: Number(form.amount), amountPaid: Number(form.amountPaid || 0),
      dueDate: form.dueDate || undefined, status: form.status,
      notes: form.notes, companyId: activeCid,
    };
    try {
      const res = editItem
        ? await fetch("/api/creditors", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editItem.id, ...payload }) })
        : await fetch("/api/creditors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { setFormError("Save failed. Try again."); return; }
      setShowDialog(false); await loadData();
    } catch { setFormError("Network error. Try again."); }
    finally { setSaving(false); }
  };

  const deleteItem = async () => {
    if (!deleteId) return;
    await fetch(`/api/creditors?id=${deleteId}`, { method: "DELETE" });
    setDeleteId(null); await loadData();
  };

  const downloadCSV = () => {
    const header = "Name,Category,Amount Owed,Amount Paid,Balance,Due Date,Status,Contact,Notes";
    const rows = displayed.map(c =>
      `"${c.name}","${c.category}","${c.amount}","${c.amountPaid}","${c.balance}","${c.dueDate ?? ""}","${c.status}","${c.contact ?? ""}","${(c.notes ?? "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `Creditors_${today}.csv`; a.click();
  };

  const isGroupHQ = !cid || cid === groupCid;

  return (
    <MainLayout>
      <PageHeader
        title="Creditors"
        subtitle="Manage amounts owed to suppliers, lenders, and other creditors"
        icon={CreditCard}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />Add Creditor
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Owed</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalOwed)}</p>
          <p className="text-xs text-gray-400">{pendingCnt + overdueCnt} outstanding</p>
        </div>
        <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Paid</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Overdue</p>
          <p className="text-xl font-bold text-orange-600">{overdueCnt}</p>
          <p className="text-xs text-gray-400">Past due date</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Records</p>
          <p className="text-xl font-bold text-gray-800">{displayed.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search creditor or category…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Creditor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">Loading…</TableCell></TableRow>
            ) : displayed.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">No creditors found.</TableCell></TableRow>
            ) : displayed.map(c => (
              <TableRow key={c.id} className="hover:bg-gray-50">
                <TableCell>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                </TableCell>
                <TableCell><span className="text-sm text-gray-600">{c.category}</span></TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(c.amountPaid)}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">{formatCurrency(c.balance)}</TableCell>
                <TableCell className="text-sm text-gray-600">{c.dueDate ? formatDate(c.dueDate) : "—"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {c.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteId(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Creditor" : "Add Creditor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Creditor Name *</label>
                <Input value={form.name} onChange={e => sf({ name: e.target.value })} placeholder="e.g. ABC Suppliers Ltd" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category *</label>
                <Select value={form.category} onValueChange={v => sf({ category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v as Creditor["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Total Amount Owed *</label>
                <Input type="number" min="0" value={form.amount} onChange={e => sf({ amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount Already Paid</label>
                <Input type="number" min="0" value={form.amountPaid} onChange={e => sf({ amountPaid: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={e => sf({ dueDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={e => sf({ phone: e.target.value })} placeholder="+255…" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Contact Person</label>
                <Input value={form.contact} onChange={e => sf({ contact: e.target.value })} placeholder="Name" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <Input type="email" value={form.email} onChange={e => sf({ email: e.target.value })} placeholder="email@example.com" />
              </div>
              {isGroupHQ && !editItem && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company *</label>
                  <Select value={form.saleCompanyId} onValueChange={v => sf({ saleCompanyId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>{companies.map(co => <SelectItem key={co.id} value={co.id}>{co.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
                <Textarea rows={2} value={form.description} onChange={e => sf({ description: e.target.value })} placeholder="What is this debt for?" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
                <Textarea rows={2} value={form.notes} onChange={e => sf({ notes: e.target.value })} placeholder="Additional notes…" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm} disabled={saving}>{saving ? "Saving…" : editItem ? "Save Changes" : "Add Creditor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Creditor</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">This will permanently remove the creditor record. Are you sure?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteItem}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
