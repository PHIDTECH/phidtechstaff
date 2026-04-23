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
import { Package, Plus, Search, DollarSign, Tag, BarChart3, Edit, Eye, Trash2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SESSION_KEY = "phidtech_session";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface Session { id: string; name: string; isSuperAdmin: boolean; companyId: string; }
interface Product {
  id: string; companyId: string; name: string; sku: string;
  category: string; unit: string; costPrice: number; sellingPrice: number;
  reorderLevel: number; createdAt: string;
}
interface StockItem {
  id: string; productId: string; companyId: string;
  warehouseName: string; quantity: number; reservedQty: number; availableQty: number;
}

const emptyForm = () => ({
  name: "", sku: "", category: "", unit: "Unit",
  costPrice: "", sellingPrice: "", reorderLevel: "0",
});

export default function ProductsPage() {
  const [products, setProducts]           = useState<Product[]>([]);
  const [stockItems, setStockItems]       = useState<StockItem[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDialog, setShowDialog]       = useState(false);
  const [editItem, setEditItem]           = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

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
  const categories      = [...new Set(companyProducts.map(p => p.category))];

  const filtered = companyProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalProducts   = companyProducts.length;
  const totalStockValue = companyStock.reduce((sum, s) => {
    const prod = companyProducts.find(p => p.id === s.productId);
    return sum + (prod ? prod.costPrice * s.quantity : 0);
  }, 0);
  const avgMargin = companyProducts.length > 0 ? Math.round(
    companyProducts.reduce((s, p) => s + ((p.sellingPrice - p.costPrice) / (p.sellingPrice || 1) * 100), 0) / companyProducts.length
  ) : 0;

  const getStockQty = (productId: string) =>
    companyStock.filter(s => s.productId === productId).reduce((s, i) => s + i.availableQty, 0);

  const getLowStockStatus = (product: Product) => {
    const qty = getStockQty(product.id);
    if (product.reorderLevel === 0) return null;
    if (qty <= 0) return "out-of-stock";
    if (qty <= product.reorderLevel) return "low-stock";
    return "in-stock";
  };

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const openAdd = () => { setEditItem(null); setForm(emptyForm()); setFormError(""); setShowDialog(true); };

  const openEdit = (p: Product) => {
    setEditItem(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, unit: p.unit,
      costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice), reorderLevel: String(p.reorderLevel) });
    setFormError(""); setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.name.trim()) { setFormError("Product name is required."); return; }
    if (!form.sku.trim())  { setFormError("SKU is required."); return; }
    if (editItem) {
      const body = { ...editItem, name: form.name.trim(), sku: form.sku.trim(),
        category: form.category, unit: form.unit,
        costPrice: Number(form.costPrice)||0, sellingPrice: Number(form.sellingPrice)||0,
        reorderLevel: Number(form.reorderLevel)||0 };
      await fetch("/api/inventory/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      const body: Product = {
        id: `prod-${Date.now()}`, companyId: cid,
        name: form.name.trim(), sku: form.sku.trim(),
        category: form.category, unit: form.unit,
        costPrice: Number(form.costPrice)||0, sellingPrice: Number(form.sellingPrice)||0,
        reorderLevel: Number(form.reorderLevel)||0,
        createdAt: new Date().toISOString(),
      };
      await fetch("/api/inventory/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    await reload(); setShowDialog(false);
  };

  const deleteProduct = async (id: string) => {
    await fetch(`/api/inventory/products?id=${id}`, { method: "DELETE" });
    await reload(); setDeleteId(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Products & SKUs"
        subtitle="Manage product catalogue, pricing and stock levels"
        icon={Package}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Products" value={totalProducts} icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Stock Value" value={formatCurrency(totalStockValue)} icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600" subtitle="At cost price" />
        <StatCard title="Categories" value={categories.length} icon={Tag} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Avg. Margin" value={`${avgMargin}%`} icon={BarChart3} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Product Catalogue</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
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
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Package className="w-10 h-10 text-gray-200" />
            <p className="font-semibold text-gray-700">No products yet</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Product</Button>
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(prod => {
              const stockQty = getStockQty(prod.id);
              const stockStatus = getLowStockStatus(prod);
              const margin = prod.sellingPrice > 0 ? Math.round(((prod.sellingPrice - prod.costPrice) / prod.sellingPrice) * 100) : 0;
              return (
                <TableRow key={prod.id}>
                  <TableCell className="font-medium text-gray-900">{prod.name}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{prod.sku}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {prod.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{prod.unit}</TableCell>
                  <TableCell className="text-gray-700">{formatCurrency(prod.costPrice)}</TableCell>
                  <TableCell className="font-semibold text-gray-900">{formatCurrency(prod.sellingPrice)}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold ${margin >= 50 ? "text-green-600" : margin >= 30 ? "text-yellow-600" : "text-red-500"}`}>
                      {margin}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {stockStatus === null ? (
                      <span className="text-xs text-gray-400">Service</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{stockQty}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          stockStatus === "in-stock" ? "bg-green-100 text-green-800" :
                          stockStatus === "low-stock" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {stockStatus?.replace("-", " ")}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(prod)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(prod)}>
                        <Edit className="w-4 h-4 text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(prod.id)}>
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

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Product Details</DialogTitle></DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <h3 className="font-bold text-gray-900 text-lg">{selectedProduct.name}</h3>
                <p className="font-mono text-sm text-gray-500 mt-0.5">{selectedProduct.sku}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Category", value: selectedProduct.category },
                  { label: "Unit", value: selectedProduct.unit },
                  { label: "Cost Price", value: formatCurrency(selectedProduct.costPrice) },
                  { label: "Selling Price", value: formatCurrency(selectedProduct.sellingPrice) },
                  { label: "Gross Margin", value: `${Math.round(((selectedProduct.sellingPrice - selectedProduct.costPrice) / selectedProduct.sellingPrice) * 100)}%` },
                  { label: "Reorder Level", value: selectedProduct.reorderLevel > 0 ? `${selectedProduct.reorderLevel} units` : "N/A" },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-semibold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Stock Locations</p>
                {companyStock.filter(s => s.productId === selectedProduct.id).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{s.warehouseName}</span>
                    <span className="font-semibold text-gray-900">{s.availableQty} available</span>
                  </div>
                ))}
                {companyStock.filter(s => s.productId === selectedProduct.id).length === 0 && (
                  <p className="text-sm text-gray-400">No stock records</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>Close</Button>
            <Button onClick={() => { openEdit(selectedProduct!); setSelectedProduct(null); }}>Edit Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Product Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Product" : "Add New Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Product Name *</label>
              <Input placeholder="Product name" value={form.name} onChange={e => sf({ name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">SKU *</label>
                <Input placeholder="e.g. PRD-001" value={form.sku} onChange={e => sf({ sku: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Input placeholder="e.g. Software, Hardware" value={form.category} onChange={e => sf({ category: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit</label>
                <Input placeholder="e.g. Unit, License, Hour" value={form.unit} onChange={e => sf({ unit: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reorder Level</label>
                <Input type="number" placeholder="0" value={form.reorderLevel} onChange={e => sf({ reorderLevel: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Cost Price (TZS)</label>
                <Input type="number" placeholder="0" value={form.costPrice} onChange={e => sf({ costPrice: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Selling Price (TZS)</label>
                <Input type="number" placeholder="0" value={form.sellingPrice} onChange={e => sf({ sellingPrice: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add Product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Product</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this product? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteProduct(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
