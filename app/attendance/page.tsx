"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, AlertTriangle, CheckCircle, TrendingUp, Plus, AlertCircle } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SESSION_KEY    = "phidtech_session";
const ACTIVE_KEY     = "phidtech_active_company";
const ATTENDANCE_KEY = "phidtech_attendance";
const USERS_KEY      = "phidtech_users";
const BRANCHES_KEY   = "phidtech_branches_cache";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; position: string; isSuperAdmin: boolean; companyId: string; branchId?: string | null; }
interface StaffUser { id: string; name: string; email?: string; companyId: string; branchId?: string | null; department?: string; position?: string; status?: string; }
interface Branch { id: string; companyId: string; name: string; allowedIPs?: string; }
interface AttendanceRecord {
  id: string; companyId: string; userId: string; date: string;
  clockIn?: string; clockOut?: string;
  hoursWorked?: number; overtime?: number; lateMinutes?: number;
  status: "present" | "absent" | "late" | "half-day";
  location?: "office" | "remote";
  clockInIP?: string;
}

const statusColors: Record<string, string> = {
  present:   "bg-green-100 text-green-800",
  absent:    "bg-red-100 text-red-800",
  late:      "bg-yellow-100 text-yellow-800",
  "half-day":"bg-blue-100 text-blue-800",
};

const WORK_START = "08:00"; // standard start time for late calculation

function calcStatus(clockIn?: string): AttendanceRecord["status"] {
  if (!clockIn) return "absent";
  return clockIn > WORK_START ? "late" : "present";
}

function calcLateMinutes(clockIn?: string): number {
  if (!clockIn || clockIn <= WORK_START) return 0;
  const [sh, sm] = WORK_START.split(":").map(Number);
  const [ih, im] = clockIn.split(":").map(Number);
  return (ih * 60 + im) - (sh * 60 + sm);
}

function calcHours(clockIn?: string, clockOut?: string): number {
  if (!clockIn || !clockOut) return 0;
  const [ih, im] = clockIn.split(":").map(Number);
  const [oh, om] = clockOut.split(":").map(Number);
  const diff = (oh * 60 + om) - (ih * 60 + im);
  return Math.max(0, diff / 60);
}

function calcOvertime(hours: number): number {
  return Math.max(0, hours - 8);
}

const today = new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  userId: "",
  date: today,
  action: "in" as "in" | "out",
  time: new Date().toTimeString().slice(0, 5),
  status: "present" as AttendanceRecord["status"],
});

