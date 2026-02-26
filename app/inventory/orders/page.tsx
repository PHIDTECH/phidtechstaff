"use client";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Search, Eye, CheckCircle, Clock, Package, DollarSign } from "lucide-react";
import { purchaseOrders, vendors, products } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewPO, setViewPO] = useState<typeof purchaseOrders[0] | null>(null);

  const companyPOs = purchaseOrders.filter(p => p.companyId === "c1");
  const filtered = companyPOs.filter(p => {
    const vendor = vendors.find(v => v.id === p.vendorId);
    return p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      vendor?.name.toLowerCase().includes(search.toLowerCase());
  });

  const totalOrdered = companyPOs.reduce((s, p) => s + p.total, 0);
  const received = companyPOs.filter(p => p.status === "received").length;
  const pending = companyPOs.filter(p => p.status === "sent").length;
  const draft = companyPOs.filter(p => p.status === "draft").length;

  return (
    <MainLayout>
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage purchase orders and goods received notes"
        icon={ShoppingCart}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> New PO
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Ordered" value={formatCurrency(totalOrdered)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Received" value={received} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Pending Delivery" value={pending} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Draft POs" value={draft} icon={Package} iconBg="bg-gray-50" iconColor="text-gray-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Purchase Order Register</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search POs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(po => {
              const vendor = vendors.find(v => v.id === po.vendorId);
              return (
                <TableRow key={po.id}>
                  <TableCell className="font-mono font-medium text-blue-700">{po.poNumber}</TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-900">{vendor?.name}</p>
                    <p className="text-xs text-gray-400">{vendor?.category}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{po.items.length} items</TableCell>
                  <TableCell className="font-bold text-gray-900">{formatCurrency(po.total)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(po.orderDate)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(po.expectedDate)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {po.receivedDate ? formatDate(po.receivedDate) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(po.status)}`}>
                      {po.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewPO(po)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      {po.status === "sent" && (
                        <Button variant="ghost" size="sm" className="text-green-600 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Receive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* View PO Dialog */}
      <Dialog open={!!viewPO} onOpenChange={() => setViewPO(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Purchase Order – {viewPO?.poNumber}</DialogTitle></DialogHeader>
          {viewPO && (() => {
            const vendor = vendors.find(v => v.id === viewPO.vendorId);
            return (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Vendor</p>
                    <p className="font-bold text-gray-900">{vendor?.name}</p>
                    <p className="text-sm text-gray-500">{vendor?.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(viewPO.status)}`}>
                      {viewPO.status.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">Order Date: {formatDate(viewPO.orderDate)}</p>
                    <p className="text-xs text-gray-400">Expected: {formatDate(viewPO.expectedDate)}</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewPO.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end">
                  <div className="p-3 bg-blue-50 rounded-lg flex items-center justify-between gap-8">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-blue-700 text-lg">{formatCurrency(viewPO.total)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPO(null)}>Close</Button>
            {viewPO?.status === "draft" && <Button>Send PO</Button>}
            {viewPO?.status === "sent" && (
              <Button className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Received
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add PO Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Vendor</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.filter(v => v.companyId === "c1").map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Order Date</label>
                <Input type="date" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Expected Date</label>
                <Input type="date" />
              </div>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Order Items</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 font-medium">
                <span>Product</span><span>Qty</span><span>Unit Cost</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Product" /></SelectTrigger>
                  <SelectContent>
                    {products.filter(p => p.companyId === "c1").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="0" className="text-sm" />
                <Input type="number" placeholder="0" className="text-sm" />
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs">+ Add Item</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button variant="outline">Save Draft</Button>
            <Button onClick={() => setShowAddDialog(false)}>Create & Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
