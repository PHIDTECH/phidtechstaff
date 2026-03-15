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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, Plus, Search, Edit, Trash2, AlertCircle, DollarSign, Users, CheckCircle } from "lucide-react";
import { formatCurrency, getInitials } from "@/lib/utils";

const ACTIVE_KEY      = "phidtech_active_company";
const USERS_KEY       = "phidtech_users";
const COMPANIES_KEY   = "phidtech_companies";
const SESSION_KEY     = "phidtech_session";
const COMMISSIONS_KEY = "phidtech_commissions";

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function lsStr(key: string, fallback = "") {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

interface Session {
  id: string; name: string; role: string; position: string;
  isSuperAdmin: boolean; companyId: string; permissions?: string[];
}
interface StaffUser {
  id: string; name: string; email: string; position: string;
  department: string; salary: number; status: string; companyId: string;
}
export interface Commission {
  id: string;
  staffId: string;
  companyId: string;
  customerName: string;
  month: string;
  year: number;
  datePaid: string;
  saleAmount: number;
  commissionPct: number;
  commissionAmount: number;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
}

const DEFAULT_PCT = 7;

const emptyForm = () => ({
  staffId: "",
  customerName: "",
  month: MONTHS[new Date().getMonth()],
  year: new Date().getFullYear(),
  datePaid: "",
  saleAmount: "",
  commissionPct: String(DEFAULT_PCT),
  status: "pending" as Commission["status"],
});

export default function CommissionsPage() {
  usePermissionGuard("commissions");
  const now = new Date();
  const [session, setSession]         = useState<Session | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const activeCompanyIdRef = useRef("");
  const [activeCompanyName, setActiveCompanyName] = useState("");
  const [staffList, setStaffList]     = useState<StaffUser[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [search, setSearch]           = useState("");
  const [filterMonth, setFilterMonth] = useState(MONTHS[now.getMonth()]);
  const [filterYear, setFilterYear]   = useState(now.getFullYear());

  const [showDialog, setShowDialog]   = useState(false);
  const [editItem, setEditItem]       = useState<Commission | null>(null);
  const [form, setForm]               = useState(emptyForm());
  const [formError, setFormError]     = useState("");
  const [deleteId, setDeleteId]       = useState<string | null>(null);

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setActiveCompanyId(cid);
    activeCompanyIdRef.current = cid;
    const companies = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    setActiveCompanyName(companies.find(c => c.id === cid)?.name ?? "");
    const allStaff = lsGet<StaffUser[]>(USERS_KEY, []);
    setStaffList(allStaff.filter(u => u.companyId === cid));
    setCommissions(lsGet<Commission[]>(COMMISSIONS_KEY, []));
  };

  useEffect(() => {
    reload();
    window.addEventListener("phidtech_companies_updated", reload);
    return () => window.removeEventListener("phidtech_companies_updated", reload);
  }, []);

  const canManage = session?.isSuperAdmin === true ||
    session?.role?.toLowerCase().includes("accountant") ||
    session?.position?.toLowerCase().includes("accountant") ||
    session?.role?.toLowerCase().includes("manager") ||
    session?.position?.toLowerCase().includes("manager");

  const cid = activeCompanyIdRef.current || activeCompanyId;
  const companyCommissions = cid
    ? commissions.filter(c => c.companyId === cid)
    : commissions;

  const monthFiltered = companyCommissions.filter(
    c => c.month === filterMonth && c.year === filterYear
  );

  const displayList = monthFiltered.filter(c => {
    const emp = staffList.find(u => u.id === c.staffId);
    const name = emp?.name?.toLowerCase() ?? "";
    const customer = c.customerName?.toLowerCase() ?? "";
    const q = search.toLowerCase();
    return name.includes(q) || customer.includes(q);
  });

  const totalCommissions = monthFiltered.reduce((s, c) => s + c.commissionAmount, 0);
  const totalSales = monthFiltered.reduce((s, c) => s + c.saleAmount, 0);
  const paidCount = monthFiltered.filter(c => c.status === "paid").length;

  const computedCommAmt = (sale: string, pct: string) => {
    const s = Number(sale) || 0;
    const p = Number(pct) || 0;
    return Math.round(s * p / 100);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (c: Commission) => {
    setEditItem(c);
    setForm({
      staffId: c.staffId,
      customerName: c.customerName,
      month: c.month,
      year: c.year,
      datePaid: c.datePaid,
      saleAmount: String(c.saleAmount),
      commissionPct: String(c.commissionPct),
      status: c.status,
    });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = () => {
    if (!form.staffId) { setFormError("Select a staff member."); return; }
    if (!form.customerName.trim()) { setFormError("Enter customer name."); return; }
    if (!form.saleAmount || Number(form.saleAmount) <= 0) { setFormError("Enter a valid sale amount."); return; }
    if (!form.commissionPct || Number(form.commissionPct) <= 0) { setFormError("Enter a valid commission %."); return; }

    const commAmt = computedCommAmt(form.saleAmount, form.commissionPct);

    if (editItem) {
      const updated = commissions.map(c => c.id === editItem.id ? {
        ...c,
        staffId: form.staffId,
        customerName: form.customerName.trim(),
        month: form.month,
        year: Number(form.year),
        datePaid: form.datePaid,
        saleAmount: Number(form.saleAmount),
        commissionPct: Number(form.commissionPct),
        commissionAmount: commAmt,
        status: form.status,
      } : c);
      lsSet(COMMISSIONS_KEY, updated);
      setCommissions(updated);
    } else {
      const newItem: Commission = {
        id: `comm-${Date.now()}`,
        staffId: form.staffId,
        companyId: activeCompanyIdRef.current || activeCompanyId,
        customerName: form.customerName.trim(),
        month: form.month,
        year: Number(form.year),
        datePaid: form.datePaid,
        saleAmount: Number(form.saleAmount),
        commissionPct: Number(form.commissionPct),
        commissionAmount: commAmt,
        status: form.status !== "pending" ? form.status : (form.datePaid ? "paid" : "pending"),
        createdAt: new Date().toISOString(),
      };
      const updated = [...commissions, newItem];
      lsSet(COMMISSIONS_KEY, updated);
      setCommissions(updated);
    }
    setShowDialog(false);
  };

  const deleteItem = (id: string) => {
    const updated = commissions.filter(c => c.id !== id);
    lsSet(COMMISSIONS_KEY, updated);
    setCommissions(updated);
    setDeleteId(null);
  };

  const markPaid = (id: string) => {
    const updated = commissions.map(c => c.id === id
      ? { ...c, status: "paid" as const, datePaid: c.datePaid || new Date().toISOString().slice(0,10) }
      : c
    );
    lsSet(COMMISSIONS_KEY, updated);
    setCommissions(updated);
  };

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <MainLayout>
      <PageHeader
        title="Commissions"
        subtitle="Track staff sales commissions per customer and month"
        icon={TrendingUp}
        actions={
          canManage ? (
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Commission
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Sales" value={formatCurrency(totalSales)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle={`${filterMonth} ${filterYear}`} />
        <StatCard title="Total Commissions" value={formatCurrency(totalCommissions)} icon={TrendingUp} iconBg="bg-green-50" iconColor="text-green-600" subtitle={`${filterMonth} ${filterYear}`} />
        <StatCard title="Commission Records" value={monthFiltered.length} icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="This month" />
        <StatCard title="Paid" value={`${paidCount}/${monthFiltered.length}`} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" subtitle="This month" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search staff or customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-green-400" />
            </div>
            <p className="font-semibold text-gray-700">No commissions for {filterMonth} {filterYear}</p>
            <p className="text-sm text-gray-400">
              {canManage ? 'Click "Add Commission" to record a new one.' : "No commission records found."}
            </p>
            {canManage && (
              <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Commission</Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Sale Amount</TableHead>
                  <TableHead>Commission %</TableHead>
                  <TableHead>Commission Amount</TableHead>
                  <TableHead>Date Paid</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayList.map(c => {
                  const emp = staffList.find(u => u.id === c.staffId);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{getInitials(emp?.name ?? "?")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{emp?.name ?? "Unknown"}</p>
                            <p className="text-xs text-gray-400">{emp?.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">{c.customerName}</TableCell>
                      <TableCell className="text-sm text-gray-600">{c.month} {c.year}</TableCell>
                      <TableCell className="font-medium text-gray-800">{formatCurrency(c.saleAmount)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{c.commissionPct}%</span>
                      </TableCell>
                      <TableCell className="font-bold text-green-700">{formatCurrency(c.commissionAmount)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{c.datePaid || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          c.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>{c.status}</span>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {c.status === "pending" && (
                              <Button variant="ghost" size="sm" className="text-green-600 text-xs h-7 px-2" onClick={() => markPaid(c.id)}>
                                Mark Paid
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                              <Edit className="w-4 h-4 text-blue-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} title="Delete">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {/* Footer totals */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">{displayList.length} record{displayList.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-gray-600">Total Sales: <strong className="text-gray-900">{formatCurrency(displayList.reduce((s,c)=>s+c.saleAmount,0))}</strong></span>
                <span className="text-gray-600">Total Commission: <strong className="text-green-700">{formatCurrency(displayList.reduce((s,c)=>s+c.commissionAmount,0))}</strong></span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Commission" : "Add Commission"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Staff Member</label>
              <Select value={form.staffId} onValueChange={v => setForm(f => ({...f, staffId: v}))}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staffList.filter(u => u.status === "active").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} — {u.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Customer Name</label>
              <Input placeholder="e.g. Acme Corporation" value={form.customerName} onChange={e => setForm(f => ({...f, customerName: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Month</label>
                <Select value={form.month} onValueChange={v => setForm(f => ({...f, month: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Year</label>
                <Select value={String(form.year)} onValueChange={v => setForm(f => ({...f, year: Number(v)}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sale Amount (TZS)</label>
              <Input type="number" placeholder="e.g. 1500000" value={form.saleAmount}
                onChange={e => setForm(f => ({...f, saleAmount: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Commission %</label>
                <Input type="number" placeholder="7" value={form.commissionPct}
                  onChange={e => setForm(f => ({...f, commissionPct: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Commission Amount</label>
                <div className="h-10 flex items-center px-3 bg-green-50 border border-green-200 rounded-md text-green-800 font-semibold text-sm">
                  {formatCurrency(computedCommAmt(form.saleAmount, form.commissionPct))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date Paid <span className="text-gray-400 font-normal">(optional)</span></label>
                <Input type="date" value={form.datePaid} onChange={e => setForm(f => ({...f, datePaid: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v as Commission["status"]}))}>  
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add Commission"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Commission</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">Are you sure you want to delete this commission record? This cannot be undone.</p>
            {deleteId && (() => {
              const c = commissions.find(x => x.id === deleteId);
              const emp = staffList.find(u => u.id === c?.staffId);
              return c ? (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 text-sm">
                  <p className="font-semibold text-red-800">{emp?.name ?? "Unknown"} — {c.customerName}</p>
                  <p className="text-red-600">{c.month} {c.year} · {formatCurrency(c.commissionAmount)}</p>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteItem(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
