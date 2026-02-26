"use client";
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
import { Textarea } from "@/components/ui/textarea";
import { CheckSquare, Plus, Search, Clock, AlertCircle, CheckCircle, XCircle, Edit, Eye, MoreVertical } from "lucide-react";
import { tasks, users, departments } from "@/lib/data";
import { formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null);

  const companyTasks = tasks.filter(t => t.companyId === "c1");
  const filtered = companyTasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending = companyTasks.filter(t => t.status === "pending").length;
  const inProgress = companyTasks.filter(t => t.status === "in-progress").length;
  const completed = companyTasks.filter(t => t.status === "completed").length;
  const cancelled = companyTasks.filter(t => t.status === "cancelled").length;

  const byDept = departments.filter(d => d.companyId === "c1").map(d => ({
    dept: d.name,
    tasks: companyTasks.filter(t => t.department === d.name)
  })).filter(d => d.tasks.length > 0);

  const priorityColor = (p: string) => ({
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800"
  }[p] || "bg-gray-100 text-gray-800");

  return (
    <MainLayout>
      <PageHeader
        title="Task Management"
        subtitle="Create, assign and track tasks across departments"
        icon={CheckSquare}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending" value={pending} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard title="In Progress" value={inProgress} icon={AlertCircle} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Completed" value={completed} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Cancelled" value={cancelled} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" />
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
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
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
                  const assignee = users.find(u => u.id === task.assignedTo);
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{task.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignee && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-xs">{getInitials(assignee.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-700">{assignee.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{task.department}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDate(task.dueDate)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedTask(task)}>
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4 text-gray-400" />
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

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["pending", "in-progress", "completed", "cancelled"].map((status) => {
              const statusTasks = companyTasks.filter(t => t.status === status);
              const colors: Record<string, string> = {
                "pending": "border-yellow-300 bg-yellow-50",
                "in-progress": "border-purple-300 bg-purple-50",
                "completed": "border-green-300 bg-green-50",
                "cancelled": "border-gray-300 bg-gray-50"
              };
              const headColors: Record<string, string> = {
                "pending": "text-yellow-700",
                "in-progress": "text-purple-700",
                "completed": "text-green-700",
                "cancelled": "text-gray-600"
              };
              return (
                <div key={status} className={`rounded-xl border-2 ${colors[status]} p-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold capitalize ${headColors[status]}`}>{status.replace("-", " ")}</h3>
                    <span className="text-xs font-bold bg-white rounded-full px-2 py-0.5 shadow-sm text-gray-700">{statusTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {statusTasks.map((task) => {
                      const assignee = users.find(u => u.id === task.assignedTo);
                      return (
                        <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
                          <p className="font-medium text-gray-800 text-sm mb-1">{task.title}</p>
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(task.priority)}`}>{task.priority}</span>
                            {assignee && (
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[10px]">{getInitials(assignee.name)}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Due: {formatDate(task.dueDate)}</p>
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
            {byDept.map(({ dept, tasks: dTasks }) => (
              <div key={dept} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{dept}</h3>
                  <span className="text-xs text-gray-500">{dTasks.length} tasks</span>
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {dTasks.map((t) => {
                    const assignee = users.find(u => u.id === t.assignedTo);
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          t.status === "completed" ? "bg-green-500" :
                          t.status === "in-progress" ? "bg-blue-500" :
                          t.status === "pending" ? "bg-yellow-500" : "bg-gray-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                          <p className="text-xs text-gray-400">{assignee?.name}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${priorityColor(t.priority)}`}>{t.priority}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{selectedTask.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{selectedTask.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Status", value: selectedTask.status },
                  { label: "Priority", value: selectedTask.priority },
                  { label: "Department", value: selectedTask.department },
                  { label: "Due Date", value: formatDate(selectedTask.dueDate) },
                  { label: "Assigned To", value: users.find(u => u.id === selectedTask.assignedTo)?.name || "-" },
                  { label: "Assigned By", value: users.find(u => u.id === selectedTask.assignedBy)?.name || "-" },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-medium text-gray-800 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
              {selectedTask.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTask.tags.map(tag => (
                    <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>Close</Button>
            <Button>Edit Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Task Title</label>
              <Input placeholder="Enter task title" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Textarea placeholder="Describe the task..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Assign To</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.companyId === "c1").map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Priority</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Set priority" /></SelectTrigger>
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
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                  <SelectContent>
                    {departments.filter(d => d.companyId === "c1").map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Due Date</label>
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAddDialog(false)}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
