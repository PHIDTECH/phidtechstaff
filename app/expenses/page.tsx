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
import { Textarea } from "@/components/ui/textarea";
import { Receipt, Plus, Search, CheckCircle, Clock, XCircle, DollarSign, Edit, Trash2, Eye, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SESSION_KEY  = "phidtech_session";
const ACTIVE_KEY   = "phidtech_active_company";
const EXPENSES_KEY = "phidtech_expenses";
const USERS_KEY    = "phidtech_users";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY    = "phidtech_group_company";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface Branch { id: string; name: string; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; branchId?: string | null; position?: string; department?: string; status?: string; }
interface Expense {
  id: string; companyId: string; userId: string; title: string;
  category: string; amount: number; description: string;
  status: "pending" | "manager_approved" | "ceo_approved" | "disbursed" | "rejected" | string;
  submittedAt: string;
  managerApprovedBy?: string; managerApprovedAt?: string;
  ceoApprovedBy?: string; ceoApprovedAt?: string;
  disbursedBy?: string; disbursedAt?: string;
  rejectedBy?: string; rejectedAt?: string;
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
  usePermissionGuard("expenses");
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

  const [groupCompanyId, setGroupCompanyId] = useState("");
  const [allStaff, setAllStaff] = useState<StaffUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const loadSession = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    // Non-superadmin staff must ALWAYS use their own companyId — never ACTIVE_KEY
    // (ACTIVE_KEY reflects the company an admin last switched to, not the staff's company)
    const cid  = sess?.isSuperAdmin
      ? lsStr(ACTIVE_KEY)
      : (sess?.companyId ?? "");
    setSession(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    const cos = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    const gc = lsStr(GROUP_KEY) || (cos[0]?.id ?? "");
    setGroupCompanyId(gc);
    // Load staff from server API, fall back to localStorage
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const data: StaffUser[] = await res.json();
        const active = Array.isArray(data) ? data.filter(u => u.status !== "inactive") : [];
        setAllStaff(active);
        setStaff(active.filter(u => u.companyId === cid));
      } else throw new Error();
    } catch {
      const allS = lsGet<StaffUser[]>(USERS_KEY, []);
      setAllStaff(allS);
      setStaff(allS.filter(u => u.companyId === cid));
    }
    // Load branches
    try {
      const br = await fetch("/api/branches", { cache: "no-store" });
      if (br.ok) setBranches(await br.json());
    } catch {}
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/expenses", { cache: "no-store" });
      if (res.ok) {
        const data: Expense[] = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
        const local = lsGet<Expense[]>(EXPENSES_KEY, []);
        if (local.length > 0) {
          const serverIds = new Set(data.map(e => e.id));
          const toMigrate = local.filter(e => !serverIds.has(e.id));
          if (toMigrate.length > 0) {
            await fetch("/api/expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toMigrate) });
            const r2 = await fetch("/api/expenses", { cache: "no-store" });
            if (r2.ok) setExpenses(await r2.json());
          }
          lsSet(EXPENSES_KEY, []);
        }
      }
    } catch { setExpenses(lsGet<Expense[]>(EXPENSES_KEY, [])); }
  };

  const reload = async () => { await loadSession(); await fetchExpenses(); };

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

  // Derive cid synchronously from session to avoid empty-string flash on first render
  const cid = (() => {
    const s = session;
    if (!s) return cidRef.current || activeCompanyId;
    if (s.isSuperAdmin) return cidRef.current || activeCompanyId;
    return s.companyId || cidRef.current || activeCompanyId;
  })();
  const _r = (session?.role ?? "").toLowerCase();
  const _p = (session?.position ?? "").toLowerCase();
  const GROUP_ROLES_E = ["group_ceo","group_cfo","group_manager","group_controller","group_hr","group_auditor","group_legal","group_it","group_accountant"];
  const isGroupUser   = session?.companyId === "group" || GROUP_ROLES_E.includes(_r) || GROUP_ROLES_E.includes(_p);
  const isEManager    = _r === "manager"    || _p === "manager"    || _r === "group_manager" || _p === "group_manager";
  const isECEO        = session?.isSuperAdmin || _r === "admin" || _p === "admin" || _r === "group_ceo" || _p === "group_ceo";
  const isEAccountant = _r === "accountant" || _p === "accountant" || _r === "group_cfo" || _p === "group_cfo" || _r === "group_accountant" || _p === "group_accountant";
  const companyExpenses = cid ? expenses.filter(e => e.companyId === cid) : expenses;
  const companyStaff    = cid ? allStaff.filter(u => u.companyId === cid) : allStaff;
  const canManage = session?.isSuperAdmin || isGroupUser || isEManager || isECEO || isEAccountant;

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

  const openAdd = () => {
    setEditItem(null);
    // Pre-fill the logged-in user as employee (admins/superadmin leave blank to pick)
    const canPickAny = session?.isSuperAdmin || session?.role === "admin" || session?.role === "manager" || session?.role === "accountant";
    setForm({ ...emptyForm(), userId: canPickAny ? "" : (session?.id ?? "") });
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (e: Expense) => {
    setEditItem(e);
    setForm({ userId: e.userId, title: e.title, category: e.category, amount: String(e.amount), description: e.description });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.userId)        { setFormError("Select an employee."); return; }
    if (!form.title.trim())  { setFormError("Enter a claim title."); return; }
    if (!form.amount)        { setFormError("Enter an amount."); return; }

    if (editItem) {
      await fetch("/api/expenses", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editItem.id, userId: form.userId, title: form.title.trim(), category: form.category, amount: Number(form.amount) || 0, description: form.description }) });
    } else {
      // Resolve companyId: selected staff's company → current session company → active company
      const selectedStaff = allStaff.find(u => u.id === form.userId);
      const expCompanyId  = selectedStaff?.companyId
        || (!session?.isSuperAdmin ? session?.companyId : undefined)
        || cidRef.current
        || activeCompanyId;
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        companyId: expCompanyId,
        userId: form.userId, title: form.title.trim(),
        category: form.category, amount: Number(form.amount) || 0,
        description: form.description, status: "pending",
        submittedAt: new Date().toISOString(),
      };
      await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newExp) });
    }
    setShowDialog(false);
    await fetchExpenses();
  };

  const updateStatus = async (id: string, newStatus: Expense["status"]) => {
    const now = new Date().toISOString();
    const by  = session?.name ?? "";
    const extra: Record<string,string> = {};
    if (newStatus === "manager_approved") { extra.managerApprovedBy = by; extra.managerApprovedAt = now; }
    if (newStatus === "ceo_approved")     { extra.ceoApprovedBy = by;     extra.ceoApprovedAt = now; }
    if (newStatus === "disbursed")        { extra.disbursedBy = by;        extra.disbursedAt = now; }
    if (newStatus === "rejected")         { extra.rejectedBy = by;         extra.rejectedAt = now; }
    await fetch("/api/expenses", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus, ...extra }) });
    await fetchExpenses();
  };

  const deleteExp = async (id: string) => {
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    setDeleteId(null);
    await fetchExpenses();
  };

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
                const approver = companyStaff.find(u => u.name === (claim.ceoApprovedBy ?? claim.managerApprovedBy ?? ""));
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
                      {(() => {
                        const s = claim.status;
                        const badge =
                          s === "pending"          ? "bg-yellow-100 text-yellow-700" :
                          s === "manager_approved" ? "bg-blue-100 text-blue-700"   :
                          s === "ceo_approved"     ? "bg-indigo-100 text-indigo-700" :
                          s === "disbursed"        ? "bg-green-100 text-green-700"  :
                          s === "rejected"         ? "bg-red-100 text-red-600"      : "bg-gray-100 text-gray-600";
                        const label =
                          s === "pending"          ? "⏳ Pending Manager" :
                          s === "manager_approved" ? "🔵 Pending CEO"     :
                          s === "ceo_approved"     ? "✅ CEO Approved"    :
                          s === "disbursed"        ? "💵 Disbursed"       :
                          s === "rejected"         ? "❌ Rejected"        : s;
                        return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge}`}>{label}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button variant="ghost" size="icon" onClick={() => setViewItem(claim)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(claim)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                        {/* Stage 1: Manager */}
                        {claim.status === "pending" && isEManager && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600 text-xs px-2" onClick={() => updateStatus(claim.id, "manager_approved")}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 text-xs px-2" onClick={() => updateStatus(claim.id, "rejected")}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {/* Stage 2: CEO — approve or disburse directly */}
                        {claim.status === "manager_approved" && isECEO && (
                          <>
                            <Button variant="ghost" size="sm" className="text-indigo-600 text-xs px-2" onClick={() => updateStatus(claim.id, "ceo_approved")}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-green-700 text-xs px-2" onClick={() => updateStatus(claim.id, "disbursed")}>
                              💵 Disburse
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 text-xs px-2" onClick={() => updateStatus(claim.id, "rejected")}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {/* Stage 3: Accountant or CEO disburses */}
                        {claim.status === "ceo_approved" && (isEAccountant || isECEO) && (
                          <Button variant="ghost" size="sm" className="text-green-700 text-xs px-2" onClick={() => updateStatus(claim.id, "disbursed")}>
                            💵 Disburse
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
            const approver = companyStaff.find(u => u.name === (viewItem.ceoApprovedBy ?? viewItem.managerApprovedBy ?? ""));
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
            {(() => {
              const canPickAny = session?.isSuperAdmin || session?.role === "admin" || session?.role === "manager" || session?.role === "accountant";
              if (canPickAny) {
                return (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Employee</label>
                    <Select value={form.userId} onValueChange={v => sf({ userId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {companyStaff.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-gray-400">No staff found</div>
                        )}
                        {companyStaff.map(u => {
                          const branch = branches.find(b => b.id === u.branchId);
                          return (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center gap-2">
                                <span>{u.name}</span>
                                {u.department && <span className="text-gray-400 text-xs">· {u.department}</span>}
                                {branch && <span className="text-blue-500 text-xs font-medium">· {branch.name}</span>}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              const me = allStaff.find(u => u.id === session?.id);
              return (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Employee</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                    <span className="font-medium">{me?.name ?? session?.name ?? "You"}</span>
                    {me?.department && <span className="text-gray-400 text-xs">· {me.department}</span>}
                    {me?.branchId && <span className="text-blue-500 text-xs">· {branches.find(b => b.id === me.branchId)?.name}</span>}
                  </div>
                </div>
              );
            })()}
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
