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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserCheck, Plus, Search, Mail, Phone, Building2, TrendingUp, Eye, Edit } from "lucide-react";
import { customers, invoices } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);

  const companyCustomers = customers.filter(c => c.companyId === "c1");
  const filtered = companyCustomers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const activeCount = companyCustomers.filter(c => c.status === "active").length;
  const businessCount = companyCustomers.filter(c => c.type === "business").length;
  const totalRevenue = companyCustomers.reduce((s, c) => s + c.totalRevenue, 0);

  return (
    <MainLayout>
      <PageHeader
        title="Customers"
        subtitle="Manage customer profiles, history and communications"
        icon={UserCheck}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Customers" value={companyCustomers.length} icon={UserCheck} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Active" value={activeCount} icon={UserCheck} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Business Clients" value={businessCount} icon={Building2} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-600" trend={14} />
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list">Customer List</TabsTrigger>
            <TabsTrigger value="cards">Card View</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(cust => {
                  const custInvoices = invoices.filter(i => i.customerId === cust.id);
                  return (
                    <TableRow key={cust.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                              {getInitials(cust.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{cust.name}</p>
                            {cust.company && <p className="text-xs text-gray-400">{cust.company}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700">{cust.email}</p>
                        <p className="text-xs text-gray-400">{cust.phone}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          cust.type === "business" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {cust.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{cust.address}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{formatCurrency(cust.totalRevenue)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(cust.createdAt)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(cust.status)}`}>
                          {cust.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(cust)}>
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

        <TabsContent value="cards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(cust => {
              const custInvoices = invoices.filter(i => i.customerId === cust.id);
              return (
                <div key={cust.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(cust)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                          {getInitials(cust.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900">{cust.name}</p>
                        {cust.company && <p className="text-xs text-gray-400">{cust.company}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(cust.status)}`}>
                      {cust.status}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-3.5 h-3.5" />{cust.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5" />{cust.phone}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">Total Revenue</p>
                      <p className="font-bold text-gray-900">{formatCurrency(cust.totalRevenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Invoices</p>
                      <p className="font-bold text-gray-900">{custInvoices.length}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      cust.type === "business" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {cust.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Customer Profile</DialogTitle></DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="text-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                    {getInitials(selectedCustomer.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedCustomer.name}</h3>
                  {selectedCustomer.company && <p className="text-gray-500">{selectedCustomer.company}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedCustomer.status)}`}>
                    {selectedCustomer.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Email", value: selectedCustomer.email },
                  { label: "Phone", value: selectedCustomer.phone },
                  { label: "Address", value: selectedCustomer.address },
                  { label: "Type", value: selectedCustomer.type },
                  { label: "Total Revenue", value: formatCurrency(selectedCustomer.totalRevenue) },
                  { label: "Customer Since", value: formatDate(selectedCustomer.createdAt) },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-medium text-gray-800 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Recent Invoices</p>
                {invoices.filter(i => i.customerId === selectedCustomer.id).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
                    <span className="font-mono text-blue-700">{inv.invoiceNumber}</span>
                    <span className="text-gray-600">{formatCurrency(inv.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(inv.status)}`}>{inv.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Close</Button>
            <Button>Edit Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
              <Input placeholder="Customer name" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company (optional)</label>
              <Input placeholder="Company name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <Input type="email" placeholder="email@domain.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input placeholder="+255 7XX XXX XXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Address</label>
                <Input placeholder="City, Country" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Add Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
