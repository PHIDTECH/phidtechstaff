"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Receipt, Plus, Search, CheckCircle, Clock, XCircle, DollarSign, Edit, Trash2, Eye, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SESSION_KEY  = "phidtech_session";
const ACTIVE_KEY   = "phidtech_active_company";
const EXPENSES_KEY = "phidtech_expenses";
const USERS_KEY    = "phidtech_users";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; position?: string; department?: string; }
interface Expense {
  id: string; companyId: string; userId: string; title: string;
  category: string; amount: number; description: string;
  status: "pending" | "approved" | "rejected" | "paid";
  submittedAt: string; approvedBy?: string;
}

const EXPENSE_CATEGORIES = ["Travel","Technology","Marketing","Software","Food","Office","Training","Accommodation","Communication","Other"];

const emptyForm = () => ({
  userId: "", title: "", category: "Travel",
  amount: "", description: "",
});

const categoryColors: Record<string, string> = {
  Travel: "bg-blue-100 text-blue-800", Technology: "bg-purple-100 text-purple-800",
  Marketing: "bg-pink-100 text-pink-800", Software: "bg-indigo-100 text-indigo-800",
  Food: "bg-orange-100 text-orange-800", Office: "bg-gray-100 text-gray-800",
  Training: "bg-teal-100 text-teal-800", Accommodation: "bg-green-100 text-green-800",
  Communication: "bg-cyan-100 text-cyan-800", Other: "bg-yellow-100 text-yellow-800",
};

