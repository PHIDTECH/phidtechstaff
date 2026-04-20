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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, Plus, Search, DollarSign, Edit, Eye, Wrench, AlertCircle, Trash2 } from "lucide-react";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SESSION_KEY   = "phidtech_session";
const ACTIVE_KEY    = "phidtech_active_company";
const USERS_KEY     = "phidtech_users";
const BRANCHES_KEY  = "phidtech_branches";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

const ASSET_CATEGORIES = ["Laptop","Desktop","Vehicle","Furniture","Machinery","Equipment","Phone","Printer","Server","Other"];
const ASSET_STATUSES   = ["active","maintenance","disposed"] as const;

interface Session { id: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; position?: string; branchId?: string; }
interface Branch { id: string; name: string; location?: string; companyId?: string; }
interface Asset {
  id: string; companyId: string; name: string; category: string;
  serialNumber: string; purchaseDate: string; purchaseCost: number;
  currentValue: number; depreciationRate: number;
  assignedTo: string; location: string; branchId?: string;
  status: "active" | "maintenance" | "disposed";
  nextMaintenance?: string; notes?: string; createdAt: string;
}

const emptyForm = (): Omit<Asset,"id"|"companyId"|"createdAt"> => ({
  name: "", category: "Laptop", serialNumber: "",
  purchaseDate: new Date().toISOString().slice(0,10),
  purchaseCost: 0, currentValue: 0, depreciationRate: 20,
  assignedTo: "", location: "", branchId: "", status: "active",
  nextMaintenance: "", notes: "",
});

const statusColors: Record<string, string> = {
  active:      "bg-green-100 text-green-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  disposed:    "bg-gray-100 text-gray-800",
};

