"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Search, Download, Eye, Upload, FolderOpen, Shield, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { formatDateTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SESSION_KEY    = "phidtech_session";
const ACTIVE_KEY     = "phidtech_active_company";
const DOCS_KEY       = "phidtech_documents";
const USERS_KEY      = "phidtech_users";
const COMPANIES_KEY  = "phidtech_companies";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface Doc {
  id: string; companyId: string; name: string; category: string;
  permissions: string; assignedTo?: string; assignedToName?: string;
  uploadedBy: string; uploadedAt: string;
  size: string; version: number; dataUrl?: string;
}
interface StaffUser { id: string; name: string; companyId: string; department?: string; position?: string; status?: string; }
interface Company { id: string; name: string; }

const CATEGORIES = ["HR Policy","Financial","Technical","Sales","Legal","Marketing","Operations","Other"];

const PERMISSIONS = [
  { value: "all",             label: "Everyone" },
  { value: "admin",           label: "Admin Only" },
  { value: "manager",         label: "Managers & Above" },
  { value: "accountant",      label: "Accountants & Above" },
  { value: "finance",         label: "Finance Team" },
  { value: "hr",              label: "HR Team" },
  { value: "department_head", label: "Department Heads" },
  { value: "department",      label: "Department Only" },
  { value: "staff",           label: "All Staff" },
  { value: "specific_staff",  label: "Specific Staff Member" },
];

const categoryIcons: Record<string, string> = {
  "HR Policy": "📋", "Financial": "💰", "Technical": "⚙️",
  "Sales": "📈", "Legal": "⚖️", "Marketing": "📣", "Operations": "🔧", "Other": "📁",
};

