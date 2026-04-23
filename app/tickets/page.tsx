"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Plus, Search, AlertCircle, Clock, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SESSION_KEY = "phidtech_session";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; }
interface Customer { id: string; name: string; email: string; companyId: string; }
interface Ticket {
  id: string; companyId: string; customerId: string;
  subject: string; description: string;
  priority: "low"|"medium"|"high"|"critical";
  status: "open"|"in-progress"|"resolved"|"closed";
  assignedTo?: string; createdAt: string; resolvedAt?: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const emptyForm = () => ({
  customerId: "", subject: "", description: "",
  priority: "medium" as Ticket["priority"],
  assignedTo: "",
});

export default function TicketsPage() {
  usePermissionGuard("sales");
  const [tickets, setTickets]             = useState<Ticket[]>([]);
  const [customers, setCustomers]         = useState<Customer[]>([]);
  const [staff, setStaff]                 = useState<StaffUser[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [showDialog, setShowDialog]       = useState(false);
  const [editItem, setEditItem]           = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");
  const [response, setResponse]           = useState("");

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = getActiveCid(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    try {
      const [tr, cr, ur] = await Promise.all([
        fetch("/api/tickets", { cache: "no-store" }),
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/users",    { cache: "no-store" }),
      ]);
      if (tr.ok) setTickets(await tr.json());
      if (cr.ok) setCustomers(await cr.json());
      if (ur.ok) setStaff(await ur.json());
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  const cid = cidRef.current || activeCompanyId;
  const companyTickets  = cid ? tickets.filter(t => t.companyId === cid) : tickets;
  const companyCustomers = cid ? customers.filter(c => c.companyId === cid) : customers;
  const companyStaff    = cid ? staff.filter(u => u.companyId === cid) : staff;

  const filtered = companyTickets.filter(t => {
    const cust = companyCustomers.find(c => c.id === t.customerId);
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      (cust?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const open       = companyTickets.filter(t => t.status === "open").length;
  const inProgress = companyTickets.filter(t => t.status === "in-progress").length;
  const resolved   = companyTickets.filter(t => t.status === "resolved").length;
  const critical   = companyTickets.filter(t => t.priority === "critical").length;

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (t: Ticket) => {
    setEditItem(t);
    setForm({ customerId: t.customerId, subject: t.subject, description: t.description, priority: t.priority, assignedTo: t.assignedTo ?? "" });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = async () => {
    if (!form.subject.trim()) { setFormError("Subject is required."); return; }
    if (editItem) {
      const body = { ...editItem, ...form };
      await fetch("/api/tickets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      const body: Ticket = {
        id: `tkt-${Date.now()}`, companyId: cid,
        customerId: form.customerId, subject: form.subject.trim(),
        description: form.description, priority: form.priority,
        status: "open", assignedTo: form.assignedTo || undefined,
        createdAt: new Date().toISOString(),
      };
      await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    await reload();
    setShowDialog(false);
  };

  const resolveTicket = async (ticket: Ticket) => {
    const body = { ...ticket, status: "resolved" as const, resolvedAt: new Date().toISOString() };
    await fetch("/api/tickets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await reload();
    setSelectedTicket(null);
  };

  const deleteTicket = async (id: string) => {
    await fetch(`/api/tickets?id=${id}`, { method: "DELETE" });
    await reload();
    setDeleteId(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Support Tickets"
        subtitle="Manage customer support requests and resolutions"
        icon={HelpCircle}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> New Ticket
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Open Tickets" value={open} icon={AlertCircle} iconBg="bg-orange-50" iconColor="text-orange-600" />
        <StatCard title="In Progress" value={inProgress} icon={Clock} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Critical" value={critical} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">All Tickets</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <HelpCircle className="w-10 h-10 text-gray-200" />
            <p className="font-semibold text-gray-700">No tickets found</p>
            <p className="text-sm text-gray-400">Click "New Ticket" to create one.</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />New Ticket</Button>
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(ticket => {
              const cust     = companyCustomers.find(c => c.id === ticket.customerId);
              const assignee = companyStaff.find(u => u.id === ticket.assignedTo);
              return (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedTicket(ticket)}>
                  <TableCell>
                    <p className="font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{ticket.description}</p>
                  </TableCell>
                  <TableCell>
                    {cust ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                            {getInitials(cust.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-700">{cust.name}</span>
                      </div>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityColors[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-[10px]">{getInitials(assignee.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-700">{assignee.name}</span>
                      </div>
                    ) : <span className="text-sm text-gray-400">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(ticket.createdAt)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {ticket.resolvedAt ? formatDate(ticket.resolvedAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      {(ticket.status === "open" || ticket.status === "in-progress") && (
                        <Button variant="ghost" size="sm" className="text-green-600 text-xs" onClick={() => resolveTicket(ticket)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(ticket)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(ticket.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ticket Details</DialogTitle></DialogHeader>
          {selectedTicket && (() => {
            const cust     = companyCustomers.find(c => c.id === selectedTicket.customerId);
            const assignee = companyStaff.find(u => u.id === selectedTicket.assignedTo);
            return (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selectedTicket.subject}</h3>
                  <p className="text-gray-500 text-sm mt-1">{selectedTicket.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Customer",    value: cust?.name || "—" },
                    { label: "Priority",    value: selectedTicket.priority },
                    { label: "Status",      value: selectedTicket.status },
                    { label: "Assigned To", value: assignee?.name || "Unassigned" },
                    { label: "Created",     value: formatDate(selectedTicket.createdAt) },
                    { label: "Resolved",    value: selectedTicket.resolvedAt ? formatDate(selectedTicket.resolvedAt) : "Pending" },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                      <p className="font-medium text-gray-800 capitalize">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Add Response</p>
                  <Textarea placeholder="Type your response..." rows={3} value={response} onChange={e => setResponse(e.target.value)} />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>Close</Button>
            {selectedTicket && (selectedTicket.status === "open" || selectedTicket.status === "in-progress") && (
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => resolveTicket(selectedTicket)}>
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Ticket Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Ticket" : "Create Support Ticket"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Customer</label>
              <Select value={form.customerId} onValueChange={v => sf({ customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {companyCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject *</label>
              <Input placeholder="Brief subject line" value={form.subject} onChange={e => sf({ subject: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Textarea placeholder="Describe the issue..." rows={3} value={form.description} onChange={e => sf({ description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Priority</label>
                <Select value={form.priority} onValueChange={v => sf({ priority: v as Ticket["priority"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To</label>
                <Select value={form.assignedTo} onValueChange={v => sf({ assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Assign agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {companyStaff.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Create Ticket"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Ticket</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this ticket? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteTicket(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
