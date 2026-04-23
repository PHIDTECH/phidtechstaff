"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Users2, Plus, Calendar, Clock, MapPin, FileText, 
  Edit, Trash2, Download, CheckCircle, XCircle, AlertCircle 
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

const SESSION_KEY = "phidtech_session";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface StaffMeeting {
  id: string;
  companyId: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  type: "regular" | "emergency" | "training" | "review";
  agenda: string;
  feedback?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: "scheduled" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Session { id: string; name: string; isSuperAdmin: boolean; companyId: string; role?: string; position?: string; }

const emptyForm = (): Omit<StaffMeeting, "id" | "createdAt" | "updatedAt"> => ({
  companyId: "",
  title: "",
  date: "",
  time: "",
  location: "",
  type: "regular",
  agenda: "",
  feedback: "",
  attachmentUrl: "",
  attachmentName: "",
  status: "scheduled",
  createdBy: "",
});

const typeColors: Record<StaffMeeting["type"], string> = {
  regular: "bg-blue-100 text-blue-700",
  emergency: "bg-red-100 text-red-700",
  training: "bg-green-100 text-green-700",
  review: "bg-purple-100 text-purple-700",
};

const statusColors: Record<StaffMeeting["status"], string> = {
  scheduled: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function StaffMeetingsPage() {
  const router = useRouter();
  useEffect(() => {
    try {
      const raw = localStorage.getItem("phidtech_session");
      if (!raw) router.replace("/login");
    } catch { router.replace("/login"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [meetings, setMeetings] = useState<StaffMeeting[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMeeting | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reload = async () => {
    const sess = lsGet<Session | null>(SESSION_KEY, null);
    if (!sess) return;
    setSession(sess);
    const cid = getActiveCid(sess);
    setActiveCompanyId(cid);
    try {
      const res = await fetch("/api/staff-meetings", { cache: "no-store" });
      if (res.ok) {
        const list: StaffMeeting[] = await res.json();
        setMeetings(list.filter(m => m.companyId === cid));
      }
    } catch { /* silently fail */ }
  };

  useEffect(() => {
    reload();
    window.addEventListener("phidtech_companies_updated", reload);
    return () => {
      window.removeEventListener("phidtech_companies_updated", reload);
    };
  }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...emptyForm(), companyId: activeCompanyId, createdBy: session?.id ?? "" });
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (meeting: StaffMeeting) => {
    setEditTarget(meeting);
    setForm({ ...meeting });
    setFormError("");
    setShowDialog(true);
  };

  const saveMeeting = async () => {
    if (!form.title.trim()) { setFormError("Meeting title is required."); return; }
    if (!form.date) { setFormError("Meeting date is required."); return; }
    if (!form.type) { setFormError("Meeting type is required."); return; }
    
    try {
      if (editTarget) {
        const r = await fetch("/api/staff-meetings", { 
          method: "PUT", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ id: editTarget.id, ...form }) 
        });
        if (!r.ok) { const d = await r.json(); setFormError(d.error ?? "Failed to save."); return; }
      } else {
        const r = await fetch("/api/staff-meetings", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify(form) 
        });
        if (!r.ok) { const d = await r.json(); setFormError(d.error ?? "Failed to save."); return; }
      }
      await reload();
      setShowDialog(false);
    } catch { setFormError("Network error. Please try again."); }
  };

  const deleteMeeting = async (id: string) => {
    await fetch(`/api/staff-meetings?id=${id}`, { method: "DELETE" });
    await reload();
    setDeleteId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      // In a real app, upload to cloud storage
      // For now, create a fake URL
      const fakeUrl = `https://example.com/attachments/${Date.now()}_${file.name}`;
      setForm(f => ({ ...f, attachmentUrl: fakeUrl, attachmentName: file.name }));
    } catch (error) {
      setFormError("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const canManage = session?.isSuperAdmin ||
    ["admin", "hr", "manager"].includes(session?.role ?? "") ||
    ["admin", "hr", "manager"].includes(session?.position ?? "");

  return (
    <MainLayout>
      <PageHeader
        title="Staff Meetings"
        subtitle="Schedule and manage staff meetings with feedback tracking"
        icon={Users2}
        actions={
          canManage && (
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Schedule Meeting
            </Button>
          )
        }
      />

      {/* Meetings Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users2 className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No staff meetings scheduled</p>
            {canManage && <p className="text-xs text-gray-400 mt-1">Click "Schedule Meeting" to create your first meeting</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meeting</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map((meeting) => (
                  <TableRow key={meeting.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{meeting.title}</p>
                        {meeting.agenda && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{meeting.agenda}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{formatDate(meeting.date)}</span>
                        {meeting.time && (
                          <>
                            <Clock className="w-3 h-3 text-gray-400 ml-2" />
                            <span>{meeting.time}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {meeting.location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{meeting.location}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[meeting.type]}>
                        {meeting.type.charAt(0).toUpperCase() + meeting.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[meeting.status]}>
                        {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {meeting.feedback ? (
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-700 line-clamp-2">{meeting.feedback}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No feedback yet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {meeting.attachmentUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={meeting.attachmentUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                        {canManage && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEdit(meeting)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteId(meeting.id)}>
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Meeting" : "Schedule New Meeting"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Meeting Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Weekly Team Standup" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Meeting Type *</label>
              <Select value={form.type} onValueChange={(v: StaffMeeting["type"]) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Meeting</SelectItem>
                  <SelectItem value="emergency">Emergency Meeting</SelectItem>
                  <SelectItem value="training">Training Session</SelectItem>
                  <SelectItem value="review">Performance Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date *</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Time</label>
              <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Location</label>
              <Input value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Conference Room A" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
              <Select value={form.status} onValueChange={(v: StaffMeeting["status"]) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Agenda</label>
              <Textarea 
                value={form.agenda || ""} 
                onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} 
                placeholder="Meeting agenda and topics to discuss..."
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Meeting Feedback</label>
              <Textarea 
                value={form.feedback || ""} 
                onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} 
                placeholder="Meeting outcomes, decisions made, action items..."
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Attachment (Optional)</label>
              <div className="flex items-center gap-3">
                <Input 
                  type="file" 
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  disabled={uploading}
                />
                {form.attachmentUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{form.attachmentName}</span>
                    <Button variant="outline" size="sm" asChild>
                      <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                )}
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {formError && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
              {formError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveMeeting}>
              {editTarget ? "Update Meeting" : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meeting</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this meeting? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMeeting(deleteId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
