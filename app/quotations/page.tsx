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
import { FileText, Plus, Download, Eye, Search, DollarSign, CheckCircle, Clock, Send } from "lucide-react";
import { quotations, customers, salesLeads } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewQuote, setViewQuote] = useState<typeof quotations[0] | null>(null);

  const companyQuotes = quotations.filter(q => q.companyId === "c1");
  const filtered = companyQuotes.filter(q =>
    q.quoteNumber.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = companyQuotes.reduce((s, q) => s + q.total, 0);
  const accepted = companyQuotes.filter(q => q.status === "accepted").length;
  const sent = companyQuotes.filter(q => q.status === "sent").length;

  return (
    <MainLayout>
      <PageHeader
        title="Quotations"
        subtitle="Create and manage sales quotations and proposals"
        icon={FileText}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Quotation
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Quoted" value={formatCurrency(totalValue)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Accepted" value={accepted} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Pending" value={sent} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Total Quotes" value={companyQuotes.length} icon={FileText} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Quotation Register</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(quote => {
              const cust = customers.find(c => c.id === quote.customerId);
              const lead = salesLeads.find(l => l.id === quote.leadId);
              const clientName = cust?.name || lead?.name || "—";
              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-mono font-medium text-blue-700">{quote.quoteNumber}</TableCell>
                  <TableCell className="font-medium text-gray-800">{clientName}</TableCell>
                  <TableCell className="text-sm text-gray-500">{quote.items.length} items</TableCell>
                  <TableCell className="text-gray-700">{formatCurrency(quote.subtotal)}</TableCell>
                  <TableCell className="text-orange-600">
                    {quote.discount > 0 ? `-${formatCurrency(quote.discount)}` : "—"}
                  </TableCell>
                  <TableCell className="font-bold text-gray-900">{formatCurrency(quote.total)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(quote.validUntil)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewQuote(quote)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4 text-gray-400" />
                      </Button>
                      {quote.status === "draft" && (
                        <Button variant="ghost" size="icon">
                          <Send className="w-4 h-4 text-blue-500" />
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

      {/* View Quote Dialog */}
      <Dialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Quotation {viewQuote?.quoteNumber}</DialogTitle></DialogHeader>
          {viewQuote && (() => {
            const cust = customers.find(c => c.id === viewQuote.customerId);
            const lead = salesLeads.find(l => l.id === viewQuote.leadId);
            const clientName = cust?.name || lead?.name || "—";
            return (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Prepared For</p>
                    <p className="font-bold text-gray-900">{clientName}</p>
                    <p className="text-xs text-gray-400 mt-1">Valid Until: {formatDate(viewQuote.validUntil)}</p>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium h-fit ${getStatusColor(viewQuote.status)}`}>
                    {viewQuote.status.toUpperCase()}
                  </span>
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
                    {viewQuote.items.map((item, i) => (
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
                  <div className="w-60 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(viewQuote.subtotal)}</span></div>
                    {viewQuote.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-orange-600">-{formatCurrency(viewQuote.discount)}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Tax (18%)</span><span>{formatCurrency(viewQuote.tax)}</span></div>
                    <div className="flex justify-between font-bold border-t border-gray-200 pt-1.5 mt-1">
                      <span>Total</span><span className="text-blue-700">{formatCurrency(viewQuote.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewQuote(null)}>Close</Button>
            <Button><Download className="w-4 h-4 mr-2" />Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Quote Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Quotation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Client</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {customers.filter(c => c.companyId === "c1").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Valid Until</label>
              <Input type="date" />
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
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs">+ Add Item</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Discount (TZS)</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tax Rate (%)</label>
                <Input type="number" defaultValue="18" />
              </div>
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
