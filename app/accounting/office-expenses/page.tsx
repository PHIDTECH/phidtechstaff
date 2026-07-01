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
import { Building2, Plus, Search, CheckCircle, Clock, XCircle, DollarSign, Edit, Trash2, Eye, AlertCircle, Download, Upload } from "lucide-react";
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

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; position?: string; department?: string; }
interface Company { id: string; name: string; }
interface AccountFloat { id: string; companyId: string; provider: string; accountName: string; currentBalance: number; accountType: string; }

interface OfficeExpense {
  id: string; companyId: string; recordedBy: string;
  title: string; category: string; amount: number;
  description: string; referenceNo: string;
  status: "pending" | "manager_approved" | "ceo_approved" | "disbursed" | "rejected" | string;
  date: string; createdAt: string;
  paymentMode?: "cash" | "bank" | "phone" | string;
  paymentDetails?: string;
  managerApprovedBy?: string; managerApprovedAt?: string;
  ceoApprovedBy?: string; ceoApprovedAt?: string;
  disbursedBy?: string; disbursedAt?: string;
  rejectedBy?: string; rejectedAt?: string;
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
  "Salary Advance",
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
  "Salary Advance":            "bg-emerald-100 text-emerald-800",
};

const emptyForm = () => ({
  recordedBy: "", title: "", category: OFFICE_EXPENSE_CATEGORIES[0],
  amount: "", description: "", referenceNo: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMode: "cash", paymentDetails: "",
});

