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
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, Search, CheckCircle, XCircle, Clock, Users, Trash2 } from "lucide-react";
import { formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const SESSION_KEY   = "phidtech_session";
const ACTIVE_KEY    = "phidtech_active_company";
const USERS_KEY     = "phidtech_users";
const LEAVE_KEY     = "phidtech_leaves";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY     = "phidtech_group_company";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; department?: string; position?: string; role?: string; status?: string; }
interface LeaveRequest {
  id: string; companyId: string; userId: string; userName: string;
  type: string; startDate: string; endDate: string; days: number;
  reason: string; status: "pending" | "approved" | "rejected";
  approvedBy?: string; approvedByName?: string; createdAt: string;
}

const LEAVE_TYPES = ["Annual", "Sick", "Maternity", "Paternity", "Emergency", "Unpaid", "Study", "Compassionate"];

const leaveTypeColor = (type: string) => ({
  Annual: "bg-blue-100 text-blue-800",
  Sick: "bg-red-100 text-red-800",
  Maternity: "bg-pink-100 text-pink-800",
  Paternity: "bg-indigo-100 text-indigo-800",
  Emergency: "bg-orange-100 text-orange-800",
  Unpaid: "bg-gray-100 text-gray-800",
  Study: "bg-teal-100 text-teal-800",
  Compassionate: "bg-purple-100 text-purple-800",
}[type] || "bg-gray-100 text-gray-800");

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

const emptyForm = () => ({ userId: "", type: "Annual", startDate: "", endDate: "", reason: "" });

