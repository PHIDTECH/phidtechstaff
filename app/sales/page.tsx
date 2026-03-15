"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Plus, Search, DollarSign, Target, Users, ArrowRight, Edit, Trash2, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SESSION_KEY = "phidtech_session";
const ACTIVE_KEY  = "phidtech_active_company";
const LEADS_KEY   = "phidtech_sales_leads";
const USERS_KEY   = "phidtech_users";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; position?: string; }
interface Lead {
  id: string; companyId: string; name: string; company: string;
  email: string; phone: string; source: string; value: number;
  assignedTo: string; expectedClose: string;
  stage: "lead"|"prospect"|"qualified"|"proposal"|"won"|"lost";
  probability: number; createdAt: string;
}

const LEAD_SOURCES = ["Referral","Cold Call","Website","Exhibition","Social Media","Government Portal","Walk-in","Other"];
const stageOrder   = ["lead","prospect","qualified","proposal","won","lost"] as Lead["stage"][];
const stageProbMap: Record<Lead["stage"], number> = {
  lead: 10, prospect: 25, qualified: 50, proposal: 70, won: 100, lost: 0,
};

const emptyForm = () => ({
  name: "", company: "", email: "", phone: "",
  source: "Referral", value: "", assignedTo: "",
  expectedClose: "", stage: "lead" as Lead["stage"],
});

const stageColors: Record<string, string> = {
  lead:      "bg-blue-100 text-blue-800",
  prospect:  "bg-purple-100 text-purple-800",
  qualified: "bg-indigo-100 text-indigo-800",
  proposal:  "bg-orange-100 text-orange-800",
  won:       "bg-green-100 text-green-800",
  lost:      "bg-red-100 text-red-800",
};