export default function ExpensesPage() {
  const [expenses, setExpenses]           = useState<Expense[]>([]);
  const [staff, setStaff]                 = useState<StaffUser[]>([]);
  const [session, setSession]             = useState<Session | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [showDialog, setShowDialog]       = useState(false);
  const [editItem, setEditItem]           = useState<Expense | null>(null);
  const [viewItem, setViewItem]           = useState<Expense | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setSession(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    setExpenses(lsGet<Expense[]>(EXPENSES_KEY, []));
    setStaff(lsGet<StaffUser[]>(USERS_KEY, []));
  };

  useEffect(() => { reload(); }, []);

  const cid            = cidRef.current || activeCompanyId;
  const companyExpenses = cid ? expenses.filter(e => e.companyId === cid) : expenses;
  const companyStaff   = cid ? staff.filter(u => u.companyId === cid) : staff;
  const canManage      = session?.isSuperAdmin || session?.role === "manager" || session?.role === "accountant";

  const filtered = companyExpenses.filter(e => {
    const emp         = companyStaff.find(u => u.id === e.userId);
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      (emp?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending       = companyExpenses.filter(e => e.status === "pending").length;
  const approved      = companyExpenses.filter(e => e.status === "approved" || e.status === "paid").length;
  const totalApproved = companyExpenses.filter(e => e.status === "approved" || e.status === "paid").reduce((s,e) => s + e.amount, 0);
  const totalPending  = companyExpenses.filter(e => e.status === "pending").reduce((s,e) => s + e.amount, 0);
  const totalReimbursed = companyExpenses.filter(e => e.status === "paid").reduce((s,e) => s + e.amount, 0);

  const save = (list: Expense[]) => { lsSet(EXPENSES_KEY, list); setExpenses(list); };

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm(), userId: session?.isSuperAdmin ? "" : (session?.id ?? "") });
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (e: Expense) => {
    setEditItem(e);
    setForm({ userId: e.userId, title: e.title, category: e.category, amount: String(e.amount), description: e.description });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = () => {
    if (!form.userId)        { setFormError("Select an employee."); return; }
    if (!form.title.trim())  { setFormError("Enter a claim title."); return; }
    if (!form.amount)        { setFormError("Enter an amount."); return; }

    if (editItem) {
      const updated = expenses.map(e => e.id === editItem.id ? {
        ...e, userId: form.userId, title: form.title.trim(),
        category: form.category, amount: Number(form.amount) || 0,
        description: form.description,
      } : e);
      save(updated);
    } else {
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        companyId: cidRef.current || activeCompanyId,
        userId: form.userId, title: form.title.trim(),
        category: form.category, amount: Number(form.amount) || 0,
        description: form.description, status: "pending",
        submittedAt: new Date().toISOString(),
      };
      save([...expenses, newExp]);
    }
    setShowDialog(false);
  };

  const updateStatus = (id: string, status: Expense["status"]) => {
    const updated = expenses.map(e => e.id === id ? {
      ...e, status,
      approvedBy: status === "approved" || status === "paid" ? (session?.id ?? "") : e.approvedBy,
    } : e);
    save(updated);
  };

  const deleteExp = (id: string) => { save(expenses.filter(e => e.id !== id)); setDeleteId(null); };

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  return (
    <MainLayout>
      <PageHeader
        title="Expense Claims"
        subtitle="Manage staff expense claims, approvals and reimbursements"
        icon={Receipt}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Submit Claim
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Claims"     value={companyExpenses.length} icon={Receipt}      iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Pending Approval" value={pending}                icon={Clock}        iconBg="bg-yellow-50" iconColor="text-yellow-600" subtitle={formatCurrency(totalPending)} />
        <StatCard title="Approved"         value={approved}               icon={CheckCircle}  iconBg="bg-green-50"  iconColor="text-green-600" subtitle={formatCurrency(totalApproved)} />
        <StatCard title="Total Reimbursed" value={formatCurrency(totalReimbursed)} icon={DollarSign} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Expense Claims Register</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
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
              <Receipt className="w-7 h-7 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-700">No expense claims yet</p>
            <p className="text-sm text-gray-400">Click &quot;Submit Claim&quot; to add the first one.</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Submit Claim</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(claim => {
                const emp      = companyStaff.find(u => u.id === claim.userId);
                const approver = companyStaff.find(u => u.id === claim.approvedBy);
                return (
                  <TableRow key={claim.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{getInitials(emp?.name ?? "?")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{emp?.name ?? <span className="text-gray-400">Unknown</span>}</p>
                          <p className="text-xs text-gray-400">{emp?.department ?? emp?.position ?? ""}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">{claim.title}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColors[claim.category] ?? "bg-gray-100 text-gray-700"}`}>
                        {claim.category}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-gray-900">{formatCurrency(claim.amount)}</TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-xs truncate">{claim.description || "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(claim.submittedAt)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{approver?.name ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(claim.status)}`}>
                        {claim.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button variant="ghost" size="icon" onClick={() => setViewItem(claim)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(claim)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                        {canManage && claim.status === "pending" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600 text-xs px-2" onClick={() => updateStatus(claim.id, "approved")}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 text-xs px-2" onClick={() => updateStatus(claim.id, "rejected")}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {canManage && claim.status === "approved" && (
                          <Button variant="ghost" size="sm" className="text-blue-600 text-xs px-2" onClick={() => updateStatus(claim.id, "paid")}>
                            Mark Paid
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(claim.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
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
          <DialogHeader><DialogTitle>Expense Claim Details</DialogTitle></DialogHeader>
          {viewItem && (() => {
            const emp      = companyStaff.find(u => u.id === viewItem.userId);
            const approver = companyStaff.find(u => u.id === viewItem.approvedBy);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="w-10 h-10"><AvatarFallback>{getInitials(emp?.name ?? "?")}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{emp?.name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-500">{emp?.position ?? emp?.department ?? ""}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Title",       value: viewItem.title },
                    { label: "Category",    value: viewItem.category },
                    { label: "Amount",      value: formatCurrency(viewItem.amount) },
                    { label: "Status",      value: viewItem.status },
                    { label: "Submitted",   value: formatDate(viewItem.submittedAt) },
                    { label: "Approved By", value: approver?.name ?? "—" },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                      <p className="font-semibold text-gray-900 text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
                {viewItem.description && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Description</p>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Expense Claim" : "Submit Expense Claim"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Employee</label>
              <Select value={form.userId} onValueChange={v => sf({ userId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {companyStaff.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Claim Title</label>
              <Input placeholder="e.g. Client Visit - Arusha Trip" value={form.title} onChange={e => sf({ title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={v => sf({ category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS)</label>
                <Input type="number" placeholder="0" value={form.amount} onChange={e => sf({ amount: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Textarea placeholder="Describe the expense..." rows={3} value={form.description} onChange={e => sf({ description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Submit Claim"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Expense Claim</DialogTitle></DialogHeader>
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