export default function LeavePage() {
  usePermissionGuard("leave");
  const [leaves, setLeaves]               = useState<LeaveRequest[]>([]);
  const [staff, setStaff]                 = useState<StaffUser[]>([]);
  const [session, setSession]             = useState<Session | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [groupCompanyId, setGroupCompanyId]   = useState("");
  const cidRef                            = useRef("");
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

  const loadSession = () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = getActiveCid(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    setStaff(lsGet<StaffUser[]>(USERS_KEY, []));
    const cos = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    const gc = lsStr(GROUP_KEY) || (cos[0]?.id ?? "");
    setGroupCompanyId(gc);
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leave", { cache: "no-store" });
      if (res.ok) {
        const data: LeaveRequest[] = await res.json();
        setLeaves(Array.isArray(data) ? data : []);
        const local = lsGet<LeaveRequest[]>(LEAVE_KEY, []);
        if (local.length > 0) {
          const serverIds = new Set(data.map(l => l.id));
          const toMigrate = local.filter(l => !serverIds.has(l.id));
          if (toMigrate.length > 0) {
            await fetch("/api/leave", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toMigrate) });
            const r2 = await fetch("/api/leave", { cache: "no-store" });
            if (r2.ok) setLeaves(await r2.json());
          }
          lsSet(LEAVE_KEY, []);
        }
      }
    } catch { setLeaves(lsGet<LeaveRequest[]>(LEAVE_KEY, [])); }
  };

  const reload = () => { loadSession(); fetchLeaves(); };

  useEffect(() => {
    loadSession();
    fetchLeaves();
    window.addEventListener("phidtech_companies_updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("phidtech_companies_updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const cid = cidRef.current || activeCompanyId;
  const isGroupUser = !!groupCompanyId && session?.companyId === groupCompanyId;
  const isGroupMgr  = isGroupUser && (
    session?.isSuperAdmin ||
    (session?.role ?? "").toLowerCase() === "admin" ||
    (session?.role ?? "").toLowerCase() === "manager" ||
    (session?.position ?? "").toLowerCase().includes("manager")
  );
  const isSubsidMgr = !isGroupUser && (
    (session?.role ?? "").toLowerCase() === "admin" ||
    (session?.role ?? "").toLowerCase() === "manager" ||
    (session?.position ?? "").toLowerCase().includes("manager")
  );
  const canManage = session?.isSuperAdmin || isGroupMgr || isSubsidMgr;

  const visibleLeaves = cid
    ? leaves.filter(l => l.companyId === cid)
    : leaves;

  const visibleStaff = cid
    ? staff.filter(u => u.companyId === cid && u.status !== "inactive")
    : staff.filter(u => u.status !== "inactive");

  const filtered = visibleLeaves.filter(l => {
    const matchSearch = l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending   = visibleLeaves.filter(l => l.status === "pending").length;
  const approved  = visibleLeaves.filter(l => l.status === "approved").length;
  const rejected  = visibleLeaves.filter(l => l.status === "rejected").length;
  const totalDays = visibleLeaves.filter(l => l.status === "approved").reduce((s, l) => s + l.days, 0);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    await fetch("/api/leave", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, approvedBy: session?.id, approvedByName: session?.name }) });
    await fetchLeaves();
  };

  const deleteLeave = async (id: string) => {
    await fetch(`/api/leave?id=${id}`, { method: "DELETE" });
    await fetchLeaves();
  };

  const submitForm = async () => {
    if (!form.userId)      { setFormError("Select an employee."); return; }
    if (!form.type)        { setFormError("Select leave type."); return; }
    if (!form.startDate)   { setFormError("Select a start date."); return; }
    if (!form.endDate)     { setFormError("Select an end date."); return; }
    const days = calcDays(form.startDate, form.endDate);
    if (days <= 0)         { setFormError("End date must be after start date."); return; }
    const emp = staff.find(u => u.id === form.userId);
    const newLeave: LeaveRequest = {
      id: `lv_${Date.now()}`,
      companyId: emp?.companyId ?? cid,
      userId: form.userId,
      userName: emp?.name ?? "Unknown",
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      reason: form.reason.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newLeave) });
    setShowAddDialog(false);
    setForm(emptyForm());
    setFormError("");
    await fetchLeaves();
  };

  // Calendar helpers
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthStr = now.toLocaleString("default", { month: "long" });

  return (
    <MainLayout>
      <PageHeader
        title="Leave Management"
        subtitle="Manage leave requests, approvals and balances"
        icon={Calendar}
        actions={
          <Button size="sm" onClick={() => { setForm(emptyForm()); setFormError(""); setShowAddDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Request Leave
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending Requests" value={pending}   icon={Clock}        iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="Approved"         value={approved}  icon={CheckCircle}  iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatCard title="Rejected"         value={rejected}  icon={XCircle}      iconBg="bg-red-50"    iconColor="text-red-500" />
        <StatCard title="Days Approved"    value={totalDays} icon={Calendar}     iconBg="bg-blue-50"   iconColor="text-blue-600" subtitle="This year" />
      </div>

      <Tabs defaultValue="requests">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="requests">Leave Requests</TabsTrigger>
            <TabsTrigger value="balances">Staff Summary</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="requests">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Users className="w-12 h-12 text-gray-200" />
                <p className="font-semibold text-gray-500">No leave requests found</p>
                <p className="text-sm text-gray-400">Click &quot;Request Leave&quot; to submit one.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved By</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{getInitials(leave.userName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{leave.userName}</p>
                            <p className="text-xs text-gray-400">{staff.find(u => u.id === leave.userId)?.department ?? ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${leaveTypeColor(leave.type)}`}>
                          {leave.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-800">{leave.days} days</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-xs truncate">{leave.reason || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{leave.approvedByName || "—"}</TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {leave.status === "pending" && (
                              <>
                                <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 text-xs" onClick={() => updateStatus(leave.id, "approved")}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 text-xs" onClick={() => updateStatus(leave.id, "rejected")}>
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {(session?.isSuperAdmin || isGroupMgr) && (
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 h-7 w-7" onClick={() => deleteLeave(leave.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="balances">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleStaff.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Users className="w-12 h-12 text-gray-200" />
                <p className="text-sm text-gray-400">No staff found.</p>
              </div>
            ) : visibleStaff.map(emp => {
              const empLeaves = visibleLeaves.filter(l => l.userId === emp.id && l.status === "approved");
              const usedDays  = empLeaves.reduce((s, l) => s + l.days, 0);
              const annualMax = 28;
              const usedPct   = Math.min(Math.round((usedDays / annualMax) * 100), 100);
              return (
                <div key={emp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-400">{emp.department ?? emp.position ?? ""}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Annual Leave Used</span>
                        <span className="font-medium text-gray-800">{usedDays}/{annualMax} days</span>
                      </div>
                      <Progress value={usedPct} className="h-2" />
                      <p className="text-xs text-gray-400 mt-1">{annualMax - usedDays} days remaining</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
                      <div><p className="text-lg font-bold text-gray-900">{annualMax}</p><p className="text-xs text-gray-400">Annual</p></div>
                      <div><p className="text-lg font-bold text-gray-900">{usedDays}</p><p className="text-xs text-gray-400">Used</p></div>
                      <div><p className="text-lg font-bold text-gray-900">{annualMax - usedDays}</p><p className="text-xs text-gray-400">Remaining</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{monthStr} {calYear} — Leave Calendar</h3>
            <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-gray-500 mb-2">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="text-center py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => {
                const day = i - firstDay + 1;
                const isValid = day >= 1 && day <= daysInMonth;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const leavesOnDay = isValid ? visibleLeaves.filter(l =>
                  l.status === "approved" && l.startDate <= dateStr && l.endDate >= dateStr
                ) : [];
                const isToday = isValid && day === now.getDate();
                return (
                  <div key={i} className={`min-h-[60px] rounded-lg p-1 text-xs ${
                    !isValid ? "bg-transparent" :
                    isToday ? "bg-blue-600 text-white" :
                    leavesOnDay.length > 0 ? "bg-green-50 border border-green-200" :
                    "bg-gray-50 border border-gray-100 hover:bg-gray-100"
                  }`}>
                    {isValid && (
                      <>
                        <div className={`font-semibold mb-1 ${isToday ? "text-white" : "text-gray-700"}`}>{day}</div>
                        {leavesOnDay.map(l => (
                          <div key={l.id} className="text-[10px] bg-green-100 text-green-700 rounded px-1 truncate mb-0.5">
                            {l.userName.split(" ")[0]}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-600" /> Today</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-200" /> On Leave</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Submit Leave Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Employee <span className="text-red-500">*</span></label>
              <Select value={form.userId} onValueChange={v => setForm(p => ({ ...p, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {visibleStaff.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}{u.department ? ` — ${u.department}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Leave Type <span className="text-red-500">*</span></label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t} Leave</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Start Date <span className="text-red-500">*</span></label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">End Date <span className="text-red-500">*</span></label>
                <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            {form.startDate && form.endDate && calcDays(form.startDate, form.endDate) > 0 && (
              <p className="text-xs text-blue-600 font-medium">
                Total: {calcDays(form.startDate, form.endDate)} day{calcDays(form.startDate, form.endDate) !== 1 ? "s" : ""}
              </p>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reason</label>
              <Textarea
                placeholder="Reason for leave..."
                rows={3}
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={submitForm}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