export default function SalesPage() {
  usePermissionGuard("sales");
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [staff, setStaff]               = useState<StaffUser[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                          = useRef("");
  const [search, setSearch]             = useState("");
  const [stageFilter, setStageFilter]   = useState("all");
  const [showDialog, setShowDialog]     = useState(false);
  const [editItem, setEditItem]         = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [form, setForm]                 = useState(emptyForm());
  const [formError, setFormError]       = useState("");

  const reload = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const cid  = sess?.isSuperAdmin ? lsStr(ACTIVE_KEY) : (sess?.companyId ?? lsStr(ACTIVE_KEY));
    setActiveCompanyId(cid);
    cidRef.current = cid;
    setLeads(lsGet<Lead[]>(LEADS_KEY, []));
    setStaff(lsGet<StaffUser[]>(USERS_KEY, []));
  };

  useEffect(() => { reload(); }, []);

  const cid          = cidRef.current || activeCompanyId;
  const companyLeads = cid ? leads.filter(l => l.companyId === cid) : leads;
  const companyStaff = cid ? staff.filter(u => u.companyId === cid) : staff;

  const filtered = companyLeads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.company ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || l.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const totalPipeline = companyLeads.filter(l => !["won","lost"].includes(l.stage)).reduce((s,l) => s + l.value, 0);
  const wonValue      = companyLeads.filter(l => l.stage === "won").reduce((s,l) => s + l.value, 0);
  const activeLeadsN  = companyLeads.filter(l => !["won","lost"].includes(l.stage)).length;
  const winRate       = companyLeads.length > 0 ? Math.round((companyLeads.filter(l => l.stage === "won").length / companyLeads.length) * 100) : 0;

  const pipelineByStage = stageOrder.slice(0,5).map(stage => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: companyLeads.filter(l => l.stage === stage).length,
    value: companyLeads.filter(l => l.stage === stage).reduce((s,l) => s + l.value, 0),
  }));

  const save = (list: Lead[]) => { lsSet(LEADS_KEY, list); setLeads(list); };

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (l: Lead) => {
    setEditItem(l);
    setForm({
      name: l.name, company: l.company, email: l.email, phone: l.phone,
      source: l.source, value: String(l.value), assignedTo: l.assignedTo,
      expectedClose: l.expectedClose, stage: l.stage,
    });
    setFormError("");
    setShowDialog(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) { setFormError("Enter a contact name."); return; }
    const prob = stageProbMap[form.stage] ?? 10;

    if (editItem) {
      const updated = leads.map(l => l.id === editItem.id ? {
        ...l, name: form.name.trim(), company: form.company, email: form.email,
        phone: form.phone, source: form.source, value: Number(form.value)||0,
        assignedTo: form.assignedTo, expectedClose: form.expectedClose,
        stage: form.stage, probability: prob,
      } : l);
      save(updated);
    } else {
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        companyId: cidRef.current || activeCompanyId,
        name: form.name.trim(), company: form.company, email: form.email,
        phone: form.phone, source: form.source, value: Number(form.value)||0,
        assignedTo: form.assignedTo, expectedClose: form.expectedClose,
        stage: form.stage, probability: prob,
        createdAt: new Date().toISOString(),
      };
      save([...leads, newLead]);
    }
    setShowDialog(false);
  };

  const moveStage = (lead: Lead, direction: 1 | -1) => {
    const idx     = stageOrder.indexOf(lead.stage);
    const newStage = stageOrder[Math.max(0, Math.min(stageOrder.length - 1, idx + direction))];
    const updated  = leads.map(l => l.id === lead.id ? { ...l, stage: newStage, probability: stageProbMap[newStage] } : l);
    save(updated);
    setSelectedLead(prev => prev?.id === lead.id ? { ...prev, stage: newStage, probability: stageProbMap[newStage] } : prev);
  };

  const deleteLead = (id: string) => { save(leads.filter(l => l.id !== id)); setDeleteId(null); };

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  return (
    <MainLayout>
      <PageHeader
        title="Sales Pipeline"
        subtitle="Track leads, prospects, deals and forecasting"
        icon={TrendingUp}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Lead
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pipeline Value" value={formatCurrency(totalPipeline)} icon={DollarSign}  iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Won Revenue"   value={formatCurrency(wonValue)}        icon={TrendingUp}  iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatCard title="Active Deals"  value={activeLeadsN}                    icon={Target}      iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Win Rate"      value={`${winRate}%`}                   icon={Users}       iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      {/* Pipeline Chart */}
      {pipelineByStage.some(s => s.count > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline by Stage</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineByStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} name="Pipeline Value" />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {pipelineByStage.map(s => (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{s.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{s.count} deals</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(s.value)}</span>
                    </div>
                  </div>
                  <Progress value={totalPipeline > 0 ? Math.round((s.value / totalPipeline) * 100) : 0} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="pipeline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Stages" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stageOrder.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="pipeline">
          {companyLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-blue-400" />
              </div>
              <p className="font-semibold text-gray-700">No leads yet</p>
              <p className="text-sm text-gray-400">Click &quot;Add Lead&quot; to start tracking your pipeline.</p>
              <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Lead</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {stageOrder.map(stage => {
                const stageLeads = companyLeads.filter(l => l.stage === stage);
                return (
                  <div key={stage} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider ${stageColors[stage]}`}>
                      {stage} <span className="ml-1 font-normal">({stageLeads.length})</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[120px]">
                      {stageLeads.map(lead => (
                        <div key={lead.id}
                          className="bg-gray-50 rounded-lg p-2.5 cursor-pointer hover:bg-gray-100 border border-gray-100 transition-colors"
                          onClick={() => setSelectedLead(lead)}>
                          <p className="font-medium text-gray-800 text-xs truncate">{lead.name}</p>
                          {lead.company && <p className="text-[10px] text-gray-400 truncate">{lead.company}</p>}
                          <p className="text-xs font-semibold text-blue-700 mt-1">{formatCurrency(lead.value)}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-400">{lead.probability}%</span>
                            <Progress value={lead.probability} className="h-1 w-12" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <TrendingUp className="w-10 h-10 text-gray-300" />
                <p className="text-gray-500 text-sm">No leads match your filter.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Deal Value</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Expected Close</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(lead => {
                    const assignee = companyStaff.find(u => u.id === lead.assignedTo);
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <p className="font-medium text-gray-900">{lead.name}</p>
                          {lead.company && <p className="text-xs text-gray-400">{lead.company}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{lead.source}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${stageColors[lead.stage]}`}>
                            {lead.stage}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">{formatCurrency(lead.value)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={lead.probability} className="h-1.5 w-16" />
                            <span className="text-xs text-gray-600">{lead.probability}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{formatDate(lead.expectedClose)}</TableCell>
                        <TableCell>
                          {assignee && (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="text-[10px]">{getInitials(assignee.name)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-700">{assignee.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}><ArrowRight className="w-4 h-4 text-gray-400" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(lead.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
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
      </Tabs>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
          {selectedLead && (() => {
            const assignee = companyStaff.find(u => u.id === selectedLead.assignedTo);
            return (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{selectedLead.name}</h3>
                    {selectedLead.company && <p className="text-gray-500">{selectedLead.company}</p>}
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${stageColors[selectedLead.stage]}`}>
                    {selectedLead.stage}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Email",          value: selectedLead.email || "—" },
                    { label: "Phone",          value: selectedLead.phone || "—" },
                    { label: "Source",         value: selectedLead.source },
                    { label: "Deal Value",     value: formatCurrency(selectedLead.value) },
                    { label: "Probability",    value: `${selectedLead.probability}%` },
                    { label: "Expected Close", value: formatDate(selectedLead.expectedClose) },
                    { label: "Assigned To",    value: assignee?.name ?? "—" },
                    { label: "Created",        value: formatDate(selectedLead.createdAt) },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                      <p className="font-medium text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Win Probability</p>
                  <Progress value={selectedLead.probability} className="h-2" />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>Close</Button>
            <Button variant="outline" onClick={() => selectedLead && moveStage(selectedLead, -1)}>← Prev Stage</Button>
            <Button onClick={() => selectedLead && moveStage(selectedLead, 1)}>Next Stage →</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Lead" : "Add New Lead"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Contact Name *</label>
                <Input placeholder="Full name" value={form.name} onChange={e => sf({ name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company</label>
                <Input placeholder="Company name" value={form.company} onChange={e => sf({ company: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <Input type="email" placeholder="email@company.com" value={form.email} onChange={e => sf({ email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input placeholder="+255 7XX XXX XXX" value={form.phone} onChange={e => sf({ phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Lead Source</label>
                <Select value={form.source} onValueChange={v => sf({ source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Deal Value (TZS)</label>
                <Input type="number" placeholder="0" value={form.value} onChange={e => sf({ value: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To (Agent)</label>
                <Select value={form.assignedTo} onValueChange={v => sf({ assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {companyStaff.map(u => <SelectItem key={u.id} value={u.id}>{u.name}{u.position ? ` – ${u.position}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Expected Close</label>
                <Input type="date" value={form.expectedClose} onChange={e => sf({ expectedClose: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Stage</label>
                <Select value={form.stage} onValueChange={v => sf({ stage: v as Lead["stage"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stageOrder.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editItem ? "Save Changes" : "Add Lead"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Lead</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteLead(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
