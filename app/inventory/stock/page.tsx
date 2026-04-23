"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Warehouse, Plus, Search, AlertTriangle, ArrowLeftRight, Package, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const SESSION_KEY = "phidtech_session";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface Session { id: string; name: string; isSuperAdmin: boolean; companyId: string; }
interface Product {
  id: string; companyId: string; name: string; sku: string;
  category: string; costPrice: number; reorderLevel: number;
}
interface StockItem {
  id: string; productId: string; companyId: string;
  warehouseName: string; quantity: number; reservedQty: number; availableQty: number;
}

export default function StockPage() {
  const [products, setProducts]           = useState<Product[]>([]);
  const [stockItems, setStockItems]       = useState<StockItem[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog]   = useState(false);
  const [receiveForm, setReceiveForm]     = useState({ productId: "", warehouseName: "", qty: "", reference: "" });
  const [receiveError, setReceiveError]   = useState("");

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = getActiveCid(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    try {
      const [pr, sr] = await Promise.all([
        fetch("/api/inventory/products", { cache: "no-store" }),
        fetch("/api/inventory/stock",    { cache: "no-store" }),
      ]);
      if (pr.ok) setProducts(await pr.json());
      if (sr.ok) setStockItems(await sr.json());
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  const cid = cidRef.current || activeCompanyId;
  const companyProducts = cid ? products.filter(p => p.companyId === cid) : products;
  const companyStock    = cid ? stockItems.filter(s => s.companyId === cid) : stockItems;
  const warehouses      = [...new Set(companyStock.map(s => s.warehouseName))].filter(Boolean);

  const filtered = companyStock.filter(s => {
    const prod = companyProducts.find(p => p.id === s.productId);
    const matchSearch = (prod?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (prod?.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchWh = warehouseFilter === "all" || s.warehouseName === warehouseFilter;
    return matchSearch && matchWh;
  });

  const totalItems     = companyStock.reduce((s, i) => s + i.quantity, 0);
  const totalAvailable = companyStock.reduce((s, i) => s + i.availableQty, 0);
  const totalReserved  = companyStock.reduce((s, i) => s + i.reservedQty, 0);

  const lowStockItems = companyStock.filter(s => {
    const prod = companyProducts.find(p => p.id === s.productId);
    return prod && prod.reorderLevel > 0 && s.availableQty <= prod.reorderLevel;
  });

  const totalStockValue = companyStock.reduce((sum, s) => {
    const prod = companyProducts.find(p => p.id === s.productId);
    return sum + (prod ? prod.costPrice * s.quantity : 0);
  }, 0);

  const receiveStock = async () => {
    if (!receiveForm.productId)  { setReceiveError("Select a product."); return; }
    if (!receiveForm.warehouseName.trim()) { setReceiveError("Enter a warehouse name."); return; }
    if (!receiveForm.qty || Number(receiveForm.qty) <= 0) { setReceiveError("Enter a valid quantity."); return; }
    const qty = Number(receiveForm.qty);
    const body: StockItem = {
      id: `stk-${Date.now()}`, productId: receiveForm.productId, companyId: cid,
      warehouseName: receiveForm.warehouseName.trim(),
      quantity: qty, reservedQty: 0, availableQty: qty,
    };
    await fetch("/api/inventory/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await reload();
    setShowReceiveDialog(false);
    setReceiveForm({ productId: "", warehouseName: "", qty: "", reference: "" });
  };

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
              const prod = companyProducts.find(p => p.id === s.productId);
              return (
                <span key={s.id} className="text-xs bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1.5 rounded-full font-medium">
                  {prod?.name} @ {s.warehouseName} — {s.availableQty} left
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Warehouse Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {warehouses.map(whName => {
          const whStock = companyStock.filter(s => s.warehouseName === whName);
          const whValue = whStock.reduce((sum, s) => {
            const prod = companyProducts.find(p => p.id === s.productId);
            return sum + (prod ? prod.costPrice * s.quantity : 0);
          }, 0);
          const whUnits = whStock.reduce((s, i) => s + i.quantity, 0);
          return (
            <div key={whName} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{whName}</h3>
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
                {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
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
              const prod = companyProducts.find(p => p.id === si.productId);
              if (!prod) return null;
              const stockPct = prod.reorderLevel > 0 ? Math.round((si.availableQty / (prod.reorderLevel * 3)) * 100) : 100;
              const isLow = prod.reorderLevel > 0 && si.availableQty <= prod.reorderLevel;
              const stockValue = prod.costPrice * si.quantity;
              return (
                <TableRow key={si.id}>
                  <TableCell className="font-medium text-gray-900">{prod.name}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{prod.sku}</TableCell>
                  <TableCell className="text-sm text-gray-600">{si.warehouseName}</TableCell>
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

      {/* Transfer Dialog (UI only — no API for transfers yet) */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transfer Stock</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Product</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {companyProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">From Warehouse</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">To Warehouse</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
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
      <Dialog open={showReceiveDialog} onOpenChange={v => { if (!v) { setShowReceiveDialog(false); setReceiveError(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Receive Stock (GRN)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {receiveError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{receiveError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Product *</label>
              <Select value={receiveForm.productId} onValueChange={v => setReceiveForm(p => ({ ...p, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {companyProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Warehouse Name *</label>
                <Input placeholder="e.g. Main Warehouse" value={receiveForm.warehouseName} onChange={e => setReceiveForm(p => ({ ...p, warehouseName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Quantity Received *</label>
                <Input type="number" placeholder="0" value={receiveForm.qty} onChange={e => setReceiveForm(p => ({ ...p, qty: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reference / PO Number</label>
              <Input placeholder="PO-2026-XXX" value={receiveForm.reference} onChange={e => setReceiveForm(p => ({ ...p, reference: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>Cancel</Button>
            <Button onClick={receiveStock}>Confirm Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
