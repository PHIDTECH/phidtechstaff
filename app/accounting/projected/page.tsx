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
import { TrendingUp, TrendingDown, Plus, Edit, Trash2, Download, RefreshCw, Target, BarChart2, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY     = "phidtech_group_company";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }
interface Projection {
  id: string; companyId: string; type: "expense" | "income";
  title: string; category: string; amount: number;
  period: "monthly" | "once"; month: string; year: number;
  priority?: "high" | "medium" | "low"; status: "draft" | "confirmed" | "done";
  notes?: string; createdAt: string;
}

const EXPENSE_CATEGORIES = ["Salaries & Wages","Rent & Utilities","Marketing & Advertising","Transport & Logistics","IT & Software","Maintenance & Repairs","Office Supplies","Professional Fees","Insurance","Other"];
const INCOME_CATEGORIES  = ["Sales Revenue","Service Fees","Consultation","Interest Income","Rental Income","Commission","Government Grants","Other"];
const MONTHS_LIST = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const currentYear  = new Date().getFullYear();
const currentMonth = MONTHS_LIST[new Date().getMonth()];

const emptyForm = () => ({
  type: "expense" as Projection["type"],
  title: "", category: "", amount: "",
  period: "monthly" as Projection["period"],
  month: currentMonth, year: String(currentYear),
  priority: "medium" as Projection["priority"],
  status: "draft" as Projection["status"],
  notes: "", saleCompanyId: "",
});

const priorityColors: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-green-100 text-green-700",
};
const statusColors: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  done:      "bg-green-100 text-green-700",
};

