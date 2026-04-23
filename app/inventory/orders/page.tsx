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
import { ShoppingCart, Plus, Search, Eye, CheckCircle, Clock, Package, DollarSign, Trash2, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";

const SESSION_KEY = "phidtech_session";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface Session { id: string; name: string; isSuperAdmin: boolean; companyId: string; }
interface POItem { productId: string; productName: string; quantity: number; unitCost: number; total: number; }
interface PurchaseOrder {
  id: string; companyId: string; vendorId: string; poNumber: string;
  items: POItem[]; total: number;
  status: "draft"|"sent"|"received"|"cancelled";
  orderDate: string; expectedDate: string; receivedDate?: string;
}
interface Vendor { id: string; companyId: string; name: string; email: string; category: string; }
interface Product { id: string; companyId: string; name: string; costPrice: number; }

const emptyForm = () => ({
  vendorId: "", orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: "",
  items: [{ productId: "", productName: "", quantity: "1", unitCost: "" }] as
    { productId: string; productName: string; quantity: string; unitCost: string }[],
});

export default function PurchaseOrdersPage() {
  const [orders, setOrders]               = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors]             = useState<Vendor[]>([]);
  const [products, setProducts]           = useState<Product[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [showDialog, setShowDialog]       = useState(false);
  const [viewPO, setViewPO]               = useState<PurchaseOrder | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = getActiveCid(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    try {
      const [or, vr, pr] = await Promise.all([
        fetch("/api/inventory/orders",   { cache: "no-store" }),
        fetch("/api/vendors",            { cache: "no-store" }),
        fetch("/api/inventory/products", { cache: "no-store" }),
      ]);
      if (or.ok) setOrders(await or.json());
      if (vr.ok) setVendors(await vr.json());
      if (pr.ok) setProducts(await pr.json());
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  const cid = cidRef.current || activeCompanyId;
  const companyPOs      = cid ? orders.filter(p => p.companyId === cid) : orders;
  const companyVendors  = cid ? vendors.filter(v => v.companyId === cid) : vendors;
  const companyProducts = cid ? products.filter(p => p.companyId === cid) : products;

  const filtered = companyPOs.filter(p => {
    const vendor = companyVendors.find(v => v.id === p.vendorId);
    return p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      (vendor?.name ?? "").toLowerCase().includes(search.toLowerCase());
  });

  const totalOrdered = companyPOs.reduce((s, p) => s + p.total, 0);
  const received     = companyPOs.filter(p => p.status === "received").length;
  const pending      = companyPOs.filter(p => p.status === "sent").length;
  const draft        = companyPOs.filter(p => p.status === "draft").length;

  const updatePoItem = (idx: number, field: string, value: string) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "productId") {
      const prod = companyProducts.find(p => p.id === value);
      items[idx].productName = prod?.name ?? "";
      items[idx].unitCost    = String(prod?.costPrice ?? "");
    }
    setForm(f => ({ ...f, items }));
  };

  const addPoItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: "", productName: "", quantity: "1", unitCost: "" }] }));
  const removePoItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const savePO = async (asDraft: boolean) => {
    if (!form.vendorId) { setFormError("Select a vendor."); return; }
    if (!form.expectedDate) { setFormError("Set an expected date."); return; }
    if (form.items.some(it => !it.productId || !it.quantity || !it.unitCost)) {
      setFormError("Complete all line items."); return;
    }
    const poItems: POItem[] = form.items.map(it => ({
      productId: it.productId, productName: it.productName,
      quantity: Number(it.quantity), unitCost: Number(it.unitCost),
      total: Number(it.quantity) * Number(it.unitCost),
    }));
    const total = poItems.reduce((s, i) => s + i.total, 0);
    const body: PurchaseOrder = {
      id: `po-${Date.now()}`, companyId: cid,
      vendorId: form.vendorId,
      poNumber: `PO-${Date.now()}`,
      items: poItems, total,
      status: asDraft ? "draft" : "sent",
      orderDate: form.orderDate, expectedDate: form.expectedDate,
    };
    await fetch("/api/inventory/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await reload(); setShowDialog(false);
  };

  const markReceived = async (po: PurchaseOrder) => {
    const body = { ...po, status: "received" as const, receivedDate: new Date().toISOString() };
    await fetch("/api/inventory/orders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await reload(); setViewPO(null);
  };

  const sendPO = async (po: PurchaseOrder) => {
    const body = { ...po, status: "sent" as const };
    await fetch("/api/inventory/orders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await reload(); setViewPO(null);
  };

  const deletePO = async (id: string) => {
    await fetch(`/api/inventory/orders?id=${id}`, { method: "DELETE" });
    await reload(); setDeleteId(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage purchase orders and goods received notes"
        icon={ShoppingCart}
        actions={
          <Button size="sm" onClick={() => { setForm(emptyForm()); setFormError(""); setShowDialog(true); }}>
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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-gray-400">No purchase orders yet</TableCell>
              </TableRow>
            ) : filtered.map(po => {
              const vendor = companyVendors.find(v => v.id === po.vendorId);
              return (
                <TableRow key={po.id}>
                  <TableCell className="font-mono font-medium text-blue-700">{po.poNumber}</TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-900">{vendor?.name ?? po.vendorId}</p>
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
                        <Button variant="ghost" size="sm" className="text-green-600 text-xs" onClick={() => markReceived(po)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Receive
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(po.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
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
            const vendor = companyVendors.find(v => v.id === viewPO.vendorId);
            return (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Vendor</p>
                    <p className="font-bold text-gray-900">{vendor?.name ?? viewPO.vendorId}</p>
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
            {viewPO?.status === "draft" && <Button onClick={() => sendPO(viewPO)}>Send PO</Button>}
            {viewPO?.status === "sent" && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => markReceived(viewPO)}>
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Received
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Vendor *</label>
              <Select value={form.vendorId} onValueChange={v => setForm(f => ({ ...f, vendorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {companyVendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Order Date</label>
                <Input type="date" value={form.orderDate} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Expected Date *</label>
                <Input type="date" value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} />
              </div>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Order Items</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 font-medium">
                <span>Product</span><span>Qty</span><span>Unit Cost</span>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                  <Select value={item.productId} onValueChange={v => updatePoItem(idx, "productId", v)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Product" /></SelectTrigger>
                    <SelectContent>
                      {companyProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="1" className="text-sm" value={item.quantity}
                    onChange={e => updatePoItem(idx, "quantity", e.target.value)} />
                  <div className="flex gap-1">
                    <Input type="number" placeholder="0" className="text-sm" value={item.unitCost}
                      onChange={e => updatePoItem(idx, "unitCost", e.target.value)} />
                    {form.items.length > 1 && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removePoItem(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={addPoItem}>+ Add Item</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => savePO(true)}>Save Draft</Button>
            <Button onClick={() => savePO(false)}>Create &amp; Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Purchase Order</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this PO? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deletePO(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
