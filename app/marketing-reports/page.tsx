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
  MessageSquarePlus, Plus, Calendar, TrendingUp, Target, 
  Edit, Trash2, Download, CheckCircle, XCircle, AlertCircle 
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

const SESSION_KEY = "phidtech_session";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface MarketingReport {
  id: string;
  companyId: string;
  staffId: string;
  date: string;
  campaign?: string;
  activities: string;
  leadsGenerated: number;
  conversions: number;
  feedback: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: "draft" | "submitted";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Session { id: string; name: string; isSuperAdmin: boolean; companyId: string; role?: string; position?: string; }

const emptyForm = (): Omit<MarketingReport, "id" | "createdAt" | "updatedAt"> => ({
  companyId: "",
  staffId: "",
  date: "",
  campaign: "",
  activities: "",
  leadsGenerated: 0,
  conversions: 0,
  feedback: "",
  attachmentUrl: "",
  attachmentName: "",
  status: "draft",
  createdBy: "",
});

const statusColors: Record<MarketingReport["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-green-100 text-green-700",
};

export default function MarketingReportsPage() {
  const router = useRouter();
  useEffect(() => {
    try {
      const raw = localStorage.getItem("phidtech_session");
      if (!raw) router.replace("/login");
    } catch { router.replace("/login"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [reports, setReports] = useState<MarketingReport[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<MarketingReport | null>(null);
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
    const isMgr = sess.isSuperAdmin ||
      ["admin", "hr", "manager"].includes(sess.role ?? "") ||
      ["admin", "hr", "manager"].includes(sess.position ?? "");
    try {
      const res = await fetch("/api/marketing-reports", { cache: "no-store" });
      if (res.ok) {
        const list: MarketingReport[] = await res.json();
        // Managers see all company reports; staff see only their own
        const visible = isMgr
          ? list.filter(r => r.companyId === cid)
          : list.filter(r => r.staffId === sess.id && r.companyId === cid);
        setReports(visible);
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
    setForm({ 
      ...emptyForm(), 
      companyId: activeCompanyId, 
      staffId: session?.id ?? "",
      createdBy: session?.id ?? "",
      date: new Date().toISOString().split('T')[0]
    });
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (report: MarketingReport) => {
    setEditTarget(report);
    setForm({ ...report });
    setFormError("");
    setShowDialog(true);
  };

  const saveReport = async () => {
    if (!form.activities.trim()) { setFormError("Marketing activities are required."); return; }
    if (!form.date) { setFormError("Report date is required."); return; }
    
    try {
      if (editTarget) {
        const r = await fetch("/api/marketing-reports", { 
          method: "PUT", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ id: editTarget.id, ...form }) 
        });
        if (!r.ok) { const d = await r.json(); setFormError(d.error ?? "Failed to save."); return; }
      } else {
        const r = await fetch("/api/marketing-reports", { 
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

  const deleteReport = async (id: string) => {
    await fetch(`/api/marketing-reports?id=${id}`, { method: "DELETE" });
    await reload();
    setDeleteId(null);
  };

  const submitReport = async (id: string) => {
    try {
      const r = await fetch("/api/marketing-reports", { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ id, status: "submitted" }) 
      });
      if (r.ok) {
        await reload();
      }
    } catch { setFormError("Failed to submit report."); }
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
        title="Marketing Reports"
        subtitle="Daily marketing activities and feedback tracking"
        icon={MessageSquarePlus}
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> New Report
          </Button>
        }
      />

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <MessageSquarePlus className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No marketing reports submitted</p>
            <p className="text-xs text-gray-400 mt-1">Click "New Report" to submit your first daily marketing report</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{formatDate(report.date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {report.campaign ? (
                        <span className="text-sm font-medium text-purple-700">{report.campaign}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-700 line-clamp-2">{report.activities}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-blue-500" />
                        <span className="text-sm font-semibold text-blue-600">{report.leadsGenerated}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-sm font-semibold text-green-600">{report.conversions}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {report.feedback ? (
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-700 line-clamp-2">{report.feedback}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No feedback</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[report.status]}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {report.attachmentUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={report.attachmentUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                        {report.status === "draft" && (
                          <Button variant="outline" size="sm" onClick={() => submitReport(report.id)}>
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(report)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(report.id)}>
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
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
            <DialogTitle>{editTarget ? "Edit Marketing Report" : "New Marketing Report"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Report Date *</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Campaign Name</label>
              <Input 
                value={form.campaign || ""} 
                onChange={e => setForm(f => ({ ...f, campaign: e.target.value }))} 
                placeholder="e.g., Summer Sale Campaign"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Leads Generated</label>
              <Input 
                type="number" 
                value={form.leadsGenerated} 
                onChange={e => setForm(f => ({ ...f, leadsGenerated: parseInt(e.target.value) || 0 }))} 
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Conversions</label>
              <Input 
                type="number" 
                value={form.conversions} 
                onChange={e => setForm(f => ({ ...f, conversions: parseInt(e.target.value) || 0 }))} 
                placeholder="0"
                min="0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Marketing Activities *</label>
              <Textarea 
                value={form.activities} 
                onChange={e => setForm(f => ({ ...f, activities: e.target.value }))} 
                placeholder="Describe your marketing activities for the day: social media posts, email campaigns, calls made, events attended, etc..."
                rows={4}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Feedback & Insights</label>
              <Textarea 
                value={form.feedback || ""} 
                onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} 
                placeholder="Share your feedback, challenges faced, successful strategies, market insights, suggestions for improvement..."
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
            <Button onClick={saveReport}>
              {editTarget ? "Update Report" : "Save Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Marketing Report</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this marketing report? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteReport(deleteId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
