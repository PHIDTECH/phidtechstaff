"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Search, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from "lucide-react";
import { kpis, users } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function KPIsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const companyKPIs = kpis.filter(k => k.companyId === "c1");
  const categories = [...new Set(companyKPIs.map(k => k.category))];

  const filtered = companyKPIs.filter(k => {
    const matchSearch = k.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || k.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const onTrack = companyKPIs.filter(k => k.status === "on-track").length;
  const atRisk = companyKPIs.filter(k => k.status === "at-risk").length;
  const offTrack = companyKPIs.filter(k => k.status === "off-track").length;

  const radarData = categories.map(cat => {
    const catKPIs = companyKPIs.filter(k => k.category === cat);
    const avgPct = catKPIs.reduce((s, k) => s + Math.min((k.actual / k.target) * 100, 100), 0) / catKPIs.length;
    return { category: cat, value: Math.round(avgPct) };
  });

  const barData = filtered.map(k => ({
    name: k.name.length > 20 ? k.name.substring(0, 18) + "…" : k.name,
    target: 100,
    actual: Math.min(Math.round((k.actual / k.target) * 100), 100),
  }));

  const statusConfig: Record<string, { color: string; bgColor: string; barColor: string }> = {
    "on-track": { color: "text-green-700", bgColor: "bg-green-100", barColor: "[&>div]:bg-green-500" },
    "at-risk": { color: "text-yellow-700", bgColor: "bg-yellow-100", barColor: "[&>div]:bg-yellow-500" },
    "off-track": { color: "text-red-700", bgColor: "bg-red-100", barColor: "[&>div]:bg-red-500" },
  };

  return (
    <MainLayout>
      <PageHeader
        title="KPIs & Performance"
        subtitle="Track key performance indicators across staff, sales and finance"
        icon={Target}
        actions={
          <>
            <Button variant="outline" size="sm">Export Report</Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add KPI
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total KPIs" value={companyKPIs.length} icon={Target} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="On Track" value={onTrack} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="At Risk" value={atRisk} icon={AlertTriangle} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Off Track" value={offTrack} icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Performance by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} />
              <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">KPI Achievement (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={120} />
              <Tooltip formatter={(v: string | number | undefined) => [`${v}%`, "Achievement"]} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="actual" fill="#3b82f6" radius={[0,4,4,0]} name="Achieved" />
            </BarChart>
          </ResponsiveContainer>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(kpi => {
              const assignee = users.find(u => u.id === kpi.userId);
              const pct = Math.min(Math.round((kpi.actual / kpi.target) * 100), 100);
              const cfg = statusConfig[kpi.status];
              const isMonetary = kpi.unit === "TZS";
              return (
                <TableRow key={kpi.id}>
                  <TableCell className="font-medium text-gray-900">{kpi.name}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {kpi.category}
                    </span>
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
                      {kpi.status.replace("-", " ")}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add KPI Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New KPI</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">KPI Name</label>
              <Input placeholder="e.g. Monthly Sales Target" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {["Sales","Engineering","Marketing","Financial","Customer","HR"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Staff / Company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company-wide</SelectItem>
                    {users.filter(u => u.companyId === "c1").map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Target Value</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit</label>
                <Input placeholder="e.g. TZS, %, Leads" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Period</label>
                <Input placeholder="e.g. March 2026" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Actual (current)</label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Add KPI</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