export default function AssetsPage() {
  usePermissionGuard("assets");
  const [assetList, setAssetList]   = useState<Asset[]>([]);
  const [staffList, setStaffList]   = useState<StaffUser[]>([]);
  const [branches, setBranches]     = useState<Branch[]>([]);
  const [cid, setCid]               = useState("");
  const cidRef                      = useRef("");
  const [search, setSearch]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog]   = useState(false);
  const [editItem, setEditItem]     = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset]   = useState<Asset | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [formError, setFormError]   = useState("");
  const [loading, setLoading]       = useState(true);

  const sf = (f: Partial<ReturnType<typeof emptyForm>>) => setForm(p => ({ ...p, ...f }));

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const c = getActiveCid(sess);
    setCid(c); cidRef.current = c;
    // Load staff
    try {
      const ur = await fetch("/api/users", { cache: "no-store" });
      if (ur.ok) setStaffList(await ur.json());
      else setStaffList(lsGet<StaffUser[]>(USERS_KEY, []));
    } catch { setStaffList(lsGet<StaffUser[]>(USERS_KEY, [])); }
    // Load branches (all branches shared across companies)
    try {
      const br = await fetch("/api/branches", { cache: "no-store" });
      if (br.ok) setBranches(await br.json());
      else setBranches(lsGet<Branch[]>(BRANCHES_KEY, []));
    } catch { setBranches(lsGet<Branch[]>(BRANCHES_KEY, [])); }
    // Load assets
    try {
      setLoading(true);
      const ar = await fetch("/api/assets", { cache: "no-store" });
      if (ar.ok) setAssetList(await ar.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []); // eslint-disable-line

  const co = cidRef.current || cid;
  const companyAssets = (co ? assetList.filter(a => a.companyId === co) : assetList)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const coStaff = co ? staffList.filter(u => u.companyId === co) : staffList;
  const categories = [...new Set(companyAssets.map(a => a.category))];

  const filtered = companyAssets.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.serialNumber ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalPurchaseCost = companyAssets.reduce((s, a) => s + (a.purchaseCost ?? 0), 0);
  const totalCurrentValue = companyAssets.reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const totalDepreciation = totalPurchaseCost - totalCurrentValue;
  const today30 = new Date(); today30.setDate(today30.getDate() + 30);
  const maintenanceDue = companyAssets.filter(a => a.nextMaintenance && new Date(a.nextMaintenance) <= today30).length;

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowAddDialog(true);
  };

  const openEdit = (a: Asset) => {
    setEditItem(a);
    setForm({
      name: a.name, category: a.category, serialNumber: a.serialNumber ?? "",
      purchaseDate: a.purchaseDate, purchaseCost: a.purchaseCost, currentValue: a.currentValue,
      depreciationRate: a.depreciationRate, assignedTo: a.assignedTo ?? "",
      location: a.location ?? "", branchId: a.branchId ?? "", status: a.status,
      nextMaintenance: a.nextMaintenance ?? "", notes: a.notes ?? "",
    });
    setFormError("");
    setShowAddDialog(true);
  };

  const saveForm = async () => {
    if (!form.name.trim()) { setFormError("Asset name is required."); return; }
    if (!form.purchaseDate) { setFormError("Purchase date is required."); return; }
    if (editItem) {
      const updated = { ...editItem, ...form };
      await fetch("/api/assets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    } else {
      const newAsset = { ...form, id: `AST-${Date.now().toString().slice(-6)}`, companyId: cidRef.current || cid, createdAt: new Date().toISOString() };
      await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newAsset) });
    }
    setShowAddDialog(false);
    await reload();
  };

  return (
    <MainLayout>
      <PageHeader
        title="Asset Management"
        subtitle="Track company assets, depreciation and maintenance"
        icon={Briefcase}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Asset
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Assets"    value={companyAssets.length}           icon={Briefcase} iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Total Cost"      value={formatCurrency(totalPurchaseCost)} icon={DollarSign} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Current Value"   value={formatCurrency(totalCurrentValue)} icon={DollarSign} iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatCard title="Maintenance Due" value={maintenanceDue}                  icon={Wrench}    iconBg="bg-orange-50" iconColor="text-orange-600" subtitle="Next 30 days" />
      </div>

      {/* Value Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Asset Value Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalPurchaseCost)}</p>
            <p className="text-sm text-blue-600 mt-1">Original Cost</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">-{formatCurrency(totalDepreciation)}</p>
            <p className="text-sm text-red-500 mt-1">Total Depreciation</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalCurrentValue)}</p>
            <p className="text-sm text-green-600 mt-1">Book Value</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="register">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="register">Asset Register</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance Schedule</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {[...new Set([...ASSET_CATEGORIES, ...categories])].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="register">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="divide-y divide-gray-50">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                    <div className="w-8 h-8 rounded bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-1.5"><div className="h-3 bg-gray-100 rounded w-2/5" /><div className="h-2.5 bg-gray-50 rounded w-1/4" /></div>
                    <div className="h-3 bg-gray-100 rounded w-20" /><div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Briefcase className="w-10 h-10 text-gray-200" />
                <p className="font-semibold text-gray-500">No assets recorded</p>
                <p className="text-sm text-gray-400">Click <strong>Add Asset</strong> to register the first one.</p>
                <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Asset</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Purchase Cost</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Deprec. Rate</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((asset: Asset) => {
                    const assignee  = coStaff.find(u => u.id === asset.assignedTo);
                    const assetBranch = branches.find(b => b.id === asset.branchId);
                    const deprecPct = asset.purchaseCost > 0 ? Math.round(((asset.purchaseCost - asset.currentValue) / asset.purchaseCost) * 100) : 0;
                    return (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <p className="font-medium text-gray-900">{asset.name}</p>
                          <p className="text-xs text-gray-400">{formatDate(asset.purchaseDate)}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{asset.category}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{asset.serialNumber || "—"}</TableCell>
                        <TableCell className="text-gray-700">{formatCurrency(asset.purchaseCost)}</TableCell>
                        <TableCell className="font-semibold text-gray-900">{formatCurrency(asset.currentValue)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-orange-600 font-medium">{asset.depreciationRate}%/yr</span>
                          <p className="text-xs text-gray-400">{deprecPct}% depreciated</p>
                        </TableCell>
                        <TableCell>
                          {assetBranch
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{assetBranch.name}</span>
                            : <span className="text-xs text-gray-400">—</span>}
                        </TableCell>
                        <TableCell>
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7"><AvatarFallback className="text-[10px]">{getInitials(assignee.name)}</AvatarFallback></Avatar>
                              <span className="text-xs text-gray-700">{assignee.name}</span>
                            </div>
                          ) : <span className="text-xs text-gray-400">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{asset.location || "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[asset.status] ?? "bg-gray-100 text-gray-700"}`}>{asset.status}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(asset)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(asset)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(asset.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="space-y-3">
            {companyAssets.filter((a: Asset) => a.nextMaintenance).sort((a: Asset, b: Asset) =>
              new Date(a.nextMaintenance!).getTime() - new Date(b.nextMaintenance!).getTime()
            ).map((asset: Asset) => {
              const daysUntil = Math.round((new Date(asset.nextMaintenance!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntil < 0;
              const isDueSoon = daysUntil >= 0 && daysUntil <= 30;
              return (
                <div key={asset.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between ${isOverdue ? "border-red-200" : isDueSoon ? "border-yellow-200" : "border-gray-100"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? "bg-red-50" : isDueSoon ? "bg-yellow-50" : "bg-green-50"}`}>
                      <Wrench className={`w-5 h-5 ${isOverdue ? "text-red-500" : isDueSoon ? "text-yellow-600" : "text-green-600"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{asset.name}</p>
                      <p className="text-xs text-gray-400">{asset.category} · {asset.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">{formatDate(asset.nextMaintenance!)}</p>
                    <p className={`text-xs font-medium ${isOverdue ? "text-red-600" : isDueSoon ? "text-yellow-600" : "text-green-600"}`}>
                      {isOverdue ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? "Due today" : `Due in ${daysUntil} days`}
                    </p>
                  </div>
                  <Button size="sm" variant={isOverdue ? "destructive" : "outline"} className="ml-4" onClick={() => openEdit(asset)}>
                    <Wrench className="w-3.5 h-3.5 mr-1.5" /> Update
                  </Button>
                </div>
              );
            })}
            {companyAssets.filter((a: Asset) => a.nextMaintenance).length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center py-12 text-sm text-gray-400">
                No maintenance scheduled. Set a maintenance date when registering assets.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Asset Detail Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Asset Details</DialogTitle></DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <h3 className="font-bold text-gray-900 text-lg">{selectedAsset.name}</h3>
                <p className="text-sm text-gray-500">{selectedAsset.category} · {selectedAsset.location}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Serial Number",     value: selectedAsset.serialNumber || "—" },
                  { label: "Purchase Date",      value: formatDate(selectedAsset.purchaseDate) },
                  { label: "Purchase Cost",      value: formatCurrency(selectedAsset.purchaseCost) },
                  { label: "Current Value",      value: formatCurrency(selectedAsset.currentValue) },
                  { label: "Depreciation Rate",  value: `${selectedAsset.depreciationRate}% per year` },
                  { label: "Branch",            value: branches.find(b => b.id === selectedAsset.branchId)?.name ?? "—" },
                  { label: "Assigned To",        value: coStaff.find(u => u.id === selectedAsset.assignedTo)?.name ?? "Unassigned" },
                  { label: "Status",             value: selectedAsset.status },
                  { label: "Next Maintenance",   value: selectedAsset.nextMaintenance ? formatDate(selectedAsset.nextMaintenance) : "—" },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-medium text-gray-800 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAsset(null)}>Close</Button>
            <Button onClick={() => { if (selectedAsset) { openEdit(selectedAsset); setSelectedAsset(null); } }}>
              <Edit className="w-4 h-4 mr-2" />Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Asset Dialog */}
      <Dialog open={showAddDialog} onOpenChange={v => { if (!v) setShowAddDialog(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Asset" : "Register New Asset"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Asset Name *</label>
                <Input placeholder="e.g. Dell Laptop XPS 15" value={form.name} onChange={e => sf({ name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={v => sf({ category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Serial Number</label>
                <Input placeholder="SN-XXXX" value={form.serialNumber} onChange={e => sf({ serialNumber: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Purchase Date *</label>
                <Input type="date" value={form.purchaseDate} onChange={e => sf({ purchaseDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Purchase Cost (TZS)</label>
                <Input type="number" placeholder="0" value={form.purchaseCost || ""} onChange={e => sf({ purchaseCost: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Current Value (TZS)</label>
                <Input type="number" placeholder="0" value={form.currentValue || ""} onChange={e => sf({ currentValue: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Depreciation Rate (%/yr)</label>
                <Input type="number" placeholder="20" value={form.depreciationRate || ""} onChange={e => sf({ depreciationRate: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v as Asset["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Branch</label>
                <Select value={form.branchId ?? ""} onValueChange={v => sf({ branchId: v })}>  
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="__none">No specific branch</SelectItem>
                    {branches.map((b: Branch) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{b.name}</span>
                          {b.location && <span className="text-gray-400 text-xs">· {b.location}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To</label>
                <Select value={form.assignedTo} onValueChange={v => sf({ assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {coStaff.map((u: StaffUser) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}{u.position ? ` · ${u.position}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Location</label>
                <Input placeholder="e.g. Main Office" value={form.location} onChange={e => sf({ location: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Next Maintenance</label>
                <Input type="date" value={form.nextMaintenance ?? ""} onChange={e => sf({ nextMaintenance: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
                <Textarea placeholder="Optional notes..." rows={2} value={form.notes ?? ""} onChange={e => sf({ notes: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Register Asset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Asset</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) {
                await fetch(`/api/assets?id=${deleteId}`, { method: "DELETE" });
                setDeleteId(null);
                await reload();
              }
            }}>
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
