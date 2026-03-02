"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users, UserPlus, Search, Mail, Phone, Building2, Shield,
  UserCheck, Edit, Eye, Lock, CheckSquare, Square, X, Plus, Trash2
} from "lucide-react";
import { formatDate, formatCurrency, getInitials, getStatusColor } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface Allowance {
  name: string;
  amount: number;
}
interface StaffUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  department: string;
  position: string;
  role: string;          // admin | manager | accountant | hr | sales | staff | ...
  salary: number;
  allowances: Allowance[];
  joinDate: string;
  status: string;
  permissions: string[];
}

// ── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_DEPARTMENTS = [
  "Administration", "Human Resources", "Finance & Accounting", "Sales & Marketing",
  "Information Technology", "Operations", "Customer Service", "Procurement",
  "Legal & Compliance", "Research & Development", "Logistics", "Production",
];

const STAFF_POSITIONS = [
  { value: "admin",             label: "System Admin",        color: "red" },
  { value: "manager",           label: "Manager / HOD",       color: "purple" },
  { value: "accountant",        label: "Accountant",          color: "green" },
  { value: "hr",                label: "HR Officer",          color: "orange" },
  { value: "sales",             label: "Sales & Marketing",   color: "blue" },
  { value: "it",                label: "IT Officer",          color: "cyan" },
  { value: "procurement",       label: "Procurement Officer", color: "yellow" },
  { value: "customer_service",  label: "Customer Service",    color: "pink" },
  { value: "legal",             label: "Legal Officer",       color: "indigo" },
  { value: "logistics",         label: "Logistics Officer",   color: "teal" },
  { value: "staff",             label: "General Staff",       color: "gray" },
];

const ALL_PERMISSIONS = [
  { key: "dashboard",    label: "Dashboard" },
  { key: "users",        label: "Users & Roles" },
  { key: "attendance",   label: "Attendance" },
  { key: "leave",        label: "Leave Management" },
  { key: "payroll",      label: "Payroll & Salary" },
  { key: "tasks",        label: "Tasks" },
  { key: "kpis",         label: "KPIs & Reports" },
  { key: "assets",       label: "Assets" },
  { key: "expenses",     label: "Expenses" },
  { key: "accounting",   label: "Accounting" },
  { key: "invoices",     label: "Invoices" },
  { key: "sales",        label: "Sales" },
  { key: "inventory",    label: "Inventory" },
  { key: "customers",    label: "Customers" },
  { key: "vendors",      label: "Vendors" },
  { key: "documents",    label: "Documents" },
  { key: "reports",      label: "Reports" },
  { key: "services",     label: "Services & Pricing" },
  { key: "commissions",  label: "Commissions" },
  { key: "notifications",label: "Messages & Notifications" },
  { key: "admin",        label: "Admin Panel" },
];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin:            ALL_PERMISSIONS.map(p => p.key),
  manager:          ["dashboard","attendance","leave","payroll","tasks","kpis","expenses","reports","services","commissions","notifications"],
  accountant:       ["dashboard","accounting","invoices","expenses","payroll","reports","services","commissions","notifications"],
  hr:               ["dashboard","users","attendance","leave","payroll","reports","services","notifications"],
  sales:            ["dashboard","sales","customers","invoices","tasks","reports","services","commissions","notifications"],
  it:               ["dashboard","tasks","assets","documents","reports","services","notifications"],
  procurement:      ["dashboard","vendors","inventory","expenses","tasks","services","notifications"],
  customer_service: ["dashboard","customers","tasks","services","notifications"],
  legal:            ["dashboard","documents","reports","services","notifications"],
  logistics:        ["dashboard","inventory","vendors","tasks","services","notifications"],
  staff:            ["dashboard","attendance","leave","expenses","services","notifications"],
};

const USERS_KEY = "phidtech_users";
const ACTIVE_KEY = "phidtech_active_company";
const COMPANIES_KEY = "phidtech_companies";

