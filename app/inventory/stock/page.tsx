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
import { Warehouse, Plus, Search, AlertTriangle, ArrowLeftRight, Package } from "lucide-react";
import { stockItems, products, warehouses } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);

  const companyWarehouses = warehouses.filter(w => w.companyId === "c1");
  const companyStock = stockItems.filter(s => s.companyId === "c1");

  const filtered = companyStock.filter(s => {
    const prod = products.find(p => p.id === s.productId);
    const wh = warehouses.find(w => w.id === s.warehouseId);
    const matchSearch = prod?.name.toLowerCase().includes(search.toLowerCase()) ||
      prod?.sku.toLowerCase().includes(search.toLowerCase());
    const matchWh = warehouseFilter === "all" || s.warehouseId === warehouseFilter;
    return matchSearch && matchWh;
  });

  const totalItems = companyStock.reduce((s, i) => s + i.quantity, 0);
  const totalAvailable = companyStock.reduce((s, i) => s + i.availableQty, 0);
  const totalReserved = companyStock.reduce((s, i) => s + i.reservedQty, 0);

  const lowStockItems = companyStock.filter(s => {
    const prod = products.find(p => p.id === s.productId);
    return prod && prod.reorderLevel > 0 && s.availableQty <= prod.reorderLevel;
  });

  const totalStockValue = companyStock.reduce((sum, s) => {
    const prod = products.find(p => p.id === s.productId);
    return sum + (prod ? prod.costPrice * s.quantity : 0);
  }, 0);

  return (
    <MainLayout>
      <PageHeader
        title="Stock Management"
        subtitle="Track inventory levels, stock movements and alerts"
        icon={Warehouse}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowTransferDialog(true)}>
              <ArrowLeftRight className="w-4 h-4 mr-2" /> Transfer Stock
            </Button>
            <Button size="sm" onClick={() => setShowReceiveDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Receive Stock
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Units" value={totalItems} icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Available" value={totalAvailable} icon={Package} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Reserved" value={totalReserved} icon={Package} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Stock Value" value={formatCurrency(totalStockValue)} icon={Package} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="font-semibold text-yellow-800">{lowStockItems.length} items at or below reorder level</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(s => {
              const prod = products.find(p => p.id === s.productId);
              const wh = warehouses.find(w => w.id === s.warehouseId);
              return (
                <span key={s.id} className="text-xs bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1.5 rounded-full font-medium">
                  {prod?.name} @ {wh?.name.split(" ")[0]} — {s.availableQty} left
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Warehouse Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {companyWarehouses.map(wh => {
          const whStock = companyStock.filter(s => s.warehouseId === wh.id);
          const whValue = whStock.reduce((sum, s) => {
            const prod = products.find(p => p.id === s.productId);
            return sum + (prod ? prod.costPrice * s.quantity : 0);
          }, 0);
          const whUnits = whStock.reduce((s, i) => s + i.quantity, 0);
          return (
            <div key={wh.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{wh.name}</h3>
                  <p className="text-xs text-gray-400">{wh.location}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Warehouse className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-0.5">Total Units</p>
                  <p className="font-bold text-gray-900">{whUnits}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-0.5">Stock Value</p>
                  <p className="font-bold text-gray-900">{formatCurrency(whValue)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Stock Register</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {companyWarehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Total Qty</TableHead>
              <TableHead>Reserved</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Reorder Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stock Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(si => {
              const prod = products.find(p => p.id === si.productId);
              const wh = warehouses.find(w => w.id === si.warehouseId);
              if (!prod) return null;
              const stockPct = prod.reorderLevel > 0 ? Math.round((si.availableQty / (prod.reorderLevel * 3)) * 100) : 100;
              const isLow = prod.reorderLevel > 0 && si.availableQty <= prod.reorderLevel;
              const stockValue = prod.costPrice * si.quantity;
              return (
                <TableRow key={si.id}>
                  <TableCell className="font-medium text-gray-900">{prod.name}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{prod.sku}</TableCell>
                  <TableCell className="text-sm text-gray-600">{wh?.name}</TableCell>
                  <TableCell className="font-semibold text-gray-800">{si.quantity}</TableCell>
                  <TableCell className="text-yellow-700">{si.reservedQty}</TableCell>
                  <TableCell className={`font-bold ${isLow ? "text-red-600" : "text-green-700"}`}>{si.availableQty}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {prod.reorderLevel > 0 ? prod.reorderLevel : "—"}
                  </TableCell>
                  <TableCell>
                    {prod.reorderLevel === 0 ? (
                      <span className="text-xs text-gray-400">Service</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(stockPct, 100)} className={`h-1.5 w-16 ${isLow ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"}`} />
                        <span className={`text-xs font-medium ${isLow ? "text-red-600" : "text-green-600"}`}>
                          {isLow ? "Low" : "OK"}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-gray-800">{formatCurrency(stockValue)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transfer Stock</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Product</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.companyId === "c1").map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">From Warehouse</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {companyWarehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">To Warehouse</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {companyWarehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Quantity</label>
              <Input type="number" placeholder="Units to transfer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowTransferDialog(false)}>Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Stock Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Receive Stock (GRN)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Product</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.companyId === "c1").map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Warehouse</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {companyWarehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Quantity Received</label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reference / PO Number</label>
              <Input placeholder="PO-2026-XXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowReceiveDialog(false)}>Confirm Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
