"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
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
import { TrendingUp, Plus, Search, DollarSign, Target, Users, ArrowRight } from "lucide-react";
import { salesLeads, users } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const stageOrder = ["lead", "prospect", "qualified", "proposal", "won", "lost"];
const stageColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800",
  prospect: "bg-purple-100 text-purple-800",
  qualified: "bg-indigo-100 text-indigo-800",
  proposal: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<typeof salesLeads[0] | null>(null);

  const companyLeads = salesLeads.filter(l => l.companyId === "c1");
  const filtered = companyLeads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.company || "").toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || l.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const totalPipeline = companyLeads.filter(l => !["won","lost"].includes(l.stage)).reduce((s,l) => s + l.value, 0);
  const wonValue = companyLeads.filter(l => l.stage === "won").reduce((s,l) => s + l.value, 0);
  const activeLeads = companyLeads.filter(l => !["won","lost"].includes(l.stage)).length;
  const winRate = Math.round((companyLeads.filter(l => l.stage === "won").length / companyLeads.length) * 100);

  const pipelineByStage = stageOrder.slice(0,5).map(stage => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: companyLeads.filter(l => l.stage === stage).length,
    value: companyLeads.filter(l => l.stage === stage).reduce((s,l) => s + l.value, 0),
  }));

  return (
    <MainLayout>
      <PageHeader
        title="Sales Pipeline"
        subtitle="Track leads, prospects, deals and forecasting"
        icon={TrendingUp}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Lead
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pipeline Value" value={formatCurrency(totalPipeline)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Won Revenue" value={formatCurrency(wonValue)} icon={TrendingUp} iconBg="bg-green-50" iconColor="text-green-600" trend={12} />
        <StatCard title="Active Deals" value={activeLeads} icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Win Rate" value={`${winRate}%`} icon={Users} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      {/* Pipeline Funnel Chart */}
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
            {pipelineByStage.map((s, i) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{s.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{s.count} deals</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(s.value)}</span>
                  </div>
                </div>
                <Progress value={Math.round((s.value / totalPipeline) * 100) || 0} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

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
                      <div
                        key={lead.id}
                        className="bg-gray-50 rounded-lg p-2.5 cursor-pointer hover:bg-gray-100 border border-gray-100 transition-colors"
                        onClick={() => setSelectedLead(lead)}
                      >
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
        </TabsContent>

        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
                  const assignee = users.find(u => u.id === lead.assignedTo);
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
                        <div className="flex items-center justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
          {selectedLead && (
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
                  { label: "Email", value: selectedLead.email },
                  { label: "Phone", value: selectedLead.phone },
                  { label: "Source", value: selectedLead.source },
                  { label: "Deal Value", value: formatCurrency(selectedLead.value) },
                  { label: "Probability", value: `${selectedLead.probability}%` },
                  { label: "Expected Close", value: formatDate(selectedLead.expectedClose) },
                  { label: "Assigned To", value: users.find(u => u.id === selectedLead.assignedTo)?.name || "—" },
                  { label: "Created", value: formatDate(selectedLead.createdAt) },
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>Close</Button>
            <Button>Move Stage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Contact Name</label>
                <Input placeholder="Full name" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company</label>
                <Input placeholder="Company name" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <Input type="email" placeholder="email@company.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input placeholder="+255 7XX XXX XXX" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Lead Source</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {["Referral","Cold Call","Website","Exhibition","Social Media","Government Portal"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Deal Value (TZS)</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.companyId === "c1" && ["Sales","manager"].includes(u.department) || u.role === "manager").map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Expected Close</label>
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
