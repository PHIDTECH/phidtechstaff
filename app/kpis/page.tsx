"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Search, TrendingDown, CheckCircle, AlertTriangle, Edit, Trash2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const SESSION_KEY = "phidtech_session";
const ACTIVE_KEY  = "phidtech_active_company";
const KPIS_KEY    = "phidtech_kpis";
const USERS_KEY   = "phidtech_users";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function lsStr(key: string, fallback = "") {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; }
interface KPI {
  id: string; companyId: string; name: string; category: string;
  userId: string; target: number; actual: number; unit: string;
  period: string; status: "on-track" | "at-risk" | "off-track";
  createdAt: string;
}

const KPI_CATEGORIES = ["Sales","Engineering","Marketing","Financial","Customer","HR","General","Operations"];

const emptyForm = () => ({
  name: "", category: "General", userId: "company",
  target: "", actual: "0", unit: "%", period: "", status: "on-track" as KPI["status"],
});

const statusConfig: Record<string, { color: string; bgColor: string; barColor: string }> = {
  "on-track": { color: "text-green-700", bgColor: "bg-green-100", barColor: "[&>div]:bg-green-500" },
  "at-risk":  { color: "text-yellow-700", bgColor: "bg-yellow-100", barColor: "[&>div]:bg-yellow-500" },
  "off-track":{ color: "text-red-700",   bgColor: "bg-red-100",    barColor: "[&>div]:bg-red-500"    },
};