export default function OfficeExpensesPage() {
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
  const [floats, setFloats]               = useState<AccountFloat[]>([]);
  const [disburseTarget, setDisburseTarget] = useState<OfficeExpense | null>(null);
  const [disburseFloatId, setDisburseFloatId] = useState("");
  const [disburseLoading, setDisburseLoading] = useState(false);
  const [disburseErr, setDisburseErr]     = useState("");
  const [importing, setImporting]         = useState(false);
  const [importMsg, setImportMsg]         = useState<{type:"success"|"error";text:string}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSession = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = getActiveCid(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    const cos = lsGet<Company[]>(COMPANIES_KEY, []);
    setCompanies(cos);
    const gc = lsStr(GROUP_KEY) || (cos[0]?.id ?? "");
    setGroupCompanyId(gc);
    // Load staff from server API
    try {
      const r = await fetch("/api/users", { cache: "no-store" });
      if (r.ok) setAllStaff(await r.json());
      else setAllStaff(lsGet<StaffUser[]>(USERS_KEY, []));
    } catch { setAllStaff(lsGet<StaffUser[]>(USERS_KEY, [])); }
    try {
      const rf = await fetch("/api/account-floats", { cache: "no-store" });
      if (rf.ok) setFloats(await rf.json());
    } catch {}
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

  const downloadCSV = () => {
    const co = cidRef.current || activeCompanyId;
    const list = (co ? expenses.filter(e => e.companyId === co) : expenses)
      .sort((a, b) => b.date.localeCompare(a.date));
    const header = "Date,Title,Category,Amount,Status,Payment Mode,Reference,Recorded By";
    const rows = list.map(e =>
      `"${e.date}","${e.title}","${e.category}","${e.amount}","${e.status}","${e.paymentMode || ""}","${e.referenceNo || ""}","${e.recordedBy || ""}"`
    ).join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Office_Expenses_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg(null);
    try {
      let cos = companies;
      if (cos.length === 0) {
        const cr = await fetch("/api/companies", { cache: "no-store" });
        if (cr.ok) cos = await cr.json();
      }
      const validCos = cos.filter(c => c.id && c.id !== "group");
      const targetCid = cidRef.current || activeCompanyId || validCos[0]?.id || "";
      if (!targetCid) throw new Error("No company found. Switch to a specific company first.");
      const text = await file.text();
      const allLines = text.trim().split(/\r?\n/);
      if (allLines.length < 2) throw new Error("No data rows found in CSV");
      const hdrs = (allLines[0].match(/("([^"]*)"|[^,]*)/g) || []).map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
      const col = (n: string) => hdrs.findIndex(h => h.includes(n));
      const iDate = col("date"); const iTitle = col("title"); const iCat = col("categ");
      const iAmt = col("amount"); const iStatus = col("status"); const iMode = col("mode");
      const iRef = col("ref"); const iRec = col("recorded");
      let imported = 0; let lastError = "";
      for (const line of allLines.slice(1)) {
        if (!line.trim()) continue;
        const vals = line.match(/("([^"]*)"|[^,]*)/g) || [];
        const clean = (i: number) => i >= 0 ? (vals[i] || "").replace(/^"|"$/g, "").trim() : "";
        const rawDate = clean(iDate);
        const date = rawDate ? (rawDate.includes("-") ? rawDate : (() => { const d = new Date(rawDate); return isNaN(d.getTime()) ? new Date().toISOString().slice(0,10) : d.toISOString().slice(0,10); })()) : new Date().toISOString().slice(0,10);
        const entry: OfficeExpense = {
          id: `imp_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
          companyId: targetCid,
          date, title: clean(iTitle) || "Imported Expense",
          category: clean(iCat) || OFFICE_EXPENSE_CATEGORIES[0],
          amount: Number(clean(iAmt).replace(/[^0-9.-]/g, "")) || 0,
          status: (clean(iStatus) || "pending") as OfficeExpense["status"],
          paymentMode: clean(iMode) || "cash",
          referenceNo: clean(iRef), recordedBy: clean(iRec) || session?.name || "",
          description: "", createdAt: new Date().toISOString(),
        };
        const res = await fetch("/api/office-expenses", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry),
        });
        if (res.ok) imported++;
        else { const err = await res.json().catch(() => ({})); lastError = err.error || res.statusText; }
      }
      if (imported === 0 && lastError) throw new Error(lastError);
      setImportMsg({ type: "success", text: `Imported ${imported} records` });
      await fetchExpenses();
    } catch (err) {
      setImportMsg({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setImportMsg(null), 5000);
    }
  };

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

  const cid = cidRef.current || activeCompanyId;
  const _or = (session?.role ?? "").toLowerCase();
  const _op = (session?.position ?? "").toLowerCase();
  const GROUP_ROLES_OE = ["group_ceo","group_cfo","group_manager","group_controller","group_hr","group_auditor","group_legal","group_it","group_accountant"];
  const isGroupUser  = session?.companyId === "group" || GROUP_ROLES_OE.includes(_or) || GROUP_ROLES_OE.includes(_op);
  const isOEManager    = _op.includes("manager") || _or.includes("manager") || _op.includes("general manager") || _or === "group_manager";
  const isOECEO        = session?.isSuperAdmin || _or === "admin" || _op === "admin" || _or.includes("ceo") || _op.includes("ceo");
  const isOEAccountant = _or === "accountant" || _op === "accountant" || _or === "group_cfo" || _op === "group_cfo" || _or === "group_accountant" || _op === "group_accountant";
  const canManage = session?.isSuperAdmin || isGroupUser || isOEManager || isOECEO || isOEAccountant;

  // SuperAdmin sees ALL subsidiaries unless they have explicitly switched to a specific company
  const companyExpenses = (session?.isSuperAdmin && !cid)
    ? expenses
    : (cid ? expenses.filter(e => e.companyId === cid) : expenses);
  const companyStaff    = (session?.isSuperAdmin && !cid)
    ? allStaff
    : (cid ? allStaff.filter(u => u.companyId === cid) : allStaff);
  const showCompanyCol  = !cid || (session?.isSuperAdmin && !cid);
  const getCompanyName  = (id: string) => companies.find(c => c.id === id)?.name ?? id;

  const totalAll       = companyExpenses.reduce((s, e) => s + e.amount, 0);
  const totalPending   = companyExpenses.filter(e => e.status === "pending").reduce((s, e) => s + e.amount, 0);
  const totalGMApproved = companyExpenses.filter(e => e.status === "manager_approved").reduce((s, e) => s + e.amount, 0);
  const totalCEOApproved = companyExpenses.filter(e => e.status === "ceo_approved").reduce((s, e) => s + e.amount, 0);
  const totalDisbursed  = companyExpenses.filter(e => e.status === "disbursed").reduce((s, e) => s + e.amount, 0);

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
    setForm({ recordedBy: e.recordedBy, title: e.title, category: e.category, amount: String(e.amount), description: e.description, referenceNo: e.referenceNo, date: e.date, paymentMode: e.paymentMode || "cash", paymentDetails: e.paymentDetails || "" });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.title.trim()) { setFormError("Enter an expense title."); return; }
    if (!form.amount)       { setFormError("Enter an amount."); return; }
    if (!form.date)         { setFormError("Select a date."); return; }
    const co = cidRef.current || activeCompanyId;
    const resolvedCompanyId = co || session?.companyId || groupCompanyId || "group";
    try {
      let res: Response;
      if (editItem) {
        res = await fetch("/api/office-expenses", { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editItem.id, title: form.title.trim(), category: form.category, amount: Number(form.amount) || 0, description: form.description, referenceNo: form.referenceNo, date: form.date, recordedBy: form.recordedBy, paymentMode: form.paymentMode, paymentDetails: form.paymentDetails }) });
      } else {
        res = await fetch("/api/office-expenses", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `oexp-${Date.now()}`,
            companyId: resolvedCompanyId,
            recordedBy: form.recordedBy || (session?.id ?? ""),
            title: form.title.trim(),
            category: form.category,
            amount: Number(form.amount) || 0,
            description: form.description,
            referenceNo: form.referenceNo,
            paymentMode: form.paymentMode,
            paymentDetails: form.paymentDetails,
            status: "pending",
            date: form.date,
            createdAt: new Date().toISOString(),
          }) });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || "Save failed. Please try again.");
        return;
      }
      const saved = await res.json().catch(() => null);
      setShowDialog(false);
      if (saved && !editItem) {
        setExpenses(prev => [...prev, saved as OfficeExpense]);
      }
      fetchExpenses();
    } catch { setFormError("Network error. Please try again."); }
  };

  const openDisburse = (exp: OfficeExpense) => {
    const coCid = exp.companyId;
    const available = floats.filter(f => !coCid || f.companyId === coCid || f.companyId === "group");
    setDisburseTarget(exp);
    setDisburseFloatId(available[0]?.id ?? "");
    setDisburseErr("");
  };

  const confirmDisburse = async () => {
    if (!disburseTarget) return;
    setDisburseLoading(true);
    setDisburseErr("");
    try {
      await updateStatus(disburseTarget.id, "disbursed");
      if (disburseFloatId) {
        const fl = floats.find(f => f.id === disburseFloatId);
        await fetch("/api/account-floats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _action: "deduct",
            id: disburseFloatId,
            amount: disburseTarget.amount,
            description: `Office Expense: ${disburseTarget.title}`,
            updatedBy: session?.name ?? "",
            reference: disburseTarget.id,
            date: new Date().toISOString().slice(0, 10),
          }),
        });
        const rf = await fetch("/api/account-floats", { cache: "no-store" });
        if (rf.ok) setFloats(await rf.json());
        setDisburseTarget(null);
        setDisburseFloatId("");
      } else {
        setDisburseTarget(null);
      }
    } catch { setDisburseErr("Failed. Try again."); }
    finally { setDisburseLoading(false); }
  };

  const updateStatus = async (id: string, newStatus: OfficeExpense["status"]) => {
    const now = new Date().toISOString();
    const by  = session?.name ?? "";
    const extra: Record<string,string> = {};
    if (newStatus === "manager_approved") { extra.managerApprovedBy = by; extra.managerApprovedAt = now; }
    if (newStatus === "ceo_approved")     { extra.ceoApprovedBy = by;     extra.ceoApprovedAt = now; }
    if (newStatus === "disbursed")        { extra.disbursedBy = by;        extra.disbursedAt = now; }
    if (newStatus === "rejected")         { extra.rejectedBy = by;         extra.rejectedAt = now; }
    await fetch("/api/office-expenses", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus, ...extra }) });
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
      {importMsg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${importMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {importMsg.text}
        </div>
      )}
      <PageHeader
        title="Office Expenses"
        subtitle="Record and track business operating expenses — advertisement, TRA, licences, rent, utilities and more"
        icon={Building2}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className={`w-4 h-4 mr-2 ${importing ? "animate-pulse" : ""}`} />{importing ? "Importing..." : "Import CSV"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Record Expense
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <StatCard title="Total Recorded"   value={formatCurrency(totalAll)}          icon={Building2}   iconBg="bg-blue-50"    iconColor="text-blue-600"   subtitle={`${companyExpenses.length} entries`} />
        <StatCard title="Pending GM"        value={formatCurrency(totalPending)}      icon={Clock}       iconBg="bg-yellow-50"  iconColor="text-yellow-600" subtitle={`${companyExpenses.filter(e=>e.status==="pending").length} items`} />
        <StatCard title="Pending CEO"       value={formatCurrency(totalGMApproved)}   icon={Clock}       iconBg="bg-blue-50"    iconColor="text-blue-600"   subtitle={`${companyExpenses.filter(e=>e.status==="manager_approved").length} items`} />
        <StatCard title="CEO Approved"      value={formatCurrency(totalCEOApproved)}  icon={CheckCircle} iconBg="bg-indigo-50"  iconColor="text-indigo-600" subtitle={`${companyExpenses.filter(e=>e.status==="ceo_approved").length} items`} />
        <StatCard title="Disbursed"         value={formatCurrency(totalDisbursed)}    icon={DollarSign}  iconBg="bg-green-50"   iconColor="text-green-600"  subtitle={`${companyExpenses.filter(e=>e.status==="disbursed").length} items`} />
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
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">⏳ Pending GM</SelectItem>
                <SelectItem value="manager_approved">🔵 Pending CEO</SelectItem>
                <SelectItem value="ceo_approved">✅ CEO Approved</SelectItem>
                <SelectItem value="disbursed">💵 Disbursed</SelectItem>
                <SelectItem value="rejected">❌ Rejected</SelectItem>
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
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Record Expense</Button>
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
                const approver = allStaff.find(u => u.name === (exp.ceoApprovedBy ?? exp.managerApprovedBy ?? ""));
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
                      {(() => {
                        const s = exp.status;
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
                        <Button variant="ghost" size="icon" onClick={() => setViewItem(exp)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                        {canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(exp)}><Edit className="w-4 h-4 text-blue-400" /></Button>}
                        {/* Stage 1: Manager */}
                        {exp.status === "pending" && isOEManager && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600 text-xs px-2" onClick={() => updateStatus(exp.id, "manager_approved")}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 text-xs px-2" onClick={() => updateStatus(exp.id, "rejected")}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {/* Stage 2: CEO approves only */}
                        {exp.status === "manager_approved" && isOECEO && (
                          <>
                            <Button variant="ghost" size="sm" className="text-indigo-600 text-xs px-2" onClick={() => updateStatus(exp.id, "ceo_approved")}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> CEO Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 text-xs px-2" onClick={() => updateStatus(exp.id, "rejected")}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {/* Stage 3: Accountant or CEO disburses */}
                        {exp.status === "ceo_approved" && (isOEAccountant || isOECEO) && (
                          <Button variant="ghost" size="sm" className="text-green-700 text-xs px-2" onClick={() => openDisburse(exp)}>
                            💵 Disburse
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
            const approver = allStaff.find(u => u.name === (viewItem.ceoApprovedBy ?? viewItem.managerApprovedBy ?? ""));
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
                {viewItem.paymentMode && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Payment Mode</p>
                      <p className="font-semibold text-blue-800 text-sm capitalize">{viewItem.paymentMode}</p>
                    </div>
                    {viewItem.paymentDetails && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">{viewItem.paymentMode === "bank" ? "Bank Account" : viewItem.paymentMode === "phone" ? "Phone Number" : "Details"}</p>
                        <p className="font-semibold text-blue-800 text-sm">{viewItem.paymentDetails}</p>
                      </div>
                    )}
                  </div>
                )}
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
            {viewItem && viewItem.status === "pending" && isOEManager && (
              <>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => { updateStatus(viewItem.id, "manager_approved"); setViewItem(null); }}>Approve</Button>
                <Button variant="destructive" onClick={() => { updateStatus(viewItem.id, "rejected"); setViewItem(null); }}>Reject</Button>
              </>
            )}
            {viewItem && viewItem.status === "manager_approved" && isOECEO && (
              <>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { updateStatus(viewItem.id, "ceo_approved"); setViewItem(null); }}>CEO Approve</Button>
                <Button variant="destructive" onClick={() => { updateStatus(viewItem.id, "rejected"); setViewItem(null); }}>Reject</Button>
              </>
            )}
            {viewItem && viewItem.status === "ceo_approved" && (isOEAccountant || isOECEO) && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { openDisburse(viewItem); setViewItem(null); }}>💵 Disburse</Button>
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Payment Mode</label>
                <Select value={form.paymentMode} onValueChange={v => sf({ paymentMode: v, paymentDetails: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="phone">📱 Mobile Money (Phone)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.paymentMode === "bank" || form.paymentMode === "phone") && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    {form.paymentMode === "bank" ? "Bank Account Number / Details" : "Phone Number (e.g. M-Pesa / Tigo Pesa)"}
                  </label>
                  <Input
                    placeholder={form.paymentMode === "bank" ? "e.g. CRDB 0123456789" : "e.g. +255 712 345 678"}
                    value={form.paymentDetails}
                    onChange={e => sf({ paymentDetails: e.target.value })}
                  />
                </div>
              )}
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

      {/* Disburse — Select Float Account */}
      <Dialog open={!!disburseTarget} onOpenChange={v => { if (!v) setDisburseTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Disburse: Select Payment Account</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            {disburseErr && <p className="text-sm text-red-600">{disburseErr}</p>}
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-gray-500 mb-1">Expense</p>
              <p className="font-semibold text-gray-900">{disburseTarget?.title}</p>
              <p className="text-blue-700 font-bold text-base mt-1">{disburseTarget ? formatCurrency(disburseTarget.amount) : ""}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Deduct from Account Float</label>
              <Select value={disburseFloatId} onValueChange={setDisburseFloatId}>
                <SelectTrigger><SelectValue placeholder="Select account (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No float deduction</SelectItem>
                  {floats.filter(f => !disburseTarget?.companyId || f.companyId === disburseTarget?.companyId || f.companyId === "group").map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.provider} — {f.accountName} ({formatCurrency(f.currentBalance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {disburseFloatId && disburseFloatId !== "none" && (() => {
              const fl = floats.find(f => f.id === disburseFloatId);
              const remaining = (fl?.currentBalance ?? 0) - (disburseTarget?.amount ?? 0);
              return <p className={`text-xs font-medium ${remaining < 0 ? "text-red-600" : "text-green-700"}`}>
                Balance after deduction: {formatCurrency(remaining)}
              </p>;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisburseTarget(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" disabled={disburseLoading} onClick={confirmDisburse}>
              {disburseLoading ? "Processing..." : "💵 Confirm Disburse"}
            </Button>
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
