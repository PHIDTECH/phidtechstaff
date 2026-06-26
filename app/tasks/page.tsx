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
import { CheckSquare, Plus, Search, Clock, AlertCircle, CheckCircle, XCircle, Edit, Eye, Paperclip, Send, MessageSquare, X, FileText, Trash2, Building2 } from "lucide-react";
import ImportExport from "@/components/shared/ImportExport";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ACTIVE_KEY    = "phidtech_active_company";
const USERS_KEY     = "phidtech_users";
const TASKS_KEY     = "phidtech_tasks";
const NOTIF_KEY     = "phidtech_notifications";
const DEPTS_KEY     = "phidtech_departments";
const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY     = "phidtech_group_company";
const BRANCHES_KEY  = "phidtech_branches_cache";

const DEFAULT_DEPARTMENTS = [
  "Administration", "Human Resources", "Finance & Accounting", "Sales & Marketing",
  "Information Technology", "Operations", "Customer Service", "Procurement",
  "Legal & Compliance", "Research & Development", "Logistics", "Production",
];

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function lsStr(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

interface Attachment { name: string; size: number; dataUrl: string; }
interface Comment { id: string; authorId: string; authorName: string; text: string; createdAt: string; }
interface Task {
  id: string; companyId: string; title: string; description: string;
  assignedTo: string; assignedBy: string; department: string;
  priority: "low"|"medium"|"high"|"critical"; status: "pending"|"in-progress"|"completed"|"cancelled";
  dueDate: string; createdAt: string;
  attachments: Attachment[]; comments: Comment[];
  participants?: string[];
  customerId?: string; customerName?: string;
  branchId?: string;
}
interface StaffUser { id: string; name: string; position: string; department: string; companyId: string; branchId?: string | null; status: string; }
interface Branch { id: string; name: string; companyId: string; }
interface CustomerAttachment { name: string; size: number; dataUrl: string; }
interface Customer {
  id: string; companyId: string; name: string; company: string;
  email: string; phone: string; type: string; address: string;
  serviceProduct: string; date: string; branch: string; status: string;
  totalRevenue: number; createdAt: string;
  attachments?: CustomerAttachment[];
}
interface Notification { id: string; userId: string; message: string; read: boolean; createdAt: string; taskId?: string; }
interface Department { id: string; name: string; companyId: string; }

const PRIORITY_COLOR: Record<string,string> = {
  critical: "bg-red-100 text-red-800",
  high:     "bg-orange-100 text-orange-800",
  medium:   "bg-yellow-100 text-yellow-800",
  low:      "bg-green-100 text-green-800",
};
const STATUS_COLOR: Record<string,string> = {
  "pending":     "bg-yellow-100 text-yellow-700",
  "in-progress": "bg-blue-100 text-blue-700",
  "completed":   "bg-green-100 text-green-700",
  "cancelled":   "bg-gray-100 text-gray-600",
};

const emptyForm = () => ({ title:"", description:"", assignedTo:"", priority:"medium" as Task["priority"], department:"", dueDate:"", attachments:[] as Attachment[], customerId:"", branchId:"", taskCompanyId:"", participants:[] as string[] });

export default function TasksPage() {
  usePermissionGuard("tasks");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [deptsList, setDeptsList] = useState<string[]>([]);
  const [allDepts, setAllDepts] = useState<Department[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [session, setSession] = useState<{id:string;name:string;position?:string;role?:string;isSuperAdmin:boolean;branchId?:string|null;companyId?:string}|null>(null);
  const [groupCompanyId, setGroupCompanyId] = useState("");
  const [allStaffList, setAllStaffList] = useState<StaffUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custSearch, setCustSearch] = useState("");
  const [companiesList, setCompaniesList] = useState<{id:string;name:string}[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const GENERAL_ROLES_TASKS = ["admin","accountant","hr","group_ceo","group_cfo","group_manager","group_controller","group_hr","group_it","group_auditor","group_legal","group_accountant"];

  const loadSession = async () => {
    const sess = lsGet<{id:string;name:string;position?:string;role?:string;isSuperAdmin:boolean;branchId?:string|null;companyId?:string}>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = getActiveCid(sess);
    setActiveCompanyId(cid);
    let cos = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    try {
      const cr = await fetch("/api/companies", { cache: "no-store" });
      if (cr.ok) {
        const srvCos: {id:string;name:string}[] = await cr.json();
        if (Array.isArray(srvCos) && srvCos.length > 0) {
          cos = srvCos;
          try { localStorage.setItem(COMPANIES_KEY, JSON.stringify(srvCos)); } catch {}
        }
      }
    } catch {}
    setCompaniesList(cos);
    const gc = lsStr(GROUP_KEY) || (cos[0]?.id ?? "");
    setGroupCompanyId(gc);
    const rawDepts = lsGet<(Department|string)[]>(DEPTS_KEY, []);
    const deptObjs: Department[] = rawDepts.map((d, i) =>
      typeof d === "string" ? { id: String(i), name: d, companyId: cid } : d
    );
    setAllDepts(deptObjs);
    const companyDepts = deptObjs.filter(d => !d.companyId || d.companyId === cid).map(d => d.name);
    setDeptsList(companyDepts.length > 0 ? companyDepts : DEFAULT_DEPARTMENTS);
    // Load staff from server API, fall back to localStorage
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const data: StaffUser[] = await res.json();
        const active = Array.isArray(data) ? data.filter(u => u.status !== "inactive") : [];
        setAllStaffList(active);
        const isBM = !!sess && !sess.isSuperAdmin && !!sess.branchId && !GENERAL_ROLES_TASKS.includes(sess.position ?? sess.role ?? "");
        setStaffList(cid ? active.filter(u => u.companyId === cid && (!isBM || u.branchId === sess?.branchId)) : active);
      } else throw new Error();
    } catch {
      const allStaff = lsGet<StaffUser[]>(USERS_KEY, []);
      setAllStaffList(allStaff);
      const isBM = !!sess && !sess.isSuperAdmin && !!sess.branchId && !GENERAL_ROLES_TASKS.includes(sess.position ?? sess.role ?? "");
      setStaffList(cid ? allStaff.filter(u => u.companyId === cid && (!isBM || u.branchId === sess?.branchId)) : allStaff);
    }
    // Load branches
    try {
      const br = await fetch("/api/branches", { cache: "no-store" });
      if (br.ok) setBranches(await br.json());
      else setBranches(lsGet<Branch[]>(BRANCHES_KEY, []));
    } catch { setBranches(lsGet<Branch[]>(BRANCHES_KEY, [])); }
    // Load customers
    try {
      const cr = await fetch("/api/customers", { cache: "no-store" });
      if (cr.ok) { const d: Customer[] = await cr.json(); setCustomers(Array.isArray(d) ? d : []); }
    } catch {}
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.ok) {
        const data: Task[] = await res.json();
        const tasks = Array.isArray(data) ? data : [];
        setTasksList(tasks);
        const local = lsGet<Task[]>(TASKS_KEY, []);
        if (local.length > 0) {
          const serverIds = new Set(data.map(t => t.id));
          const toMigrate = local.filter(t => !serverIds.has(t.id));
          if (toMigrate.length > 0) {
            await fetch("/api/tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toMigrate) });
            const r2 = await fetch("/api/tasks", { cache: "no-store" });
            if (r2.ok) setTasksList(await r2.json());
          }
          lsSet(TASKS_KEY, []);
        }
      }
    } catch { setTasksList(lsGet<Task[]>(TASKS_KEY, [])); }
  };

  const reload = async () => {
    await loadSession();
    const sess = lsGet<{id:string;name:string;isSuperAdmin:boolean;companyId?:string;role?:string;position?:string;branchId?:string|null}>(SESSION_KEY, null as never);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.ok) {
        const tasks: Task[] = await res.json();
        setTasksList(Array.isArray(tasks) ? tasks : []);
        checkDueNotifications(Array.isArray(tasks) ? tasks : [], sess?.id);
      }
    } catch {}
  };

  useEffect(() => {
    loadSession();
    fetchTasks();
    window.addEventListener("phidtech_companies_updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("phidtech_companies_updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, [])

  useEffect(() => {
    if (selectedTask) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTask?.comments?.length]);

  // Sync selectedTask when tasksList updates
  useEffect(() => {
    if (selectedTask) {
      const updated = tasksList.find(t => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasksList]);

  const GENERAL_ROLES_TASKS_FILTER = ["admin","accountant","hr","group_ceo","group_cfo","group_manager","group_controller","group_hr","group_it","group_auditor","group_legal","group_accountant"];
  const isBranchManagerTasks = !!session && !session.isSuperAdmin && !!session.branchId && !GENERAL_ROLES_TASKS_FILTER.includes(session.position ?? session.role ?? "");
  // Branch managers see only tasks assigned to/from staff in their branch
  const branchStaffIds = isBranchManagerTasks && session?.branchId
    ? staffList.filter(u => u.branchId === session.branchId).map(u => u.id)
    : null;
  const ALL_GRP_ROLES_T = ["group_ceo","group_cfo","group_manager","group_controller","group_hr","group_auditor","group_legal","group_it","group_accountant"];
  const _tr = (session?.role ?? "").toLowerCase();
  const _tp = (session?.position ?? "").toLowerCase();
  const isGroupUser = session?.isSuperAdmin || session?.companyId === "group" || ALL_GRP_ROLES_T.includes(_tr) || ALL_GRP_ROLES_T.includes(_tp);
  const isGroupMgr  = isGroupUser;
  const companyTasks = isGroupUser
    ? (activeCompanyId ? tasksList.filter(t => t.companyId === activeCompanyId) : tasksList)
    : tasksList.filter(t =>
        t.companyId === activeCompanyId &&
        (!branchStaffIds || branchStaffIds.includes(t.assignedTo) || t.assignedBy === session?.id)
      );
  const filtered = companyTasks.filter(t => {
    const matchSearch = (t.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending    = companyTasks.filter(t => t.status === "pending").length;
  const inProgress = companyTasks.filter(t => t.status === "in-progress").length;
  const completed  = companyTasks.filter(t => t.status === "completed").length;
  const cancelled  = companyTasks.filter(t => t.status === "cancelled").length;

  const byDept = deptsList.map(d => ({
    dept: d, tasks: companyTasks.filter(t => t.department === d)
  })).filter(d => d.tasks.length > 0);

  const pushNotification = (userId: string, message: string, taskId: string) => {
    if (!userId) return;
    const notifs = lsGet<Notification[]>(NOTIF_KEY, []);
    notifs.push({ id: `n-${Date.now()}`, userId, message, read: false, createdAt: new Date().toISOString(), taskId });
    lsSet(NOTIF_KEY, notifs);
    window.dispatchEvent(new Event("storage"));
  };

  const checkDueNotifications = (tasks: Task[], uid?: string) => {
    if (!uid) return;
    const today = new Date().toISOString().slice(0,10);
    const notifs = lsGet<Notification[]>(NOTIF_KEY, []);
    tasks.forEach(t => {
      if (t.assignedTo !== uid && t.assignedBy !== uid) return;
      if (t.status === "completed" || t.status === "cancelled") return;
      const dueKey = `due-${t.id}-${today}`;
      if (notifs.some(n => n.id === dueKey)) return;
      if (t.dueDate === today) {
        notifs.push({ id: dueKey, userId: uid, message: `Task "${t.title}" is due TODAY!`, read: false, createdAt: new Date().toISOString(), taskId: t.id });
      } else if (t.dueDate && t.dueDate < today) {
        notifs.push({ id: dueKey, userId: uid, message: `OVERDUE: Task "${t.title}" was due on ${t.dueDate}`, read: false, createdAt: new Date().toISOString(), taskId: t.id });
      }
    });
    lsSet(NOTIF_KEY, notifs);
    window.dispatchEvent(new Event("storage"));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(f => ({
          ...f,
          attachments: [...f.attachments, { name: file.name, size: file.size, dataUrl: ev.target?.result as string }]
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setForm(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }));
  };

  const saveTask = async () => {
    if (!form.title.trim()) { setFormError("Task title is required."); return; }
    if (!form.assignedTo) { setFormError("Assign to a staff member."); return; }
    if (!form.priority)   { setFormError("Select a priority."); return; }
    if (!form.dueDate)    { setFormError("Set a due date."); return; }
    const taskCid = form.taskCompanyId || activeCompanyId;
    if (!taskCid) { setFormError("Please select a company first."); return; }
    const assignee = staffList.find(u => u.id === form.assignedTo);
    const customer = customers.find(c => c.id === form.customerId);
    const task: Task = {
      id: `task-${Date.now()}`,
      companyId: taskCid,
      title: form.title.trim(),
      description: form.description.trim(),
      assignedTo: form.assignedTo,
      assignedBy: session?.id ?? "superadmin",
      department: form.department || (assignee?.department ?? ""),
      priority: form.priority,
      status: "pending",
      dueDate: form.dueDate,
      createdAt: new Date().toISOString(),
      attachments: form.attachments,
      comments: [],
      participants: form.participants,
      customerId: customer?.id,
      customerName: customer?.name,
      branchId: form.branchId || undefined,
    };
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); setFormError(err.error || "Save failed. Please try again."); return; }
    pushNotification(form.assignedTo, `You have been assigned a new task: "${task.title}"`, task.id);
    setForm(emptyForm());
    setFormError("");
    setShowAddDialog(false);
    await fetchTasks();
  };

  const updateStatus = async (taskId: string, status: Task["status"]) => {
    await fetch("/api/tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: taskId, status }) });
    const task = tasksList.find(t => t.id === taskId);
    if (task) pushNotification(task.assignedBy, `Task "${task.title}" status changed to ${status}`, task.id);
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task permanently?")) return;
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    if (selectedTask?.id === id) setSelectedTask(null);
    await fetchTasks();
  };

  const sendComment = async () => {
    if (!commentText.trim() || !selectedTask) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      authorId: session?.id ?? "superadmin",
      authorName: session?.name ?? "System Administrator",
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    const task = tasksList.find(t => t.id === selectedTask.id);
    if (!task) return;
    const updatedComments = [...task.comments, comment];
    await fetch("/api/tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedTask.id, comments: updatedComments }) });
    const notifyIds = new Set([task.assignedTo, task.assignedBy, ...(task.participants ?? [])].filter(id => id !== (session?.id ?? "superadmin")));
    notifyIds.forEach(uid => pushNotification(uid, `New comment on task "${task.title}": ${comment.text.slice(0,60)}`, task.id));
    setCommentText("");
    await fetchTasks();
  };

  return (
    <MainLayout>
      <PageHeader
        title="Task Management"
        subtitle="Create, assign and track tasks across departments"
        icon={CheckSquare}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ImportExport
              label="Tasks"
              rows={tasksList as unknown as Record<string, unknown>[]}
              excludeColumns={["attachments", "comments"]}
              onImport={async (rows) => {
                const res = await fetch("/api/bulk-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dbKey: "tasks", records: rows }) });
                const data = await res.json();
                fetchTasks();
                return { imported: data.imported ?? 0, errors: data.errors ?? [] };
              }}
            />
            <Button size="sm" onClick={() => { setForm(emptyForm()); setFormError(""); setShowAddDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> New Task
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending"     value={pending}    icon={Clock}        iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="In Progress" value={inProgress} icon={AlertCircle}  iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Completed"   value={completed}  icon={CheckCircle}  iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatCard title="Cancelled"   value={cancelled}  icon={XCircle}      iconBg="bg-red-50"    iconColor="text-red-500" />
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list">All Tasks</TabsTrigger>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="department">By Department</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckSquare className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No tasks yet. Click <strong>New Task</strong> to create one.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    {isGroupUser && <TableHead>Subsidiary</TableHead>}
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((task) => {
                    const assignee = staffList.find(u => u.id === task.assignedTo);
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-400 truncate max-w-xs">{task.description}</p>
                            {task.attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                <Paperclip className="w-3 h-3" />{task.attachments.length} file(s)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {isGroupUser && (
                          <TableCell className="text-xs font-medium">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              {companiesList.find(c => c.id === task.companyId)?.name ?? task.companyId}
                            </span>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-xs">{getInitials(assignee?.name ?? "?")}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-700">{assignee?.name ?? "Unassigned"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{task.department}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_COLOR[task.priority] ?? "bg-gray-100 text-gray-700"}`}>
                            {task.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{task.dueDate}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[task.status]}`}>
                            {task.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedTask(task); setCommentText(""); }} title="View / Chat">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </Button>
                            {task.comments.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-medium">{task.comments.length}</span>
                            )}
                            {isGroupMgr && (
                              <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} title="Delete task">
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            )}
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

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["pending","in-progress","completed","cancelled"] as Task["status"][]).map((status) => {
              const statusTasks = companyTasks.filter(t => t.status === status);
              const colStyle: Record<string,string> = {
                "pending":     "border-yellow-300 bg-yellow-50",
                "in-progress": "border-purple-300 bg-purple-50",
                "completed":   "border-green-300 bg-green-50",
                "cancelled":   "border-gray-300 bg-gray-50",
              };
              const headStyle: Record<string,string> = {
                "pending":     "text-yellow-700",
                "in-progress": "text-purple-700",
                "completed":   "text-green-700",
                "cancelled":   "text-gray-600",
              };
              return (
                <div key={status} className={`rounded-xl border-2 ${colStyle[status]} p-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold capitalize ${headStyle[status]}`}>{status.replace("-", " ")}</h3>
                    <span className="text-xs font-bold bg-white rounded-full px-2 py-0.5 shadow-sm text-gray-700">{statusTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {statusTasks.map((task) => {
                      const assignee = staffList.find(u => u.id === task.assignedTo);
                      return (
                        <div key={task.id} onClick={() => { setSelectedTask(task); setCommentText(""); }}
                          className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
                          <p className="font-medium text-gray-800 text-sm mb-1">{task.title}</p>
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
                            <div className="flex items-center gap-1">
                              {task.comments.length > 0 && (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <MessageSquare className="w-3 h-3" />{task.comments.length}
                                </span>
                              )}
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[10px]">{getInitials(assignee?.name ?? "?")}</AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Due: {task.dueDate}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="department">
          <div className="space-y-4">
            {byDept.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center py-12 text-gray-400 text-sm">
                No tasks by department yet.
              </div>
            ) : byDept.map(({ dept, tasks: dTasks }) => (
              <div key={dept} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{dept}</h3>
                  <span className="text-xs text-gray-500">{dTasks.length} tasks</span>
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {dTasks.map((t) => {
                    const assignee = staffList.find(u => u.id === t.assignedTo);
                    return (
                      <div key={t.id} onClick={() => { setSelectedTask(t); setCommentText(""); }}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          t.status === "completed" ? "bg-green-500" :
                          t.status === "in-progress" ? "bg-blue-500" :
                          t.status === "pending" ? "bg-yellow-500" : "bg-gray-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                          <p className="text-xs text-gray-400">{assignee?.name}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Task Detail + Chat Dialog ── */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-gray-100">
            <DialogTitle className="text-base">{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Task info */}
              <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-gray-100 text-xs">
                {[
                  { label: "Status", value: selectedTask.status },
                  { label: "Priority", value: selectedTask.priority },
                  { label: "Department", value: selectedTask.department || "—" },
                  { label: "Due Date", value: selectedTask.dueDate },
                  { label: "Assigned To", value: staffList.find(u => u.id === selectedTask.assignedTo)?.name ?? "—" },
                  { label: "Assigned By", value: staffList.find(u => u.id === selectedTask.assignedBy)?.name ?? "Admin" },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-gray-400 mb-0.5">{item.label}</p>
                    <p className="font-medium text-gray-800 capitalize truncate">{item.value}</p>
                  </div>
                ))}
              </div>
              {selectedTask.description && (
                <p className="px-6 py-2 text-sm text-gray-600 border-b border-gray-100">{selectedTask.description}</p>
              )}
              {/* Customer info on task detail */}
              {selectedTask.customerName && (() => {
                const cust = customers.find(c => c.id === selectedTask.customerId);
                return (
                  <div className="px-6 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Linked Customer</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{selectedTask.customerName}</p>
                        {cust?.company && <p className="text-xs text-gray-400">{cust.company}</p>}
                        {cust?.email   && <p className="text-xs text-gray-400">{cust.email} · {cust.phone}</p>}
                        {cust?.serviceProduct && <p className="text-xs text-blue-600">{cust.serviceProduct}</p>}
                      </div>
                      {cust?.attachments && cust.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cust.attachments.map((a, i) => (
                            <a key={i} href={a.dataUrl} download={a.name}
                              className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100">
                              <FileText className="w-3 h-3" />{a.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              {/* Attachments */}
              {selectedTask.attachments.length > 0 && (
                <div className="px-6 py-2 border-b border-gray-100 flex flex-wrap gap-2">
                  {selectedTask.attachments.map((a, i) => (
                    <a key={i} href={a.dataUrl} download={a.name}
                      className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                      <FileText className="w-3.5 h-3.5" />{a.name}
                    </a>
                  ))}
                </div>
              )}
              {/* Chat Participants strip */}
              {(() => {
                const allParticipantIds = [
                  selectedTask.assignedTo,
                  selectedTask.assignedBy,
                  ...(selectedTask.participants ?? []),
                ].filter((id, i, arr) => id && arr.indexOf(id) === i);
                if (allParticipantIds.length === 0) return null;
                return (
                  <div className="px-6 py-2 border-b border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Chat Participants</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allParticipantIds.map(uid => {
                        const u = staffList.find(s => s.id === uid);
                        const label = uid === selectedTask.assignedTo ? "Assignee" : uid === selectedTask.assignedBy ? "Creator" : "Participant";
                        return (
                          <div key={uid} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
                            <Avatar className="w-5 h-5 shrink-0">
                              <AvatarFallback className="text-[9px]">{getInitials(u?.name ?? "?")}</AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-medium text-gray-700">{u?.name ?? "Unknown"}</span>
                            <span className="text-[10px] text-gray-400">({label})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* Status update */}
              <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">Update status:</span>
                {(["pending","in-progress","completed","cancelled"] as Task["status"][]).map(s => (
                  <button key={s} onClick={() => updateStatus(selectedTask.id, s)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      selectedTask.status === s ? STATUS_COLOR[s] + " ring-2 ring-offset-1 ring-blue-400" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>{s}</button>
                ))}
              </div>
              {/* Comments / Chat */}
              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3 min-h-[180px]">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Comments & Chat
                </p>
                {selectedTask.comments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No comments yet. Be the first to comment.</p>
                ) : (
                  selectedTask.comments.map(c => {
                    const isMe = c.authorId === (session?.id ?? "superadmin");
                    return (
                      <div key={c.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarFallback className="text-[10px]">{getInitials(c.authorName)}</AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                          <div className={`px-3 py-2 rounded-xl text-sm ${
                            isMe ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"
                          }`}>{c.text}</div>
                          <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                            {c.authorName} · {new Date(c.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              {/* Comment input */}
              <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  rows={1}
                  className="resize-none flex-1 text-sm"
                />
                <Button size="icon" onClick={sendComment} disabled={!commentText.trim()} className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Task Dialog ── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Task Title *</label>
              <Input placeholder="Enter task title" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Textarea placeholder="Describe the task..." rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>

            {/* Company selector — shown whenever no company is active */}
            {!activeCompanyId && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company *</label>
                <Select value={form.taskCompanyId} onValueChange={v => setForm(f => ({...f, taskCompanyId: v, branchId: "", assignedTo: "", customerId: ""}))}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companiesList.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Branch + Customer row */}
            {(() => {
              const formCid = form.taskCompanyId || activeCompanyId;
              const formBranches = branches.filter(b => !formCid || b.companyId === formCid || b.companyId === "group");
              const formCustomers = customers.filter(c => !formCid || c.companyId === formCid);
              return (
              <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Branch</label>
                <Select value={form.branchId || undefined} onValueChange={v => setForm(f => ({...f, branchId: v, assignedTo: ""}))}>
                  <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All Branches</SelectItem>
                    <SelectItem value="head_office">— Head Office —</SelectItem>
                    {formBranches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Customer (optional)</label>
                <Select value={form.customerId || undefined} onValueChange={v => { setForm(f => ({...f, customerId: v})); setCustSearch(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent className="max-h-72 p-0">
                    {/* Search box — stopPropagation prevents Select from hijacking keystrokes */}
                    <div className="px-2 pt-2 pb-1 border-b border-gray-100" onKeyDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                      <Input
                        placeholder="Search customer..."
                        value={custSearch}
                        onChange={e => setCustSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      <SelectItem value="__none">None</SelectItem>
                      {formCustomers.filter(c =>
                        !custSearch ||
                        (c.name ?? "").toLowerCase().includes(custSearch.toLowerCase()) ||
                        (c.company ?? "").toLowerCase().includes(custSearch.toLowerCase()) ||
                        (c.phone ?? "").includes(custSearch)
                      ).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span>{c.name}</span>
                            {c.company && <span className="text-gray-400 text-xs">· {c.company}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
              );
            })()}

            {/* Customer details card (shown when customer selected) */}
            {form.customerId && form.customerId !== "__none" && (() => {
              const cust = customers.find(c => c.id === form.customerId);
              if (!cust) return null;
              return (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{cust.name}</p>
                      {cust.company && <p className="text-xs text-gray-500">{cust.company}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      cust.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>{cust.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {cust.email    && <div><span className="text-gray-400">Email: </span><span className="text-gray-700">{cust.email}</span></div>}
                    {cust.phone    && <div><span className="text-gray-400">Phone: </span><span className="text-gray-700">{cust.phone}</span></div>}
                    {cust.serviceProduct && <div className="col-span-2"><span className="text-gray-400">Service: </span><span className="text-gray-700">{cust.serviceProduct}</span></div>}
                    {cust.address  && <div className="col-span-2"><span className="text-gray-400">Address: </span><span className="text-gray-700">{cust.address}</span></div>}
                  </div>
                  {cust.attachments && cust.attachments.length > 0 && (
                    <div className="pt-1.5 border-t border-blue-100">
                      <p className="text-xs text-gray-400 mb-1.5 font-medium">Customer Attachments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cust.attachments.map((a, i) => (
                          <a key={i} href={a.dataUrl} download={a.name}
                            className="flex items-center gap-1 text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                            <FileText className="w-3 h-3" />{a.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To *</label>
                <Select value={form.assignedTo} onValueChange={v => setForm(f => ({...f, assignedTo: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent className="max-h-52">
                    {(() => {
                      const formCid2 = form.taskCompanyId || activeCompanyId;
                      const byCompany = formCid2 ? allStaffList.filter(u => u.companyId === formCid2) : allStaffList;
                      // Fall back to all staff if company filter returns nothing (companyId mismatch)
                      const baseList = byCompany.length > 0 ? byCompany : allStaffList;
                      const filtered = baseList.filter(u =>
                        !form.branchId || form.branchId === "__all" || u.branchId === form.branchId
                      );
                      if (filtered.length === 0) return (
                        <div className="px-3 py-4 text-center text-sm text-gray-400">No staff found</div>
                      );
                      return filtered.map(u => {
                        const br = branches.find(b => b.id === u.branchId);
                        return (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex items-center gap-2">
                              <span>{u.name}</span>
                              <span className="text-gray-400 text-xs">· {u.position || u.department}</span>
                              {br && <span className="text-blue-500 text-xs font-medium">· {br.name}</span>}
                            </div>
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Priority *</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({...f, priority: v as Task["priority"]}))}>  
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Department</label>
                <Select value={form.department} onValueChange={v => setForm(f => ({...f, department: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                  <SelectContent>
                    {deptsList.length === 0
                      ? <SelectItem value="__none" disabled>No departments found</SelectItem>
                      : deptsList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Due Date *</label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} />
              </div>
            </div>
            {/* Participants (chat members) */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Chat Participants <span className="text-gray-400 font-normal text-xs">(optional — can chat on this task)</span></label>
              {(() => {
                const formCid3 = form.taskCompanyId || activeCompanyId;
                const byCo3 = formCid3 ? allStaffList.filter(u => u.companyId === formCid3) : allStaffList;
                const pickable = (byCo3.length > 0 ? byCo3 : allStaffList)
                  .filter(u => u.id !== form.assignedTo && (u.status ?? "").toLowerCase() === "active");
                return (
                  <div className="border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                    {pickable.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">No other staff available</p>
                    ) : pickable.map(u => {
                      const isSelected = form.participants.includes(u.id);
                      return (
                        <button key={u.id} type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            participants: isSelected
                              ? f.participants.filter(id => id !== u.id)
                              : [...f.participants, u.id],
                          }))}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                            isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
                          }`}>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className="text-[10px]">{getInitials(u.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-gray-800">{u.name}</span>
                            <span className="text-[10px] text-gray-400 ml-1.5">{u.position || u.department}</span>
                          </div>
                          {isSelected && <span className="text-[10px] text-blue-600 font-medium shrink-0">✓ Added</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              {form.participants.length > 0 && (
                <p className="text-xs text-blue-600 mt-1.5 font-medium">{form.participants.length} participant{form.participants.length !== 1 ? "s" : ""} added to chat</p>
              )}
            </div>
            {/* Document upload */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Attachments</label>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                <Paperclip className="w-4 h-4" /> Click to upload files (PDF, images, docs)
              </button>
              {form.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {form.attachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="flex items-center gap-2 text-xs text-gray-700">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />{a.name}
                        <span className="text-gray-400">({(a.size/1024).toFixed(1)} KB)</span>
                      </span>
                      <button onClick={() => removeAttachment(i)} className="text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={saveTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