function fileIcon(name: string) {
  if (name.endsWith(".pdf"))  return "📄";
  if (name.match(/\.xlsx?$/)) return "📊";
  if (name.match(/\.docx?$/)) return "📝";
  if (name.match(/\.pptx?$/)) return "📑";
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return "🖼️";
  return "📁";
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const emptyForm = () => ({ category: "", permissions: "all", assignedTo: "", assignedToName: "" });

export default function DocumentsPage() {
  usePermissionGuard("documents");
  const [docs, setDocs]                 = useState<Doc[]>([]);
  const [staff, setStaff]               = useState<StaffUser[]>([]);
  const [companies, setCompanies]       = useState<Company[]>([]);
  const [cid, setCid]                   = useState("");
  const cidRef                          = useRef("");
  const [session, setSession]           = useState<Session | null>(null);
  const [search, setSearch]             = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [form, setForm]                 = useState(emptyForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError]       = useState("");
  const [uploading, setUploading]       = useState(false);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [previewDoc, setPreviewDoc]     = useState<Doc | null>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const dropZoneRef                     = useRef<HTMLDivElement>(null);

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const c = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setCid(c); cidRef.current = c;
    setDocs(lsGet<Doc[]>(DOCS_KEY, []));
    setStaff(lsGet<StaffUser[]>(USERS_KEY, []));
    setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
  };

  useEffect(() => { reload(); }, []);

  const co         = cidRef.current || cid;
  const coStaff    = (co ? staff.filter(u => u.companyId === co && u.status !== "inactive") : staff);
  // For specific staff picker: ALL active staff across ALL companies, grouped by company
  const allActiveStaff = staff.filter(u => u.status !== "inactive");
  const staffByCompany = companies.map(c => ({
    company: c,
    members: allActiveStaff.filter(u => u.companyId === c.id),
  })).filter(g => g.members.length > 0);
  // Staff not belonging to any known company
  const knownCompanyIds = new Set(companies.map(c => c.id));
  const ungroupedStaff  = allActiveStaff.filter(u => !knownCompanyIds.has(u.companyId));
  const coDocs   = (co ? docs.filter(d => d.companyId === co) : docs)
                     .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const categories = [...new Set(coDocs.map(d => d.category))];

  const thisMonth = new Date().toISOString().slice(0, 7);
  const filtered  = coDocs.filter(d => {
    const ms = d.name.toLowerCase().includes(search.toLowerCase()) ||
               d.category.toLowerCase().includes(search.toLowerCase());
    const mf = categoryFilter === "all" || d.category === categoryFilter;
    return ms && mf;
  });
  const docsByCategory = categories.map(cat => ({
    category: cat,
    docs: coDocs.filter(d => d.category === cat),
  }));

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const openUpload = () => {
    setForm(emptyForm());
    setSelectedFile(null);
    setFormError("");
    setShowUploadDialog(true);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setFormError("File exceeds 50 MB limit."); return; }
    setSelectedFile(file);
    setFormError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileChange(file);
  };

  const saveUpload = () => {
    if (!selectedFile) { setFormError("Please select a file to upload."); return; }
    if (!form.category)   { setFormError("Select a category."); return; }
    setUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const assignedStaff = form.permissions === "specific_staff" && form.assignedTo
        ? coStaff.find(u => u.id === form.assignedTo)
        : undefined;
      const newDoc: Doc = {
        id:             `doc-${Date.now()}`,
        companyId:      cidRef.current || cid,
        name:           selectedFile.name,
        category:       form.category,
        permissions:    form.permissions,
        assignedTo:     assignedStaff?.id,
        assignedToName: assignedStaff?.name,
        uploadedBy:     session?.name ?? "Unknown",
        uploadedAt:     new Date().toISOString(),
        size:           fmtBytes(selectedFile.size),
        version:        1,
        dataUrl:        typeof reader.result === "string" ? reader.result : undefined,
      };
      const updated = [...docs, newDoc];
      lsSet(DOCS_KEY, updated);
      setDocs(updated);
      setUploading(false);
      setShowUploadDialog(false);
    };
    reader.onerror = () => { setFormError("Failed to read file."); setUploading(false); };
    reader.readAsDataURL(selectedFile);
  };

  const deleteDoc = (id: string) => {
    const updated = docs.filter(d => d.id !== id);
    lsSet(DOCS_KEY, updated);
    setDocs(updated);
    setDeleteId(null);
  };

  const permLabel = (val: string, assignedToName?: string) => {
    if (val === "specific_staff" && assignedToName) return `👤 ${assignedToName}`;
    return PERMISSIONS.find(p => p.value === val)?.label ?? val;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Document Management"
        subtitle="Upload, organize and manage company documents"
        icon={FileText}
        actions={
          <Button size="sm" onClick={openUpload}>
            <Upload className="w-4 h-4 mr-2" /> Upload Document
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Documents" value={coDocs.length}                                                    icon={FileText}  iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Categories"      value={categories.length}                                                icon={FolderOpen}iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="This Month"      value={coDocs.filter(d => d.uploadedAt.startsWith(thisMonth)).length}    icon={Upload}    iconBg="bg-green-50"  iconColor="text-green-600" subtitle="Uploaded" />
        <StatCard title="Permissions Set" value={coDocs.filter(d => d.permissions && d.permissions !== "all").length} icon={Shield} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle="Restricted" />
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list">All Documents</TabsTrigger>
            <TabsTrigger value="folders">By Category</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <FileText className="w-12 h-12 text-gray-200" />
                <p className="font-semibold text-gray-500">No documents yet</p>
                <p className="text-sm text-gray-400">Click &quot;Upload Document&quot; to add the first one.</p>
                <Button size="sm" onClick={openUpload}><Upload className="w-4 h-4 mr-2" />Upload</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{fileIcon(doc.name)}</span>
                          <p className="font-medium text-gray-900 max-w-[180px] truncate">{doc.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{doc.category}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-[10px]">{getInitials(doc.uploadedBy)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-700">{doc.uploadedBy}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDateTime(doc.uploadedAt)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{doc.size}</TableCell>
                      <TableCell>
                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">v{doc.version}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{permLabel(doc.permissions, doc.assignedToName)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {doc.dataUrl && (
                            <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(doc)} title="Preview">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </Button>
                          )}
                          {doc.dataUrl && (
                            <a href={doc.dataUrl} download={doc.name}>
                              <Button variant="ghost" size="icon" title="Download">
                                <Download className="w-4 h-4 text-gray-400" />
                              </Button>
                            </a>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(doc.id)} title="Delete">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="folders">
          {docsByCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <FolderOpen className="w-12 h-12 text-gray-200" />
              <p className="text-sm text-gray-400">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docsByCategory.map(({ category, docs: catDocs }) => (
                <div key={category} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                      {categoryIcons[category] || "📁"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{category}</h3>
                      <p className="text-xs text-gray-400">{catDocs.length} document{catDocs.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {catDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">{fileIcon(doc.name)}</span>
                          <p className="text-sm text-gray-700 truncate">{doc.name}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <span className="text-xs font-mono text-gray-400">v{doc.version}</span>
                          {doc.dataUrl && (
                            <a href={doc.dataUrl} download={doc.name}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Download className="w-3 h-3 text-gray-400" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={v => { if (!v) setShowUploadDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            {/* Drop zone — clicking opens file picker */}
            <div
              ref={dropZoneRef}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none
                ${selectedFile
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                }`}
            >
              {selectedFile ? (
                <>
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-green-700 truncate px-4">{selectedFile.name}</p>
                  <p className="text-xs text-green-500 mt-1">{fmtBytes(selectedFile.size)} · Click to change</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Click to upload or drag &amp; drop</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, PPTX, images — up to 50 MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category <span className="text-red-500">*</span></label>
              <Select value={form.category} onValueChange={v => sf({ category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Who can access?</label>
              <Select value={form.permissions} onValueChange={v => sf({ permissions: v, assignedTo: "", assignedToName: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERMISSIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.permissions === "specific_staff" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select Staff Member <span className="text-red-500">*</span></label>
                <Select value={form.assignedTo} onValueChange={v => {
                  const u = allActiveStaff.find(s => s.id === v);
                  sf({ assignedTo: v, assignedToName: u?.name ?? "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {staffByCompany.map(group => (
                      <div key={group.company.id}>
                        <div className="px-2 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                          🏢 {group.company.name}
                        </div>
                        {group.members.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}{u.department ? ` – ${u.department}` : ""}{u.position ? ` (${u.position})` : ""}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                    {ungroupedStaff.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}{u.department ? ` – ${u.department}` : ""}{u.position ? ` (${u.position})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.assignedTo && (
                  <p className="text-xs text-blue-600 mt-1">✓ Document will be sent directly to {form.assignedToName}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={saveUpload} disabled={uploading}>
              {uploading ? "Uploading…" : <><Upload className="w-4 h-4 mr-2" />Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{previewDoc?.name}</DialogTitle></DialogHeader>
          {previewDoc?.dataUrl && (
            previewDoc.dataUrl.startsWith("data:image") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewDoc.dataUrl} alt={previewDoc.name} className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg" />
            ) : previewDoc.dataUrl.startsWith("data:application/pdf") ? (
              <iframe src={previewDoc.dataUrl} className="w-full h-[60vh] rounded-lg border" title={previewDoc.name} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <span className="text-5xl">{fileIcon(previewDoc.name)}</span>
                <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
                <a href={previewDoc.dataUrl} download={previewDoc.name}>
                  <Button><Download className="w-4 h-4 mr-2" />Download to view</Button>
                </a>
              </div>
            )
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
            {previewDoc?.dataUrl && (
              <a href={previewDoc.dataUrl} download={previewDoc.name}>
                <Button><Download className="w-4 h-4 mr-2" />Download</Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Document</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">This document will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteDoc(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
