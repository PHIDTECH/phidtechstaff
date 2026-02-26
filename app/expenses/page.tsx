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
import { Receipt, Plus, Search, CheckCircle, Clock, XCircle, DollarSign } from "lucide-react";
import { expenseClaims, users } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const companyExpenses = expenseClaims.filter(e => e.companyId === "c1");
  const filtered = companyExpenses.filter(e => {
    const emp = users.find(u => u.id === e.userId);
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      emp?.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending = companyExpenses.filter(e => e.status === "pending").length;
  const approved = companyExpenses.filter(e => e.status === "approved" || e.status === "paid").length;
  const totalApproved = companyExpenses.filter(e => e.status === "approved" || e.status === "paid").reduce((s,e) => s + e.amount, 0);
  const totalPending = companyExpenses.filter(e => e.status === "pending").reduce((s,e) => s + e.amount, 0);

  const categoryColors: Record<string, string> = {
    Travel: "bg-blue-100 text-blue-800",
    Technology: "bg-purple-100 text-purple-800",
    Marketing: "bg-pink-100 text-pink-800",
    Software: "bg-indigo-100 text-indigo-800",
    Food: "bg-orange-100 text-orange-800",
    Office: "bg-gray-100 text-gray-800",
  };

  return (
    <MainLayout>
      <PageHeader
        title="Expense Claims"
        subtitle="Manage staff expense claims, approvals and reimbursements"
        icon={Receipt}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Submit Claim
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Claims" value={companyExpenses.length} icon={Receipt} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Pending Approval" value={pending} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" subtitle={formatCurrency(totalPending)} />
        <StatCard title="Approved" value={approved} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" subtitle={formatCurrency(totalApproved)} />
        <StatCard title="Total Reimbursed" value={formatCurrency(companyExpenses.filter(e => e.status === "paid").reduce((s,e) => s + e.amount, 0))} icon={DollarSign} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Expense Claims Register</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(claim => {
              const emp = users.find(u => u.id === claim.userId);
              const approver = users.find(u => u.id === claim.approvedBy);
              return (
                <TableRow key={claim.id}>
                  <TableCell>
                    {emp && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{getInitials(emp.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.department}</p>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-gray-800">{claim.title}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColors[claim.category] || "bg-gray-100 text-gray-700"}`}>
                      {claim.category}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-gray-900">{formatCurrency(claim.amount)}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-xs truncate">{claim.description}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(claim.submittedAt)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{approver?.name || "—"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(claim.status)}`}>
                      {claim.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {claim.status === "pending" && (
                        <>
                          <Button variant="ghost" size="sm" className="text-green-600 text-xs">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 text-xs">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {claim.status === "approved" && (
                        <Button variant="ghost" size="sm" className="text-blue-600 text-xs">
                          Mark Paid
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

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit Expense Claim</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Employee</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.companyId === "c1").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Claim Title</label>
              <Input placeholder="e.g. Client Visit - Arusha Trip" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {["Travel", "Technology", "Marketing", "Software", "Food", "Office", "Training", "Other"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS)</label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Textarea placeholder="Describe the expense..." rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Receipt (optional)</label>
              <Input type="file" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Submit Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
