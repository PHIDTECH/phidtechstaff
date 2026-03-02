"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
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
import { CheckSquare, Plus, Search, Clock, AlertCircle, CheckCircle, XCircle, Edit, Eye, Paperclip, Send, MessageSquare, X, FileText } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ACTIVE_KEY  = "phidtech_active_company";
const USERS_KEY   = "phidtech_users";
const TASKS_KEY   = "phidtech_tasks";
const NOTIF_KEY   = "phidtech_notifications";
const DEPTS_KEY   = "phidtech_departments";
const SESSION_KEY = "phidtech_session";

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
}
interface StaffUser { id: string; name: string; position: string; department: string; companyId: string; status: string; }
interface Notification { id: string; userId: string; message: string; read: boolean; createdAt: string; taskId?: string; }

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

const emptyForm = () => ({ title:"", description:"", assignedTo:"", priority:"medium" as Task["priority"], department:"", dueDate:"", attachments:[] as Attachment[] });

export default function TasksPage() {
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
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [session, setSession] = useState<{id:string;name:string;isSuperAdmin:boolean}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const reload = () => {
    const cid = lsStr(ACTIVE_KEY);
    setActiveCompanyId(cid);
    const allStaff = lsGet<StaffUser[]>(USERS_KEY, []);
    setStaffList(allStaff.filter(u => u.companyId === cid));
    setDeptsList(lsGet<string[]>(DEPTS_KEY, []));
    setTasksList(lsGet<Task[]>(TASKS_KEY, []));
    const sess = lsGet<{id:string;name:string;isSuperAdmin:boolean}>(SESSION_KEY, null as never);
    setSession(sess);
  };

  useEffect(() => {
    reload();
    window.addEventListener("phidtech_companies_updated", reload);
    return () => window.removeEventListener("phidtech_companies_updated", reload);
  }, []);

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

  const companyTasks = tasksList.filter(t => t.companyId === activeCompanyId);
  const filtered = companyTasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
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
    const notifs = lsGet<Notification[]>(NOTIF_KEY, []);
    notifs.push({ id: `n-${Date.now()}`, userId, message, read: false, createdAt: new Date().toISOString(), taskId });
    lsSet(NOTIF_KEY, notifs);
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

  const saveTask = () => {
    if (!form.title.trim()) { setFormError("Task title is required."); return; }
    if (!form.assignedTo) { setFormError("Assign to a staff member."); return; }
    if (!form.priority)   { setFormError("Select a priority."); return; }
    if (!form.dueDate)    { setFormError("Set a due date."); return; }
    const assignee = staffList.find(u => u.id === form.assignedTo);
    const task: Task = {
      id: `task-${Date.now()}`,
      companyId: activeCompanyId,
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
    };
    const updated = [...tasksList, task];
    lsSet(TASKS_KEY, updated);
    setTasksList(updated);
    pushNotification(form.assignedTo, `You have been assigned a new task: "${task.title}"`, task.id);
    setForm(emptyForm());
    setFormError("");
    setShowAddDialog(false);
  };

  const updateStatus = (taskId: string, status: Task["status"]) => {
    const updated = tasksList.map(t => t.id === taskId ? { ...t, status } : t);
    lsSet(TASKS_KEY, updated);
    setTasksList(updated);
    const task = tasksList.find(t => t.id === taskId);
    if (task) pushNotification(task.assignedBy, `Task "${task.title}" status changed to ${status}`, task.id);
  };

  const sendComment = () => {
    if (!commentText.trim() || !selectedTask) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      authorId: session?.id ?? "superadmin",
      authorName: session?.name ?? "System Administrator",
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = tasksList.map(t =>
      t.id === selectedTask.id ? { ...t, comments: [...t.comments, comment] } : t
    );
    lsSet(TASKS_KEY, updated);
    setTasksList(updated);
    // Notify the assigned staff (if commenter is not the assignee) and the creator
    const task = tasksList.find(t => t.id === selectedTask.id)!;
    const notifyIds = new Set([task.assignedTo, task.assignedBy].filter(id => id !== (session?.id ?? "superadmin")));
    notifyIds.forEach(uid => pushNotification(uid, `New comment on task "${task.title}": ${comment.text.slice(0,60)}`, task.id));
    setCommentText("");
  };

  return (
    <MainLayout>
      <PageHeader
        title="Task Management"
        subtitle="Create, assign and track tasks across departments"
        icon={CheckSquare}
        actions={
          <Button size="sm" onClick={() => { setForm(emptyForm()); setFormError(""); setShowAddDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To *</label>
                <Select value={form.assignedTo} onValueChange={v => setForm(f => ({...f, assignedTo: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.position}</SelectItem>
                    ))}
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
                    {deptsList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Due Date *</label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} />
              </div>
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
