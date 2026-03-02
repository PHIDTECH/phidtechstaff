"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserCheck, Plus, Search, Mail, Phone, Building2, TrendingUp, Eye, Edit, Trash2, AlertCircle } from "lucide-react";
import { formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ACTIVE_KEY    = "phidtech_active_company";
const COMPANIES_KEY = "phidtech_companies";
const SESSION_KEY   = "phidtech_session";
const CUSTOMERS_KEY = "phidtech_customers";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function lsStr(key: string, fallback = "") {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

interface Session {
  id: string; name: string; role: string; position: string;
  isSuperAdmin: boolean; companyId: string; permissions?: string[];
}
interface Company { id: string; name: string; parentId?: string; }
interface Customer {
  id: string;
  companyId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  type: string;
  address: string;
  serviceProduct: string;
  date: string;
  branch: string;
  status: string;
  totalRevenue: number;
  createdAt: string;
}

const emptyForm = () => ({
  name: "", company: "", email: "", phone: "",
  type: "business", address: "",
  serviceProduct: "", date: "", branch: "head_office",
  status: "active",
});

function formatDate(d: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function CustomersPage() {
  const [session, setSession]             = useState<Session | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [companies, setCompanies]         = useState<Company[]>([]);
  const [customers, setCustomers]         = useState<Customer[]>([]);
  const [search, setSearch]               = useState("");
  const [typeFilter, setTypeFilter]       = useState("all");
  const [branchFilter, setBranchFilter]   = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer]   = useState<Customer | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");
  const [deleteId, setDeleteId]           = useState<string | null>(null);

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setActiveCompanyId(cid);
    setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
    setCustomers(lsGet<Customer[]>(CUSTOMERS_KEY, []));
  };

  useEffect(() => {
    reload();
    window.addEventListener("phidtech_companies_updated", reload);
    return () => window.removeEventListener("phidtech_companies_updated", reload);
  }, []);

  // SuperAdmin: see ALL customers across all companies
  // Staff: see only their company's customers
  const visibleCustomers = session?.isSuperAdmin
    ? customers
    : customers.filter(c => c.companyId === activeCompanyId);

  const filtered = visibleCustomers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.serviceProduct || "").toLowerCase().includes(q);
    const matchType   = typeFilter === "all" || c.type === typeFilter;
    const matchBranch = branchFilter === "all" || c.branch === branchFilter;
    return matchSearch && matchType && matchBranch;
  });

  const activeCount   = visibleCustomers.filter(c => c.status === "active").length;
  const businessCount = visibleCustomers.filter(c => c.type === "business").length;
  const totalRevenue  = visibleCustomers.reduce((s, c) => s + (c.totalRevenue || 0), 0);

  const getCompanyName = (cid: string) =>
    companies.find(c => c.id === cid)?.name ?? cid;

  const openAdd = () => {
    setForm({ ...emptyForm(), branch: "head_office" });
    setFormError("");
    setShowAddDialog(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({
      name: c.name, company: c.company, email: c.email, phone: c.phone,
      type: c.type, address: c.address, serviceProduct: c.serviceProduct,
      date: c.date, branch: c.branch, status: c.status,
    });
    setFormError("");
    setShowEditDialog(true);
  };

  const saveCustomer = (isEdit: boolean) => {
    if (!form.name.trim()) { setFormError("Customer name is required."); return; }
    if (isEdit && editCustomer) {
      const updated = customers.map(c => c.id === editCustomer.id ? {
        ...c, ...form, totalRevenue: c.totalRevenue,
      } : c);
      lsSet(CUSTOMERS_KEY, updated);
      setCustomers(updated);
      setShowEditDialog(false);
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        companyId: activeCompanyId,
        name: form.name.trim(), company: form.company.trim(),
        email: form.email.trim(), phone: form.phone.trim(),
        type: form.type, address: form.address.trim(),
        serviceProduct: form.serviceProduct.trim(),
        date: form.date, branch: form.branch,
        status: form.status,
        totalRevenue: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const updated = [...customers, newCust];
      lsSet(CUSTOMERS_KEY, updated);
      setCustomers(updated);
      setShowAddDialog(false);
    }
  };

  const deleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    lsSet(CUSTOMERS_KEY, updated);
    setCustomers(updated);
    setDeleteId(null);
  };

  const branchLabel = (b: string) => b === "head_office" ? "Head Office" : b || "—";

  return (
    <MainLayout>
      <PageHeader
        title="Customers"
        subtitle="Manage customer profiles, history and communications"
        icon={UserCheck}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Customers" value={visibleCustomers.length} icon={UserCheck} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Active" value={activeCount} icon={UserCheck} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Business Clients" value={businessCount} icon={Building2} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list">Customer List</TabsTrigger>
            <TabsTrigger value="cards">Card View</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="head_office">Head Office</SelectItem>
                <SelectItem value="branch">Branch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <UserCheck className="w-7 h-7 text-blue-400" />
                </div>
                <p className="font-semibold text-gray-700">No customers found</p>
                <p className="text-sm text-gray-400">Click "Add Customer" to add the first one.</p>
                <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Service / Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                    {session?.isSuperAdmin && <TableHead>Company</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(cust => (
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
                        <p className="text-sm text-gray-700">{cust.email || "—"}</p>
                        <p className="text-xs text-gray-400">{cust.phone || "—"}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 max-w-[160px] truncate" title={cust.serviceProduct}>
                        {cust.serviceProduct || "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          cust.type === "business" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                        }`}>{cust.type}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          cust.branch === "head_office" ? "bg-gray-100 text-gray-700" : "bg-amber-50 text-amber-700"
                        }`}>{branchLabel(cust.branch)}</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(cust.date) || formatDate(cust.createdAt)}</TableCell>
                      {session?.isSuperAdmin && (
                        <TableCell className="text-xs text-gray-500">{getCompanyName(cust.companyId)}</TableCell>
                      )}
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(cust.status)}`}>
                          {cust.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(cust)} title="View">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cust)} title="Edit">
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(cust.id)} title="Delete">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(cust => (
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
                <div className="space-y-1.5 mb-3">
                  {cust.email && <div className="flex items-center gap-2 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" />{cust.email}</div>}
                  {cust.phone && <div className="flex items-center gap-2 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" />{cust.phone}</div>}
                  {cust.serviceProduct && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="truncate">{cust.serviceProduct}</span>
                    </div>
                  )}
                  {cust.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Building2 className="w-3.5 h-3.5" />{cust.address}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Branch</p>
                    <p className="text-xs font-medium text-gray-700">{branchLabel(cust.branch)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Date</p>
                    <p className="text-xs font-medium text-gray-700">{formatDate(cust.date) || "—"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cust.type === "business" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                  }`}>{cust.type}</span>
                </div>
                {session?.isSuperAdmin && (
                  <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-50 pt-2">{getCompanyName(cust.companyId)}</p>
                )}
              </div>
            ))}
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
                  {selectedCustomer.company && <p className="text-gray-500 text-sm">{selectedCustomer.company}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedCustomer.status)}`}>
                    {selectedCustomer.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Email", value: selectedCustomer.email || "—" },
                  { label: "Phone", value: selectedCustomer.phone || "—" },
                  { label: "Address", value: selectedCustomer.address || "—" },
                  { label: "Type", value: selectedCustomer.type },
                  { label: "Service / Product", value: selectedCustomer.serviceProduct || "—" },
                  { label: "Branch / Office", value: branchLabel(selectedCustomer.branch) },
                  { label: "Date", value: formatDate(selectedCustomer.date) },
                  { label: "Customer Since", value: formatDate(selectedCustomer.createdAt) },
                  ...(session?.isSuperAdmin ? [{ label: "Company", value: getCompanyName(selectedCustomer.companyId) }] : []),
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-medium text-gray-800 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Close</Button>
            <Button onClick={() => { if (selectedCustomer) { openEdit(selectedCustomer); setSelectedCustomer(null); } }}>
              <Edit className="w-4 h-4 mr-2" /> Edit Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Customer Dialog */}
      {[
        { open: showAddDialog, onClose: () => setShowAddDialog(false), isEdit: false, title: "Add New Customer" },
        { open: showEditDialog, onClose: () => setShowEditDialog(false), isEdit: true, title: "Edit Customer" },
      ].map(({ open, onClose, isEdit, title }) => (
        <Dialog key={title} open={open} onOpenChange={v => { if (!v) onClose(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                <Input placeholder="Customer name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company / Organisation (optional)</label>
                <Input placeholder="Company name" value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                  <Input type="email" placeholder="email@domain.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                  <Input placeholder="+255 7XX XXX XXX" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Service / Product</label>
                <Input placeholder="e.g. Web Development, Office Supplies" value={form.serviceProduct} onChange={e => setForm(f => ({...f, serviceProduct: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date</label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Branch / Office</label>
                  <Select value={form.branch} onValueChange={v => setForm(f => ({...f, branch: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="head_office">Head Office</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Address</label>
                <Input placeholder="City, Country" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => saveCustomer(isEdit)}>{isEdit ? "Save Changes" : "Add Customer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Customer</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">Are you sure you want to delete this customer? This cannot be undone.</p>
            {deleteId && (() => {
              const c = customers.find(x => x.id === deleteId);
              return c ? (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 text-sm">
                  <p className="font-semibold text-red-800">{c.name}</p>
                  <p className="text-red-600">{c.company || c.email}</p>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteCustomer(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
