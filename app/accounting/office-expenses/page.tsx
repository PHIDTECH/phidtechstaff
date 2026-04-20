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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Search, CheckCircle, Clock, XCircle, DollarSign, Edit, Trash2, Eye, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SESSION_KEY        = "phidtech_session";
const ACTIVE_KEY         = "phidtech_active_company";
const OFFICE_EXP_KEY     = "phidtech_office_expenses";
const USERS_KEY          = "phidtech_users";
const COMPANIES_KEY      = "phidtech_companies";
const GROUP_KEY          = "phidtech_group_company";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; position?: string; department?: string; }
interface Company { id: string; name: string; }
interface OfficeExpense {
  id: string; companyId: string; recordedBy: string;
  title: string; category: string; amount: number;
  description: string; referenceNo: string;
  status: "pending" | "approved" | "rejected" | "paid";
  date: string; createdAt: string; approvedBy?: string;
}

const OFFICE_EXPENSE_CATEGORIES = [
  "Advertisement & Marketing",
  "TRA / Tax Payments",
  "Licences & Permits",
  "Rent & Utilities",
  "Internet & Telecoms",
  "Insurance",
  "Bank Charges",
  "Office Supplies",
  "Repairs & Maintenance",
  "Transport & Fuel",
  "Legal & Professional Fees",
  "Government Levies",
  "Miscellaneous",
];

const categoryColors: Record<string, string> = {
  "Advertisement & Marketing": "bg-pink-100 text-pink-800",
  "TRA / Tax Payments":        "bg-red-100 text-red-800",
  "Licences & Permits":        "bg-yellow-100 text-yellow-800",
  "Rent & Utilities":          "bg-blue-100 text-blue-800",
  "Internet & Telecoms":       "bg-cyan-100 text-cyan-800",
  "Insurance":                 "bg-indigo-100 text-indigo-800",
  "Bank Charges":              "bg-gray-100 text-gray-800",
  "Office Supplies":           "bg-orange-100 text-orange-800",
  "Repairs & Maintenance":     "bg-amber-100 text-amber-800",
  "Transport & Fuel":          "bg-green-100 text-green-800",
  "Legal & Professional Fees": "bg-purple-100 text-purple-800",
  "Government Levies":         "bg-rose-100 text-rose-800",
  "Miscellaneous":             "bg-slate-100 text-slate-800",
};

const emptyForm = () => ({
  recordedBy: "", title: "", category: OFFICE_EXPENSE_CATEGORIES[0],
  amount: "", description: "", referenceNo: "",
  date: new Date().toISOString().slice(0, 10),
});

