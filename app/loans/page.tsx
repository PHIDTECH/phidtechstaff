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
import { DollarSign, Plus, Search, Edit, Trash2, Eye, AlertCircle, Users, TrendingUp, CheckCircle } from "lucide-react";
import ImportExport from "@/components/shared/ImportExport";
import { formatCurrency, formatDate } from "@/lib/utils";

const SESSION_KEY  = "phidtech_session";
const ACTIVE_KEY   = "phidtech_active_company";
const COMPANIES_KEY= "phidtech_companies";
const GROUP_KEY    = "phidtech_group_company";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function lsStr(key: string, fb = "") { try { return localStorage.getItem(key) ?? fb; } catch { return fb; } }

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }
interface LoanCustomer {
  id: string; companyId: string; customerName: string; contactPhone?: string;
  date: string; amountOfLoan: number; interestPerMonth: number; loanPeriod: number;
  processingFeeType?: string; processingFee?: number;
  penaltyFeeType?: string; penaltyFee?: number;
  status: string; notes?: string; createdAt: string; createdBy?: string;
}

const emptyForm = () => ({
  customerName: "", contactPhone: "", date: new Date().toISOString().slice(0, 10),
  amountOfLoan: "", interestPerMonth: "", loanPeriod: "", notes: "", status: "active",
  processingFeeType: "fixed", processingFee: "",
  penaltyFeeType: "percent", penaltyFee: "",
  formCompanyId: "",
});

const calcTotalInterest = (amount: number, rate: number, period: number) =>
  Math.round(amount * (rate / 100) * period);

