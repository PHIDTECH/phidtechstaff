"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, UserPlus, Search, Filter, MoreVertical, Mail,
  Phone, Building2, Shield, UserCheck, UserX, Edit, Eye
} from "lucide-react";
import { users, departments } from "@/lib/data";
import { formatDate, formatCurrency, getInitials, getStatusColor } from "@/lib/utils";
import { useCompanyContext } from "@/lib/CompanyContext";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<typeof users[0] | null>(null);
  const { activeCompanyId } = useCompanyContext();

  const companyUsers = users.filter(u => u.companyId === activeCompanyId || u.companyId === "c1");
  const filtered = companyUsers.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = companyUsers.filter(u => u.role === "admin").length;
  const managerCount = companyUsers.filter(u => u.role === "manager").length;
  const staffCount = companyUsers.filter(u => u.role === "staff").length;
  const activeCount = companyUsers.filter(u => u.status === "active").length;

  return (
    <MainLayout>
      <PageHeader
        title="Users & Role Management"
        subtitle="Manage staff profiles, roles, and permissions"
        icon={Users}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Staff" value={companyUsers.length} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle="All companies" />
        <StatCard title="Active" value={activeCount} icon={UserCheck} iconBg="bg-green-50" iconColor="text-green-600" subtitle="Currently active" />
        <StatCard title="Managers" value={managerCount} icon={Shield} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="Team leads" />
        <StatCard title="Departments" value={departments.filter(d => d.companyId === "c1").length} icon={Building2} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle="Active depts" />
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list">Staff List</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-gray-700">{user.department}</p>
                        <p className="text-xs text-gray-400">{user.position}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        user.role === "admin" ? "bg-red-50 text-red-700" :
                        user.role === "manager" ? "bg-purple-50 text-purple-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">{formatCurrency(user.salary)}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{formatDate(user.joinDate)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedUser(user)}>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="w-4 h-4 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { role: "Admin", color: "red", count: adminCount, desc: "Full system access", perms: ["All modules", "User management", "System settings", "Audit logs", "Backup/restore"] },
              { role: "Manager", color: "purple", count: managerCount, desc: "Department level access", perms: ["Own department data", "Approve leave/expenses", "View reports", "Manage tasks", "KPI tracking"] },
              { role: "Staff", color: "blue", count: staffCount, desc: "Limited personal access", perms: ["Own profile", "Submit leave", "View tasks", "Expense claims", "Attendance records"] },
            ].map((r) => (
              <div key={r.role} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    r.color === "red" ? "bg-red-50" : r.color === "purple" ? "bg-purple-50" : "bg-blue-50"
                  }`}>
                    <Shield className={`w-5 h-5 ${
                      r.color === "red" ? "text-red-600" : r.color === "purple" ? "text-purple-600" : "text-blue-600"
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{r.role}</p>
                    <p className="text-xs text-gray-400">{r.count} users</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-3">{r.desc}</p>
                <div className="space-y-1.5">
                  {r.perms.map((p) => (
                    <div key={p} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.filter(d => d.companyId === "c1").map((dept) => {
              const manager = users.find(u => u.id === dept.managerId);
              const deptUsers = users.filter(u => u.department === dept.name && u.companyId === "c1");
              return (
                <div key={dept.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{deptUsers.length} members</p>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{dept.headCount} headcount</span>
                  </div>
                  {manager && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">{getInitials(manager.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{manager.name}</p>
                        <p className="text-xs text-gray-400">Department Head</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {deptUsers.slice(0, 4).map((u) => (
                      <Avatar key={u.id} className="w-7 h-7">
                        <AvatarFallback className="text-[10px]">{getInitials(u.name)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {deptUsers.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-500">
                        +{deptUsers.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* View User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg">{getInitials(selectedUser.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedUser.name}</h3>
                  <p className="text-gray-500">{selectedUser.position}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedUser.status)}`}>{selectedUser.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Email", value: selectedUser.email, icon: Mail },
                  { label: "Phone", value: selectedUser.phone, icon: Phone },
                  { label: "Department", value: selectedUser.department, icon: Building2 },
                  { label: "Role", value: selectedUser.role, icon: Shield },
                  { label: "Salary", value: formatCurrency(selectedUser.salary), icon: null },
                  { label: "Join Date", value: formatDate(selectedUser.joinDate), icon: null },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-medium text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Close</Button>
            <Button>Edit Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
              <Input placeholder="Enter full name" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
              <Input placeholder="email@company.co.tz" type="email" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
              <Input placeholder="+255 7XX XXX XXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Department</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                <SelectContent>
                  {departments.filter(d => d.companyId === "c1").map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Role</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Position</label>
              <Input placeholder="Job title" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Basic Salary (TZS)</label>
              <Input placeholder="0" type="number" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
