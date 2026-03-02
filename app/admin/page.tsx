"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Settings, Users, Building2, Activity, RefreshCw, Download,
  CheckCircle, AlertTriangle, Database, Pencil, ArrowLeftRight, X, Plus
} from "lucide-react";
import { auditLogs } from "@/lib/data";
import { formatDateTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Company } from "@/lib/types";

const COMPANIES_KEY = "phidtech_companies";
const ACTIVE_KEY = "phidtech_active_company";
const USERS_KEY = "phidtech_users";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = ""): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

const emptyCompany = (): Omit<Company, "id" | "createdAt"> => ({
  name: "", industry: "", address: "", phone: "", email: "", website: "", logo: ""
});

export default function AdminPage() {
  const [brandName, setBrandName] = useState("PHIDTECH MS");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState("");
  const [staffUsers, setStaffUsers] = useState<{id:string;companyId:string;status:string;name:string}[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyCompany());
  const [formError, setFormError] = useState("");

  const reload = () => {
    setCompaniesList(lsGet<Company[]>(COMPANIES_KEY, []));
    setActiveCompanyIdState(lsStr(ACTIVE_KEY));
    setStaffUsers(lsGet(USERS_KEY, []));
  };

  useEffect(() => {
    reload();
    const onCustom = () => reload();
    const onStorage = (e: StorageEvent) => {
      if (e.key === COMPANIES_KEY || e.key === ACTIVE_KEY || e.key === USERS_KEY) reload();
    };
    window.addEventListener("phidtech_companies_updated", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("phidtech_companies_updated", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const persistCompanies = (list: Company[]) => {
    setCompaniesList(list);
    try {
      localStorage.setItem(COMPANIES_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("phidtech_companies_updated"));
    } catch {}
  };

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
      window.dispatchEvent(new Event("phidtech_companies_updated"));
    } catch {}
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyCompany());
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (company: Company) => {
    setEditTarget(company);
    setForm({ name: company.name, industry: company.industry, address: company.address, phone: company.phone, email: company.email, website: company.website ?? "", logo: company.logo ?? "" });
    setFormError("");
    setShowModal(true);
  };

  const saveCompany = () => {
    if (!form.name.trim()) { setFormError("Company name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    if (editTarget) {
      persistCompanies(companiesList.map(c => c.id === editTarget.id ? { ...c, ...form } : c));
    } else {
      const newCompany: Company = { ...form, id: `c${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
      const updated = [...companiesList, newCompany];
      persistCompanies(updated);
      setActiveCompanyId(newCompany.id);
    }
    setShowModal(false);
  };

  const systemStats = [
    { label: "Total Companies", value: companiesList.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Users", value: staffUsers.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Active Users", value: staffUsers.filter(u => u.status === "active").length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Audit Events", value: auditLogs.length, icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const modulePermissions = [
    { module: "Dashboard", admin: true, manager: true, staff: true },
    { module: "User Management", admin: true, manager: false, staff: false },
    { module: "Payroll", admin: true, manager: true, staff: false },
    { module: "Accounting", admin: true, manager: true, staff: false },
    { module: "Tasks", admin: true, manager: true, staff: true },
    { module: "Leave Management", admin: true, manager: true, staff: true },
    { module: "Invoices", admin: true, manager: true, staff: false },
    { module: "CRM / Customers", admin: true, manager: true, staff: true },
    { module: "Sales Pipeline", admin: true, manager: true, staff: true },
    { module: "Inventory", admin: true, manager: true, staff: false },
    { module: "Assets", admin: true, manager: true, staff: false },
    { module: "Expenses", admin: true, manager: true, staff: true },
    { module: "Documents", admin: true, manager: true, staff: true },
    { module: "Reports", admin: true, manager: true, staff: false },
    { module: "Services & Pricing", admin: true, manager: true, staff: true },
    { module: "Commissions", admin: true, manager: true, staff: true },
    { module: "Messages & Notifications", admin: true, manager: true, staff: true },
    { module: "Petty Cash", admin: true, manager: true, staff: false },
    { module: "Admin Panel", admin: true, manager: false, staff: false },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="System Admin Panel"
        subtitle="System configuration, permissions, branding and audit logs"
        icon={Settings}
        actions={
          <Button size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Sync System
          </Button>
        }
      />

      {/* System Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {systemStats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="companies">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Companies Tab */}
        <TabsContent value="companies">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Registered Companies</h3>
              <Button size="sm" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-2" /> Add Company
              </Button>
            </div>
            <div className="divide-y divide-gray-50">
              {companiesList.map(company => {
                const companyUsers = staffUsers.filter(u => u.companyId === company.id);
                const isActive = company.id === activeCompanyId;
                return (
                  <div key={company.id} className={`px-5 py-4 flex items-center justify-between hover:bg-gray-50 ${isActive ? "bg-blue-50/40" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{company.name}</p>
                          {isActive && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">Active</span>}
                        </div>
                        <p className="text-xs text-gray-400">{company.industry} · {company.address}</p>
                        <p className="text-xs text-gray-400">{company.email} · {company.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{companyUsers.length}</p>
                        <p className="text-xs text-gray-400">Users</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(company)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        {!isActive && (
                          <Button size="sm" onClick={() => setActiveCompanyId(company.id)}>
                            <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Switch
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Module Access Permissions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Configure which roles can access each module</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Admin
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" /> Manager
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Staff
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modulePermissions.map(perm => (
                  <TableRow key={perm.module}>
                    <TableCell className="font-medium text-gray-800">{perm.module}</TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        defaultChecked={perm.admin}
                        disabled={perm.module === "Admin Panel"}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        defaultChecked={perm.manager}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        defaultChecked={perm.staff}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <Button size="sm">Save Permissions</Button>
            </div>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">System Branding</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">System Name</label>
                  <Input value={brandName} onChange={e => setBrandName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tagline</label>
                  <Input defaultValue="Unified Business Operations Management System" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company Logo</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors cursor-pointer">
                    <p className="text-sm text-gray-500">Click to upload logo</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, SVG (recommended 200×60px)</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Favicon</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors cursor-pointer">
                    <p className="text-sm text-gray-500">Upload favicon (32×32px ICO or PNG)</p>
                  </div>
                </div>
                <Button className="w-full">Save Branding</Button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Live Preview</h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: primaryColor }}>
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-bold text-white">{brandName || "PHIDTECH MS"}</p>
                </div>
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="w-8 h-2 rounded" style={{ backgroundColor: primaryColor, opacity: 0.3 }} />
                        <div className="w-16 h-4 bg-gray-200 rounded mt-2" />
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="w-20 h-2 rounded mb-2" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />
                    <div className="space-y-1.5">
                      {[1,2,3].map(i => <div key={i} className="h-2 bg-gray-100 rounded" />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Notification Settings</h3>
            <div className="space-y-4">
              {[
                { label: "Email Notifications", desc: "Send email alerts for important system events", enabled: true },
                { label: "SMS Notifications", desc: "Send SMS for critical alerts (payroll, approvals)", enabled: false },
                { label: "In-App Notifications", desc: "Show real-time notifications within the system", enabled: true },
                { label: "Leave Request Alerts", desc: "Notify managers when leave is submitted", enabled: true },
                { label: "Payroll Reminders", desc: "Send reminder 3 days before payroll due date", enabled: true },
                { label: "Invoice Due Alerts", desc: "Alert finance team for overdue invoices", enabled: true },
                { label: "Low Stock Alerts", desc: "Alert inventory manager when stock hits reorder level", enabled: true },
                { label: "Task Deadline Reminders", desc: "Remind staff of upcoming task deadlines", enabled: false },
                { label: "KPI Performance Alerts", desc: "Alert managers when KPIs fall below threshold", enabled: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
              <Button className="mt-2">Save Notification Settings</Button>
            </div>
          </div>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <Database className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Database Backup</h3>
                  <p className="text-xs text-gray-400">Last backup: 26 Feb 2026 at 02:00 AM</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-700">System is healthy. All data backed up successfully.</p>
                </div>
                {[
                  { label: "Auto Backup Schedule", value: "Daily at 2:00 AM" },
                  { label: "Retention Period", value: "30 days" },
                  { label: "Storage Used", value: "2.4 GB / 50 GB" },
                  { label: "Last Backup Size", value: "156 MB" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1">
                  <Database className="w-4 h-4 mr-2" /> Backup Now
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Restore System</h3>
              <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700">Restoring will overwrite all current data. This action cannot be undone.</p>
              </div>
              <div className="space-y-3">
                {[
                  { date: "26 Feb 2026 – 02:00 AM", size: "156 MB", type: "Auto" },
                  { date: "25 Feb 2026 – 02:00 AM", size: "154 MB", type: "Auto" },
                  { date: "24 Feb 2026 – 02:00 AM", size: "152 MB", type: "Auto" },
                  { date: "20 Feb 2026 – 10:30 AM", size: "148 MB", type: "Manual" },
                ].map((backup, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{backup.date}</p>
                      <p className="text-xs text-gray-400">{backup.size} · {backup.type}</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs">Restore</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">System Audit Logs</h3>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" /> Export Logs
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map(log => {
                  const user = staffUsers.find(u => u.id === log.userId);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        {user && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-[10px]">{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-700">{user.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium font-mono ${
                          log.action.includes("LOGIN") ? "bg-green-100 text-green-800" :
                          log.action.includes("DEACTIVATED") || log.action.includes("DELETED") ? "bg-red-100 text-red-800" :
                          log.action.includes("APPROVED") ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                          {log.module}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-sm truncate">{log.details}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{log.ipAddress}</TableCell>
                      <TableCell className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Company Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editTarget ? "Edit Company" : "Add New Company"}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{formError}</div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company Name <span className="text-red-500">*</span></label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PHID Technologies Ltd" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Industry</label>
                <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Technology, Logistics, Retail" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email <span className="text-red-500">*</span></label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@company.co.tz" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255 700 000 000" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Address</label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Dar es Salaam, Tanzania" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Website</label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="www.company.co.tz" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={saveCompany}>
                {editTarget ? "Save Changes" : "Add Company"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
