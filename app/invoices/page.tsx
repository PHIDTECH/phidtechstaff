"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Search, Download, Eye, DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { invoices, customers } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<typeof invoices[0] | null>(null);

  const companyInvoices = invoices.filter(i => i.companyId === "c1");
  const filtered = companyInvoices.filter(i => {
    const cust = customers.find(c => c.id === i.customerId);
    const matchSearch = i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      cust?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paid = companyInvoices.filter(i => i.status === "paid");
  const unpaid = companyInvoices.filter(i => i.status === "sent");
  const overdue = companyInvoices.filter(i => i.status === "overdue");
  const totalRevenue = paid.reduce((s, i) => s + i.total, 0);
  const totalOutstanding = [...unpaid, ...overdue].reduce((s, i) => s + i.total, 0);

  return (
    <MainLayout>
      <PageHeader
        title="Invoices"
        subtitle="Manage client invoices and payments"
        icon={FileText}
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Invoice
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Invoiced" value={formatCurrency(companyInvoices.reduce((s,i)=>s+i.total,0))} icon={FileText} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Collected" value={formatCurrency(totalRevenue)} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" subtitle={`${paid.length} invoices`} />
        <StatCard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" subtitle={`${unpaid.length} pending`} />
        <StatCard title="Overdue" value={formatCurrency(overdue.reduce((s,i)=>s+i.total,0))} icon={AlertCircle} iconBg="bg-red-50" iconColor="text-red-500" subtitle={`${overdue.length} invoices`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Invoice Register</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Tax (18%)</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(inv => {
              const cust = customers.find(c => c.id === inv.customerId);
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium text-blue-700">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-800">{cust?.name}</p>
                    <p className="text-xs text-gray-400">{cust?.address}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(inv.issueDate)}</TableCell>
                  <TableCell className={`text-sm ${inv.status === "overdue" ? "text-red-600 font-medium" : "text-gray-600"}`}>
                    {formatDate(inv.dueDate)}
                  </TableCell>
                  <TableCell className="text-gray-700">{formatCurrency(inv.subtotal)}</TableCell>
                  <TableCell className="text-gray-500">{formatCurrency(inv.tax)}</TableCell>
                  <TableCell className="font-bold text-gray-900">{formatCurrency(inv.total)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4 text-gray-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Invoice {viewInvoice?.invoiceNumber}</DialogTitle></DialogHeader>
          {viewInvoice && (() => {
            const cust = customers.find(c => c.id === viewInvoice.customerId);
            return (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Bill To</p>
                    <p className="font-bold text-gray-900">{cust?.name}</p>
                    <p className="text-sm text-gray-500">{cust?.email}</p>
                    <p className="text-sm text-gray-500">{cust?.address}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(viewInvoice.status)}`}>
                      {viewInvoice.status.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">Issued: {formatDate(viewInvoice.issueDate)}</p>
                    <p className="text-xs text-gray-400">Due: {formatDate(viewInvoice.dueDate)}</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end">
                  <div className="w-56 space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(viewInvoice.subtotal)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Tax (18%)</span><span>{formatCurrency(viewInvoice.tax)}</span></div>
                    <div className="flex justify-between font-bold border-t border-gray-200 pt-1.5 mt-1">
                      <span>Total</span>
                      <span className="text-blue-700">{formatCurrency(viewInvoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewInvoice(null)}>Close</Button>
            <Button><Download className="w-4 h-4 mr-2" />Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Invoice Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Customer</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.filter(c => c.companyId === "c1").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Issue Date</label>
                <Input type="date" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Due Date</label>
                <Input type="date" />
              </div>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Line Items</p>
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 font-medium">
                <span className="col-span-2">Description</span><span>Qty</span><span>Unit Price</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Item description" className="col-span-2 text-sm" />
                <Input placeholder="1" type="number" className="text-sm" />
                <Input placeholder="0" type="number" className="text-sm" />
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs">+ Add Line Item</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Save Draft</Button>
            <Button onClick={() => setShowAddDialog(false)}>Create & Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
