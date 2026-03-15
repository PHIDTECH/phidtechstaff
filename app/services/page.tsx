"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Plus, Search, Edit, Trash2, AlertCircle, Tag, DollarSign, CheckCircle, ToggleLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SESSION_KEY  = "phidtech_session";
const SERVICES_KEY = "phidtech_services";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

interface Session {
  id: string; name: string; role: string; position: string;
  isSuperAdmin: boolean; companyId: string; permissions?: string[];
}
export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  currency: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  "IT Services", "Consulting", "Training", "Maintenance",
  "Installation", "Design", "Development", "Support", "Other",
];
const UNITS = ["per hour", "per day", "per project", "per month", "per unit", "fixed"];

const emptyForm = () => ({
  name: "",
  category: "IT Services",
  description: "",
  price: "",
  unit: "per project",
  currency: "TZS",
  status: "active" as "active" | "inactive",
});

export default function ServicesPage() {
  usePermissionGuard("services");
  const [session, setSession]     = useState<Session | null>(null);
  const [services, setServices]   = useState<Service[]>([]);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem]   = useState<Service | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    setServices(lsGet<Service[]>(SERVICES_KEY, []));
  };

  useEffect(() => { reload(); }, []);

  const isSuperAdmin = session?.isSuperAdmin === true;

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q);
    const matchCat = catFilter === "all" || s.category === catFilter;
    return matchSearch && matchCat;
  });

  const activeCount = services.filter(s => s.status === "active").length;
  const avgPrice = services.length
    ? services.reduce((sum, s) => sum + s.price, 0) / services.length
    : 0;
  const categories = [...new Set(services.map(s => s.category))];

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (s: Service) => {
    setEditItem(s);
    setForm({
      name: s.name, category: s.category, description: s.description,
      price: String(s.price), unit: s.unit, currency: s.currency, status: s.status,
    });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) { setFormError("Service name is required."); return; }
    if (!form.price || Number(form.price) < 0) { setFormError("Enter a valid price."); return; }
    const now = new Date().toISOString();
    if (editItem) {
      const updated = services.map(s => s.id === editItem.id ? {
        ...s,
        name: form.name.trim(), category: form.category,
        description: form.description.trim(), price: Number(form.price),
        unit: form.unit, currency: form.currency, status: form.status,
        updatedAt: now,
      } : s);
      lsSet(SERVICES_KEY, updated);
      setServices(updated);
    } else {
      const newSvc: Service = {
        id: `svc-${Date.now()}`,
        name: form.name.trim(), category: form.category,
        description: form.description.trim(), price: Number(form.price),
        unit: form.unit, currency: form.currency, status: form.status,
        createdAt: now, updatedAt: now,
      };
      const updated = [...services, newSvc];
      lsSet(SERVICES_KEY, updated);
      setServices(updated);
    }
    setShowDialog(false);
  };

  const toggleStatus = (id: string) => {
    const updated = services.map(s => s.id === id
      ? { ...s, status: s.status === "active" ? "inactive" as const : "active" as const, updatedAt: new Date().toISOString() }
      : s
    );
    lsSet(SERVICES_KEY, updated);
    setServices(updated);
  };

  const deleteService = (id: string) => {
    const updated = services.filter(s => s.id !== id);
    lsSet(SERVICES_KEY, updated);
    setServices(updated);
    setDeleteId(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Services & Pricing"
        subtitle="Manage company services and their prices — available across all subsidiaries"
        icon={Briefcase}
        actions={
          isSuperAdmin ? (
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Service
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Services" value={services.length} icon={Briefcase} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Active" value={activeCount} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Categories" value={categories.length} icon={Tag} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Avg. Price" value={formatCurrency(Math.round(avgPrice))} icon={DollarSign} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-700">No services found</p>
            <p className="text-sm text-gray-400">
              {isSuperAdmin ? 'Click "Add Service" to add your first service.' : "No services have been added yet."}
            </p>
            {isSuperAdmin && (
              <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Service</Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(svc => (
                  <TableRow key={svc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="font-medium text-gray-900">{svc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700">
                        {svc.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[220px] truncate" title={svc.description}>
                      {svc.description || "—"}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-gray-900">
                        {svc.currency === "TZS" ? "TZS " : svc.currency + " "}
                        {svc.price.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{svc.unit}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        svc.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {svc.status}
                      </span>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="sm"
                            className={`text-xs h-7 px-2 ${svc.status === "active" ? "text-gray-500" : "text-green-600"}`}
                            onClick={() => toggleStatus(svc.id)}
                            title={svc.status === "active" ? "Deactivate" : "Activate"}
                          >
                            <ToggleLeft className="w-4 h-4 mr-1" />
                            {svc.status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(svc)} title="Edit">
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(svc.id)} title="Delete">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{filtered.length} service{filtered.length !== 1 ? "s" : ""}</span>
              <span className="text-sm text-gray-500">
                Total value: <strong className="text-gray-800">{formatCurrency(filtered.reduce((s, x) => s + x.price, 0))}</strong>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Service Name <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Website Development" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Input placeholder="Brief description of the service" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Price <span className="text-red-500">*</span></label>
                <Input type="number" placeholder="0" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Currency</label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({...f, currency: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="TZS">TZS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="UGX">UGX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Billing Unit</label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({...f, unit: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v as "active" | "inactive"}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add Service"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Service</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">Are you sure you want to delete this service? This cannot be undone.</p>
            {deleteId && (() => {
              const s = services.find(x => x.id === deleteId);
              return s ? (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 text-sm">
                  <p className="font-semibold text-red-800">{s.name}</p>
                  <p className="text-red-600">{s.category} · {s.currency} {s.price.toLocaleString()} {s.unit}</p>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteService(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
