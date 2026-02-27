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
import { Megaphone, Plus, Search, DollarSign, Users, TrendingUp, Target } from "lucide-react";
import { campaigns } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function MarketingPage() {
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<typeof campaigns[0] | null>(null);

  const companyCampaigns = campaigns.filter(c => c.companyId === "c1");
  const filtered = companyCampaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBudget = companyCampaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = companyCampaigns.reduce((s, c) => s + c.spent, 0);
  const totalLeads = companyCampaigns.reduce((s, c) => s + c.leads, 0);
  const totalConversions = companyCampaigns.reduce((s, c) => s + c.conversions, 0);
  const conversionRate = Math.round((totalConversions / totalLeads) * 100);

  const typeData = ["email","social","event","paid","sms"].map(type => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    campaigns: companyCampaigns.filter(c => c.type === type).length,
    leads: companyCampaigns.filter(c => c.type === type).reduce((s,c) => s + c.leads, 0),
  })).filter(d => d.campaigns > 0);

  const typeColors: Record<string, string> = {
    email: "bg-blue-100 text-blue-800",
    social: "bg-purple-100 text-purple-800",
    event: "bg-green-100 text-green-800",
    paid: "bg-orange-100 text-orange-800",
    sms: "bg-yellow-100 text-yellow-800",
  };

  return (
    <MainLayout>
      <PageHeader
        title="Marketing Management"
        subtitle="Campaign tracking, lead generation and marketing analytics"
        icon={Megaphone}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Budget" value={formatCurrency(totalBudget)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Total Spent" value={formatCurrency(totalSpent)} icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle={`${Math.round((totalSpent/totalBudget)*100)}% of budget`} />
        <StatCard title="Leads Generated" value={totalLeads} icon={Users} iconBg="bg-green-50" iconColor="text-green-600" trend={22} />
        <StatCard title="Conversion Rate" value={`${conversionRate}%`} icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle={`${totalConversions} conversions`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Leads by Campaign Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="leads" fill="#3b82f6" radius={[4,4,0,0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Budget vs Spent by Campaign</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={companyCampaigns.map(c => ({ name: c.name.substring(0,15)+"…", budget: c.budget, spent: c.spent }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
              <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="budget" fill="#e2e8f0" radius={[4,4,0,0]} name="Budget" />
              <Bar dataKey="spent" fill="#3b82f6" radius={[4,4,0,0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(camp => {
              const budgetPct = Math.round((camp.spent / camp.budget) * 100);
              const convPct = Math.round((camp.conversions / camp.leads) * 100) || 0;
              return (
                <TableRow key={camp.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedCampaign(camp)}>
                  <TableCell className="font-medium text-gray-900">{camp.name}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${typeColors[camp.type] || "bg-gray-100 text-gray-700"}`}>
                      {camp.type}
                    </span>
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
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{camp.conversions}</span>
                      <span className="text-xs text-gray-400">({convPct}%)</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {formatDate(camp.startDate)} – {formatDate(camp.endDate)}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(camp.status)}`}>
                      {camp.status}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Campaign Detail */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Campaign Details</DialogTitle></DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedCampaign.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[selectedCampaign.type]}`}>{selectedCampaign.type}</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(selectedCampaign.status)}`}>
                  {selectedCampaign.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Budget", value: formatCurrency(selectedCampaign.budget) },
                  { label: "Spent", value: formatCurrency(selectedCampaign.spent) },
                  { label: "Leads Generated", value: selectedCampaign.leads.toString() },
                  { label: "Conversions", value: selectedCampaign.conversions.toString() },
                  { label: "Start Date", value: formatDate(selectedCampaign.startDate) },
                  { label: "End Date", value: formatDate(selectedCampaign.endDate) },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-semibold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Budget Utilization</span>
                  <span className="font-medium">{Math.round((selectedCampaign.spent/selectedCampaign.budget)*100)}%</span>
                </div>
                <Progress value={Math.round((selectedCampaign.spent/selectedCampaign.budget)*100)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Lead Conversion Rate</span>
                  <span className="font-medium">{Math.round((selectedCampaign.conversions/selectedCampaign.leads)*100)}%</span>
                </div>
                <Progress value={Math.round((selectedCampaign.conversions/selectedCampaign.leads)*100)} className="h-2 [&>div]:bg-green-500" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCampaign(null)}>Close</Button>
            <Button>Edit Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Campaign Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Campaign Name</label>
              <Input placeholder="e.g. Q2 Email Campaign" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Budget (TZS)</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Start Date</label>
                <Input type="date" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">End Date</label>
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
