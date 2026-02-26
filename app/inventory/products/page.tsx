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
import { Package, Plus, Search, DollarSign, Tag, BarChart3, Edit, Eye } from "lucide-react";
import { products, stockItems, warehouses } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);

  const companyProducts = products.filter(p => p.companyId === "c1");
  const categories = [...new Set(companyProducts.map(p => p.category))];

  const filtered = companyProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalProducts = companyProducts.length;
  const totalStockValue = stockItems.filter(s => s.companyId === "c1").reduce((sum, s) => {
    const prod = products.find(p => p.id === s.productId);
    return sum + (prod ? prod.costPrice * s.quantity : 0);
  }, 0);
  const avgMargin = Math.round(
    companyProducts.reduce((s, p) => s + ((p.sellingPrice - p.costPrice) / p.sellingPrice * 100), 0) / companyProducts.length
  );

  const getStockQty = (productId: string) =>
    stockItems.filter(s => s.productId === productId && s.companyId === "c1")
      .reduce((s, i) => s + i.availableQty, 0);

  const getLowStockStatus = (product: typeof products[0]) => {
    const qty = getStockQty(product.id);
    if (product.reorderLevel === 0) return null;
    if (qty <= 0) return "out-of-stock";
    if (qty <= product.reorderLevel) return "low-stock";
    return "in-stock";
  };

  return (
    <MainLayout>
      <PageHeader
        title="Products & SKUs"
        subtitle="Manage product catalogue, pricing and stock levels"
        icon={Package}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
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
              const margin = Math.round(((prod.sellingPrice - prod.costPrice) / prod.sellingPrice) * 100);
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
                <p className="text-sm font-semibold text-gray-700 mb-2">Stock by Warehouse</p>
                {warehouses.filter(w => w.companyId === "c1").map(wh => {
                  const si = stockItems.find(s => s.productId === selectedProduct.id && s.warehouseId === wh.id);
                  return (
                    <div key={wh.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{wh.name}</span>
                      <span className="font-semibold text-gray-900">{si?.availableQty || 0} available</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>Close</Button>
            <Button>Edit Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Product Name</label>
              <Input placeholder="Product name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">SKU</label>
                <Input placeholder="e.g. PRD-001" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Input placeholder="e.g. Software, Hardware" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit</label>
                <Input placeholder="e.g. Unit, License, Hour" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reorder Level</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Cost Price (TZS)</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Selling Price (TZS)</label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
