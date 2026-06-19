"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeCheck, Plus, Search, Upload, Trash2, Edit, AlertCircle, CheckCircle, Download } from "lucide-react";
import ImportExport from "@/components/shared/ImportExport";
import { getActiveCid } from "@/lib/getActiveCid";
import { formatDate } from "@/lib/utils";

const SESSION_KEY = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
function lsGet<T>(k: string, fb: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; } }

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface LicenceCustomer {
  id: string; companyId: string; name: string; phone: string;
  email?: string; address?: string; businessName?: string;
  licenceType?: string; licenceNumber?: string; licenceExpiry?: string;
  notes?: string; createdAt: string;
}

const LICENCE_TYPES = ["Business Licence", "Media Licence", "Broadcasting Licence", "Content Licence", "Trade Licence", "Professional Licence", "Other"];

const emptyForm = (): Omit<LicenceCustomer, "id" | "createdAt"> => ({
  companyId: "", name: "", phone: "", email: "", address: "",
  businessName: "", licenceType: "", licenceNumber: "", licenceExpiry: "", notes: "",
});

function parseLine(line: string): string[] {
  const r: string[] = []; let c = ""; let q = false;
  for (const ch of line) { if (ch === '"') { q = !q; } else if (ch === "," && !q) { r.push(c.trim()); c = ""; } else { c += ch; } }
  r.push(c.trim()); return r;
}

