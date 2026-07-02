"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Settings, Users, Building2, Activity, RefreshCw, Download,
  CheckCircle, AlertTriangle, Database, Pencil, ArrowLeftRight, X, Plus, MapPin, Trash2, Wifi, Copy, OctagonX
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditLogs } from "@/lib/data";
import { formatDateTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Company } from "@/lib/types";

const COMPANIES_KEY = "phidtech_companies";
const ACTIVE_KEY = "phidtech_active_company";
const USERS_KEY = "phidtech_users";
const GROUP_KEY = "phidtech_group_company";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = ""): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

const emptyCompany = (): Omit<Company, "id" | "createdAt"> => ({
  name: "", industry: "", address: "", phone: "", email: "", website: "", logo: ""
});

function MigrateButton({ label, lsKey, endpoint }: { label: string; lsKey: string; endpoint: string }) {
  const [status, setStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [msg, setMsg] = useState("");

  const run = async () => {
    setStatus("running");
    try {
      const raw = localStorage.getItem(lsKey);
      const items = raw ? JSON.parse(raw) : [];
      if (!items.length) { setMsg(`No data found in this browser's local storage (${lsKey}).`); setStatus("done"); return; }
      const bodyKey = endpoint.includes("users") ? "users" : "companies";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: items, secret: "Kaijage@@2023" }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? "Migration failed."); setStatus("error"); return; }
      setMsg(`✅ Done! Imported ${data.imported} new record(s). ${data.skipped} already existed on server.`);
      setStatus("done");
    } catch { setMsg("Network error during migration."); setStatus("error"); }
  };

  return (
    <div className="space-y-3">
      {msg && (
        <div className={`p-3 rounded-lg text-sm ${status === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
          {msg}
        </div>
      )}
      <Button size="sm" onClick={run} disabled={status === "running"} className="w-full">
        <ArrowLeftRight className="w-4 h-4 mr-2" />
        {status === "running" ? "Migrating…" : label}
      </Button>
    </div>
  );
}

interface Branch { id: string; companyId: string; name: string; location: string; managerId: string; allowedIPs?: string; }
const emptyBranch = (): Omit<Branch, "id"> => ({ companyId: "", name: "", location: "", managerId: "", allowedIPs: "" });

// ── Data Management sub-component ────────────────────────────────────────────
function DataManagement() {
  const DATASETS: { label: string; endpoint: string; color: string }[] = [
    { label: "Customer Sales",  endpoint: "/api/accounting/sales?clear=all", color: "blue"   },
    { label: "Customers",       endpoint: "/api/customers?clear=all",        color: "green"  },
    { label: "Expenses",        endpoint: "/api/expenses?clear=all",         color: "orange" },
  ];
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);

  const doClear = async (endpoint: string) => {
    setBusy(true);
    try {
      const r = await fetch(endpoint, { method: "DELETE" });
      const d = await r.json();
      setMsg({ text: `Deleted ${d.deleted ?? 0} records successfully.`, ok: true });
    } catch { setMsg({ text: "Failed. Please try again.", ok: false }); }
    finally { setBusy(false); setConfirm(null); setTimeout(() => setMsg(null), 4000); }
  };

  const colorMap: Record<string, string> = {
    blue:   "bg-blue-50 border-blue-200 text-blue-800",
    green:  "bg-green-50 border-green-200 text-green-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
  };
  const iconMap: Record<string, string> = {
    blue: "bg-blue-100", green: "bg-green-100", orange: "bg-orange-100",
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Danger Zone</p>
          <p className="text-xs text-amber-700 mt-0.5">These actions permanently delete all records in the selected dataset. Use this only to fix a bad CSV import. Data cannot be recovered.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DATASETS.map(ds => (
          <div key={ds.label} className={`rounded-xl border p-5 ${colorMap[ds.color]}`}>
            <div className={`w-10 h-10 rounded-full ${iconMap[ds.color]} flex items-center justify-center mb-3`}>
              <Database className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">{ds.label}</p>
            <p className="text-xs text-gray-500 mb-4">Remove all records from this dataset on the server.</p>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 w-full"
              onClick={() => setConfirm(ds.endpoint)}
            >
              <OctagonX className="w-4 h-4 mr-1.5" />Clear All {ds.label}
            </Button>
          </div>
        ))}
      </div>
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <OctagonX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Delete ALL Records?</p>
                <p className="text-sm text-gray-500">All data in this dataset will be permanently removed. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
              <Button size="sm" onClick={() => doClear(confirm)} disabled={busy} className="bg-red-600 hover:bg-red-700 text-white">
                {busy ? "Deleting..." : "Yes, Delete All"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  usePermissionGuard("admin");
  const [brandName, setBrandName] = useState("PHIDTECH MS");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState("");
  const [staffUsers, setStaffUsers] = useState<{id:string;companyId:string;status:string;name:string;role:string}[]>([]);
  const [groupCompanyId, setGroupCompanyIdState] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyCompany());
  const [formError, setFormError] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState(emptyBranch());
  const [branchFormError, setBranchFormError] = useState("");
  const [deleteBranchId, setDeleteBranchId] = useState<string | null>(null);
  const [detectedIP, setDetectedIP] = useState("");
  const [detectingIP, setDetectingIP] = useState(false);
  const [ipCopied, setIpCopied] = useState(false);
  const [beemSettings, setBeemSettings] = useState({ apiKey: "", secretKey: "", senderId: "INFO" });
  const [beemSaving, setBeemSaving] = useState(false);
  const [beemMsg, setBeemMsg] = useState<{ok:boolean;text:string}|null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ok:boolean;detail:string}|null>(null);
  const [seedingBranches, setSeedingBranches] = useState(false);
  const [seedMsg, setSeedMsg] = useState<{ok:boolean;text:string}|null>(null);

  const detectMyIP = async () => {
    setDetectingIP(true);
    try {
      const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
      const data = await res.json();
      setDetectedIP(data.ip ?? "");
    } catch { setDetectedIP(""); }
    setDetectingIP(false);
  };

  const copyIP = () => {
    if (!detectedIP) return;
    navigator.clipboard.writeText(detectedIP).then(() => {
      setIpCopied(true);
      setTimeout(() => setIpCopied(false), 2000);
    });
  };

  const reload = async () => {
    // Companies from server
    try {
      const res = await fetch("/api/companies", { cache: "no-store" });
      if (res.ok) {
        const list = await res.json();
        setCompaniesList(list);
        try { localStorage.setItem(COMPANIES_KEY, JSON.stringify(list)); } catch {}
      }
    } catch {}
    // Users from server
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const list = await res.json();
        setStaffUsers(list);
        try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch {}
      }
    } catch {}
    // Branches from server
    try {
      const res = await fetch("/api/branches", { cache: "no-store" });
      if (res.ok) setBranches(await res.json());
    } catch {}
    // Beem settings
    try {
      const res = await fetch("/api/settings/beem", { cache: "no-store" });
      if (res.ok) setBeemSettings(await res.json());
    } catch {}
    // Active company from raw localStorage
    try {
      const raw = localStorage.getItem(ACTIVE_KEY) ?? "";
      setActiveCompanyIdState(raw && raw !== '""' ? raw.replace(/^"|"$/g, "") : "");
    } catch {}
    // Group company
    try {
      const gc = localStorage.getItem(GROUP_KEY) ?? "";
      setGroupCompanyIdState(gc.replace(/^"|"$/g, ""));
    } catch {}
  };

  useEffect(() => {
    reload();
    const onCustom = () => reload();
    window.addEventListener("phidtech_companies_updated", onCustom);
    return () => {
      window.removeEventListener("phidtech_companies_updated", onCustom);
    };
  }, []);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    try {
      if (id) { localStorage.setItem(ACTIVE_KEY, id); }
      else { localStorage.removeItem(ACTIVE_KEY); }
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

  const saveCompany = async () => {
    if (!form.name.trim()) { setFormError("Company name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    try {
      if (editTarget) {
        const r = await fetch("/api/companies", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editTarget.id, ...form }) });
        if (!r.ok) { const d = await r.json(); setFormError(d.error ?? "Failed to save."); return; }
      } else {
        const r = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (!r.ok) { const d = await r.json(); setFormError(d.error ?? "Failed to save."); return; }
        const newCompany = await r.json();
        setActiveCompanyId(newCompany.id);
      }
      await reload();
      window.dispatchEvent(new Event("phidtech_companies_updated"));
      setShowModal(false);
    } catch { setFormError("Network error. Please try again."); }
  };

  const bf = (f: Partial<typeof branchForm>) => setBranchForm(p => ({ ...p, ...f }));

  const openAddBranch = () => { setEditBranch(null); setBranchForm(emptyBranch()); setBranchFormError(""); setShowBranchModal(true); };
  const openEditBranch = (b: Branch) => { setEditBranch(b); setBranchForm({ companyId: b.companyId, name: b.name, location: b.location, managerId: b.managerId, allowedIPs: b.allowedIPs ?? "" }); setBranchFormError(""); setShowBranchModal(true); };

  const saveBranch = async () => {
    if (!branchForm.name.trim()) { setBranchFormError("Branch name is required."); return; }
    if (!branchForm.companyId)   { setBranchFormError("Select a company."); return; }
    try {
      if (editBranch) {
        const r = await fetch("/api/branches", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editBranch.id, ...branchForm }) });
        if (!r.ok) { const d = await r.json(); setBranchFormError(d.error ?? "Failed to save."); return; }
      } else {
        const r = await fetch("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(branchForm) });
        if (!r.ok) { const d = await r.json(); setBranchFormError(d.error ?? "Failed to save."); return; }
      }
      await reload();
      setShowBranchModal(false);
    } catch { setBranchFormError("Network error."); }
  };

  const deleteBranch = async (id: string) => {
    await fetch(`/api/branches?id=${id}`, { method: "DELETE" });
    await reload();
    setDeleteBranchId(null);
  };

  const seedDefaultBranches = async () => {
    setSeedingBranches(true); setSeedMsg(null);
    try {
      const res = await fetch("/api/branches/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSeedMsg({ ok: true, text: `Done! Added ${data.added} new branch(es). Total: ${data.total}.` });
        await reload();
      } else {
        setSeedMsg({ ok: false, text: data.error ?? "Failed to seed branches." });
      }
    } catch { setSeedMsg({ ok: false, text: "Network error." }); }
    setSeedingBranches(false);
  };

  const saveBeem = async () => {
    setBeemSaving(true); setBeemMsg(null);
    try {
      const res = await fetch("/api/settings/beem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(beemSettings),
      });
      setBeemMsg(res.ok ? { ok: true, text: "Settings saved successfully!" } : { ok: false, text: "Failed to save settings." });
    } catch { setBeemMsg({ ok: false, text: "Network error." }); }
    setBeemSaving(false);
  };

  const testSms = async () => {
    if (!testPhone.trim()) return;
    setTestLoading(true); setTestResult(null);
    try {
      const res = await fetch("/api/settings/beem/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim() }),
      });
      const d = await res.json();
      if (d.ok) {
        setTestResult({ ok: true, detail: `✓ Sent! HTTP ${d.httpStatus}, Beem code ${d.beemCode}, Sender: ${d.senderId}, Phone: ${d.normalisedPhone}` });
      } else {
        const detail = d.beemMessage || d.error || `HTTP ${d.httpStatus ?? "?"}, code ${d.beemCode ?? "?"}`;
        setTestResult({ ok: false, detail: `✗ Failed: ${detail}` });
      }
    } catch (e) { setTestResult({ ok: false, detail: `Network error: ${e}` }); }
    setTestLoading(false);
  };

  const systemStats = [
    { label: "Total Companies", value: companiesList.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Branches", value: branches.length, icon: MapPin, color: "text-teal-600", bg: "bg-teal-50" },
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
    { module: "Staff Meeting", admin: true, manager: true, staff: false },
    { module: "Marketing Report",            admin: true, manager: true,  staff: true  },
    { module: "Media Customers",              admin: true, manager: true,  staff: true  },
    { module: "Business Customers",           admin: true, manager: true,  staff: true  },
    { module: "Licence Customers",            admin: true, manager: true,  staff: true  },
    { module: "Entertainment Customers",      admin: true, manager: true,  staff: true  },
    { module: "Movies Customers",             admin: true, manager: true,  staff: true  },
    { module: "Admin Panel",                  admin: true, manager: false, staff: false },
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
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="sms">SMS Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
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
                        {company.id === groupCompanyId && (
                          <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">Group</span>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(company)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        {company.id !== groupCompanyId && (
                          <Button variant="outline" size="sm" onClick={() => {
                            setGroupCompanyIdState(company.id);
                            try { localStorage.setItem(GROUP_KEY, company.id); } catch {}
                          }}>
                            🏢 Set as Group
                          </Button>
                        )}
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

        {/* Branches Tab */}
        <TabsContent value="branches">
          {/* IP Detection Helper Banner */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Wifi className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Set Branch Office IP</p>
                  <p className="text-xs text-blue-600">Click the button from inside each office to detect its public IP, then copy it into the branch's Allowed IPs field.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {detectedIP && (
                  <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="font-mono text-sm font-bold text-blue-800">{detectedIP}</span>
                    <button onClick={copyIP} className="text-blue-500 hover:text-blue-700" title="Copy IP">
                      {ipCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={detectMyIP} disabled={detectingIP} className="bg-white">
                  <Wifi className="w-4 h-4 mr-2" />
                  {detectingIP ? "Detecting…" : "Detect My IP"}
                </Button>
                {detectedIP && (
                  <Button size="sm" onClick={() => { setBranchForm(f => ({ ...f, allowedIPs: f.allowedIPs ? f.allowedIPs + ", " + detectedIP : detectedIP })); setShowBranchModal(true); setEditBranch(null); setBranchFormError(""); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-1" /> Add to Branch
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Branch Management</h3>
                <p className="text-xs text-gray-400 mt-0.5">Manage branches per company and assign branch managers</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={seedDefaultBranches} disabled={seedingBranches}>
                  <Download className="w-4 h-4 mr-2" />{seedingBranches ? "Seeding…" : "Seed Default Branches"}
                </Button>
                <Button size="sm" onClick={openAddBranch}>
                  <Plus className="w-4 h-4 mr-2" /> Add Branch
                </Button>
              </div>
            </div>
            {seedMsg && (
              <div className={`mx-5 mt-3 px-3 py-2 rounded-lg text-sm border ${seedMsg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {seedMsg.text}
              </div>
            )}
            {branches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <MapPin className="w-12 h-12 text-gray-200" />
                <p className="font-semibold text-gray-500">No branches yet</p>
                <p className="text-sm text-gray-400">Add a branch to get started.</p>
                <Button size="sm" onClick={openAddBranch}><Plus className="w-4 h-4 mr-2" />Add Branch</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Allowed Office IPs</TableHead>
                    <TableHead>Branch Manager</TableHead>
                    <TableHead>Staff Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map(branch => {
                    const company = branch.companyId === "group"
                      ? { name: "👑 PHIDTECH GROUP HQ" }
                      : companiesList.find(c => c.id === branch.companyId);
                    const manager = staffUsers.find(u => u.id === branch.managerId);
                    const branchStaff = staffUsers.filter((u: {id:string;companyId:string;status:string;name:string;role:string} & {branchId?: string}) => u.branchId === branch.id);
                    return (
                      <TableRow key={branch.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-teal-600" />
                            </div>
                            <span className="font-medium text-gray-900">{branch.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{company?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-gray-500">{branch.location || "—"}</TableCell>
                        <TableCell>
                          {branch.allowedIPs ? (
                            <div className="flex flex-wrap gap-1">
                              {branch.allowedIPs.split(",").map(ip => ip.trim()).filter(Boolean).map(ip => (
                                <span key={ip} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono">{ip}</span>
                              ))}
                            </div>
                          ) : <span className="text-gray-300 text-xs">Not set</span>}
                        </TableCell>
                        <TableCell>
                          {manager ? (
                            <span className="text-sm font-medium text-gray-800">{manager.name}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-gray-800">{branchStaff.length}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {detectedIP && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-200 text-xs h-7 px-2"
                                title={`Add ${detectedIP} to this branch`}
                                onClick={async () => {
                                  const existing = (branch.allowedIPs ?? "").split(",").map(s => s.trim()).filter(Boolean);
                                  if (!existing.includes(detectedIP)) {
                                    const newIPs = [...existing, detectedIP].join(", ");
                                    await fetch("/api/branches", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: branch.id, allowedIPs: newIPs }) });
                                    await reload();
                                  }
                                }}
                              >
                                <Wifi className="w-3 h-3 mr-1" /> Use {detectedIP}
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => openEditBranch(branch)}>
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteBranchId(branch.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
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
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Migrate Staff to Server</h3>
                  <p className="text-xs text-gray-400">Import staff users from this browser to the shared server database</p>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 mb-4">
                Run these <strong>once</strong> after deployment to move existing data from this browser to the server so all devices share the same data.
              </div>
              <MigrateButton label="Migrate Companies → Server" lsKey="phidtech_companies" endpoint="/api/companies/migrate" />
              <div className="mt-3">
                <MigrateButton label="Migrate Staff Users → Server" lsKey="phidtech_users" endpoint="/api/users/migrate" />
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

        {/* SMS Settings Tab */}
        <TabsContent value="sms">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm max-w-lg p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Beem Africa SMS Settings</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Get your API credentials from{" "}
                <a href="https://app.beem.africa" target="_blank" rel="noreferrer" className="text-blue-600 underline">app.beem.africa</a>.
                Used for sending SMS to staff and customers automatically.
              </p>
            </div>
            {beemMsg && (
              <div className={`px-3 py-2 rounded-lg text-sm border ${beemMsg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {beemMsg.text}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">API Key <span className="text-red-500">*</span></label>
                <Input
                  value={beemSettings.apiKey}
                  onChange={e => setBeemSettings(s => ({ ...s, apiKey: e.target.value }))}
                  placeholder="Your Beem Africa API Key"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Secret Key <span className="text-red-500">*</span></label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={beemSettings.secretKey}
                  onChange={e => setBeemSettings(s => ({ ...s, secretKey: e.target.value }))}
                  placeholder="Your Beem Africa Secret Key"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sender ID</label>
                <Input
                  value={beemSettings.senderId}
                  onChange={e => setBeemSettings(s => ({ ...s, senderId: e.target.value }))}
                  placeholder="e.g. PHIDTECH (max 11 chars)"
                  maxLength={11}
                />
                <p className="text-xs text-gray-400 mt-1">Max 11 characters, no spaces. Must be registered with Beem.</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <Button onClick={saveBeem} disabled={beemSaving}>
                {beemSaving ? "Saving…" : "Save SMS Settings"}
              </Button>
            </div>

            {/* Test SMS */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Test SMS</p>
                <p className="text-xs text-gray-400 mt-0.5">Send a test message to verify your credentials are working.</p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="e.g. 0765849729 or 255765849729"
                  className="flex-1"
                />
                <Button onClick={testSms} disabled={testLoading || !testPhone.trim()} variant="outline">
                  {testLoading ? "Sending…" : "Send Test"}
                </Button>
              </div>
              {testResult && (
                <div className={`px-3 py-2 rounded-lg text-xs border font-mono break-all ${testResult.ok ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {testResult.detail}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Auto-SMS Triggers (sent when Beem is configured):</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>Expense claim <strong>disbursed / paid</strong></li>
                <li>Salary advance <strong>disbursed</strong></li>
                <li>Leave request <strong>submitted</strong></li>
                <li>Task <strong>assigned</strong> to a staff member</li>
                <li>Payroll <strong>marked as paid</strong></li>
                <li>Commission <strong>marked as paid</strong></li>
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data">
          <DataManagement />
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

      {/* Add / Edit Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editBranch ? "Edit Branch" : "Add New Branch"}
                </h2>
              </div>
              <button onClick={() => setShowBranchModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {branchFormError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{branchFormError}</div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company <span className="text-red-500">*</span></label>
                <Select value={branchForm.companyId || undefined} onValueChange={v => bf({ companyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">👑 PHIDTECH GROUP HQ (visible to all)</SelectItem>
                    {companiesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Branch Name <span className="text-red-500">*</span></label>
                <Input value={branchForm.name} onChange={e => bf({ name: e.target.value })} placeholder="e.g. Karagwe Branch" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Location</label>
                <Input value={branchForm.location} onChange={e => bf({ location: e.target.value })} placeholder="e.g. Karagwe, Kagera" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Branch Manager</label>
                <Select value={branchForm.managerId || "none"} onValueChange={v => bf({ managerId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select manager (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No manager assigned —</SelectItem>
                    {staffUsers
                      .filter(u => !branchForm.companyId || u.companyId === branchForm.companyId)
                      .map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Office IP Address(es)</label>
                <Input value={branchForm.allowedIPs ?? ""} onChange={e => bf({ allowedIPs: e.target.value })} placeholder="e.g. 197.186.10.5, 41.73.2.100" />
                <p className="text-xs text-gray-400 mt-1">Separate multiple IPs with commas. Staff clocking in from these IPs will be marked <strong>In Office</strong>.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowBranchModal(false)}>Cancel</Button>
              <Button onClick={saveBranch}>
                {editBranch ? "Save Changes" : "Add Branch"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Branch Confirmation */}
      {deleteBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Branch?</h3>
            <p className="text-sm text-gray-500 mb-6">This will permanently delete this branch. Staff assigned to it will no longer have a branch.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteBranchId(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => deleteBranch(deleteBranchId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