export default function KPIsPage() {
  const [kpis, setKpis]                   = useState<KPI[]>([]);
  const [staff, setStaff]                 = useState<StaffUser[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef = useRef("");
  const [search, setSearch]               = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDialog, setShowDialog]       = useState(false);
  const [editItem, setEditItem]           = useState<KPI | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");
  const [deleteId, setDeleteId]           = useState<string | null>(null);

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setActiveCompanyId(cid);
    cidRef.current = cid;
    setKpis(lsGet<KPI[]>(KPIS_KEY, []));
    setStaff(lsGet<StaffUser[]>(USERS_KEY, []));
  };

  useEffect(() => { reload(); }, []);

  const cid = cidRef.current || activeCompanyId;
  const companyKPIs = cid ? kpis.filter(k => k.companyId === cid) : kpis;
  const companyStaff = cid ? staff.filter(u => u.companyId === cid) : staff;
  const categories = [...new Set(companyKPIs.map(k => k.category))];

  const filtered = companyKPIs.filter(k => {
    const matchSearch = k.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || k.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const onTrack  = companyKPIs.filter(k => k.status === "on-track").length;
  const atRisk   = companyKPIs.filter(k => k.status === "at-risk").length;
  const offTrack = companyKPIs.filter(k => k.status === "off-track").length;

  const radarData = categories.map(cat => {
    const catKPIs = companyKPIs.filter(k => k.category === cat);
    const avgPct  = catKPIs.reduce((s, k) => s + Math.min(k.target > 0 ? (k.actual / k.target) * 100 : 0, 100), 0) / catKPIs.length;
    return { category: cat, value: Math.round(avgPct) };
  });

  const barData = filtered.map(k => ({
    name:   k.name.length > 18 ? k.name.substring(0, 16) + "…" : k.name,
    actual: k.target > 0 ? Math.min(Math.round((k.actual / k.target) * 100), 100) : 0,
  }));

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (k: KPI) => {
    setEditItem(k);
    setForm({
      name: k.name, category: k.category, userId: k.userId,
      target: String(k.target), actual: String(k.actual),
      unit: k.unit, period: k.period, status: k.status,
    });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = () => {
    if (!form.name.trim())   { setFormError("Enter a KPI name."); return; }
    if (!form.target)        { setFormError("Enter a target value."); return; }
    if (!form.period.trim()) { setFormError("Enter a period."); return; }

    const target = Number(form.target) || 0;
    const actual = Number(form.actual) || 0;
    const pct    = target > 0 ? (actual / target) * 100 : 0;
    const autoStatus: KPI["status"] = pct >= 90 ? "on-track" : pct >= 50 ? "at-risk" : "off-track";

    if (editItem) {
      const updated = kpis.map(k => k.id === editItem.id ? {
        ...k, name: form.name.trim(), category: form.category,
        userId: form.userId, target, actual, unit: form.unit,
        period: form.period.trim(), status: form.status || autoStatus,
      } : k);
      lsSet(KPIS_KEY, updated);
      setKpis(updated);
    } else {
      const newKPI: KPI = {
        id: `kpi-${Date.now()}`,
        companyId: cidRef.current || activeCompanyId,
        name: form.name.trim(), category: form.category,
        userId: form.userId, target, actual, unit: form.unit,
        period: form.period.trim(), status: form.status || autoStatus,
        createdAt: new Date().toISOString(),
      };
      const updated = [...kpis, newKPI];
      lsSet(KPIS_KEY, updated);
      setKpis(updated);
    }
    setShowDialog(false);
  };

  const deleteKPI = (id: string) => {
    const updated = kpis.filter(k => k.id !== id);
    lsSet(KPIS_KEY, updated);
    setKpis(updated);
    setDeleteId(null);
  };

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  return (
    <MainLayout>
      <PageHeader
        title="KPIs & Performance"
        subtitle="Track key performance indicators across staff, sales and finance"
        icon={Target}
        actions={
          <>
            <Button variant="outline" size="sm">Export Report</Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add KPI
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total KPIs" value={companyKPIs.length} icon={Target} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="On Track"  value={onTrack}  icon={CheckCircle}  iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatCard title="At Risk"   value={atRisk}   icon={AlertTriangle} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Off Track" value={offTrack} icon={TrendingDown}  iconBg="bg-red-50"    iconColor="text-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Performance by Category</h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} />
                <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">KPI Achievement (%)</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={120} />
                <Tooltip formatter={(v: string | number | undefined) => [`${v}%`, "Achievement"]} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="actual" fill="#3b82f6" radius={[0,4,4,0]} name="Achieved" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* KPI Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">KPI Register</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search KPIs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Target className="w-7 h-7 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-700">No KPIs yet</p>
            <p className="text-sm text-gray-400">Click &quot;Add KPI&quot; to track your first indicator.</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add KPI</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Achievement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(kpi => {
                const assignee  = companyStaff.find(u => u.id === kpi.userId);
                const pct       = kpi.target > 0 ? Math.min(Math.round((kpi.actual / kpi.target) * 100), 100) : 0;
                const cfg       = statusConfig[kpi.status] ?? statusConfig["at-risk"];
                const isMonetary = kpi.unit === "TZS";
                return (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium text-gray-900">{kpi.name}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{kpi.category}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {assignee ? assignee.name : <span className="text-gray-400">Company-wide</span>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{kpi.period}</TableCell>
                    <TableCell className="font-medium text-gray-800">
                      {isMonetary ? formatCurrency(kpi.target) : `${kpi.target.toLocaleString()} ${kpi.unit}`}
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {isMonetary ? formatCurrency(kpi.actual) : `${kpi.actual.toLocaleString()} ${kpi.unit}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className={`h-1.5 w-20 ${cfg.barColor}`} />
                        <span className={`text-xs font-bold ${cfg.color}`}>{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${cfg.bgColor} ${cfg.color}`}>
                        {kpi.status.replace(/-/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(kpi)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(kpi.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit KPI" : "Add New KPI"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">KPI Name</label>
              <Input placeholder="e.g. Monthly Sales Target" value={form.name} onChange={e => sf({ name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={v => sf({ category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KPI_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To</label>
                <Select value={form.userId} onValueChange={v => sf({ userId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company-wide</SelectItem>
                    {companyStaff.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Target Value</label>
                <Input type="number" placeholder="0" value={form.target} onChange={e => sf({ target: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit</label>
                <Input placeholder="e.g. %, TZS, Leads" value={form.unit} onChange={e => sf({ unit: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Period</label>
                <Input placeholder="e.g. March 2026" value={form.period} onChange={e => sf({ period: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Actual (current)</label>
                <Input type="number" placeholder="0" value={form.actual} onChange={e => sf({ actual: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v as KPI["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on-track">On Track</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="off-track">Off Track</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add KPI"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete KPI</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this KPI? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteKPI(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
