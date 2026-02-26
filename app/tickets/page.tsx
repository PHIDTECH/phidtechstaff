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
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Plus, Search, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { supportTickets, customers, users } from "@/lib/data";
import { formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<typeof supportTickets[0] | null>(null);

  const companyTickets = supportTickets.filter(t => t.companyId === "c1");
  const filtered = companyTickets.filter(t => {
    const cust = customers.find(c => c.id === t.customerId);
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      cust?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const open = companyTickets.filter(t => t.status === "open").length;
  const inProgress = companyTickets.filter(t => t.status === "in-progress").length;
  const resolved = companyTickets.filter(t => t.status === "resolved").length;
  const critical = companyTickets.filter(t => t.priority === "critical").length;

  const priorityColors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <MainLayout>
      <PageHeader
        title="Support Tickets"
        subtitle="Manage customer support requests and resolutions"
        icon={HelpCircle}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
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
              const cust = customers.find(c => c.id === ticket.customerId);
              const assignee = users.find(u => u.id === ticket.assignedTo);
              return (
                <TableRow key={ticket.id} className="cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                  <TableCell>
                    <p className="font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{ticket.description}</p>
                  </TableCell>
                  <TableCell>
                    {cust && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                            {getInitials(cust.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-700">{cust.name}</span>
                      </div>
                    )}
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
                        <Button variant="ghost" size="sm" className="text-green-600 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
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

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ticket Details</DialogTitle></DialogHeader>
          {selectedTicket && (() => {
            const cust = customers.find(c => c.id === selectedTicket.customerId);
            const assignee = users.find(u => u.id === selectedTicket.assignedTo);
            return (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selectedTicket.subject}</h3>
                  <p className="text-gray-500 text-sm mt-1">{selectedTicket.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Customer", value: cust?.name || "—" },
                    { label: "Priority", value: selectedTicket.priority },
                    { label: "Status", value: selectedTicket.status },
                    { label: "Assigned To", value: assignee?.name || "Unassigned" },
                    { label: "Created", value: formatDate(selectedTicket.createdAt) },
                    { label: "Resolved", value: selectedTicket.resolvedAt ? formatDate(selectedTicket.resolvedAt) : "Pending" },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                      <p className="font-medium text-gray-800 capitalize">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Add Response</p>
                  <Textarea placeholder="Type your response..." rows={3} />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>Close</Button>
            <Button variant="success" className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Ticket Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
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
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
              <Input placeholder="Brief subject line" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Textarea placeholder="Describe the issue..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Priority</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Set priority" /></SelectTrigger>
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
                <Select>
                  <SelectTrigger><SelectValue placeholder="Assign agent" /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.companyId === "c1").map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
