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
import { Clock, Users, AlertTriangle, CheckCircle, TrendingUp, Plus } from "lucide-react";
import { attendanceRecords, users } from "@/lib/data";
import { formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const weeklyData = [
  { day: "Mon 23", present: 10, absent: 1, late: 1 },
  { day: "Tue 24", present: 9, absent: 2, late: 1 },
  { day: "Wed 25", present: 11, absent: 0, late: 1 },
  { day: "Thu 26", present: 10, absent: 1, late: 2 },
  { day: "Fri 27", present: 8, absent: 2, late: 2 },
];

export default function AttendancePage() {
  const [dateFilter, setDateFilter] = useState("2026-02-24");
  const [showClockDialog, setShowClockDialog] = useState(false);

  const companyUsers = users.filter(u => u.companyId === "c1" && u.status === "active");
  const dayRecords = attendanceRecords.filter(r => r.date === dateFilter && r.companyId === "c1");

  const present = dayRecords.filter(r => r.status === "present").length;
  const absent = dayRecords.filter(r => r.status === "absent").length;
  const late = dayRecords.filter(r => r.status === "late").length;
  const halfDay = dayRecords.filter(r => r.status === "half-day").length;
  const totalOvertime = dayRecords.reduce((s, r) => s + (r.overtime || 0), 0);
  const avgHours = dayRecords.filter(r => r.hoursWorked && r.hoursWorked > 0).reduce((s,r,_,a) => s + (r.hoursWorked || 0)/a.length, 0);

  const statusColors: Record<string, string> = {
    present: "bg-green-100 text-green-800",
    absent: "bg-red-100 text-red-800",
    late: "bg-yellow-100 text-yellow-800",
    "half-day": "bg-blue-100 text-blue-800",
  };

  return (
    <MainLayout>
      <PageHeader
        title="Attendance Management"
        subtitle="Track daily attendance, overtime and time records"
        icon={Clock}
        actions={
          <>
            <Button variant="outline" size="sm">Export Report</Button>
            <Button size="sm" onClick={() => setShowClockDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Clock In/Out
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Present Today" value={present} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Absent" value={absent} icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" />
        <StatCard title="Late" value={late} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Total Overtime" value={`${totalOvertime.toFixed(1)}h`} icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="Today" />
      </div>

      <Tabs defaultValue="daily">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Date:</label>
            <Input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        <TabsContent value="daily">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Attendance – {formatDate(dateFilter)}</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />{present} Present</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" />{absent} Absent</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" />{late} Late</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Late (mins)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyUsers.map(user => {
                  const record = dayRecords.find(r => r.userId === user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{user.department}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-700">
                        {record?.clockIn || <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-700">
                        {record?.clockOut || <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell>
                        {record?.hoursWorked ? (
                          <span className="font-semibold text-gray-900">{record.hoursWorked.toFixed(1)}h</span>
                        ) : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell>
                        {record?.overtime && record.overtime > 0 ? (
                          <span className="text-purple-700 font-semibold">+{record.overtime.toFixed(1)}h</span>
                        ) : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell>
                        {record?.lateMinutes && record.lateMinutes > 0 ? (
                          <span className="text-yellow-700 font-semibold">{record.lateMinutes} min</span>
                        ) : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell>
                        {record ? (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[record.status]}`}>
                            {record.status}
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-800">absent</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="weekly">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Week of Feb 23–27, 2026</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="present" fill="#10b981" radius={[3,3,0,0]} name="Present" />
                  <Bar dataKey="absent" fill="#ef4444" radius={[3,3,0,0]} name="Absent" />
                  <Bar dataKey="late" fill="#f59e0b" radius={[3,3,0,0]} name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Weekly Statistics</h3>
              <div className="space-y-3">
                {[
                  { label: "Avg. Daily Attendance", value: "91%", color: "text-green-600" },
                  { label: "Total Staff Working Days", value: "48 / 55", color: "text-blue-600" },
                  { label: "Total Overtime Hours", value: "18.5h", color: "text-purple-600" },
                  { label: "Total Late Arrivals", value: "7 incidents", color: "text-yellow-600" },
                  { label: "Total Absent Days", value: "7 days", color: "text-red-500" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className={`font-bold text-sm ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monthly">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">February 2026 – Monthly Attendance Summary</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Overtime (hrs)</TableHead>
                  <TableHead>Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyUsers.map(user => {
                  const userRecords = attendanceRecords.filter(r => r.userId === user.id && r.companyId === "c1");
                  const presentDays = userRecords.filter(r => r.status === "present" || r.status === "late").length;
                  const absentDays = userRecords.filter(r => r.status === "absent").length;
                  const lateDays = userRecords.filter(r => r.status === "late").length;
                  const overtime = userRecords.reduce((s,r) => s + (r.overtime || 0), 0);
                  const workingDays = 20;
                  const pct = Math.round((presentDays / workingDays) * 100);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{user.department}</TableCell>
                      <TableCell className="text-sm text-gray-700">{workingDays}</TableCell>
                      <TableCell className="text-green-700 font-semibold">{presentDays}</TableCell>
                      <TableCell className="text-red-600 font-semibold">{absentDays}</TableCell>
                      <TableCell className="text-yellow-700 font-semibold">{lateDays}</TableCell>
                      <TableCell className="text-purple-700 font-semibold">{overtime.toFixed(1)}</TableCell>
                      <TableCell>
                        <span className={`font-bold text-sm ${pct >= 95 ? "text-green-600" : pct >= 85 ? "text-yellow-600" : "text-red-500"}`}>
                          {pct}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Clock In/Out Dialog */}
      <Dialog open={showClockDialog} onOpenChange={setShowClockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Attendance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Employee</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {companyUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date</label>
                <Input type="date" defaultValue={dateFilter} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Action</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Clock In / Out" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Clock In</SelectItem>
                    <SelectItem value="out">Clock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Time</label>
              <Input type="time" defaultValue={new Date().toTimeString().slice(0,5)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClockDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowClockDialog(false)}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