export default function AttendancePage() {
  usePermissionGuard("attendance");
  const [records, setRecords]             = useState<AttendanceRecord[]>([]);
  const [staff, setStaff]                 = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading]   = useState(true);
  const [branches, setBranches]           = useState<Branch[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const cidRef                            = useRef("");
  const [dateFilter, setDateFilter]       = useState(today);
  const [showDialog, setShowDialog]       = useState(false);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

  const [session, setSession] = useState<Session | null>(() => {
    try { const v = localStorage.getItem(SESSION_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
  });

  const loadSession = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const resolvedCid = getActiveCid(sess);
    setActiveCompanyId(resolvedCid);
    cidRef.current = resolvedCid;
    // Load ALL staff from API — filter by companyId client-side
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      let data: StaffUser[] = res.ok ? await res.json() : [];
      if (!Array.isArray(data)) data = [];
      // Migrate localStorage users to API if API has fewer (handles first-time setup)
      const localUsers = lsGet<StaffUser[]>(USERS_KEY, []);
      if (localUsers.length > 0 && data.length < localUsers.length) {
        const serverEmails = new Set(data.map((u: StaffUser) => u.email?.toLowerCase()));
        const toMigrate = localUsers.filter(u => !serverEmails.has(u.email?.toLowerCase()));
        for (const u of toMigrate) {
          try { await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) }); } catch {}
        }
        const r2 = await fetch("/api/users", { cache: "no-store" });
        if (r2.ok) data = await r2.json();
      }
      setStaff(data.length > 0 ? data : localUsers);
    } catch {
      setStaff(lsGet<StaffUser[]>(USERS_KEY, []));
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/attendance", { cache: "no-store" });
      if (res.ok) {
        const data: AttendanceRecord[] = await res.json();
        setRecords(Array.isArray(data) ? data : []);
        const local = lsGet<AttendanceRecord[]>(ATTENDANCE_KEY, []);
        if (local.length > 0) {
          const serverIds = new Set(data.map(r => r.id));
          const toMigrate = local.filter(r => !serverIds.has(r.id));
          if (toMigrate.length > 0) {
            await fetch("/api/attendance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toMigrate) });
            const r2 = await fetch("/api/attendance", { cache: "no-store" });
            if (r2.ok) setRecords(await r2.json());
          }
          lsSet(ATTENDANCE_KEY, []);
        }
      }
    } catch { setRecords(lsGet<AttendanceRecord[]>(ATTENDANCE_KEY, [])); }
  };

  const loadBranches = async () => {
    try {
      const res = await fetch("/api/branches", { cache: "no-store" });
      if (res.ok) {
        const data: Branch[] = await res.json();
        setBranches(data);
        lsSet(BRANCHES_KEY, data);
      } else {
        setBranches(lsGet<Branch[]>(BRANCHES_KEY, []));
      }
    } catch {
      setBranches(lsGet<Branch[]>(BRANCHES_KEY, []));
    }
  };

  const reload = async () => { await loadSession(); await fetchRecords(); };

  useEffect(() => {
    loadSession();
    fetchRecords();
    loadBranches();
    window.addEventListener("phidtech_companies_updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("phidtech_companies_updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  // Derive cid synchronously from session to avoid empty-string flash before async state settles
  const cid = (() => {
    if (!session) return cidRef.current || activeCompanyId;
    const _r = (session.role ?? "").toLowerCase();
    const _p = (session.position ?? "").toLowerCase();
    const ATT_GRP = ["group_ceo","group_cfo","group_manager","group_controller","group_hr","group_auditor","group_legal","group_it","group_accountant"];
    const isGroupMember = session.isSuperAdmin || session.companyId === "group" || ATT_GRP.includes(_r) || ATT_GRP.includes(_p);
    if (isGroupMember) return cidRef.current || activeCompanyId; // "" in Group HQ mode
    return session.companyId || cidRef.current || activeCompanyId;
  })();

  // Branch-scope: only true branch managers (role === "branch_manager" or position includes "branch manager")
  // see a restricted view in the daily table. Everyone else — including regular branch staff — sees all company staff.
  const GENERAL_ROLES = ["admin","accountant","hr","group_ceo","group_cfo","group_manager","group_controller","group_hr","group_it","group_auditor","group_legal","group_accountant","branch_manager"];
  const isBranchManager = !!session && !session.isSuperAdmin && !!session.branchId &&
    (session.role === "branch_manager" || (session.position ?? "").toLowerCase().includes("branch manager"));

  // Dialog: show ALL non-inactive staff — if cid is resolved filter by it, otherwise show everyone so dialog is never empty
  const allCompanyStaff = staff.length === 0
    ? []
    : cid
      ? staff.filter(u => u.companyId === cid && u.status !== "inactive")
      : staff.filter(u => u.status !== "inactive");

  // Table view: branch managers only see their own branch; everyone else sees all
  const companyStaff = (() => {
    if (isBranchManager && session?.branchId) return allCompanyStaff.filter(u => u.branchId === session.branchId);
    return allCompanyStaff;
  })();
  const companyRecs  = cid ? records.filter(r => r.companyId === cid) : records;
  const dayRecords   = companyRecs.filter(r => r.date === dateFilter);

  const present      = dayRecords.filter(r => r.status === "present").length;
  const absent       = companyStaff.length - dayRecords.filter(r => r.status !== "absent").length;
  const late         = dayRecords.filter(r => r.status === "late").length;
  const totalOvertime = dayRecords.reduce((s, r) => s + (r.overtime || 0), 0);

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const openDialog = () => {
    setForm(emptyForm());
    setFormError("");
    setShowDialog(true);
  };

  const saveRecord = async () => {
    if (!form.userId) { setFormError("Select an employee."); return; }
    if (!form.date)   { setFormError("Select a date."); return; }
    if (!form.time)   { setFormError("Enter the time."); return; }

    // Derive companyId from the selected employee — works across all branches/companies
    const selectedEmp = staff.find(u => u.id === form.userId);
    const companyId = selectedEmp?.companyId || cidRef.current || activeCompanyId;
    const existing = records.find(r => r.userId === form.userId && r.date === form.date && r.companyId === companyId)
      ?? records.find(r => r.userId === form.userId && r.date === form.date);

    if (form.action === "in") {
      const status      = form.status !== "present" && form.status !== "late" ? calcStatus(form.time) : form.status;
      const lateMinutes = calcLateMinutes(form.time);
      if (existing) {
        await fetch("/api/attendance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          id: existing.id, clockIn: form.time, status,
          lateMinutes: lateMinutes > 0 ? lateMinutes : existing.lateMinutes,
          hoursWorked: calcHours(form.time, existing.clockOut),
          overtime: calcOvertime(calcHours(form.time, existing.clockOut)),
        }) });
      } else {
        await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          id: `att-${Date.now()}`, companyId, userId: form.userId, date: form.date,
          clockIn: form.time, status,
          lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
        }) });
      }
    } else {
      if (existing) {
        const hours    = calcHours(existing.clockIn, form.time);
        const overtime = calcOvertime(hours);
        await fetch("/api/attendance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          id: existing.id, clockOut: form.time,
          hoursWorked: hours > 0 ? hours : existing.hoursWorked,
          overtime:    overtime > 0 ? overtime : undefined,
          status:      hours < 4 ? "half-day" : existing.status,
        }) });
      } else {
        await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          id: `att-${Date.now()}`, companyId, userId: form.userId, date: form.date,
          clockOut: form.time, status: "present",
        }) });
      }
    }
    setShowDialog(false);
    setDateFilter(form.date);
    await fetchRecords();
  };

  // Weekly summary: last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const dayRecs = companyRecs.filter(r => r.date === dateStr);
    return {
      day: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
      present: dayRecs.filter(r => r.status === "present").length,
      absent:  dayRecs.filter(r => r.status === "absent").length,
      late:    dayRecs.filter(r => r.status === "late").length,
    };
  });

  // Monthly summary: current month
  const monthStr = dateFilter.slice(0, 7);
  const monthRecs = companyRecs.filter(r => r.date.startsWith(monthStr));
  const workingDays = 22;

  return (
    <MainLayout>
      <PageHeader
        title="Attendance Management"
        subtitle="Track daily attendance, overtime and time records"
        icon={Clock}
        actions={
          <>
            <Button variant="outline" size="sm">Export Report</Button>
            <Button size="sm" onClick={openDialog}>
              <Plus className="w-4 h-4 mr-2" /> Clock In/Out
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Present Today"  value={present}                        icon={CheckCircle}  iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatCard title="Absent"         value={Math.max(0, absent)}            icon={AlertTriangle}iconBg="bg-red-50"    iconColor="text-red-500" />
        <StatCard title="Late"           value={late}                           icon={Clock}        iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Total Overtime" value={`${totalOvertime.toFixed(1)}h`} icon={TrendingUp}   iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="Today" />
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
            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-40" />
          </div>
        </div>

        <TabsContent value="daily">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Attendance – {formatDate(dateFilter)}</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />{present} Present</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" />{Math.max(0,absent)} Absent</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" />{late} Late</span>
              </div>
            </div>
            {companyStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Clock className="w-10 h-10 text-gray-300" />
                <p className="text-gray-500 text-sm">No staff found. Add employees first.</p>
              </div>
            ) : (
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
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyStaff.map(user => {
                    const record = dayRecords.find(r => r.userId === user.id);
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
                        <TableCell className="text-sm text-gray-600">{user.department ?? "—"}</TableCell>
                        <TableCell className="font-mono text-sm text-gray-700">
                          {record?.clockIn ?? <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-700">
                          {record?.clockOut ?? <span className="text-gray-300">—</span>}
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
                          {record?.location === "office" ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">In Office</span>
                          ) : record?.location === "remote" ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-orange-100 text-orange-700">Remote</span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[record?.status ?? "absent"]}`}>
                            {record?.status ?? "absent"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="weekly">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Last 7 Days</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="present" fill="#10b981" radius={[3,3,0,0]} name="Present" />
                  <Bar dataKey="absent"  fill="#ef4444" radius={[3,3,0,0]} name="Absent" />
                  <Bar dataKey="late"    fill="#f59e0b" radius={[3,3,0,0]} name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">7-Day Statistics</h3>
              <div className="space-y-3">
                {[
                  { label: "Total Present", value: last7.reduce((s,d) => s + d.present, 0), color: "text-green-600" },
                  { label: "Total Late",    value: last7.reduce((s,d) => s + d.late, 0),    color: "text-yellow-600" },
                  { label: "Total Absent",  value: last7.reduce((s,d) => s + d.absent, 0),  color: "text-red-500" },
                  { label: "Total Overtime", value: `${companyRecs.filter(r => r.date >= last7[0].day).reduce((s,r) => s + (r.overtime||0), 0).toFixed(1)}h`, color: "text-purple-600" },
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
              <h3 className="font-semibold text-gray-900">
                {new Date(dateFilter).toLocaleDateString("en-GB", { month: "long", year: "numeric" })} – Monthly Attendance Summary
              </h3>
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
                {companyStaff.map(user => {
                  const userRecs    = monthRecs.filter(r => r.userId === user.id);
                  const presentDays = userRecs.filter(r => r.status === "present" || r.status === "late" || r.status === "half-day").length;
                  const absentDays  = userRecs.filter(r => r.status === "absent").length;
                  const lateDays    = userRecs.filter(r => r.status === "late").length;
                  const overtime    = userRecs.reduce((s, r) => s + (r.overtime || 0), 0);
                  const pct         = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
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
                      <TableCell className="text-sm text-gray-600">{user.department ?? "—"}</TableCell>
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
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Clock In / Clock Out</h2>
                <p className="text-blue-200 text-xs mt-0.5">
                  {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            {/* Employee selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Employee</label>
              <Select value={form.userId} onValueChange={v => sf({ userId: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select employee…" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {staffLoading ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-400">Loading staff…</div>
                  ) : allCompanyStaff.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-400">No staff found. Please add employees first.</div>
                  ) : allCompanyStaff.map(u => {
                    const branch = branches.find(b => b.id === u.branchId);
                    return (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {getInitials(u.name)}
                          </div>
                          <span>{u.name}</span>
                          {u.department && <span className="text-gray-400 text-xs">· {u.department}</span>}
                          {branch && <span className="text-blue-500 text-xs font-medium">· {branch.name}</span>}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Employee today's status preview */}
            {form.userId && (() => {
              const emp = allCompanyStaff.find(u => u.id === form.userId);
              const existingRec = records.find(r => r.userId === form.userId && r.date === form.date && r.companyId === (cidRef.current || activeCompanyId));
              const suggestedAction = existingRec?.clockIn && !existingRec?.clockOut ? "out" : "in";
              return (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-bold">{getInitials(emp?.name ?? "?")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{emp?.name}</p>
                      <p className="text-xs text-gray-400">{emp?.position ?? emp?.department ?? "Staff"}</p>
                    </div>
                    {existingRec && (
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[existingRec.status]}`}>
                        {existingRec.status}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-medium">Clock In</p>
                      <p className="text-sm font-semibold text-gray-800 font-mono">{existingRec?.clockIn ?? "—"}</p>
                    </div>
                    <div className="text-center border-x border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-medium">Clock Out</p>
                      <p className="text-sm font-semibold text-gray-800 font-mono">{existingRec?.clockOut ?? "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-medium">Hours</p>
                      <p className="text-sm font-semibold text-gray-800">{existingRec?.hoursWorked ? `${existingRec.hoursWorked.toFixed(1)}h` : "—"}</p>
                    </div>
                  </div>
                  {/* Auto-suggest action */}
                  {form.action !== suggestedAction && (
                    <button
                      type="button"
                      onClick={() => sf({ action: suggestedAction })}
                      className="w-full text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg py-1.5 font-medium hover:bg-blue-100 transition"
                    >
                      Suggested: Switch to Clock {suggestedAction === "in" ? "In" : "Out"}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Date, Action, Time row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Date</label>
                <Input type="date" value={form.date} onChange={e => sf({ date: e.target.value })} className="h-11" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Action</label>
                <Select value={form.action} onValueChange={v => sf({ action: v as "in"|"out" })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">
                      <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Clock In</span>
                    </SelectItem>
                    <SelectItem value="out">
                      <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Clock Out</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Time</label>
                <Input type="time" value={form.time} onChange={e => sf({ time: e.target.value })} className="h-11 font-mono" />
              </div>
            </div>

            {/* Status override (clock in only) */}
            {form.action === "in" && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Status</label>
                <Select value={form.status} onValueChange={v => sf({ status: v as AttendanceRecord["status"] })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Present</span></SelectItem>
                    <SelectItem value="late"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Late</span></SelectItem>
                    <SelectItem value="half-day"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Half Day</span></SelectItem>
                    <SelectItem value="absent"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Absent</span></SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Auto-set to Late if clock-in is after {WORK_START}
                </p>
              </div>
            )}

          </div>

          <DialogFooter className="px-5 pb-5 pt-0 gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              className={`flex-1 ${form.action === "in" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}`}
              onClick={saveRecord}
            >
              {form.action === "in"
                ? <><CheckCircle className="w-4 h-4 mr-2" /> Confirm Clock In</>
                : <><AlertTriangle className="w-4 h-4 mr-2" /> Confirm Clock Out</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