export default function ProjectedPage() {
  usePermissionGuard("accounting");
  const [projections, setProjections] = useState<Projection[]>([]);
  const [companies,   setCompanies]   = useState<Company[]>([]);
  const [session,     setSession]     = useState<Session | null>(null);
  const [cid,         setCid]         = useState("");
  const [groupCid,    setGroupCid]    = useState("");
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<"expense" | "income">("expense");
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear,  setFilterYear]  = useState(String(currentYear));
  const [showDialog,  setShowDialog]  = useState(false);
  const [editItem,    setEditItem]    = useState<Projection | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [form,        setForm]        = useState(emptyForm());
  const [formError,   setFormError]   = useState("");
  const sf = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));

  const loadData = async () => {
    setLoading(true);
    try {
      const sess = lsGet<Session>(SESSION_KEY, null as never);
      setSession(sess);
      const activeCid = getActiveCid(sess);
      setCid(activeCid);
      const cos = lsGet<Company[]>(COMPANIES_KEY, []);
      setCompanies(cos);
      setGroupCid(lsGet<string>(GROUP_KEY, ""));
      const r = await fetch("/api/projected", { cache: "no-store" });
      if (r.ok) setProjections(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isGroupView = !cid || cid === groupCid;
  const allFiltered = projections
    .filter(p => isGroupView || p.companyId === cid)
    .filter(p => !filterMonth || p.month === filterMonth)
    .filter(p => !filterYear  || String(p.year) === filterYear);

  const expenses = allFiltered.filter(p => p.type === "expense");
  const incomes  = allFiltered.filter(p => p.type === "income");
  const displayed= activeTab === "expense" ? expenses : incomes;

  const totalIncome   = incomes.reduce((s, p)  => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, p) => s + p.amount, 0);
  const netProjection = totalIncome - totalExpenses;

  const confirmedIncome  = incomes.filter(p  => p.status === "confirmed" || p.status === "done").reduce((s, p) => s + p.amount, 0);
  const confirmedExpense = expenses.filter(p => p.status === "confirmed" || p.status === "done").reduce((s, p) => s + p.amount, 0);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm(), type: activeTab });
    setFormError(""); setShowDialog(true);
  };
  const openEdit = (p: Projection) => {
    setEditItem(p);
    setForm({ type: p.type, title: p.title, category: p.category, amount: String(p.amount), period: p.period, month: p.month, year: String(p.year), priority: p.priority ?? "medium", status: p.status, notes: p.notes ?? "", saleCompanyId: p.companyId });
    setFormError(""); setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.title.trim())    { setFormError("Enter a title."); return; }
    if (!form.category)        { setFormError("Select a category."); return; }
    if (!form.amount || isNaN(Number(form.amount))) { setFormError("Enter a valid amount."); return; }
    const activeCid = form.saleCompanyId || cid || session?.companyId || groupCid || "group";
    const payload = {
      type: form.type, title: form.title.trim(), category: form.category,
      amount: Number(form.amount), period: form.period, month: form.month,
      year: Number(form.year), priority: form.priority, status: form.status,
      notes: form.notes, companyId: activeCid,
    };
    try {
      if (editItem) {
        await fetch("/api/projected", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editItem.id, ...payload }) });
      } else {
        await fetch("/api/projected", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() }) });
      }
      setShowDialog(false); await loadData();
    } catch { setFormError("Save failed. Try again."); }
  };

  const deleteItem = async () => {
    if (!deleteId) return;
    await fetch(`/api/projected?id=${deleteId}`, { method: "DELETE" });
    setDeleteId(null); await loadData();
  };

  const downloadCSV = () => {
    const header = "Type,Title,Category,Amount,Period,Month,Year,Priority,Status,Notes";
    const rows = displayed.map(p =>
      `"${p.type}","${p.title}","${p.category}","${p.amount}","${p.period}","${p.month}","${p.year}","${p.priority ?? ""}","${p.status}","${(p.notes ?? "").replace(/"/g,'""')}"`
    ).join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `Projected_${activeTab}_${filterMonth}_${filterYear}.csv`; a.click();
  };

  const categories = form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 1 + i));

  return (
    <MainLayout>
      <PageHeader
        title="Projected Expenses & Income"
        subtitle="Plan and track projected expenses and income — does not affect books of accounts"
        icon={Target}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />Add {activeTab === "expense" ? "Expense" : "Income"}
            </Button>
          </div>
        }
      />

      {/* Note Banner */}
      <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Planning Tool Only:</strong> Records here are for budgeting and forecasting purposes only. They do <strong>not</strong> appear in Profit & Loss, Balance Sheet, or any other financial report.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Projected Income</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          <p className="text-xs text-gray-400">{incomes.length} records · {filterMonth} {filterYear}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Projected Expenses</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-gray-400">{expenses.length} records · {filterMonth} {filterYear}</p>
        </div>
        <div className={`bg-white rounded-xl border shadow-sm p-4 ${netProjection >= 0 ? "border-green-100" : "border-red-100"}`}>
          <p className="text-xs text-gray-500 mb-1">Net Projection</p>
          <p className={`text-xl font-bold ${netProjection >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(netProjection)}</p>
          <p className="text-xs text-gray-400">{netProjection >= 0 ? "Surplus" : "Deficit"}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Confirmed (Expenses)</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(confirmedExpense)}</p>
          <p className="text-xs text-gray-400">Confirmed income: {formatCurrency(confirmedIncome)}</p>
        </div>
      </div>

      {/* Filters + Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setActiveTab("expense")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "expense" ? "bg-white shadow text-red-600" : "text-gray-600"}`}>
            <TrendingDown className="w-4 h-4" />Expenses
          </button>
          <button onClick={() => setActiveTab("income")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "income" ? "bg-white shadow text-green-600" : "text-gray-600"}`}>
            <TrendingUp className="w-4 h-4" />Income
          </button>
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <span className="ml-auto text-xs text-gray-400">{displayed.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Month / Year</TableHead>
              {activeTab === "expense" && <TableHead>Priority</TableHead>}
              <TableHead>Status</TableHead>
              {isGroupView && <TableHead>Company</TableHead>}
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-gray-400">Loading...</TableCell></TableRow>
            ) : displayed.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-gray-400">
                <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />No projected {activeTab}s for {filterMonth} {filterYear}
              </TableCell></TableRow>
            ) : displayed.map((p, i) => (
              <TableRow key={p.id} className="hover:bg-gray-50">
                <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium text-gray-900">{p.title}</TableCell>
                <TableCell className="text-gray-600 text-sm">{p.category}</TableCell>
                <TableCell className="font-semibold text-gray-900">{formatCurrency(p.amount)}</TableCell>
                <TableCell><span className="capitalize text-sm text-gray-600">{p.period}</span></TableCell>
                <TableCell className="text-sm text-gray-600">{p.month} {p.year}</TableCell>
                {activeTab === "expense" && (
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColors[p.priority ?? "medium"]}`}>{p.priority ?? "medium"}</span>
                  </TableCell>
                )}
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[p.status]}`}>{p.status}</span>
                </TableCell>
                {isGroupView && (
                  <TableCell className="text-xs text-gray-500">{companies.find(c => c.id === p.companyId)?.name ?? p.companyId}</TableCell>
                )}
                <TableCell className="text-xs text-gray-400 max-w-[140px] truncate">{p.notes ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {displayed.length > 0 && (
              <TableRow className="bg-gray-50 font-bold border-t-2">
                <TableCell colSpan={3} className="text-gray-700">Total Projected {activeTab === "expense" ? "Expenses" : "Income"}</TableCell>
                <TableCell className={`text-lg ${activeTab === "expense" ? "text-red-600" : "text-green-600"}`}>{formatCurrency(displayed.reduce((s, p) => s + p.amount, 0))}</TableCell>
                <TableCell colSpan={6} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editItem ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editItem ? "Edit" : "Add"} Projected {form.type === "expense" ? "Expense" : "Income"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Type toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => sf({ type: "expense", category: "" })} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${form.type === "expense" ? "bg-white shadow text-red-600" : "text-gray-500"}`}>Expense</button>
              <button onClick={() => sf({ type: "income", category: "" })} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${form.type === "income" ? "bg-white shadow text-green-600" : "text-gray-500"}`}>Income</button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Title / Description *</label>
              <Input placeholder={form.type === "expense" ? "e.g. Monthly office rent" : "e.g. Expected client payment"} value={form.title} onChange={e => sf({ title: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category *</label>
                <Select value={form.category} onValueChange={v => sf({ category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS) *</label>
                <Input type="number" placeholder="0" value={form.amount} onChange={e => sf({ amount: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Period</label>
                <Select value={form.period} onValueChange={v => sf({ period: v as Projection["period"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="once">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Month</label>
                <Select value={form.month} onValueChange={v => sf({ month: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS_LIST.map(m => <SelectItem key={m} value={m}>{m.slice(0,3)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Year</label>
                <Select value={form.year} onValueChange={v => sf({ year: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.type === "expense" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Priority</label>
                  <Select value={form.priority ?? "medium"} onValueChange={v => sf({ priority: v as Projection["priority"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v as Projection["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="done">Done (Actual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group HQ company selector */}
            {!cid && companies.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company</label>
                <Select value={form.saleCompanyId} onValueChange={v => sf({ saleCompanyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                  <SelectContent>{companies.filter(c => c.id !== groupCid).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
              <Textarea placeholder="Optional details…" value={form.notes} onChange={e => sf({ notes: e.target.value })} rows={2} />
            </div>

            {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add Projection"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Projection</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Remove this projected record? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteItem}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