export default function LicenceCustomersPage() {
  const [customers, setCustomers] = useState<LicenceCustomer[]>([]);
  const [companies, setCompanies] = useState<{id:string;name:string}[]>([]);
  const [cid, setCid] = useState(""); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false); const [editItem, setEditItem] = useState<LicenceCustomer | null>(null);
  const [form, setForm] = useState(emptyForm()); const [formError, setFormError] = useState(""); const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false); const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState<Omit<LicenceCustomer,"id"|"createdAt">[]>([]);
  const [bulkError, setBulkError] = useState(""); const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(""); const [bulkCompany, setBulkCompany] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setCid(getActiveCid(sess));
    const cos = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    setCompanies(cos); setBulkCompany(getActiveCid(sess) || cos.find(c => c.id !== "group")?.id || "");
    try { const r = await fetch("/api/licence-customers", { cache: "no-store" }); if (r.ok) setCustomers(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const visible = customers.filter(c => {
    const ok = !cid || c.companyId === cid;
    const q = search.toLowerCase();
    return ok && (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q) ||
      (c.businessName ?? "").toLowerCase().includes(q) || (c.licenceNumber ?? "").toLowerCase().includes(q));
  });

  const isExpired = (d?: string) => !!d && new Date(d) < new Date();
  const expiringSoon = (d?: string) => { if (!d) return false; const diff = (new Date(d).getTime() - Date.now()) / 86400000; return diff >= 0 && diff <= 30; };

  const openAdd = () => { setEditItem(null); setForm({ ...emptyForm(), companyId: cid }); setFormError(""); setShowDialog(true); };
  const openEdit = (c: LicenceCustomer) => {
    setEditItem(c);
    setForm({ companyId: c.companyId, name: c.name, phone: c.phone, email: c.email ?? "", address: c.address ?? "",
      businessName: c.businessName ?? "", licenceType: c.licenceType ?? "",
      licenceNumber: c.licenceNumber ?? "", licenceExpiry: c.licenceExpiry ?? "", notes: c.notes ?? "" });
    setFormError(""); setShowDialog(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.phone.trim()) { setFormError("Phone is required."); return; }
    if (!form.companyId) { setFormError("Select a company."); return; }
    setSaving(true); setFormError("");
    try {
      const r = await fetch("/api/licence-customers", { method: editItem ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editItem ? { ...form, id: editItem.id } : form) });
      if (!r.ok) { setFormError((await r.json().catch(() => ({}))).error || "Save failed."); setSaving(false); return; }
      setShowDialog(false); await load();
    } catch { setFormError("Network error."); }
    setSaving(false);
  };

  const remove = async (id: string) => { await fetch(`/api/licence-customers?id=${id}`, { method: "DELETE" }); setDeleteId(null); await load(); };

  const parseBulk = (raw: string) => {
    setBulkError(""); setBulkPreview([]); setBulkSuccess("");
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { setBulkError("Need header + at least one data row."); return; }
    const hdr = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, "").toLowerCase().trim());
    const idx = (c: string) => hdr.indexOf(c);
    if (idx("name") === -1 || idx("phone") === -1) { setBulkError("Missing required columns: Name, Phone."); return; }
    const parsed: Omit<LicenceCustomer,"id"|"createdAt">[] = []; const errs: string[] = [];
    lines.slice(1).forEach((l, i) => {
      const cols = parseLine(l);
      const name = cols[idx("name")]?.replace(/^"|"$/g,"").trim(); const phone = cols[idx("phone")]?.replace(/^"|"$/g,"").trim();
      if (!name || !phone) { errs.push(`Row ${i+2}: Name & Phone required.`); return; }
      parsed.push({ companyId: bulkCompany, name, phone, email: cols[idx("email")]?.replace(/^"|"$/g,"").trim()||"",
        businessName: cols[idx("business name")]?.replace(/^"|"$/g,"").trim()||"",
        licenceType: cols[idx("licence type")]?.replace(/^"|"$/g,"").trim()||"",
        licenceNumber: cols[idx("licence number")]?.replace(/^"|"$/g,"").trim()||"",
        licenceExpiry: cols[idx("licence expiry")]?.replace(/^"|"$/g,"").trim()||"",
        address: cols[idx("address")]?.replace(/^"|"$/g,"").trim()||"", notes: cols[idx("notes")]?.replace(/^"|"$/g,"").trim()||"" });
    });
    if (errs.length) setBulkError(errs.join("\n")); else setBulkPreview(parsed);
  };

  const submitBulk = async () => {
    if (!bulkPreview.length || !bulkCompany) return; setBulkSaving(true); setBulkError("");
    try {
      const r = await fetch("/api/licence-customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bulkPreview.map(p => ({ ...p, companyId: bulkCompany }))) });
      if (!r.ok) { setBulkError((await r.json().catch(()=>({}))).error||"Import failed."); setBulkSaving(false); return; }
      setBulkSuccess(`${bulkPreview.length} customers imported!`); setBulkPreview([]); setBulkText("");
      if (fileRef.current) fileRef.current.value = ""; await load();
    } catch { setBulkError("Network error."); }
    setBulkSaving(false);
  };

  const coName = (id: string) => companies.find(c => c.id === id)?.name ?? "—";

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center"><BadgeCheck className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-xl font-bold text-gray-900">Licence Customers</h1><p className="text-sm text-gray-500">Manage customers with business licences and permits</p></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ImportExport
              label="Licence Customers"
              rows={customers as unknown as Record<string, unknown>[]}
              onImport={async (rows) => {
                const res = await fetch("/api/bulk-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dbKey: "licence_customers", records: rows }) });
                const data = await res.json();
                await load();
                return { imported: data.imported ?? 0, errors: data.errors ?? [] };
              }}
            />
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={openAdd}><Plus className="w-4 h-4 mr-1.5" /> Add Customer</Button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search by name, phone, licence no…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <span className="text-sm text-gray-500">{visible.length} record{visible.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          : visible.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <BadgeCheck className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-500">No licence customers yet</p>
              <Button size="sm" variant="outline" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add First</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                <TableHead>Business</TableHead><TableHead>Licence Type</TableHead>
                <TableHead>Licence No.</TableHead><TableHead>Expiry</TableHead>
                <TableHead>Company</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {visible.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                    <TableCell className="font-medium text-gray-900">{c.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.phone}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.businessName || "—"}</TableCell>
                    <TableCell>{c.licenceType ? <span className="px-2 py-0.5 text-xs rounded-full bg-teal-50 text-teal-700">{c.licenceType}</span> : "—"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.licenceNumber || "—"}</TableCell>
                    <TableCell>
                      {c.licenceExpiry ? (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${isExpired(c.licenceExpiry) ? "bg-red-50 text-red-600" : expiringSoon(c.licenceExpiry) ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"}`}>
                          {formatDate(c.licenceExpiry)}
                        </span>
                      ) : "—"}
                    </TableCell>
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

        {/* Add/Edit */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editItem ? "Edit Customer" : "Add Licence Customer"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {formError && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600"><AlertCircle className="w-4 h-4 shrink-0" />{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Company *</label>
                  <Select value={form.companyId} onValueChange={v => setForm(f => ({...f, companyId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>{companies.filter(c => c.id !== "group").map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Full Name *</label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Contact person name" /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Phone *</label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="255712345678" /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Business Name</label><Input value={form.businessName} onChange={e => setForm(f => ({...f, businessName: e.target.value}))} placeholder="Registered business name" /></div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Licence Type</label>
                  <Select value={form.licenceType || "__none__"} onValueChange={v => setForm(f => ({...f, licenceType: v === "__none__" ? "" : v}))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">— None —</SelectItem>{LICENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Licence Number</label><Input value={form.licenceNumber} onChange={e => setForm(f => ({...f, licenceNumber: e.target.value}))} placeholder="e.g. ML-2024-001" /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Expiry Date</label><Input type="date" value={form.licenceExpiry} onChange={e => setForm(f => ({...f, licenceExpiry: e.target.value}))} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Email</label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@example.com" /></div>
                <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Address</label><Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="Physical address" /></div>
                <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label><Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Additional notes" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">{saving ? "Saving…" : editItem ? "Save Changes" : "Add Customer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Customer</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
            <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteId && remove(deleteId)}>Delete</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import */}
        <Dialog open={showBulk} onOpenChange={setShowBulk}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-teal-600" /> Bulk Import Licence Customers</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Import to Company *</label>
                <Select value={bulkCompany} onValueChange={v => { setBulkCompany(v); if (bulkPreview.length) parseBulk(bulkText); }}>
                  <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{companies.filter(c => c.id !== "group").map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-100 rounded-lg">
                <Download className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-teal-800">CSV Template</p><p className="text-xs text-teal-600">Required: <strong>Name, Phone</strong>. Optional: Business Name, Licence Type, Licence Number, Licence Expiry, Email, Address, Notes</p></div>
                <Button size="sm" variant="outline" onClick={() => {
                  const csv = `Name,Phone,Business Name,Licence Type,Licence Number,Licence Expiry,Email,Address,Notes\nJane Smith,255712345678,Smith Broadcasting,Media Licence,ML-001,2026-12-31,jane@example.com,Dar es Salaam,`;
                  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="licence_customers_template.csv"; a.click();
                }}>Download</Button>
              </div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Upload CSV</label><input ref={fileRef} type="file" accept=".csv,.txt" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = ev => { const t = ev.target?.result as string; setBulkText(t); parseBulk(t); }; rd.readAsText(f); }} className="block w-full text-sm text-gray-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-xs file:font-medium file:bg-white cursor-pointer" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Or paste CSV data</label><textarea rows={4} value={bulkText} onChange={e => { setBulkText(e.target.value); parseBulk(e.target.value); }} className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-teal-400" /></div>
              {bulkError && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><pre className="text-xs text-red-600 whitespace-pre-wrap">{bulkError}</pre></div>}
              {bulkSuccess && <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" /><p className="text-sm text-green-700 font-medium">{bulkSuccess}</p></div>}
              {bulkPreview.length > 0 && <div><p className="text-xs font-medium text-gray-600 mb-1.5">{bulkPreview.length} customers ready:</p><div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">{bulkPreview.map((p,i)=><div key={i} className="px-3 py-2"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.phone}{p.licenceNumber ? ` · ${p.licenceNumber}` : ""}{p.licenceExpiry ? ` · expires ${p.licenceExpiry}` : ""}</p></div>)}</div></div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulk(false)}>Close</Button>
              <Button onClick={submitBulk} disabled={bulkSaving || !bulkPreview.length || !bulkCompany} className="bg-teal-600 hover:bg-teal-700 text-white">{bulkSaving ? "Importing…" : `Import ${bulkPreview.length || ""} Customers`}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
