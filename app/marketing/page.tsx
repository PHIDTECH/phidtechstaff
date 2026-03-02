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
import { Megaphone, Plus, Search, DollarSign, Users, TrendingUp, Target, Edit, Trash2, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SESSION_KEY    = "phidtech_session";
const ACTIVE_KEY     = "phidtech_active_company";
const CAMPAIGNS_KEY  = "phidtech_campaigns";

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
interface Campaign {
  id: string; companyId: string; name: string;
  type: "email"|"sms"|"social"|"event"|"paid";
  budget: number; spent: number; leads: number; conversions: number;
  startDate: string; endDate: string;
  status: "draft"|"active"|"paused"|"completed";
  createdAt: string;
}

const emptyForm = () => ({
  name: "", type: "email" as Campaign["type"],
  budget: "", spent: "0", leads: "0", conversions: "0",
  startDate: "", endDate: "", status: "draft" as Campaign["status"],
});

const typeColors: Record<string, string> = {
  email:  "bg-blue-100 text-blue-800",
  social: "bg-purple-100 text-purple-800",
  event:  "bg-green-100 text-green-800",
  paid:   "bg-orange-100 text-orange-800",
  sms:    "bg-yellow-100 text-yellow-800",
};

export default function MarketingPage() {
  const [campaigns, setCampaigns]         = useState<Campaign[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef = useRef("");
  const [search, setSearch]               = useState("");
  const [showDialog, setShowDialog]       = useState(false);
  const [editItem, setEditItem]           = useState<Campaign | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [viewItem, setViewItem]           = useState<Campaign | null>(null);

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setActiveCompanyId(cid);
    cidRef.current = cid;
    setCampaigns(lsGet<Campaign[]>(CAMPAIGNS_KEY, []));
  };

  useEffect(() => { reload(); }, []);

  const cid = cidRef.current || activeCompanyId;
  const companyCampaigns = cid ? campaigns.filter(c => c.companyId === cid) : campaigns;

  const filtered = companyCampaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBudget      = companyCampaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent       = companyCampaigns.reduce((s, c) => s + c.spent, 0);
  const totalLeads       = companyCampaigns.reduce((s, c) => s + c.leads, 0);
  const totalConversions = companyCampaigns.reduce((s, c) => s + c.conversions, 0);
  const conversionRate   = totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0;

  const typeData = ["email","social","event","paid","sms"].map(type => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    leads: companyCampaigns.filter(c => c.type === type).reduce((s, c) => s + c.leads, 0),
  })).filter(d => d.leads > 0);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (c: Campaign) => {
    setEditItem(c);
    setForm({
      name: c.name, type: c.type,
      budget: String(c.budget), spent: String(c.spent),
      leads: String(c.leads), conversions: String(c.conversions),
      startDate: c.startDate, endDate: c.endDate, status: c.status,
    });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = () => {
    if (!form.name.trim())  { setFormError("Enter a campaign name."); return; }
    if (!form.startDate)    { setFormError("Select a start date."); return; }
    if (!form.endDate)      { setFormError("Select an end date."); return; }

    if (editItem) {
      const updated = campaigns.map(c => c.id === editItem.id ? {
        ...c, name: form.name.trim(), type: form.type,
        budget: Number(form.budget)||0, spent: Number(form.spent)||0,
        leads: Number(form.leads)||0, conversions: Number(form.conversions)||0,
        startDate: form.startDate, endDate: form.endDate, status: form.status,
      } : c);
      lsSet(CAMPAIGNS_KEY, updated);
      setCampaigns(updated);
    } else {
      const newItem: Campaign = {
        id: `camp-${Date.now()}`,
        companyId: cidRef.current || activeCompanyId,
        name: form.name.trim(), type: form.type,
        budget: Number(form.budget)||0, spent: Number(form.spent)||0,
        leads: Number(form.leads)||0, conversions: Number(form.conversions)||0,
        startDate: form.startDate, endDate: form.endDate, status: form.status,
        createdAt: new Date().toISOString(),
      };
      const updated = [...campaigns, newItem];
      lsSet(CAMPAIGNS_KEY, updated);
      setCampaigns(updated);
    }
    setShowDialog(false);
  };

  const deleteItem = (id: string) => {
    const updated = campaigns.filter(c => c.id !== id);
    lsSet(CAMPAIGNS_KEY, updated);
    setCampaigns(updated);
    setDeleteId(null);
  };

  const sf = (f: Partial<typeof form>) => setForm(p => ({...p, ...f}));

  return (
    <MainLayout>
      <PageHeader
        title="Marketing Management"
        subtitle="Campaign tracking, lead generation and marketing analytics"
        icon={Megaphone}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Budget" value={formatCurrency(totalBudget)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Total Spent" value={formatCurrency(totalSpent)} icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle={totalBudget > 0 ? `${Math.round((totalSpent/totalBudget)*100)}% of budget` : undefined} />
        <StatCard title="Leads Generated" value={totalLeads} icon={Users} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Conversion Rate" value={`${conversionRate}%`} icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle={`${totalConversions} conversions`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Leads by Campaign Type</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="leads" fill="#3b82f6" radius={[4,4,0,0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Budget vs Spent by Campaign</h3>
          {companyCampaigns.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={companyCampaigns.map(c => ({ name: c.name.substring(0,12)+"…", budget: c.budget, spent: c.spent }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="budget" fill="#e2e8f0" radius={[4,4,0,0]} name="Budget" />
                <Bar dataKey="spent"  fill="#3b82f6" radius={[4,4,0,0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Campaigns</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Megaphone className="w-7 h-7 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-700">No campaigns yet</p>
            <p className="text-sm text-gray-400">Click &quot;New Campaign&quot; to create your first one.</p>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />New Campaign</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Budget Used</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(camp => {
                const budgetPct = camp.budget > 0 ? Math.round((camp.spent / camp.budget) * 100) : 0;
                const convPct   = camp.leads  > 0 ? Math.round((camp.conversions / camp.leads) * 100) : 0;
                return (
                  <TableRow key={camp.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900 cursor-pointer" onClick={() => setViewItem(camp)}>{camp.name}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${typeColors[camp.type] ?? "bg-gray-100 text-gray-700"}`}>{camp.type}</span>
                    </TableCell>
                    <TableCell className="text-gray-700">{formatCurrency(camp.budget)}</TableCell>
                    <TableCell className="text-gray-700">{formatCurrency(camp.spent)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={budgetPct} className={`h-1.5 w-16 ${budgetPct > 90 ? "[&>div]:bg-red-500" : ""}`} />
                        <span className="text-xs text-gray-500">{budgetPct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-gray-800">{camp.leads}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-gray-800">{camp.conversions}</span>
                      <span className="text-xs text-gray-400 ml-1">({convPct}%)</span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{formatDate(camp.startDate)} – {formatDate(camp.endDate)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(camp.status)}`}>{camp.status}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(camp)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(camp.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* View Detail Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Campaign Details</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{viewItem.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[viewItem.type]}`}>{viewItem.type}</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(viewItem.status)}`}>{viewItem.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Budget",          value: formatCurrency(viewItem.budget) },
                  { label: "Spent",           value: formatCurrency(viewItem.spent) },
                  { label: "Leads Generated", value: String(viewItem.leads) },
                  { label: "Conversions",     value: String(viewItem.conversions) },
                  { label: "Start Date",      value: formatDate(viewItem.startDate) },
                  { label: "End Date",        value: formatDate(viewItem.endDate) },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-semibold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
              {viewItem.budget > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Budget Utilization</span>
                    <span className="font-medium">{Math.round((viewItem.spent/viewItem.budget)*100)}%</span>
                  </div>
                  <Progress value={Math.round((viewItem.spent/viewItem.budget)*100)} className="h-2" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
            <Button onClick={() => { if (viewItem) { openEdit(viewItem); setViewItem(null); } }}>Edit Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Campaign" : "Create New Campaign"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Campaign Name</label>
              <Input placeholder="e.g. Q2 Email Campaign" value={form.name} onChange={e => sf({ name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
                <Select value={form.type} onValueChange={v => sf({ type: v as Campaign["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="paid">Paid Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v as Campaign["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Budget (TZS)</label>
                <Input type="number" placeholder="0" value={form.budget} onChange={e => sf({ budget: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Spent (TZS)</label>
                <Input type="number" placeholder="0" value={form.spent} onChange={e => sf({ spent: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Leads</label>
                <Input type="number" placeholder="0" value={form.leads} onChange={e => sf({ leads: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Conversions</label>
                <Input type="number" placeholder="0" value={form.conversions} onChange={e => sf({ conversions: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Start Date</label>
                <Input type="date" value={form.startDate} onChange={e => sf({ startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">End Date</label>
                <Input type="date" value={form.endDate} onChange={e => sf({ endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Create Campaign"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Campaign</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this campaign? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteItem(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
