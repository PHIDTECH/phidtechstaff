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
import { Building2, Plus, Search, DollarSign, Eye, Edit, Trash2, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SESSION_KEY = "phidtech_session";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface Vendor {
  id: string; companyId: string; name: string; email: string;
  phone: string; address: string; category: string;
  status: "active"|"inactive"; totalPurchases: number; createdAt: string;
}
interface PurchaseOrder {
  id: string; companyId: string; vendorId: string; poNumber: string;
  total: number; status: string; orderDate: string;
}

const emptyForm = () => ({
  name: "", email: "", phone: "", address: "", category: "", status: "active" as Vendor["status"],
});

export default function VendorsPage() {
  usePermissionGuard("vendors");
  const [vendors, setVendors]             = useState<Vendor[]>([]);
  const [orders, setOrders]               = useState<PurchaseOrder[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [showDialog, setShowDialog]       = useState(false);
  const [editItem, setEditItem]           = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = getActiveCid(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    try {
      const [vr, or] = await Promise.all([
        fetch("/api/vendors",           { cache: "no-store" }),
        fetch("/api/inventory/orders",  { cache: "no-store" }),
      ]);
      if (vr.ok) setVendors(await vr.json());
      if (or.ok) setOrders(await or.json());
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  const cid = cidRef.current || activeCompanyId;
  const companyVendors = cid ? vendors.filter(v => v.companyId === cid) : vendors;
  const companyOrders  = cid ? orders.filter(o => o.companyId === cid) : orders;

  const filtered = companyVendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalPurchases = companyVendors.reduce((s, v) => s + v.totalPurchases, 0);
  const activeVendors  = companyVendors.filter(v => v.status === "active").length;
  const categories     = [...new Set(companyVendors.map(v => v.category))];

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const openAdd = () => {
    setEditItem(null); setForm(emptyForm()); setFormError(""); setShowDialog(true);
  };

  const openEdit = (v: Vendor) => {
    setEditItem(v);
    setForm({ name: v.name, email: v.email, phone: v.phone, address: v.address, category: v.category, status: v.status });
    setFormError(""); setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.name.trim()) { setFormError("Vendor name is required."); return; }
    if (editItem) {
      const body = { ...editItem, ...form, name: form.name.trim() };
      await fetch("/api/vendors", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      const body: Vendor = {
        id: `ven-${Date.now()}`, companyId: cid,
        name: form.name.trim(), email: form.email, phone: form.phone,
        address: form.address, category: form.category,
        status: form.status, totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };
      await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    await reload(); setShowDialog(false);
  };

  const deleteVendor = async (id: string) => {
    await fetch(`/api/vendors?id=${id}`, { method: "DELETE" });
    await reload(); setDeleteId(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Vendor Management"
        subtitle="Manage supplier profiles, contacts and purchase history"
        icon={Building2}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Vendor
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Vendors" value={companyVendors.length} icon={Building2} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Active" value={activeVendors} icon={Building2} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Categories" value={categories.length} icon={Building2} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Total Purchases" value={formatCurrency(totalPurchases)} icon={DollarSign} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Vendor Directory</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Building2 className="w-10 h-10 text-gray-200" />
            <p className="font-semibold text-gray-700">No vendors yet</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Vendor</Button>
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Total Purchases</TableHead>
              <TableHead>POs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(vendor => {
              const vendorPOs = companyOrders.filter(po => po.vendorId === vendor.id);
              return (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                          {getInitials(vendor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{vendor.name}</p>
                        <p className="text-xs text-gray-400">{vendor.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{vendor.phone}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                      {vendor.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{vendor.address}</TableCell>
                  <TableCell className="font-semibold text-gray-900">{formatCurrency(vendor.totalPurchases)}</TableCell>
                  <TableCell className="text-sm text-gray-700">{vendorPOs.length}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(vendor.status)}`}>
                      {vendor.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(vendor)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(vendor)}>
                        <Edit className="w-4 h-4 text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(vendor.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        )}
      </div>

      {/* Vendor Detail */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Vendor Profile</DialogTitle></DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="text-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                    {getInitials(selectedVendor.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedVendor.name}</h3>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{selectedVendor.category}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Email", value: selectedVendor.email },
                  { label: "Phone", value: selectedVendor.phone },
                  { label: "Address", value: selectedVendor.address },
                  { label: "Total Purchases", value: formatCurrency(selectedVendor.totalPurchases) },
                  { label: "Status", value: selectedVendor.status },
                  { label: "Vendor Since", value: formatDate(selectedVendor.createdAt) },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-medium text-gray-800 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Purchase Orders</p>
                {companyOrders.filter(po => po.vendorId === selectedVendor.id).map(po => (
                  <div key={po.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
                    <span className="font-mono text-blue-700">{po.poNumber}</span>
                    <span className="text-gray-600">{formatCurrency(po.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(po.status)}`}>{po.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVendor(null)}>Close</Button>
            <Button onClick={() => { openEdit(selectedVendor!); setSelectedVendor(null); }}>Edit Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Vendor Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Vendor" : "Add New Vendor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Vendor Name *</label>
              <Input placeholder="Company / supplier name" value={form.name} onChange={e => sf({ name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <Input type="email" placeholder="email@vendor.com" value={form.email} onChange={e => sf({ email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input placeholder="+255 7XX XXX XXX" value={form.phone} onChange={e => sf({ phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Input placeholder="e.g. Hardware, Software" value={form.category} onChange={e => sf({ category: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Address</label>
                <Input placeholder="City, Country" value={form.address} onChange={e => sf({ address: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v as Vendor["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add Vendor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Vendor</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this vendor? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteVendor(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