export default function LoansPage() {
  usePermissionGuard("loans");
  const [loans, setLoans]           = useState<LoanCustomer[]>([]);
  const [session, setSession]       = useState<Session | null>(null);
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [groupCompanyId, setGroupCompanyId]   = useState("");
  const cidRef                      = useRef("");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem]     = useState<LoanCustomer | null>(null);
  const [viewItem, setViewItem]     = useState<LoanCustomer | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [formError, setFormError]   = useState("");

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
      const r = await fetch("/api/loans", { cache: "no-store" });
      if (r.ok) setLoans(await r.json());
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
  const isGroupUser      = session?.companyId === "group" || GRP.includes(_or) || GRP.includes(_op);
  const canManage         = session?.isSuperAdmin || isGroupUser || ["admin","manager","accountant"].includes(_or) || ["admin","manager","accountant"].includes(_op);
  const canViewFinancials = session?.isSuperAdmin || isGroupUser;

  const companyLoans = (session?.isSuperAdmin && !cid) ? loans : (cid ? loans.filter(l => l.companyId === cid) : loans);
  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.name ?? id;

  const filtered = companyLoans.filter(l => {
    const q = search.toLowerCase();
    return (l.customerName.toLowerCase().includes(q) || (l.contactPhone ?? "").includes(q)) &&
      (statusFilter === "all" || l.status === statusFilter);
  });

  const totalCapital    = companyLoans.reduce((s, l) => s + l.amountOfLoan, 0);
  const totalInterest   = companyLoans.reduce((s, l) => s + calcTotalInterest(l.amountOfLoan, l.interestPerMonth, l.loanPeriod), 0);
  const activeLoans     = companyLoans.filter(l => l.status === "active");
  const activeCount     = activeLoans.length;
  const activeCapital   = activeLoans.reduce((s, l) => s + l.amountOfLoan, 0);
  const activeInterest  = activeLoans.reduce((s, l) => s + calcTotalInterest(l.amountOfLoan, l.interestPerMonth, l.loanPeriod), 0);

  const openAdd = () => { setEditItem(null); setForm(emptyForm()); setFormError(""); setShowDialog(true); };
  const openEdit = (l: LoanCustomer) => {
    setEditItem(l);
    setForm({ customerName: l.customerName, contactPhone: l.contactPhone ?? "", date: l.date, amountOfLoan: String(l.amountOfLoan), interestPerMonth: String(l.interestPerMonth), loanPeriod: String(l.loanPeriod), notes: l.notes ?? "", status: l.status, processingFeeType: l.processingFeeType || "fixed", processingFee: String(l.processingFee ?? ""), penaltyFeeType: l.penaltyFeeType || "percent", penaltyFee: String(l.penaltyFee ?? ""), formCompanyId: l.companyId });
    setFormError(""); setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.customerName.trim()) { setFormError("Enter customer name."); return; }
    if (!form.amountOfLoan)        { setFormError("Enter loan amount."); return; }
    if (!form.interestPerMonth)    { setFormError("Enter interest rate per month."); return; }
    if (!form.loanPeriod)          { setFormError("Enter loan period."); return; }
    const co = cidRef.current || activeCompanyId;
    const resolvedCid = form.formCompanyId || co || session?.companyId || groupCompanyId || "group";
    try {
      let res: Response;
      if (editItem) {
        res = await fetch("/api/loans", { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editItem.id, customerName: form.customerName.trim(), contactPhone: form.contactPhone, date: form.date, amountOfLoan: Number(form.amountOfLoan), interestPerMonth: Number(form.interestPerMonth), loanPeriod: Number(form.loanPeriod), notes: form.notes, status: form.status, processingFeeType: form.processingFeeType, processingFee: form.processingFee ? Number(form.processingFee) : 0, penaltyFeeType: form.penaltyFeeType, penaltyFee: form.penaltyFee ? Number(form.penaltyFee) : 0 }) });
      } else {
        res = await fetch("/api/loans", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: `loan-${Date.now()}`, companyId: resolvedCid, customerName: form.customerName.trim(), contactPhone: form.contactPhone, date: form.date, amountOfLoan: Number(form.amountOfLoan), interestPerMonth: Number(form.interestPerMonth), loanPeriod: Number(form.loanPeriod), notes: form.notes, status: form.status, processingFeeType: form.processingFeeType, processingFee: form.processingFee ? Number(form.processingFee) : 0, penaltyFeeType: form.penaltyFeeType, penaltyFee: form.penaltyFee ? Number(form.penaltyFee) : 0, createdAt: new Date().toISOString(), createdBy: session?.id ?? "" }) });
      }
      if (!res.ok) { const e = await res.json().catch(() => ({})); setFormError(e.error || "Save failed."); return; }
      const saved = await res.json().catch(() => null);
      setShowDialog(false);
      if (saved && !editItem) setLoans(prev => [...prev, saved as LoanCustomer]);
      loadData();
    } catch { setFormError("Network error."); }
  };

  const deleteLoan = async (id: string) => {
    await fetch(`/api/loans?id=${id}`, { method: "DELETE" });
    setLoans(prev => prev.filter(l => l.id !== id));
    setDeleteId(null);
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", active: "bg-green-100 text-green-800", completed: "bg-blue-100 text-blue-800", defaulted: "bg-red-100 text-red-800" };
    return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${m[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Loan Customers"
        subtitle="Manage loan records for PHIDTECH GLOBAL FINANCE LIMITED"
        icon={DollarSign}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ImportExport
              label="Loan Customers"
              rows={loans as unknown as Record<string, unknown>[]}
              onImport={async (rows) => {
                const res = await fetch("/api/bulk-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dbKey: "loans", records: rows }) });
                const data = await res.json();
                loadData();
                return { imported: data.imported ?? 0, errors: data.errors ?? [] };
              }}
            />
            {canManage && (
              <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> New Loan
              </Button>
            )}
          </div>
        }
      />

      <div className={`grid gap-4 mb-6 ${canViewFinancials ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2"}`}>
        <StatCard title="Total Loans"    value={companyLoans.length} icon={Users}       iconBg="bg-blue-50"    iconColor="text-blue-600"   subtitle="All records" />
        <StatCard title="Active Loans"   value={activeCount}         icon={CheckCircle}  iconBg="bg-green-50"   iconColor="text-green-600" subtitle="Currently active" />
        {canViewFinancials && <StatCard title="Active Capital"    value={formatCurrency(activeCapital)}   icon={DollarSign} iconBg="bg-purple-50"   iconColor="text-purple-600" subtitle={`Total: ${formatCurrency(totalCapital)}`} />}
        {canViewFinancials && <StatCard title="Active Interest"   value={formatCurrency(activeInterest)}  icon={TrendingUp}  iconBg="bg-emerald-50" iconColor="text-emerald-600" subtitle="Revenue from active loans" />}
        {canViewFinancials && <StatCard title="Total Interest"    value={formatCurrency(totalInterest)}   icon={TrendingUp}  iconBg="bg-orange-50"  iconColor="text-orange-600" subtitle="All-time interest revenue" />}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search customer name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Customer Name</TableHead>
              <TableHead>Date</TableHead>
              {canViewFinancials && <TableHead>Loan Amount</TableHead>}
              {canViewFinancials && <TableHead>Rate/Month</TableHead>}
              {canViewFinancials && <TableHead>Period</TableHead>}
              {canViewFinancials && <TableHead>Total Interest</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={canViewFinancials ? 8 : 4} className="text-center py-10 text-gray-400">No loan records found.</TableCell></TableRow>
            ) : filtered.map(loan => (
              <TableRow key={loan.id} className="hover:bg-gray-50">
                <TableCell>
                  <p className="font-medium text-gray-900">{loan.customerName}</p>
                  {loan.contactPhone && <p className="text-xs text-gray-400">{loan.contactPhone}</p>}
                </TableCell>
                <TableCell className="text-gray-600 text-sm">{formatDate(loan.date)}</TableCell>
                {canViewFinancials && <TableCell className="font-semibold text-gray-900">{formatCurrency(loan.amountOfLoan)}</TableCell>}
                {canViewFinancials && <TableCell className="text-gray-600">{loan.interestPerMonth}%</TableCell>}
                {canViewFinancials && <TableCell className="text-gray-600">{loan.loanPeriod} mo.</TableCell>}
                {canViewFinancials && <TableCell className="font-semibold text-green-700">{formatCurrency(calcTotalInterest(loan.amountOfLoan, loan.interestPerMonth, loan.loanPeriod))}</TableCell>}
                <TableCell>{statusBadge(loan.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewItem(loan)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                    {canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(loan)}><Edit className="w-4 h-4 text-blue-400" /></Button>}
                    {canManage && <Button variant="ghost" size="icon" onClick={() => setDeleteId(loan.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>}
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
          <DialogHeader><DialogTitle>Loan Details</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="text-lg font-bold text-blue-900">{viewItem.customerName}</p>
                {viewItem.contactPhone && <p className="text-sm text-blue-700">{viewItem.contactPhone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Date",   value: formatDate(viewItem.date), restricted: false },
                  { label: "Status", value: viewItem.status,           restricted: false },
                  { label: "Loan Amount",      value: formatCurrency(viewItem.amountOfLoan),                                                                                                        restricted: true  },
                  { label: "Rate / Month",     value: `${viewItem.interestPerMonth}%`,                                                                                                              restricted: true  },
                  { label: "Loan Period",      value: `${viewItem.loanPeriod} months`,                                                                                                             restricted: true  },
                  { label: "Interest Revenue", value: formatCurrency(calcTotalInterest(viewItem.amountOfLoan, viewItem.interestPerMonth, viewItem.loanPeriod)),                                    restricted: true  },
                  { label: "Processing Fee",   value: viewItem.processingFee ? `${viewItem.processingFeeType === "percent" ? viewItem.processingFee + "%" : formatCurrency(viewItem.processingFee)}` : "—", restricted: true },
                  { label: "Penalty Fee",      value: viewItem.penaltyFee    ? `${viewItem.penaltyFeeType    === "percent" ? viewItem.penaltyFee    + "%" : formatCurrency(viewItem.penaltyFee)}`    : "—", restricted: true },
                ].filter(r => !r.restricted || canViewFinancials).map(r => (
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
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader><DialogTitle>{editItem ? "Edit Loan" : "New Loan Customer"}</DialogTitle></DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(!cid || session?.isSuperAdmin) && !editItem && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company <span className="text-red-500">*</span></label>
                  <Select value={form.formCompanyId || cid} onValueChange={v => sf({ formCompanyId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {companies.filter(c => c.id !== groupCompanyId).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Contact Phone</label>
                <Input placeholder="+255 7XX XXX XXX" value={form.contactPhone} onChange={e => sf({ contactPhone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date <span className="text-red-500">*</span></label>
                <Input type="date" value={form.date} onChange={e => sf({ date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount of Loan (TZS) <span className="text-red-500">*</span></label>
                <Input type="number" placeholder="0" value={form.amountOfLoan} onChange={e => sf({ amountOfLoan: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Interest per Month (%) <span className="text-red-500">*</span></label>
                <Input type="number" step="0.1" placeholder="e.g. 5" value={form.interestPerMonth} onChange={e => sf({ interestPerMonth: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Loan Period (months) <span className="text-red-500">*</span></label>
                <Input type="number" placeholder="e.g. 12" value={form.loanPeriod} onChange={e => sf({ loanPeriod: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="defaulted">Defaulted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Processing Fee */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Processing Fee Type</label>
                <Select value={form.processingFeeType} onValueChange={v => sf({ processingFeeType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount (TZS)</SelectItem>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Processing Fee {form.processingFeeType === "percent" ? "(%)" : "(TZS)"}</label>
                <Input type="number" step="0.01" placeholder="0" value={form.processingFee} onChange={e => sf({ processingFee: e.target.value })} />
              </div>
              {/* Penalty Fee */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Penalty Fee Type</label>
                <Select value={form.penaltyFeeType} onValueChange={v => sf({ penaltyFeeType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount (TZS)</SelectItem>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Penalty Fee {form.penaltyFeeType === "percent" ? "(%)" : "(TZS)"}</label>
                <Input type="number" step="0.01" placeholder="0" value={form.penaltyFee} onChange={e => sf({ penaltyFee: e.target.value })} />
              </div>
              {form.amountOfLoan && form.interestPerMonth && form.loanPeriod && (
                <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">Calculated Interest Revenue</p>
                  <p className="text-lg font-bold text-green-800">
                    {formatCurrency(calcTotalInterest(Number(form.amountOfLoan), Number(form.interestPerMonth), Number(form.loanPeriod)))}
                  </p>
                  <p className="text-xs text-green-600">{form.amountOfLoan} × {form.interestPerMonth}% × {form.loanPeriod} months</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
                <Textarea placeholder="Additional notes..." rows={2} value={form.notes} onChange={e => sf({ notes: e.target.value })} />
              </div>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add Loan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Loan Record</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteLoan(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
