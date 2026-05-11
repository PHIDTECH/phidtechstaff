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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Plus, Search, Edit, Trash2, Eye, AlertCircle, DollarSign, CheckCircle, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY     = "phidtech_group_company";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function lsStr(key: string, fb = "") { try { return localStorage.getItem(key) ?? fb; } catch { return fb; } }

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }
interface LoanCustomer {
  id: string; companyId: string; customerName: string; contactPhone?: string;
  date: string; amountOfLoan: number; interestPerMonth: number; loanPeriod: number; status: string;
}
interface LoanInterest {
  id: string; loanId?: string; companyId: string; customerName: string;
  date: string; amountOfLoan: number; interestPerMonth: number; loanPeriod: number;
  interestRevenue: number; status: string; notes?: string; createdAt: string;
}

const calcInterest = (amount: number, rate: number, period: number) =>
  Math.round(amount * (rate / 100) * period);

const emptyForm = () => ({
  loanId: "", customerName: "", date: new Date().toISOString().slice(0, 10),
  amountOfLoan: "", interestPerMonth: "", loanPeriod: "", interestRevenue: "",
  notes: "", status: "pending",
});

export default function LoanInterestPage() {
  usePermissionGuard("loan_interest");
  const [records, setRecords]     = useState<LoanInterest[]>([]);
  const [loans, setLoans]         = useState<LoanCustomer[]>([]);
  const [session, setSession]     = useState<Session | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [groupCompanyId, setGroupCompanyId]   = useState("");
  const cidRef                    = useRef("");
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem]   = useState<LoanInterest | null>(null);
  const [viewItem, setViewItem]   = useState<LoanInterest | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [formError, setFormError] = useState("");

  const sf = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));

  const loadData = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = getActiveCid(sess);
    setActiveCompanyId(cid); cidRef.current = cid;
    const cos = lsGet<Company[]>(COMPANIES_KEY, []);
    setCompanies(cos);
    setGroupCompanyId(lsStr(GROUP_KEY) || (cos[0]?.id ?? ""));
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/loan-interest", { cache: "no-store" }),
        fetch("/api/loans", { cache: "no-store" }),
      ]);
      if (r1.ok) setRecords(await r1.json());
      if (r2.ok) setLoans(await r2.json());
    } catch {}
  };

  useEffect(() => {
    loadData();
    window.addEventListener("phidtech_companies_updated", loadData);
    window.addEventListener("storage", loadData);
    return () => {
      window.removeEventListener("phidtech_companies_updated", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, []);

  const cid = cidRef.current || activeCompanyId;
  const _or = (session?.role ?? "").toLowerCase();
  const _op = (session?.position ?? "").toLowerCase();
  const GRP = ["group_ceo","group_cfo","group_manager","group_accountant","group_controller"];
  const isGroupUser = session?.companyId === "group" || GRP.includes(_or) || GRP.includes(_op);
  const canManage   = session?.isSuperAdmin || isGroupUser || ["admin","manager","accountant"].includes(_or) || ["admin","manager","accountant"].includes(_op);

  const companyRecords = (session?.isSuperAdmin && !cid) ? records : (cid ? records.filter(r => r.companyId === cid) : records);
  const companyLoans   = (session?.isSuperAdmin && !cid) ? loans   : (cid ? loans.filter(l => l.companyId === cid)   : loans);
  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.name ?? id;

  const filtered = companyRecords.filter(r => {
    const q = search.toLowerCase();
    return r.customerName.toLowerCase().includes(q) && (statusFilter === "all" || r.status === statusFilter);
  });

  const totalRevenue  = companyRecords.reduce((s, r) => s + r.interestRevenue, 0);
  const paidRevenue   = companyRecords.filter(r => r.status === "paid").reduce((s, r) => s + r.interestRevenue, 0);
  const pendingRevenue= companyRecords.filter(r => r.status === "pending").reduce((s, r) => s + r.interestRevenue, 0);

  // When a loan is selected from dropdown, auto-fill form fields
  const handleLoanSelect = (loanId: string) => {
    const loan = companyLoans.find(l => l.id === loanId);
    if (!loan) { sf({ loanId: "", customerName: "", amountOfLoan: "", interestPerMonth: "", loanPeriod: "", interestRevenue: "" }); return; }
    const rev = calcInterest(loan.amountOfLoan, loan.interestPerMonth, loan.loanPeriod);
    sf({ loanId, customerName: loan.customerName, amountOfLoan: String(loan.amountOfLoan), interestPerMonth: String(loan.interestPerMonth), loanPeriod: String(loan.loanPeriod), interestRevenue: String(rev) });
  };

  // Auto-recalculate when amount/rate/period change
  const recalc = (p: Partial<typeof form>) => {
    const merged = { ...form, ...p };
    const rev = calcInterest(Number(merged.amountOfLoan), Number(merged.interestPerMonth), Number(merged.loanPeriod));
    sf({ ...p, interestRevenue: rev > 0 ? String(rev) : merged.interestRevenue });
  };

  const openAdd = () => { setEditItem(null); setForm(emptyForm()); setFormError(""); setShowDialog(true); };
  const openEdit = (r: LoanInterest) => {
    setEditItem(r);
    setForm({ loanId: r.loanId ?? "", customerName: r.customerName, date: r.date, amountOfLoan: String(r.amountOfLoan), interestPerMonth: String(r.interestPerMonth), loanPeriod: String(r.loanPeriod), interestRevenue: String(r.interestRevenue), notes: r.notes ?? "", status: r.status });
    setFormError(""); setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.customerName.trim()) { setFormError("Enter customer name."); return; }
    if (!form.amountOfLoan)        { setFormError("Enter loan amount."); return; }
    if (!form.interestPerMonth)    { setFormError("Enter interest rate per month."); return; }
    if (!form.loanPeriod)          { setFormError("Enter loan period."); return; }
    const co = cidRef.current || activeCompanyId;
    const resolvedCid = co || session?.companyId || groupCompanyId || "group";
    const payload = {
      customerName: form.customerName.trim(), date: form.date,
      amountOfLoan: Number(form.amountOfLoan), interestPerMonth: Number(form.interestPerMonth),
      loanPeriod: Number(form.loanPeriod),
      interestRevenue: Number(form.interestRevenue) || calcInterest(Number(form.amountOfLoan), Number(form.interestPerMonth), Number(form.loanPeriod)),
      loanId: form.loanId || undefined, notes: form.notes, status: form.status,
    };
    try {
      let res: Response;
      if (editItem) {
        res = await fetch("/api/loan-interest", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editItem.id, ...payload }) });
      } else {
        res = await fetch("/api/loan-interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: `lint-${Date.now()}`, companyId: resolvedCid, createdAt: new Date().toISOString(), ...payload }) });
      }
      if (!res.ok) { const e = await res.json().catch(() => ({})); setFormError(e.error || "Save failed."); return; }
      const saved = await res.json().catch(() => null);
      setShowDialog(false);
      if (saved && !editItem) setRecords(prev => [...prev, saved as LoanInterest]);
      loadData();
    } catch { setFormError("Network error."); }
  };

  const markPaid = async (id: string) => {
    await fetch("/api/loan-interest", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "paid" }) });
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "paid" } : r));
  };

  const deleteRecord = async (id: string) => {
    await fetch(`/api/loan-interest?id=${id}`, { method: "DELETE" });
    setRecords(prev => prev.filter(r => r.id !== id));
    setDeleteId(null);
  };

  const statusBadge = (s: string) => {
    const m: Record<string,string> = { pending: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800" };
    return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${m[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Interest from Loans"
        subtitle="Track interest revenue from loan customers"
        icon={TrendingUp}
        actions={canManage ? (
          <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" /> Add Interest Record
          </Button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Interest Revenue" value={formatCurrency(totalRevenue)}   icon={TrendingUp}   iconBg="bg-green-50"  iconColor="text-green-600"  subtitle="All records" />
        <StatCard title="Paid"                    value={formatCurrency(paidRevenue)}    icon={CheckCircle}  iconBg="bg-blue-50"   iconColor="text-blue-600"   subtitle="Collected" />
        <StatCard title="Pending"                 value={formatCurrency(pendingRevenue)} icon={Clock}        iconBg="bg-yellow-50" iconColor="text-yellow-600" subtitle="Outstanding" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search customer name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Customer Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Loan Amount</TableHead>
              <TableHead>Rate/Month</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Interest Revenue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">No interest records found.</TableCell></TableRow>
            ) : filtered.map(rec => (
              <TableRow key={rec.id} className="hover:bg-gray-50">
                <TableCell className="font-medium text-gray-900">{rec.customerName}</TableCell>
                <TableCell className="text-gray-600 text-sm">{formatDate(rec.date)}</TableCell>
                <TableCell className="text-gray-700">{formatCurrency(rec.amountOfLoan)}</TableCell>
                <TableCell className="text-gray-600">{rec.interestPerMonth}%</TableCell>
                <TableCell className="text-gray-600">{rec.loanPeriod} mo.</TableCell>
                <TableCell className="font-bold text-green-700">{formatCurrency(rec.interestRevenue)}</TableCell>
                <TableCell>{statusBadge(rec.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewItem(rec)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                    {canManage && rec.status === "pending" && (
                      <Button variant="ghost" size="sm" className="text-green-600 text-xs px-2" onClick={() => markPaid(rec.id)}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Paid
                      </Button>
                    )}
                    {canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(rec)}><Edit className="w-4 h-4 text-blue-400" /></Button>}
                    {canManage && <Button variant="ghost" size="icon" onClick={() => setDeleteId(rec.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Interest Record Details</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="text-lg font-bold text-green-900">{viewItem.customerName}</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(viewItem.interestRevenue)}</p>
                <p className="text-xs text-green-600">Interest Revenue</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Date",             value: formatDate(viewItem.date) },
                  { label: "Status",           value: viewItem.status },
                  { label: "Loan Amount",      value: formatCurrency(viewItem.amountOfLoan) },
                  { label: "Interest/Month",   value: `${viewItem.interestPerMonth}%` },
                  { label: "Loan Period",      value: `${viewItem.loanPeriod} months` },
                  { label: "Interest Revenue", value: formatCurrency(viewItem.interestRevenue) },
                ].map(r => (
                  <div key={r.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{r.label}</p>
                    <p className="font-semibold text-gray-900 text-sm">{r.value}</p>
                  </div>
                ))}
              </div>
              {viewItem.notes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{viewItem.notes}</p>
                </div>
              )}
              {(session?.isSuperAdmin && !cid) && (
                <p className="text-xs text-blue-500">Company: {getCompanyName(viewItem.companyId)}</p>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewItem(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Interest Record" : "Add Interest Record"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {/* Loan picker — auto-fills fields */}
              {!editItem && companyLoans.length > 0 && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select from Loan Customers (optional)</label>
                  <Select value={form.loanId || "none"} onValueChange={v => v === "none" ? sf({ loanId: "" }) : handleLoanSelect(v)}>
                    <SelectTrigger><SelectValue placeholder="Choose a loan to auto-fill..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Enter manually —</SelectItem>
                      {companyLoans.filter(l => l.status === "active").map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.customerName} — {formatCurrency(l.amountOfLoan)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Customer Name <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. John Mwalimu" value={form.customerName} onChange={e => sf({ customerName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date <span className="text-red-500">*</span></label>
                <Input type="date" value={form.date} onChange={e => sf({ date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount of Loan (TZS) <span className="text-red-500">*</span></label>
                <Input type="number" placeholder="0" value={form.amountOfLoan} onChange={e => recalc({ amountOfLoan: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Interest per Month (%) <span className="text-red-500">*</span></label>
                <Input type="number" step="0.1" placeholder="e.g. 5" value={form.interestPerMonth} onChange={e => recalc({ interestPerMonth: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Loan Period (months) <span className="text-red-500">*</span></label>
                <Input type="number" placeholder="e.g. 12" value={form.loanPeriod} onChange={e => recalc({ loanPeriod: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Interest Revenue (TZS)</label>
                <Input type="number" placeholder="Auto-calculated" value={form.interestRevenue} onChange={e => sf({ interestRevenue: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.interestRevenue && Number(form.interestRevenue) > 0 && (
                <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">Interest Revenue</p>
                  <p className="text-xl font-bold text-green-800">{formatCurrency(Number(form.interestRevenue))}</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
                <Textarea placeholder="Additional notes..." rows={2} value={form.notes} onChange={e => sf({ notes: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Interest Record</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteRecord(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
