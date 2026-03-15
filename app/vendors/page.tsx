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
import { Building2, Plus, Search, DollarSign, Eye, Edit } from "lucide-react";
import { vendors, purchaseOrders } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function VendorsPage() {
  usePermissionGuard("vendors");
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<typeof vendors[0] | null>(null);

  const companyVendors = vendors.filter(v => v.companyId === "c1");
  const filtered = companyVendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalPurchases = companyVendors.reduce((s, v) => s + v.totalPurchases, 0);
  const activeVendors = companyVendors.filter(v => v.status === "active").length;
  const categories = [...new Set(companyVendors.map(v => v.category))];

  return (
    <MainLayout>
      <PageHeader
        title="Vendor Management"
        subtitle="Manage supplier profiles, contacts and purchase history"
        icon={Building2}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
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
              const vendorPOs = purchaseOrders.filter(po => po.vendorId === vendor.id);
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
                {purchaseOrders.filter(po => po.vendorId === selectedVendor.id).map(po => (
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
            <Button>Edit Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vendor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Vendor Name</label>
              <Input placeholder="Company / supplier name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <Input type="email" placeholder="email@vendor.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input placeholder="+255 7XX XXX XXX" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Input placeholder="e.g. Hardware, Software" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Address</label>
                <Input placeholder="City, Country" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Add Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
