"use client";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Users, DollarSign, CheckSquare, TrendingUp, AlertCircle,
  Calendar, Package, Clock, ArrowRight, Building2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  monthlyRevenueData, salesPipelineData, tasks, leaveRequests,
  users, invoices, supportTickets, kpis, notifications, currentCompany,
  attendanceSummary
} from "@/lib/data";
import { formatCurrency, getInitials, getStatusColor, formatDate } from "@/lib/utils";
import Link from "next/link";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export default function DashboardPage() {
  const activeUsers = users.filter(u => u.status === "active" && u.companyId === "c1").length;
  const pendingLeaves = leaveRequests.filter(l => l.status === "pending").length;
  const openTickets = supportTickets.filter(t => t.status === "open" || t.status === "in-progress").length;
  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;
  const totalRevenue = monthlyRevenueData[monthlyRevenueData.length - 1].revenue;
  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "in-progress").length;
  const onTrackKpis = kpis.filter(k => k.status === "on-track").length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <MainLayout>
      {/* Welcome Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Building2 className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Good morning, John!</h1>
            <p className="text-sm text-gray-500">{currentCompany.name} · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
        {unreadNotifications > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 w-fit">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">You have <strong>{unreadNotifications}</strong> unread notifications</span>
            <Link href="/notifications" className="text-xs text-blue-600 font-medium ml-1 hover:underline">View →</Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          trend={14}
          subtitle="February 2026"
        />
        <StatCard
          title="Active Staff"
          value={activeUsers}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          trend={2}
          subtitle="Across all departments"
        />
        <StatCard
          title="Active Tasks"
          value={pendingTasks}
          icon={CheckSquare}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          subtitle="Pending & In-progress"
        />
        <StatCard
          title="Sales Pipeline"
          value={formatCurrency(salesPipelineData.reduce((s, i) => s + i.value, 0))}
          icon={TrendingUp}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          trend={8}
          subtitle="Total pipeline value"
        />
      </div>

      {/* Alert Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending Leaves", value: pendingLeaves, color: "yellow", icon: Calendar, href: "/leave" },
          { label: "Open Tickets", value: openTickets, color: "red", icon: AlertCircle, href: "/tickets" },
          { label: "Overdue Invoices", value: overdueInvoices, color: "red", icon: DollarSign, href: "/invoices" },
          { label: "KPIs On-Track", value: `${onTrackKpis}/${kpis.length}`, color: "green", icon: TrendingUp, href: "/kpis" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  item.color === "yellow" ? "bg-yellow-50" : item.color === "red" ? "bg-red-50" : "bg-green-50"
                }`}>
                  <Icon className={`w-4.5 h-4.5 ${
                    item.color === "yellow" ? "text-yellow-600" : item.color === "red" ? "text-red-500" : "text-green-600"
                  }`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Revenue vs Expenses</h3>
              <p className="text-xs text-gray-400">Last 6 months performance</p>
            </div>
            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">+14% MoM</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyRevenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpenses)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Pipeline */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Sales Pipeline</h3>
            <p className="text-xs text-gray-400">By stage value</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={salesPipelineData} dataKey="value" nameKey="stage" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {salesPipelineData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {salesPipelineData.slice(0, 4).map((item, i) => (
              <div key={item.stage} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-600">{item.stage}</span>
                </div>
                <span className="font-medium text-gray-800">{item.count} deals</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Attendance */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">This Week Attendance</h3>
            <Link href="/attendance" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={attendanceSummary} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
              <Bar dataKey="present" fill="#10b981" radius={[3, 3, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="#ef4444" radius={[3, 3, 0, 0]} name="Absent" />
              <Bar dataKey="late" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Late" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Tasks</h3>
            <Link href="/tasks" className="text-xs text-blue-600 hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 4).map((task) => {
              const assignee = users.find(u => u.id === task.assignedTo);
              return (
                <div key={task.id} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                    task.priority === "critical" ? "bg-red-500" :
                    task.priority === "high" ? "bg-orange-500" :
                    task.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400">{assignee?.name} · Due {formatDate(task.dueDate)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KPI Overview */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">KPI Overview</h3>
            <Link href="/kpis" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {kpis.slice(0, 4).map((kpi) => {
              const pct = Math.round((kpi.actual / kpi.target) * 100);
              return (
                <div key={kpi.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 truncate">{kpi.name}</span>
                    <span className={`shrink-0 ml-2 ${kpi.status === "on-track" ? "text-green-600" : kpi.status === "at-risk" ? "text-yellow-600" : "text-red-500"}`}>
                      {pct}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(pct, 100)}
                    className={`h-1.5 ${kpi.status === "on-track" ? "[&>div]:bg-green-500" : kpi.status === "at-risk" ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
            <Link href="/invoices" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {invoices.slice(0, 4).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">Due {formatDate(inv.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(inv.status)}`}>{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Support Tickets</h3>
            <Link href="/tickets" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {supportTickets.slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-800 truncate">{ticket.subject}</p>
                  <p className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.priority)}`}>{ticket.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
