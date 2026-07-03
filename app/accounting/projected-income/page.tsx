"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
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
import { TrendingUp, Plus, Edit, Trash2, Download, Upload, RefreshCw, Printer, AlertTriangle, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY     = "phidtech_group_company";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }
interface Service { id: string; name: string; price: number; unit: string; category: string; companyId: string; status: string; }

interface ProjectedIncome {
  id: string; companyId: string;
  serviceId?: string; serviceName: string;
  category: string; unitPrice: number; units: number; amount: number;
  period: "once" | "weekly" | "monthly" | "3months" | "6months" | "yearly";
  month: string; year: number;
  status: "draft" | "confirmed" | "done";
  notes?: string; createdAt: string;
}

const MONTHS_LIST = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const currentYear  = new Date().getFullYear();
const currentMonth = MONTHS_LIST[new Date().getMonth()];
const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 1 + i));

const statusColors: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  done:      "bg-green-100 text-green-700",
};

const emptyForm = () => ({
  serviceId: "", serviceName: "", category: "Sales Revenue",
  unitPrice: "", units: "1",
  period: "monthly" as ProjectedIncome["period"],
  month: currentMonth, year: String(currentYear),
  status: "draft" as ProjectedIncome["status"],
  notes: "", saleCompanyId: "",
});