function positionColor(pos: string) {
  const found = STAFF_POSITIONS.find(p => p.value === pos);
  const c = found?.color ?? "gray";
  const map: Record<string, string> = {
    red: "bg-red-50 text-red-700", purple: "bg-purple-50 text-purple-700",
    green: "bg-green-50 text-green-700", orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700", cyan: "bg-cyan-50 text-cyan-700",
    yellow: "bg-yellow-50 text-yellow-700", pink: "bg-pink-50 text-pink-700",
    indigo: "bg-indigo-50 text-indigo-700", teal: "bg-teal-50 text-teal-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return map[c] ?? map.gray;
}

function positionLabel(pos: string) {
  return STAFF_POSITIONS.find(p => p.value === pos)?.label ?? pos;
}

const emptyForm = (companyId = "") => ({
  name: "", email: "", password: "", phone: "",
  department: "", position: "staff", salary: "",
  status: "active", permissions: DEFAULT_PERMISSIONS["staff"] as string[],
  companyId,
  allowances: [] as Allowance[],
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = ""): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

// ── Component ───────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [customDept, setCustomDept] = useState("");
  const [deptsList, setDeptsList] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [usersList, setUsersList] = useState<StaffUser[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("");
  const [companiesList, setCompaniesList] = useState<Array<{id:string;name:string;industry?:string}>>([]);

  // Load everything directly from localStorage — no context race
  const reload = () => {
    setUsersList(lsGet<StaffUser[]>(USERS_KEY, []));
    setDeptsList(lsGet<string[]>("phidtech_departments", DEFAULT_DEPARTMENTS));
    setCompaniesList(lsGet(COMPANIES_KEY, []));
    setActiveCompanyId(lsStr(ACTIVE_KEY));
  };

  useEffect(() => {
    reload();
    // Listen for company switches from the header
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_KEY || e.key === USERS_KEY || e.key === COMPANIES_KEY) reload();
    };
    const onCustom = () => reload();
    window.addEventListener("storage", onStorage);
    window.addEventListener("phidtech_companies_updated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("phidtech_companies_updated", onCustom);
    };
  }, []);

  const activeCompany = companiesList.find(c => c.id === activeCompanyId) ?? companiesList[0];

  const saveUsers = (list: StaffUser[]) => {
    setUsersList(list);
    try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch {}
  };

  const saveDepts = (list: string[]) => {
    setDeptsList(list);
    try { localStorage.setItem("phidtech_departments", JSON.stringify(list)); } catch {}
  };

  const companyUsers = activeCompanyId
    ? usersList.filter(u => u.companyId === activeCompanyId)
    : [];

  const filtered = companyUsers.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.position === roleFilter;
    return matchSearch && matchRole;
  });

  const activeCount = companyUsers.filter(u => u.status === "active").length;
  const managerCount = companyUsers.filter(u => u.position === "manager").length;
  const deptCount = [...new Set(companyUsers.map(u => u.department))].length;

  const openAdd = () => { setForm(emptyForm(activeCompanyId)); setFormError(""); setShowAddDialog(true); };

  const openEdit = (u: StaffUser) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: u.password, phone: u.phone,
      department: u.department, position: u.position, salary: String(u.salary),
      status: u.status, permissions: [...u.permissions], companyId: u.companyId,
      allowances: u.allowances ? [...u.allowances] : [] });
    setFormError("");
    setShowEditDialog(true);
  };

  const handlePositionChange = (pos: string) => {
    setForm(f => ({ ...f, position: pos, permissions: DEFAULT_PERMISSIONS[pos] ?? DEFAULT_PERMISSIONS.staff }));
  };

  const togglePerm = (key: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }));
  };

  const addCustomDept = () => {
    if (!customDept.trim() || deptsList.includes(customDept.trim())) return;
    saveDepts([...deptsList, customDept.trim()]);
    setCustomDept("");
  };

  const saveUser = (isEdit = false) => {
    if (!isEdit && !form.companyId) { setFormError("Please select a company."); return; }
    if (!form.name.trim()) { setFormError("Full name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    if (!isEdit && !form.password.trim()) { setFormError("Password is required."); return; }
    if (!isEdit && form.password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (!form.department) { setFormError("Department is required."); return; }
    if (isEdit && editUser) {
      const updated = usersList.map(u => u.id === editUser.id ? {
        ...u, name: form.name, email: form.email,
        password: form.password || u.password,
        phone: form.phone, department: form.department,
        position: form.position, salary: Number(form.salary) || 0,
        status: form.status, permissions: form.permissions,
        allowances: form.allowances,
      } : u);
      saveUsers(updated);
      setShowEditDialog(false);
    } else {
      const newUser: StaffUser = {
        id: `u${Date.now()}`, companyId: form.companyId || activeCompanyId,
        name: form.name, email: form.email, password: form.password,
        phone: form.phone, department: form.department,
        position: form.position, role: form.position,
        salary: Number(form.salary) || 0,
        allowances: form.allowances,
        joinDate: new Date().toISOString().slice(0, 10),
        status: form.status, permissions: form.permissions,
      };
      saveUsers([...usersList, newUser]);
      setShowAddDialog(false);
    }
  };

  const deleteUser = (id: string) => {
    if (!confirm("Delete this employee?")) return;
    saveUsers(usersList.filter(u => u.id !== id));
  };

  return (
    <MainLayout>
      <PageHeader
        title="Users & Role Management"
        subtitle={`Managing staff for: ${activeCompany?.name ?? "Select a company"}`}
        icon={Users}
        actions={
          <Button size="sm" onClick={openAdd}>
            <UserPlus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Staff" value={companyUsers.length} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle={activeCompany?.name} />
        <StatCard title="Active" value={activeCount} icon={UserCheck} iconBg="bg-green-50" iconColor="text-green-600" subtitle="Currently active" />
        <StatCard title="Managers" value={managerCount} icon={Shield} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="HODs & Managers" />
        <StatCard title="Departments" value={deptCount} icon={Building2} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle="Active depts" />
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list">Staff List</TabsTrigger>
            <TabsTrigger value="roles">Positions & Permissions</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {STAFF_POSITIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Staff List ── */}
        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {companyUsers.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No employees yet</p>
                <p className="text-sm mt-1">Click "Add Employee" to create the first staff account</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(user => (
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
                      <TableCell className="text-sm text-gray-700">{user.department}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${positionColor(user.position)}`}>
                          {positionLabel(user.position)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">{formatCurrency(user.salary)}</TableCell>
                      <TableCell>
                        {user.allowances && user.allowances.length > 0 ? (
                          <div className="group relative cursor-default inline-block">
                            <span className="font-medium text-green-700">
                              +{formatCurrency(user.allowances.reduce((s, a) => s + a.amount, 0))}
                            </span>
                            <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-white border border-gray-100 shadow-lg rounded-lg p-2 min-w-[180px]">
                              {user.allowances.map((a, i) => (
                                <div key={i} className="flex justify-between gap-4 text-xs py-0.5">
                                  <span className="text-gray-600">{a.name}</span>
                                  <span className="font-medium text-gray-800">{formatCurrency(a.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
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
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                            <Edit className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteUser(user.id)}>
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

        {/* ── Positions & Permissions ── */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAFF_POSITIONS.map(pos => {
              const count = companyUsers.filter(u => u.position === pos.value).length;
              const perms = DEFAULT_PERMISSIONS[pos.value] ?? [];
              return (
                <div key={pos.value} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{pos.label}</p>
                      <p className="text-xs text-gray-400">{count} employee{count !== 1 ? "s" : ""}</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${positionColor(pos.value)}`}>
                      {pos.value}
                    </span>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    {ALL_PERMISSIONS.map(p => (
                      <div key={p.key} className="flex items-center gap-2 text-xs text-gray-600">
                        {perms.includes(p.key)
                          ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          : <Square className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                        {p.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Departments ── */}
        <TabsContent value="departments">
          <div className="mb-4 flex items-center gap-2">
            <Input
              placeholder="Add new department name..."
              value={customDept}
              onChange={e => setCustomDept(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomDept()}
              className="max-w-xs"
            />
            <Button size="sm" onClick={addCustomDept} variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptsList.map(dept => {
              const deptUsers = companyUsers.filter(u => u.department === dept);
              return (
                <div key={dept} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{dept}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{deptUsers.length} member{deptUsers.length !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{deptUsers.length} staff</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {deptUsers.slice(0, 5).map(u => (
                      <Avatar key={u.id} className="w-7 h-7">
                        <AvatarFallback className="text-[10px]">{getInitials(u.name)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {deptUsers.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-500">
                        +{deptUsers.length - 5}
                      </div>
                    )}
                    {deptUsers.length === 0 && <p className="text-xs text-gray-400 italic">No staff assigned</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── View Employee Dialog ── */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Employee Profile</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg">{getInitials(selectedUser.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedUser.name}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${positionColor(selectedUser.position)}`}>
                    {positionLabel(selectedUser.position)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Email", value: selectedUser.email },
                  { label: "Phone", value: selectedUser.phone },
                  { label: "Department", value: selectedUser.department },
                  { label: "Status", value: selectedUser.status },
                  { label: "Salary", value: formatCurrency(selectedUser.salary) },
                  { label: "Join Date", value: formatDate(selectedUser.joinDate) },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-medium text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Permissions</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUser.permissions.map(p => (
                    <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Close</Button>
            <Button onClick={() => { if (selectedUser) { openEdit(selectedUser); setSelectedUser(null); } }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Employee Dialog ── */}
      {[{ open: showAddDialog, onClose: () => setShowAddDialog(false), isEdit: false },
        { open: showEditDialog, onClose: () => setShowEditDialog(false), isEdit: true }
      ].map(({ open, onClose, isEdit }) => (
        <Dialog key={isEdit ? "edit" : "add"} open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            </DialogHeader>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company <span className="text-red-500">*</span></label>
                <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesList.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Mwalimu" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="staff@company.co.tz" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Login Password {isEdit ? "(leave blank to keep)" : <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={isEdit ? "Leave blank to keep current" : "Min. 6 characters"} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255 7XX XXX XXX" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Department <span className="text-red-500">*</span></label>
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {deptsList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Position / Role <span className="text-red-500">*</span></label>
                <Select value={form.position} onValueChange={handlePositionChange}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {STAFF_POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Basic Salary (TZS)</label>
                <Input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Allowances */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Allowances</p>
                <Button size="sm" variant="outline" type="button" onClick={() => setForm(f => ({ ...f, allowances: [...f.allowances, { name: "", amount: 0 }] }))}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Allowance
                </Button>
              </div>
              {form.allowances.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No allowances set. Click "Add Allowance" to add one.</p>
              ) : (
                <div className="space-y-2">
                  {form.allowances.map((alw, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Allowance name (e.g. Transport)"
                        value={alw.name}
                        onChange={e => setForm(f => ({ ...f, allowances: f.allowances.map((a, i) => i === idx ? { ...a, name: e.target.value } : a) }))}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={alw.amount || ""}
                        onChange={e => setForm(f => ({ ...f, allowances: f.allowances.map((a, i) => i === idx ? { ...a, amount: Number(e.target.value) } : a) }))}
                        className="w-36"
                      />
                      <button type="button" onClick={() => setForm(f => ({ ...f, allowances: f.allowances.filter((_, i) => i !== idx) }))} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permissions */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Module Permissions</p>
                <div className="flex gap-2">
                  <button className="text-xs text-blue-600 hover:underline" onClick={() => setForm(f => ({ ...f, permissions: ALL_PERMISSIONS.map(p => p.key) }))}>Select All</button>
                  <span className="text-gray-300">|</span>
                  <button className="text-xs text-gray-500 hover:underline" onClick={() => setForm(f => ({ ...f, permissions: [] }))}>Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {ALL_PERMISSIONS.map(p => (
                  <button key={p.key} onClick={() => togglePerm(p.key)}
                    className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors ${form.permissions.includes(p.key) ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-100"}`}>
                    {form.permissions.includes(p.key)
                      ? <CheckSquare className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                      : <Square className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => saveUser(isEdit)}>
                {isEdit ? "Save Changes" : "Add Employee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </MainLayout>
  );
}
