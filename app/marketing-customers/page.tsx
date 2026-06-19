"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Search, Upload, Trash2, Edit, AlertCircle, CheckCircle, Download } from "lucide-react";
import ImportExport from "@/components/shared/ImportExport";
import { getActiveCid } from "@/lib/getActiveCid";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface MarketingCustomer {
  id: string; companyId: string;
  name: string; phone: string;
  email?: string; address?: string;
  businessName?: string;
  campaign?: string;
  category?: string;
  source?: string;
  notes?: string;
  createdAt: string;
}

const CATEGORIES = ["Lead", "Prospect", "Active Customer", "Inactive", "VIP"];
const SOURCES    = ["Social Media", "Referral", "Walk-in", "Phone Call", "Email Campaign", "Event", "Website", "Other"];

const emptyForm = (): Omit<MarketingCustomer, "id" | "createdAt"> => ({
  companyId: "", name: "", phone: "",
  email: "", address: "", businessName: "",
  campaign: "", category: "", source: "", notes: "",
});

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === "," && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  result.push(cur.trim());
  return result;
}

export default function MarketingCustomersPage() {
  const [customers, setCustomers] = useState<MarketingCustomer[]>([]);
  const [companies, setCompanies] = useState<{id:string;name:string}[]>([]);
  const [cid,       setCid]       = useState("");
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);

  const [showDialog, setShowDialog] = useState(false);
  const [editItem,   setEditItem]   = useState<MarketingCustomer | null>(null);
  const [form,       setForm]       = useState(emptyForm());
  const [formError,  setFormError]  = useState("");
  const [saving,     setSaving]     = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [showBulk,    setShowBulk]    = useState(false);
  const [bulkText,    setBulkText]    = useState("");
  const [bulkPreview, setBulkPreview] = useState<Omit<MarketingCustomer,"id"|"createdAt">[]>([]);
  const [bulkError,   setBulkError]   = useState("");
  const [bulkSaving,  setBulkSaving]  = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [bulkCompany, setBulkCompany] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const activeCid = getActiveCid(sess);
    setCid(activeCid);
    const cos = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    setCompanies(cos);
    setBulkCompany(activeCid || cos.find(c => c.id !== "group")?.id || "");
    try {
      const r = await fetch("/api/marketing-customers", { cache: "no-store" });
      if (r.ok) setCustomers(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = customers.filter(c => {
    const matchCo = !cid || c.companyId === cid;
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.businessName ?? "").toLowerCase().includes(q) ||
      (c.campaign ?? "").toLowerCase().includes(q);
    return matchCo && matchQ;
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm(), companyId: cid });
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (c: MarketingCustomer) => {
    setEditItem(c);
    setForm({
      companyId: c.companyId, name: c.name, phone: c.phone,
      email: c.email ?? "", address: c.address ?? "",
      businessName: c.businessName ?? "", campaign: c.campaign ?? "",
      category: c.category ?? "", source: c.source ?? "", notes: c.notes ?? "",
    });
    setFormError("");
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.name.trim())  { setFormError("Name is required."); return; }
    if (!form.phone.trim()) { setFormError("Phone is required."); return; }
    if (!form.companyId)    { setFormError("Select a company."); return; }
    setSaving(true); setFormError("");
    try {
      const method = editItem ? "PUT" : "POST";
      const body   = editItem ? { ...form, id: editItem.id } : form;
      const r = await fetch("/api/marketing-customers", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); setFormError(e.error || "Save failed."); setSaving(false); return; }
      setShowDialog(false);
      await load();
    } catch { setFormError("Network error."); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/marketing-customers?id=${id}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
  };

  const parseBulk = (raw: string) => {
    setBulkError(""); setBulkPreview([]); setBulkSuccess("");
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { setBulkError("File must have a header row and at least one data row."); return; }
    const header = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, "").toLowerCase().trim());
    const idx = (col: string) => header.indexOf(col.toLowerCase());
    const nameIdx  = idx("name");
    const phoneIdx = idx("phone");
    if (nameIdx === -1 || phoneIdx === -1) {
      setBulkError(`Missing required columns. Header must include: Name, Phone. Found: ${header.join(", ")}`);
      return;
    }
    const parsed: Omit<MarketingCustomer,"id"|"createdAt">[] = [];
    const errors: string[] = [];
    lines.slice(1).forEach((line, i) => {
      const cols = parseCsvLine(line);
      const name  = cols[nameIdx]?.replace(/^"|"$/g, "").trim();
      const phone = cols[phoneIdx]?.replace(/^"|"$/g, "").trim();
      if (!name || !phone) { errors.push(`Row ${i + 2}: Name and Phone are required.`); return; }
      parsed.push({
        companyId:    bulkCompany,
        name, phone,
        email:        cols[idx("email")]?.replace(/^"|"$/g, "").trim() || "",
        businessName: cols[idx("business name")]?.replace(/^"|"$/g, "").trim() || "",
        campaign:     cols[idx("campaign")]?.replace(/^"|"$/g, "").trim() || "",
        category:     cols[idx("category")]?.replace(/^"|"$/g, "").trim() || "",
        source:       cols[idx("source")]?.replace(/^"|"$/g, "").trim() || "",
        address:      cols[idx("address")]?.replace(/^"|"$/g, "").trim() || "",
        notes:        cols[idx("notes")]?.replace(/^"|"$/g, "").trim() || "",
      });
    });
    if (errors.length) setBulkError(errors.join("\n"));
    else setBulkPreview(parsed);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const text = ev.target?.result as string; setBulkText(text); parseBulk(text); };
    reader.readAsText(file);
  };

  const submitBulk = async () => {
    if (!bulkPreview.length || !bulkCompany) return;
    setBulkSaving(true); setBulkError("");
    try {
      const payload = bulkPreview.map(p => ({ ...p, companyId: bulkCompany }));
      const r = await fetch("/api/marketing-customers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); setBulkError(e.error || "Import failed."); setBulkSaving(false); return; }
      setBulkSuccess(`${bulkPreview.length} customers imported successfully!`);
      setBulkPreview([]); setBulkText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch { setBulkError("Network error."); }
    setBulkSaving(false);
  };

  const downloadTemplate = () => {
    const csv = `Name,Phone,Business Name,Campaign,Category,Source,Email,Address,Notes\nJane Smith,255712345678,Smith Enterprises,Q1 Campaign,Lead,Social Media,jane@example.com,Dar es Salaam,Interested in product X`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "marketing_customers_template.csv"; a.click();
  };

  const coName = (id: string) => companies.find(c => c.id === id)?.name ?? id ?? "—";

  const categoryColor: Record<string, string> = {
    "Lead":            "bg-yellow-50 text-yellow-700",
    "Prospect":        "bg-blue-50 text-blue-700",
    "Active Customer": "bg-green-50 text-green-700",
    "Inactive":        "bg-gray-100 text-gray-500",
    "VIP":             "bg-purple-50 text-purple-700",
  };

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Marketing Customers</h1>
              <p className="text-sm text-gray-500">Register and manage customers from marketing campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ImportExport
              label="Marketing Customers"
              rows={customers as unknown as Record<string, unknown>[]}
              onImport={async (rows) => {
                const res = await fetch("/api/bulk-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dbKey: "marketing_customers", records: rows }) });
                const data = await res.json();
                await load();
                return { imported: data.imported ?? 0, errors: data.errors ?? [] };
              }}
            />
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Customer
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by name, phone, or campaign…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <span className="text-sm text-gray-500 shrink-0">{visible.length} record{visible.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center gap-3">
              <Megaphone className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-500">No marketing customers yet</p>
              <Button size="sm" variant="outline" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add First Customer</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-gray-900">{c.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.phone}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.businessName || "—"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.campaign || "—"}</TableCell>
                    <TableCell>
                      {c.category ? (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${categoryColor[c.category] ?? "bg-gray-100 text-gray-600"}`}>{c.category}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{c.source || "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{coName(c.companyId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Add / Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Customer" : "Add Marketing Customer"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Company *</label>
                  <Select value={form.companyId} onValueChange={v => setForm(f => ({...f, companyId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {companies.filter(c => c.id !== "group").map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Jane Smith" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Phone *</label>
                  <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="e.g. 255712345678" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Business Name</label>
                  <Input value={form.businessName} onChange={e => setForm(f => ({...f, businessName: e.target.value}))} placeholder="e.g. Smith Enterprises" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Campaign</label>
                  <Input value={form.campaign} onChange={e => setForm(f => ({...f, campaign: e.target.value}))} placeholder="e.g. Q1 Campaign 2026" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                  <Select value={form.category || "__none__"} onValueChange={v => setForm(f => ({...f, category: v === "__none__" ? "" : v}))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {CATEGORIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Source</label>
                  <Select value={form.source || "__none__"} onValueChange={v => setForm(f => ({...f, source: v === "__none__" ? "" : v}))}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@example.com" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Address</label>
                  <Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="Physical address" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                  <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Any additional notes" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">{saving ? "Saving…" : editItem ? "Save Changes" : "Add Customer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete Customer</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteId && remove(deleteId)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulk} onOpenChange={setShowBulk}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-500" /> Bulk Import Marketing Customers
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Import to Company *</label>
                <Select value={bulkCompany} onValueChange={v => { setBulkCompany(v); if (bulkPreview.length) parseBulk(bulkText); }}>
                  <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.filter(c => c.id !== "group").map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <Download className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800">CSV Template</p>
                  <p className="text-xs text-orange-600">Required: <strong>Name, Phone</strong>. Optional: Business Name, Campaign, Category, Source, Email, Address, Notes</p>
                </div>
                <Button size="sm" variant="outline" onClick={downloadTemplate} className="shrink-0">Download</Button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Upload CSV / Excel (saved as CSV)</label>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFile}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-xs file:font-medium file:bg-white hover:file:bg-gray-50 cursor-pointer" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Or paste CSV data directly</label>
                <textarea rows={6} value={bulkText}
                  onChange={e => { setBulkText(e.target.value); parseBulk(e.target.value); }}
                  placeholder={"Name,Phone,Business Name,Campaign,...\nJane Smith,255712345678,Smith Co,Q1 Campaign,..."}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-orange-400" />
              </div>

              {bulkError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">{bulkError}</pre>
                </div>
              )}
              {bulkSuccess && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <p className="text-sm text-green-700 font-medium">{bulkSuccess}</p>
                </div>
              )}
              {bulkPreview.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">{bulkPreview.length} customers ready to import:</p>
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
                    {bulkPreview.map((p, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.phone}{p.businessName ? ` · ${p.businessName}` : ""}{p.campaign ? ` · ${p.campaign}` : ""}</p>
                        </div>
                        {p.category && <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${categoryColor[p.category] ?? "bg-gray-100 text-gray-600"}`}>{p.category}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulk(false)}>Close</Button>
              <Button onClick={submitBulk} disabled={bulkSaving || bulkPreview.length === 0 || !bulkCompany}
                className="bg-orange-500 hover:bg-orange-600 text-white">
                {bulkSaving ? "Importing…" : `Import ${bulkPreview.length || ""} Customers`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