export default function ProjectedIncomePage() {
  usePermissionGuard("projected_income");

  const [items,     setItems]     = useState<ProjectedIncome[]>([]);
  const [services,  setServices]  = useState<Service[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [session,   setSession]   = useState<Session | null>(null);
  const [cid,       setCid]       = useState("");
  const [groupCid,  setGroupCid]  = useState("");
  const [loading,   setLoading]   = useState(true);

  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear,  setFilterYear]  = useState(String(currentYear));

  const [showDialog, setShowDialog] = useState(false);
  const [editItem,   setEditItem]   = useState<ProjectedIncome | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState(emptyForm());
  const [formError,  setFormError]  = useState("");

  // Print signature fields
  const [showPrint,      setShowPrint]      = useState(false);
  const [sigStaff,       setSigStaff]       = useState("");
  const [sigBranchMgr,   setSigBranchMgr]   = useState("");
  const [sigGenMgr,      setSigGenMgr]      = useState("");
  const [sigCeo,         setSigCeo]         = useState("");

  const importRef = useRef<HTMLInputElement>(null);
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
      const [ir, sr] = await Promise.all([
        fetch("/api/projected-income", { cache: "no-store" }),
        fetch("/api/services",         { cache: "no-store" }),
      ]);
      if (ir.ok) setItems(await ir.json());
      if (sr.ok) setServices(await sr.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isGroupView = !cid || cid === groupCid;

  const displayed = items
    .filter(p => isGroupView || p.companyId === cid)
    .filter(p => p.month === filterMonth && String(p.year) === filterYear);

  const totalProjected  = displayed.reduce((s, p) => s + p.amount, 0);
  const totalConfirmed  = displayed.filter(p => p.status === "confirmed" || p.status === "done").reduce((s, p) => s + p.amount, 0);
  const totalUnits      = displayed.reduce((s, p) => s + p.units, 0);

  // Service auto-fill
  const handleServiceChange = (serviceId: string) => {
    if (serviceId === "__manual__") {
      sf({ serviceId: "", serviceName: "", unitPrice: "", category: "Sales Revenue" });
      return;
    }
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      const units = Number(form.units) || 1;
      sf({
        serviceId: svc.id,
        serviceName: svc.name,
        unitPrice: String(svc.price),
        category: svc.category || "Sales Revenue",
      });
    }
  };

  const handleUnitsChange = (val: string) => {
    const units = Number(val) || 0;
    const price = Number(form.unitPrice) || 0;
    sf({ units: val });
    // amount auto-computed on save
    void price; void units;
  };

  const computedAmount = (Number(form.unitPrice) || 0) * (Number(form.units) || 1);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm() });
    setFormError(""); setShowDialog(true);
  };

  const openEdit = (p: ProjectedIncome) => {
    setEditItem(p);
    setForm({
      serviceId: p.serviceId ?? "",
      serviceName: p.serviceName,
      category: p.category,
      unitPrice: String(p.unitPrice),
      units: String(p.units),
      period: p.period,
      month: p.month,
      year: String(p.year),
      status: p.status,
      notes: p.notes ?? "",
      saleCompanyId: p.companyId,
    });
    setFormError(""); setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.serviceName.trim()) { setFormError("Enter a service name or select from dropdown."); return; }
    if (!form.unitPrice || isNaN(Number(form.unitPrice))) { setFormError("Enter a valid unit price."); return; }
    const units  = Math.max(1, Number(form.units) || 1);
    const amount = (Number(form.unitPrice) || 0) * units;
    const activeCid = form.saleCompanyId || cid || session?.companyId || groupCid || "group";
    const payload: Omit<ProjectedIncome,"id"|"createdAt"> = {
      companyId: activeCid,
      serviceId: form.serviceId || undefined,
      serviceName: form.serviceName.trim(),
      category: form.category,
      unitPrice: Number(form.unitPrice),
      units,
      amount,
      period: form.period,
      month: form.month,
      year: Number(form.year),
      status: form.status,
      notes: form.notes,
    };
    try {
      if (editItem) {
        await fetch("/api/projected-income", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editItem.id, ...payload }) });
      } else {
        await fetch("/api/projected-income", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() }) });
      }
      setShowDialog(false); await loadData();
    } catch { setFormError("Save failed. Try again."); }
  };

  const deleteItem = async () => {
    if (!deleteId) return;
    await fetch(`/api/projected-income?id=${deleteId}`, { method: "DELETE" });
    setDeleteId(null); await loadData();
  };

  // --- Export CSV ---
  const exportCSV = () => {
    const header = "Service,Category,Unit Price,Units,Total Amount,Period,Month,Year,Status,Notes";
    const rows = displayed.map(p =>
      `"${p.serviceName}","${p.category}","${p.unitPrice}","${p.units}","${p.amount}","${p.period}","${p.month}","${p.year}","${p.status}","${(p.notes ?? "").replace(/"/g,'""')}"`
    ).join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `Projected_Income_${filterMonth}_${filterYear}.csv`; a.click();
  };

  // --- Import CSV ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return;
    const activeCid = cid || groupCid || "group";
    let imported = 0;
    for (const line of lines.slice(1)) {
      const cols = line.match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g,"").trim()) ?? [];
      if (cols.length < 5) continue;
      const payload = {
        companyId: activeCid,
        serviceName: cols[0] || "Imported",
        category:   cols[1] || "Sales Revenue",
        unitPrice:  Number(cols[2]) || 0,
        units:      Number(cols[3]) || 1,
        amount:     Number(cols[4]) || 0,
        period:     (cols[5] || "monthly") as ProjectedIncome["period"],
        month:      cols[6] || currentMonth,
        year:       Number(cols[7]) || currentYear,
        status:     (cols[8] || "draft") as ProjectedIncome["status"],
        notes:      cols[9] || "",
        createdAt:  new Date().toISOString(),
      };
      const res = await fetch("/api/projected-income", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      if (res.ok) imported++;
    }
    alert(`Imported ${imported} records.`);
    await loadData();
    if (importRef.current) importRef.current.value = "";
  };

  // --- Print ---
  const handlePrint = () => {
    const companyName = companies.find(c => c.id === cid)?.name ?? "All Companies";
    const dateStr = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
    const rowsHtml = displayed.map((p, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${p.serviceName}</td>
        <td>${p.category}</td>
        <td style="text-align:right">${p.unitPrice.toLocaleString()}</td>
        <td style="text-align:center">${p.units}</td>
        <td style="text-align:right;font-weight:bold">${p.amount.toLocaleString()}</td>
        <td>${p.period}</td>
        <td>${p.month} ${p.year}</td>
        <td>${p.status}</td>
      </tr>`).join("");

    const sigBlock = (label: string, name: string) => `
      <div class="sig-box">
        <p class="sig-label">${label}</p>
        <p class="sig-name">${name || "____________________________"}</p>
        <div class="sig-line"></div>
        <p class="sig-sub">Signature &amp; Date</p>
      </div>`;

    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Projected Income Report</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;font-size:12px}
      body{padding:32px}
      h1{font-size:18px;margin-bottom:4px}
      .meta{color:#555;margin-bottom:20px;font-size:11px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#1e40af;color:#fff;padding:7px 8px;text-align:left}
      td{border-bottom:1px solid #e5e7eb;padding:6px 8px;vertical-align:top}
      tr:nth-child(even) td{background:#f8fafc}
      .total-row td{background:#dbeafe;font-weight:bold;font-size:13px}
      .sig-section{display:flex;gap:32px;flex-wrap:wrap;margin-top:40px;border-top:2px solid #1e40af;padding-top:24px}
      .sig-box{flex:1;min-width:180px;text-align:center}
      .sig-label{font-weight:bold;font-size:11px;color:#374151;margin-bottom:4px}
      .sig-name{font-size:13px;font-weight:600;color:#1e40af;margin-bottom:32px}
      .sig-line{border-top:1.5px solid #374151;margin:0 16px}
      .sig-sub{font-size:10px;color:#6b7280;margin-top:4px}
      .footer{margin-top:24px;text-align:center;font-size:10px;color:#9ca3af}
    </style></head><body>
    <h1>Projected Income Report</h1>
    <p class="meta">${companyName} &nbsp;|&nbsp; ${filterMonth} ${filterYear} &nbsp;|&nbsp; Generated: ${dateStr}</p>
    <table>
      <thead><tr>
        <th>#</th><th>Service / Item</th><th>Category</th>
        <th style="text-align:right">Unit Price (TZS)</th>
        <th style="text-align:center">Units</th>
        <th style="text-align:right">Total (TZS)</th>
        <th>Period</th><th>Month/Year</th><th>Status</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4">TOTAL PROJECTED INCOME</td>
          <td style="text-align:center">${totalUnits}</td>
          <td style="text-align:right">${totalProjected.toLocaleString()}</td>
          <td colspan="3">Confirmed: ${totalConfirmed.toLocaleString()}</td>
        </tr>
      </tfoot>
    </table>
    <p style="font-size:11px;color:#b45309;margin-bottom:8px"><strong>Note:</strong> This is a projected income plan for budgeting purposes only. It does not affect actual financial records.</p>
    <div class="sig-section">
      ${sigBlock("Prepared By (Staff)", sigStaff)}
      ${sigBlock("Branch Manager", sigBranchMgr)}
      ${sigBlock("General Manager", sigGenMgr)}
      ${sigBlock("Chief Executive Officer (CEO)", sigCeo)}
    </div>
    <div class="footer">Printed on ${new Date().toLocaleString()} &nbsp;|&nbsp; PHIDTECH BOMS</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  const activeServices = services.filter(s => s.status === "active");

  return (
    <MainLayout>
      <PageHeader
        title="Projected Income"
        subtitle="Plan projected income by service — select service, set units, auto-calculates total"
        icon={TrendingUp}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />Import CSV
            </Button>
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => setShowPrint(true)}>
              <Printer className="w-4 h-4 mr-2" />Print Report
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />Add Income
            </Button>
          </div>
        }
      />

      {/* Planning only notice */}
      <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Planning Tool Only:</strong> Projected income records are for budgeting purposes only — they do <strong>not</strong> affect actual books of accounts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Projected</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalProjected)}</p>
          <p className="text-xs text-gray-400">{displayed.length} records · {filterMonth} {filterYear}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Confirmed Income</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalConfirmed)}</p>
          <p className="text-xs text-gray-400">Confirmed / Done status</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Units</p>
          <p className="text-xl font-bold text-gray-800">{totalUnits.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Across all services</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Services in Plan</p>
          <p className="text-xl font-bold text-purple-600">{new Set(displayed.map(p => p.serviceName)).size}</p>
          <p className="text-xs text-gray-400">Unique services</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Month</label>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Year</label>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <span className="ml-auto text-xs text-gray-400">{displayed.length} records · {filterMonth} {filterYear}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>#</TableHead>
              <TableHead>Service / Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-center">Units</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Month / Year</TableHead>
              <TableHead>Status</TableHead>
              {isGroupView && <TableHead>Company</TableHead>}
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={12} className="text-center py-12 text-gray-400">Loading...</TableCell></TableRow>
            ) : displayed.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center py-12 text-gray-400">
                <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                No projected income for {filterMonth} {filterYear}. Click &quot;Add Income&quot; to start.
              </TableCell></TableRow>
            ) : displayed.map((p, i) => (
              <TableRow key={p.id} className="hover:bg-gray-50">
                <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium text-gray-900">{p.serviceName}</TableCell>
                <TableCell className="text-gray-600 text-sm">{p.category}</TableCell>
                <TableCell className="text-right text-gray-700">{formatCurrency(p.unitPrice)}</TableCell>
                <TableCell className="text-center font-semibold text-blue-700">{p.units}</TableCell>
                <TableCell className="text-right font-bold text-green-700">{formatCurrency(p.amount)}</TableCell>
                <TableCell><span className="capitalize text-sm text-gray-600">{p.period}</span></TableCell>
                <TableCell className="text-sm text-gray-600">{p.month} {p.year}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[p.status]}`}>{p.status}</span>
                </TableCell>
                {isGroupView && (
                  <TableCell className="text-xs text-gray-500">{companies.find(c => c.id === p.companyId)?.name ?? p.companyId}</TableCell>
                )}
                <TableCell className="text-xs text-gray-400 max-w-[120px] truncate">{p.notes ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {displayed.length > 0 && (
              <TableRow className="bg-green-50 font-bold border-t-2 border-green-200">
                <TableCell colSpan={4} className="text-gray-700">TOTAL PROJECTED INCOME</TableCell>
                <TableCell className="text-center text-blue-700">{totalUnits}</TableCell>
                <TableCell className="text-right text-xl text-green-700">{formatCurrency(totalProjected)}</TableCell>
                <TableCell colSpan={6} className="text-gray-500 text-sm">Confirmed: {formatCurrency(totalConfirmed)}</TableCell>
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
              {editItem ? "Edit" : "Add"} Projected Income
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Service Dropdown */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select Service *</label>
              <Select value={form.serviceId || "__manual__"} onValueChange={handleServiceChange}>
                <SelectTrigger><SelectValue placeholder="Choose a service…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">-- Enter Manually --</SelectItem>
                  {activeServices.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(s.price)} / {s.unit || "unit"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manual service name (shows when no service selected) */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Service / Item Name *</label>
              <Input placeholder="e.g. Website Design, Consultation" value={form.serviceName} onChange={e => sf({ serviceName: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={v => sf({ category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Sales Revenue","Service Fees","Consultation","Interest Income","Rental Income","Commission","Government Grants","Other"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit Price (TZS) *</label>
                <Input type="number" placeholder="0" value={form.unitPrice} onChange={e => sf({ unitPrice: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Number of Units *</label>
                <Input type="number" min="1" placeholder="1" value={form.units} onChange={e => handleUnitsChange(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Total Amount</label>
                <div className="h-9 flex items-center px-3 bg-green-50 border border-green-200 rounded-lg text-green-700 font-bold text-sm">
                  {formatCurrency(computedAmount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Period</label>
                <Select value={form.period} onValueChange={v => sf({ period: v as ProjectedIncome["period"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="3months">Every 3 Months</SelectItem>
                    <SelectItem value="6months">Every 6 Months</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v as ProjectedIncome["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="done">Done (Actual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!cid && companies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company</label>
                  <Select value={form.saleCompanyId} onValueChange={v => sf({ saleCompanyId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                    <SelectContent>{companies.filter(c => c.id !== groupCid).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
              <Textarea placeholder="Optional details…" value={form.notes} onChange={e => sf({ notes: e.target.value })} rows={2} />
            </div>

            {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>
              {editItem ? "Save Changes" : `Add Income (${formatCurrency(computedAmount)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Projected Income</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Remove this record? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteItem}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Signature Dialog */}
      <Dialog open={showPrint} onOpenChange={v => { if (!v) setShowPrint(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Printer className="w-4 h-4" />Print Projected Income Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">Enter names for signature blocks (leave blank to show blank lines):</p>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Staff Name (Prepared By)</label>
              <Input placeholder="e.g. John Doe" value={sigStaff} onChange={e => setSigStaff(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Branch Manager Name</label>
              <Input placeholder="e.g. Jane Smith" value={sigBranchMgr} onChange={e => setSigBranchMgr(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">General Manager Name</label>
              <Input placeholder="e.g. Robert Johnson" value={sigGenMgr} onChange={e => setSigGenMgr(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">CEO Name</label>
              <Input placeholder="e.g. Michael Brown" value={sigCeo} onChange={e => setSigCeo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrint(false)}>Cancel</Button>
            <Button onClick={() => { setShowPrint(false); handlePrint(); }}>
              <Printer className="w-4 h-4 mr-2" />Print Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