export default function OfficeExpensesPage() {
  usePermissionGuard("accounting");
  const [expenses, setExpenses]           = useState<OfficeExpense[]>([]);
  const [allStaff, setAllStaff]           = useState<StaffUser[]>([]);
  const [companies, setCompanies]         = useState<Company[]>([]);
  const [session, setSession]             = useState<Session | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [groupCompanyId, setGroupCompanyId]   = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDialog, setShowDialog]       = useState(false);
  const [editItem, setEditItem]           = useState<OfficeExpense | null>(null);
  const [viewItem, setViewItem]           = useState<OfficeExpense | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

  const loadSession = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = getActiveCid(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    setAllStaff(lsGet<StaffUser[]>(USERS_KEY, []));
    const cos = lsGet<Company[]>(COMPANIES_KEY, []);
    setCompanies(cos);
    const gc = lsStr(GROUP_KEY) || (cos[0]?.id ?? "");
    setGroupCompanyId(gc);
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/office-expenses", { cache: "no-store" });
      if (res.ok) {
        const data: OfficeExpense[] = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
        const local = lsGet<OfficeExpense[]>(OFFICE_EXP_KEY, []);
        if (local.length > 0) {
          const serverIds = new Set(data.map(e => e.id));
          const toMigrate = local.filter(e => !serverIds.has(e.id));
          if (toMigrate.length > 0) {
            await fetch("/api/office-expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toMigrate) });
            const r2 = await fetch("/api/office-expenses", { cache: "no-store" });
            if (r2.ok) setExpenses(await r2.json());
          }
          lsSet(OFFICE_EXP_KEY, []);
        }
      }
    } catch { setExpenses(lsGet<OfficeExpense[]>(OFFICE_EXP_KEY, [])); }
  };

  const reload = () => { loadSession(); fetchExpenses(); };

  useEffect(() => {
    loadSession();
    fetchExpenses();
    window.addEventListener("phidtech_companies_updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("phidtech_companies_updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const cid         = cidRef.current || activeCompanyId;
  const isGroupUser = !!groupCompanyId && session?.companyId === groupCompanyId;
  const isGroupMgr  = isGroupUser && (session?.isSuperAdmin || session?.role === "admin" || session?.role === "manager");
  const canManage   = session?.isSuperAdmin || isGroupMgr || session?.role === "admin" || session?.role === "manager" || session?.role === "accountant";

  const companyExpenses = cid ? expenses.filter(e => e.companyId === cid) : expenses;
  const companyStaff    = cid ? allStaff.filter(u => u.companyId === cid) : allStaff;
  const showCompanyCol  = !cid;
  const getCompanyName  = (id: string) => companies.find(c => c.id === id)?.name ?? id;

  const totalAll      = companyExpenses.reduce((s, e) => s + e.amount, 0);
  const totalPaid     = companyExpenses.filter(e => e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const totalPending  = companyExpenses.filter(e => e.status === "pending").reduce((s, e) => s + e.amount, 0);
  const totalApproved = companyExpenses.filter(e => e.status === "approved").reduce((s, e) => s + e.amount, 0);

  const filtered = companyExpenses.filter(e => {
    const recorder    = allStaff.find(u => u.id === e.recordedBy);
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.referenceNo || "").toLowerCase().includes(search.toLowerCase()) ||
      (recorder?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus   = statusFilter === "all"   || e.status   === statusFilter;
    const matchCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm(), recordedBy: session?.id ?? "" });
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (e: OfficeExpense) => {
    setEditItem(e);
    setForm({ recordedBy: e.recordedBy, title: e.title, category: e.category, amount: String(e.amount), description: e.description, referenceNo: e.referenceNo, date: e.date });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.title.trim()) { setFormError("Enter an expense title."); return; }
    if (!form.amount)       { setFormError("Enter an amount."); return; }
    if (!form.date)         { setFormError("Select a date."); return; }
    if (editItem) {
      await fetch("/api/office-expenses", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editItem.id, title: form.title.trim(), category: form.category, amount: Number(form.amount) || 0, description: form.description, referenceNo: form.referenceNo, date: form.date, recordedBy: form.recordedBy }) });
    } else {
      await fetch("/api/office-expenses", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `oexp-${Date.now()}`,
          companyId: cidRef.current || activeCompanyId,
          recordedBy: form.recordedBy || (session?.id ?? ""),
          title: form.title.trim(),
          category: form.category,
          amount: Number(form.amount) || 0,
          description: form.description,
          referenceNo: form.referenceNo,
          status: "pending",
          date: form.date,
          createdAt: new Date().toISOString(),
        }) });
    }
    setShowDialog(false);
    await fetchExpenses();
  };

  const updateStatus = async (id: string, status: OfficeExpense["status"]) => {
    await fetch("/api/office-expenses", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, approvedBy: (status === "approved" || status === "paid") ? (session?.id ?? "") : undefined }) });
    await fetchExpenses();
  };

  const deleteExp = async (id: string) => {
    await fetch(`/api/office-expenses?id=${id}`, { method: "DELETE" });
    setDeleteId(null);
    await fetchExpenses();
  };
  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  return (
    <MainLayout>
      <PageHeader
        title="Office Expenses"
        subtitle="Record and track business operating expenses — advertisement, TRA, licences, rent, utilities and more"
        icon={Building2}
        actions={
          canManage ? (
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Record Expense
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Recorded"  value={formatCurrency(totalAll)}      icon={Building2}   iconBg="bg-blue-50"   iconColor="text-blue-600"   subtitle={`${companyExpenses.length} entries`} />
        <StatCard title="Pending"         value={formatCurrency(totalPending)}   icon={Clock}       iconBg="bg-yellow-50" iconColor="text-yellow-600" subtitle={`${companyExpenses.filter(e=>e.status==="pending").length} items`} />
        <StatCard title="Approved"        value={formatCurrency(totalApproved)}  icon={CheckCircle} iconBg="bg-green-50"  iconColor="text-green-600"  subtitle={`${companyExpenses.filter(e=>e.status==="approved").length} items`} />
        <StatCard title="Paid / Settled"  value={formatCurrency(totalPaid)}      icon={DollarSign}  iconBg="bg-purple-50" iconColor="text-purple-600" subtitle={`${companyExpenses.filter(e=>e.status==="paid").length} items`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Office Expenses Register</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-44" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {OFFICE_EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-700">No office expenses recorded</p>
            <p className="text-sm text-gray-400">Click &quot;Record Expense&quot; to add the first entry.</p>
            {canManage && <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Record Expense</Button>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                {showCompanyCol && <TableHead>Company</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Ref No.</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(exp => {
                const recorder = allStaff.find(u => u.id === exp.recordedBy);
                const approver = allStaff.find(u => u.id === exp.approvedBy);
                return (
                  <TableRow key={exp.id}>
                    <TableCell className="font-medium text-gray-900">{exp.title}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColors[exp.category] ?? "bg-gray-100 text-gray-700"}`}>
                        {exp.category}
                      </span>
                    </TableCell>
                    {showCompanyCol && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">{getCompanyName(exp.companyId)}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-bold text-gray-900">{formatCurrency(exp.amount)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(exp.date)}</TableCell>
                    <TableCell className="text-sm text-gray-400">{exp.referenceNo || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6"><AvatarFallback className="text-[10px]">{getInitials(recorder?.name ?? "?")}</AvatarFallback></Avatar>
                        <span className="text-sm text-gray-600">{recorder?.name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(exp.status)}`}>
                        {exp.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button variant="ghost" size="icon" onClick={() => setViewItem(exp)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                        {canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(exp)}><Edit className="w-4 h-4 text-blue-400" /></Button>}
                        {canManage && exp.status === "pending" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600 text-xs px-2" onClick={() => updateStatus(exp.id, "approved")}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 text-xs px-2" onClick={() => updateStatus(exp.id, "rejected")}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {canManage && exp.status === "approved" && (
                          <Button variant="ghost" size="sm" className="text-blue-600 text-xs px-2" onClick={() => updateStatus(exp.id, "paid")}>
                            Mark Paid
                          </Button>
                        )}
                        {canManage && <Button variant="ghost" size="icon" onClick={() => setDeleteId(exp.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>}
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
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Office Expense Details</DialogTitle></DialogHeader>
          {viewItem && (() => {
            const recorder = allStaff.find(u => u.id === viewItem.recordedBy);
            const approver = allStaff.find(u => u.id === viewItem.approvedBy);
            return (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Category</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColors[viewItem.category] ?? "bg-gray-100 text-gray-700"}`}>{viewItem.category}</span>
                  {showCompanyCol && <p className="text-xs text-blue-500 mt-2">{getCompanyName(viewItem.companyId)}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Title",         value: viewItem.title },
                    { label: "Amount",        value: formatCurrency(viewItem.amount) },
                    { label: "Date",          value: formatDate(viewItem.date) },
                    { label: "Reference No.", value: viewItem.referenceNo || "—" },
                    { label: "Status",        value: viewItem.status },
                    { label: "Recorded By",   value: recorder?.name ?? "—" },
                    { label: "Approved By",   value: approver?.name ?? "—" },
                    { label: "Created",       value: formatDate(viewItem.createdAt) },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                      <p className="font-semibold text-gray-900 text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
                {viewItem.description && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Description / Notes</p>
                    <p className="text-sm text-gray-700">{viewItem.description}</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
            {viewItem && canManage && viewItem.status === "pending" && (
              <>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => { updateStatus(viewItem.id, "approved"); setViewItem(null); }}>Approve</Button>
                <Button variant="destructive" onClick={() => { updateStatus(viewItem.id, "rejected"); setViewItem(null); }}>Reject</Button>
              </>
            )}
            {viewItem && canManage && viewItem.status === "approved" && (
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { updateStatus(viewItem.id, "paid"); setViewItem(null); }}>Mark Paid</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Office Expense" : "Record Office Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Expense Title</label>
                <Input placeholder="e.g. TRA VAT Payment — March 2026" value={form.title} onChange={e => sf({ title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={v => sf({ category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OFFICE_EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS)</label>
                <Input type="number" placeholder="0" value={form.amount} onChange={e => sf({ amount: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date</label>
                <Input type="date" value={form.date} onChange={e => sf({ date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reference No. (optional)</label>
                <Input placeholder="e.g. TRA-2026-001" value={form.referenceNo} onChange={e => sf({ referenceNo: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Recorded By</label>
                <Select value={form.recordedBy} onValueChange={v => sf({ recordedBy: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {companyStaff.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description / Notes</label>
                <Textarea placeholder="Additional details about this expense..." rows={3} value={form.description} onChange={e => sf({ description: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Record Expense"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Office Expense</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteExp(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
