"use client";
export const dynamic = "force-dynamic";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Download, TrendingUp, DollarSign, Users, Target } from "lucide-react";
import { monthlyRevenueData, users, tasks, kpis, attendanceRecords, invoices } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const deptProductivity = [
  { dept: "Engineering", tasks: 4, completed: 2, rate: 50 },
  { dept: "Sales", tasks: 3, completed: 1, rate: 33 },
  { dept: "Finance", tasks: 2, completed: 2, rate: 100 },
  { dept: "Marketing", tasks: 2, completed: 0, rate: 0 },
  { dept: "HR & Admin", tasks: 1, completed: 0, rate: 0 },
];

const salesByMonth = [
  { month: "Sep", revenue: 55000000, target: 60000000 },
  { month: "Oct", revenue: 62000000, target: 65000000 },
  { month: "Nov", revenue: 58000000, target: 65000000 },
  { month: "Dec", revenue: 75000000, target: 70000000 },
  { month: "Jan", revenue: 70000000, target: 75000000 },
  { month: "Feb", revenue: 80000000, target: 80000000 },
];

const expenseBreakdown = [
  { name: "Salaries", value: 38000000 },
  { name: "Rent", value: 7200000 },
  { name: "Marketing", value: 4500000 },
  { name: "Travel", value: 2100000 },
  { name: "Other", value: 3200000 },
];

export default function ReportsPage() {
  const activeUsers = users.filter(u => u.companyId === "c1" && u.status === "active").length;
  const totalPayroll = users.filter(u => u.companyId === "c1").reduce((s, u) => s + u.salary, 0);
  const revenue = monthlyRevenueData[monthlyRevenueData.length - 1].revenue;
  const profit = monthlyRevenueData[monthlyRevenueData.length - 1].profit;
  const onTrackKPIs = kpis.filter(k => k.companyId === "c1" && k.status === "on-track").length;

  return (
    <MainLayout>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive business performance reports and insights"
        icon={BarChart3}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export Excel
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Monthly Revenue" value={formatCurrency(revenue)} icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600" trend={14} />
        <StatCard title="Net Profit" value={formatCurrency(profit)} icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" trend={8} />
        <StatCard title="Active Staff" value={activeUsers} icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="KPIs On-Track" value={`${onTrackKPIs}/${kpis.filter(k => k.companyId === "c1").length}`} icon={Target} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <Tabs defaultValue="financial">
        <TabsList className="mb-6">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="hr">HR & Attendance</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Revenue vs Expenses vs Profit */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Financial Performance – 6 Month Trend</h3>
                  <p className="text-xs text-gray-400">Revenue, Expenses & Net Profit</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#gradRev)" name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gradExp)" name="Expenses" />
                  <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} fill="url(#gradProfit)" name="Net Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                    {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {expenseBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Invoice Status Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "Paid", count: invoices.filter(i=>i.status==="paid").length, value: invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.total,0), color: "bg-green-500" },
                  { label: "Sent / Pending", count: invoices.filter(i=>i.status==="sent").length, value: invoices.filter(i=>i.status==="sent").reduce((s,i)=>s+i.total,0), color: "bg-blue-500" },
                  { label: "Overdue", count: invoices.filter(i=>i.status==="overdue").length, value: invoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.total,0), color: "bg-red-500" },
                  { label: "Draft", count: invoices.filter(i=>i.status==="draft").length, value: invoices.filter(i=>i.status==="draft").reduce((s,i)=>s+i.total,0), color: "bg-gray-400" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.count} invoices</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Sales vs Target – Monthly</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="target" fill="#e2e8f0" radius={[4,4,0,0]} name="Target" />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} name="Actual Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Sales KPIs Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "Total Revenue YTD", value: formatCurrency(monthlyRevenueData.reduce((s,m)=>s+m.revenue,0)), trend: "+14%" },
                  { label: "Total Pipeline Value", value: formatCurrency(525000000), trend: "+22%" },
                  { label: "Deals Won (Q1)", value: "3 deals", trend: "" },
                  { label: "Conversion Rate", value: "17%", trend: "+3%" },
                  { label: "Avg. Deal Value", value: formatCurrency(78333333), trend: "" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{item.value}</span>
                      {item.trend && <span className="text-xs text-green-600 font-medium">{item.trend}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Top Sales Staff</h3>
              <div className="space-y-3">
                {users.filter(u => u.department === "Sales" && u.companyId === "c1").map((user, i) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-white" : "bg-gray-100 text-gray-600"}`}>{i+1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.position}</p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{formatCurrency(user.salary * 12)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hr">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Staff Overview</h3>
              <div className="space-y-3">
                {[
                  { label: "Total Staff", value: users.filter(u => u.companyId === "c1").length },
                  { label: "Active", value: users.filter(u => u.companyId === "c1" && u.status === "active").length },
                  { label: "Admins", value: users.filter(u => u.companyId === "c1" && u.role === "admin").length },
                  { label: "Managers", value: users.filter(u => u.companyId === "c1" && u.role === "manager").length },
                  { label: "Staff", value: users.filter(u => u.companyId === "c1" && u.role === "staff").length },
                  { label: "Total Annual Payroll", value: formatCurrency(totalPayroll * 12) },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Payroll by Department</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={
                  ["Engineering","Sales","Finance","Marketing","HR & Admin"].map(dept => ({
                    dept: dept.split(" ")[0],
                    payroll: users.filter(u => u.department === dept && u.companyId === "c1").reduce((s,u) => s + u.salary, 0),
                  }))
                }>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dept" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="payroll" fill="#8b5cf6" radius={[4,4,0,0]} name="Monthly Payroll" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="productivity">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Task Completion by Department</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptProductivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="tasks" fill="#e2e8f0" radius={[0,4,4,0]} name="Total Tasks" />
                  <Bar dataKey="completed" fill="#10b981" radius={[0,4,4,0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">KPI Performance Summary</h3>
              <div className="space-y-3">
                {kpis.filter(k => k.companyId === "c1").slice(0, 6).map(kpi => {
                  const pct = Math.min(Math.round((kpi.actual / kpi.target) * 100), 100);
                  return (
                    <div key={kpi.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 truncate mr-2">{kpi.name}</span>
                        <span className={`font-bold shrink-0 ${
                          kpi.status === "on-track" ? "text-green-600" :
                          kpi.status === "at-risk" ? "text-yellow-600" : "text-red-500"
                        }`}>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            kpi.status === "on-track" ? "bg-green-500" :
                            kpi.status === "at-risk" ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
