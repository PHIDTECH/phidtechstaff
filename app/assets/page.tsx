"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
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
import { Briefcase, Plus, Search, DollarSign, AlertTriangle, Edit, Eye, Wrench } from "lucide-react";
import { assets, users } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AssetsPage() {
  usePermissionGuard("assets");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<typeof assets[0] | null>(null);

  const companyAssets = assets.filter(a => a.companyId === "c1");
  const categories = [...new Set(companyAssets.map(a => a.category))];

  const filtered = companyAssets.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalPurchaseCost = companyAssets.reduce((s, a) => s + a.purchaseCost, 0);
  const totalCurrentValue = companyAssets.reduce((s, a) => s + a.currentValue, 0);
  const totalDepreciation = totalPurchaseCost - totalCurrentValue;
  const maintenanceDue = companyAssets.filter(a => a.nextMaintenance && new Date(a.nextMaintenance) <= new Date("2026-04-01")).length;

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    disposed: "bg-gray-100 text-gray-800",
  };

  return (
    <MainLayout>
      <PageHeader
        title="Asset Management"
        subtitle="Track company assets, depreciation and maintenance"
        icon={Briefcase}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Asset
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Assets" value={companyAssets.length} icon={Briefcase} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Total Cost" value={formatCurrency(totalPurchaseCost)} icon={DollarSign} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Current Value" value={formatCurrency(totalCurrentValue)} icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Maintenance Due" value={maintenanceDue} icon={Wrench} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle="Next 30 days" />
      </div>

      {/* Depreciation Summary */}
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
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="register">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Purchase Cost</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Deprec. Rate</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(asset => {
                  const assignee = users.find(u => u.id === asset.assignedTo);
                  const deprecPct = Math.round(((asset.purchaseCost - asset.currentValue) / asset.purchaseCost) * 100);
                  return (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <p className="font-medium text-gray-900">{asset.name}</p>
                        <p className="text-xs text-gray-400">{formatDate(asset.purchaseDate)}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                          {asset.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{asset.serialNumber}</TableCell>
                      <TableCell className="text-gray-700">{formatCurrency(asset.purchaseCost)}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{formatCurrency(asset.currentValue)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-orange-600 font-medium">{asset.depreciationRate}%/yr</span>
                        <p className="text-xs text-gray-400">{deprecPct}% depreciated</p>
                      </TableCell>
                      <TableCell>
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-[10px]">{getInitials(assignee.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-700">{assignee.name}</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{asset.location}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[asset.status]}`}>
                          {asset.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(asset)}>
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="space-y-3">
            {companyAssets.filter(a => a.nextMaintenance).sort((a, b) =>
              new Date(a.nextMaintenance!).getTime() - new Date(b.nextMaintenance!).getTime()
            ).map(asset => {
              const daysUntil = Math.round((new Date(asset.nextMaintenance!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntil < 0;
              const isDueSoon = daysUntil >= 0 && daysUntil <= 30;
              return (
                <div key={asset.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between ${
                  isOverdue ? "border-red-200" : isDueSoon ? "border-yellow-200" : "border-gray-100"
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isOverdue ? "bg-red-50" : isDueSoon ? "bg-yellow-50" : "bg-green-50"
                    }`}>
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
                  <Button size="sm" variant={isOverdue ? "destructive" : "outline"} className="ml-4">
                    <Wrench className="w-3.5 h-3.5 mr-1.5" /> Schedule
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Asset Detail */}
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
                  { label: "Serial Number", value: selectedAsset.serialNumber },
                  { label: "Purchase Date", value: formatDate(selectedAsset.purchaseDate) },
                  { label: "Purchase Cost", value: formatCurrency(selectedAsset.purchaseCost) },
                  { label: "Current Value", value: formatCurrency(selectedAsset.currentValue) },
                  { label: "Depreciation Rate", value: `${selectedAsset.depreciationRate}% per year` },
                  { label: "Assigned To", value: users.find(u => u.id === selectedAsset.assignedTo)?.name || "Unassigned" },
                  { label: "Status", value: selectedAsset.status },
                  { label: "Next Maintenance", value: selectedAsset.nextMaintenance ? formatDate(selectedAsset.nextMaintenance) : "—" },
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
            <Button>Edit Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Asset Name</label>
              <Input placeholder="e.g. Dell Laptop XPS 15" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
              <Input placeholder="e.g. Laptop, Vehicle" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Serial Number</label>
              <Input placeholder="SN-XXXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Purchase Date</label>
              <Input type="date" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Purchase Cost (TZS)</label>
              <Input type="number" placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Depreciation Rate (%/yr)</label>
              <Input type="number" placeholder="20" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.companyId === "c1").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Location</label>
              <Input placeholder="e.g. Main Office" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Register Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
