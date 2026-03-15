"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, Search, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { leaveRequests, leaveBalances, users } from "@/lib/data";
import { formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export default function LeavePage() {
  usePermissionGuard("leave");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<typeof leaveRequests[0] | null>(null);

  const companyLeaves = leaveRequests.filter(l => l.companyId === "c1");
  const filtered = companyLeaves.filter(l => {
    const user = users.find(u => u.id === l.userId);
    const matchSearch = user?.name.toLowerCase().includes(search.toLowerCase()) ||
      l.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending = companyLeaves.filter(l => l.status === "pending").length;
  const approved = companyLeaves.filter(l => l.status === "approved").length;
  const rejected = companyLeaves.filter(l => l.status === "rejected").length;
  const totalDays = companyLeaves.filter(l => l.status === "approved").reduce((s, l) => s + l.days, 0);

  const leaveTypeColor = (type: string) => ({
    annual: "bg-blue-100 text-blue-800",
    sick: "bg-red-100 text-red-800",
    maternity: "bg-pink-100 text-pink-800",
    paternity: "bg-indigo-100 text-indigo-800",
    emergency: "bg-orange-100 text-orange-800",
    unpaid: "bg-gray-100 text-gray-800",
  }[type] || "bg-gray-100 text-gray-800");

  return (
    <MainLayout>
      <PageHeader
        title="Leave Management"
        subtitle="Manage leave requests, approvals and balances"
        icon={Calendar}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Request Leave
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending Requests" value={pending} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Approved" value={approved} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Rejected" value={rejected} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" />
        <StatCard title="Total Days Approved" value={totalDays} icon={Calendar} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle="This year" />
      </div>

      <Tabs defaultValue="requests">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="requests">Leave Requests</TabsTrigger>
            <TabsTrigger value="balances">Leave Balances</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="requests">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((leave) => {
                  const employee = users.find(u => u.id === leave.userId);
                  const approver = users.find(u => u.id === leave.approvedBy);
                  return (
                    <TableRow key={leave.id}>
                      <TableCell>
                        {employee && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{getInitials(employee.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{employee.name}</p>
                              <p className="text-xs text-gray-400">{employee.department}</p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${leaveTypeColor(leave.type)}`}>
                          {leave.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-800">{leave.days} days</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-xs truncate">{leave.reason}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{approver?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {leave.status === "pending" && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs">
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs">
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="balances">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaveBalances.map((balance) => {
              const employee = users.find(u => u.id === balance.userId);
              if (!employee) return null;
              const usedPct = Math.round((balance.used / balance.annual) * 100);
              return (
                <div key={balance.userId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{employee.name}</p>
                      <p className="text-xs text-gray-400">{employee.department}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Annual Leave</span>
                        <span className="font-medium text-gray-800">{balance.used}/{balance.annual} days</span>
                      </div>
                      <Progress value={usedPct} className="h-2" />
                      <p className="text-xs text-gray-400 mt-1">{balance.remaining} days remaining</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{balance.annual}</p>
                        <p className="text-xs text-gray-400">Annual</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{balance.sick}</p>
                        <p className="text-xs text-gray-400">Sick</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{balance.remaining}</p>
                        <p className="text-xs text-gray-400">Remaining</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">March 2026 – Leave Calendar</h3>
            <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-gray-500 mb-2">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="text-center py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 5;
                const isValid = day >= 1 && day <= 31;
                const dateStr = `2026-03-${String(day).padStart(2, "0")}`;
                const leavesOnDay = companyLeaves.filter(l =>
                  l.status === "approved" &&
                  l.startDate <= dateStr && l.endDate >= dateStr
                );
                const isToday = day === 10;
                return (
                  <div
                    key={i}
                    className={`min-h-[60px] rounded-lg p-1 text-xs ${
                      !isValid ? "bg-transparent" :
                      isToday ? "bg-blue-600 text-white" :
                      leavesOnDay.length > 0 ? "bg-green-50 border border-green-200" :
                      "bg-gray-50 border border-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    {isValid && (
                      <>
                        <div className={`font-semibold mb-1 ${isToday ? "text-white" : "text-gray-700"}`}>{day}</div>
                        {leavesOnDay.map((l) => {
                          const emp = users.find(u => u.id === l.userId);
                          return (
                            <div key={l.id} className="text-[10px] bg-green-100 text-green-700 rounded px-1 truncate mb-0.5">
                              {emp?.name.split(" ")[0]}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-600" /> Today</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-200" /> On Leave</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Leave Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Leave Request</DialogTitle>
          </DialogHeader>
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
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Leave Type</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="maternity">Maternity Leave</SelectItem>
                  <SelectItem value="paternity">Paternity Leave</SelectItem>
                  <SelectItem value="emergency">Emergency Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Start Date</label>
                <Input type="date" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">End Date</label>
                <Input type="date" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reason</label>
              <Textarea placeholder="Reason for leave..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
