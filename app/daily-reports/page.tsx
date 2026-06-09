"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Eye, CheckCircle, ChevronDown, ChevronUp, Trash2, FileText } from "lucide-react";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }

type ReportStatus = "draft" | "submitted" | "reviewed_gm" | "approved_ceo";
type ReportType   = "branch_manager" | "group_exec";

interface MediaPlatform { engagements?: string; subscribers?: string; storiesPerDay?: string; revenue?: string; views?: string; followers?: string; watchingHours?: string; reach?: string; }
interface HudumaItem  { idadi: string; kiasi: string; }

interface DailyReport {
  id: string;
  type: ReportType;
  date: string;
  companyId: string;
  submittedBy: string;
  submittedByName: string;
  status: ReportStatus;
  reviewedByGM?: string; reviewedAt?: string;
  approvedByCEO?: string; approvedAt?: string;
  createdAt: string;
  // Branch manager
  subscriptionDivision?: { watejaMfumo: string; subscriptionZilizolipwa: string; mapato: string; watejaChelewa: string; mrr: string; };
  consultancyDivision?:  { usajiliKampuni: string; usajiliMajina: string; maombiLeseni: string; mapatoLeo: string; };
  mediaDivision?:        { facebook: MediaPlatform; tiktok: MediaPlatform; instagram: MediaPlatform; youtube: MediaPlatform; mapato: string; watejaMpya: string; };
  fedhaZaKampuni?:       { mapatoLeo: string; matumiziLeo: string; netIncome: string; bankBalance: string; mobileWalletBalance: string; };
  hudumaNyingine?:       { photocopy: HudumaItem; vyeti: HudumaItem; leseni: HudumaItem; maombiVyuo: HudumaItem; maombiMkopo: HudumaItem; };
  // Group exec extras
  microfinanceDivision?: { marejesheoMikopo: string; mikopoMipya: string; watejaWaliolipa: string; watejaMpya: string; mikopoIliyochelewa: string; wahusika: string; branchBora: string; branchUfuatiliaji: string; };
  ictDivision?:          { projectsZinazoendela: string; projectsMpya: string; projectsZilizokamilika: string; mapatoLeo: string; changamoto: string; };
}

const emptySubscription  = () => ({ watejaMfumo:"", subscriptionZilizolipwa:"", mapato:"", watejaChelewa:"", mrr:"" });
const emptyConsultancy   = () => ({ usajiliKampuni:"", usajiliMajina:"", maombiLeseni:"", mapatoLeo:"" });
const emptyMediaPlatform = (): MediaPlatform => ({ engagements:"", subscribers:"", storiesPerDay:"", revenue:"", views:"", followers:"", watchingHours:"", reach:"" });
const emptyMedia         = () => ({ facebook: emptyMediaPlatform(), tiktok: emptyMediaPlatform(), instagram: emptyMediaPlatform(), youtube: emptyMediaPlatform(), mapato:"", watejaMpya:"" });
const emptyFedha         = () => ({ mapatoLeo:"", matumiziLeo:"", netIncome:"", bankBalance:"", mobileWalletBalance:"" });
const emptyHuduma        = () => ({ photocopy:{idadi:"",kiasi:""}, vyeti:{idadi:"",kiasi:""}, leseni:{idadi:"",kiasi:""}, maombiVyuo:{idadi:"",kiasi:""}, maombiMkopo:{idadi:"",kiasi:""} });
const emptyMicrofinance  = () => ({ marejesheoMikopo:"", mikopoMipya:"", watejaWaliolipa:"", watejaMpya:"", mikopoIliyochelewa:"", wahusika:"", branchBora:"", branchUfuatiliaji:"" });
const emptyIct           = () => ({ projectsZinazoendela:"", projectsMpya:"", projectsZilizokamilika:"", mapatoLeo:"", changamoto:"" });

const emptyForm = (type: ReportType): Partial<DailyReport> => ({
  type,
  date: new Date().toISOString().slice(0, 10),
  status: "draft",
  subscriptionDivision: emptySubscription(),
  consultancyDivision: emptyConsultancy(),
  mediaDivision: emptyMedia(),
  fedhaZaKampuni: emptyFedha(),
  hudumaNyingine: emptyHuduma(),
  ...(type === "group_exec" ? { microfinanceDivision: emptyMicrofinance(), ictDivision: emptyIct() } : {}),
});

const STATUS_LABELS: Record<ReportStatus, string> = {
  draft: "Draft", submitted: "Submitted", reviewed_gm: "GM Reviewed", approved_ceo: "CEO Approved"
};
const STATUS_COLORS: Record<ReportStatus, string> = {
  draft: "bg-gray-100 text-gray-600", submitted: "bg-blue-100 text-blue-700",
  reviewed_gm: "bg-indigo-100 text-indigo-700", approved_ceo: "bg-green-100 text-green-700"
};

function SectionCard({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? label} className="text-sm" />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? label} rows={3} className="text-sm" />
    </div>
  );
}

function HudumaRow({ label, item, onChange }: { label: string; item: HudumaItem; onChange: (v: HudumaItem) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-end">
      <div className="text-xs font-medium text-gray-700 pb-2">{label}</div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Idadi</label>
        <Input value={item.idadi} onChange={e => onChange({ ...item, idadi: e.target.value })} className="text-sm" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Kiasi</label>
        <Input value={item.kiasi} onChange={e => onChange({ ...item, kiasi: e.target.value })} className="text-sm" />
      </div>
    </div>
  );
}

export default function DailyReportsPage() {
  const [session,       setSession]       = useState<Session | null>(null);
  const [companies,     setCompanies]     = useState<Company[]>([]);
  const [cid,           setCid]           = useState("");
  const [reports,       setReports]       = useState<DailyReport[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [formType,      setFormType]      = useState<ReportType>("branch_manager");
  const [form,          setForm]          = useState<Partial<DailyReport>>(emptyForm("branch_manager"));
  const [saving,        setSaving]        = useState(false);
  const [viewReport,    setViewReport]    = useState<DailyReport | null>(null);
  const [openSections,  setOpenSections]  = useState<Record<string, boolean>>({ subscription:true, consultancy:false, media:false, fedha:false, huduma:false, micro:false, ict:false });

  const loadData = async () => {
    setLoading(true);
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const activeCid = getActiveCid(sess);
    setCid(activeCid);
    setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
    try {
      const r = await fetch("/api/daily-reports", { cache: "no-store" });
      if (r.ok) setReports(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const _r = (session?.role ?? "").toLowerCase();
  const _p = (session?.position ?? "").toLowerCase();
  const isGM      = _r.includes("manager") || _p.includes("manager") || _p.includes("general manager");
  const isCEO     = session?.isSuperAdmin || _r.includes("ceo") || _p.includes("ceo") || _r === "admin" || _p === "admin";
  const isAcct    = _r.includes("accountant") || _p.includes("accountant") || _r.includes("group_cfo") || _p.includes("group_cfo");
  const canSubmitExec = isCEO || isAcct || session?.isSuperAdmin;

  const visibleReports = (() => {
    const base = Array.isArray(reports) ? reports : [];
    if (isCEO || session?.isSuperAdmin) return base;
    if (isGM) return base.filter(r => r.status !== "draft" || r.submittedBy === session?.id);
    return base.filter(r => r.companyId === cid || r.submittedBy === session?.id);
  })();

  const toggleSection = (k: string) => setOpenSections(s => ({ ...s, [k]: !s[k] }));

  const openNewForm = (type: ReportType) => {
    setFormType(type);
    setForm(emptyForm(type));
    setOpenSections({ subscription:true, consultancy:false, media:false, fedha:false, huduma:false, micro:true, ict:false });
    setShowForm(true);
  };

  const updateForm = (path: string[], val: unknown) => {
    setForm(prev => {
      const next = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = { ...cur[path[i]] };
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = val;
      return next;
    });
  };

  const saveReport = async (status: ReportStatus) => {
    setSaving(true);
    try {
      const payload: DailyReport = {
        ...(form as DailyReport),
        id: form.id ?? `dr-${Date.now()}`,
        companyId: form.companyId ?? cid,
        submittedBy: session?.id ?? "",
        submittedByName: session?.name ?? "",
        status,
        createdAt: form.createdAt ?? new Date().toISOString(),
      };
      const method = form.id ? "PUT" : "POST";
      const r = await fetch("/api/daily-reports", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) { await loadData(); setShowForm(false); }
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: ReportStatus, extra: Partial<DailyReport> = {}) => {
    await fetch("/api/daily-reports", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, ...extra }) });
    await loadData();
  };

  const deleteReport = async (id: string) => {
    await fetch(`/api/daily-reports?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const sd  = form.subscriptionDivision  ?? emptySubscription();
  const cd  = form.consultancyDivision   ?? emptyConsultancy();
  const md  = form.mediaDivision         ?? emptyMedia();
  const fk  = form.fedhaZaKampuni        ?? emptyFedha();
  const hn  = form.hudumaNyingine        ?? emptyHuduma();
  const mf  = form.microfinanceDivision  ?? emptyMicrofinance();
  const ict = form.ictDivision           ?? emptyIct();

  return (
    <MainLayout>
      <PageHeader
        title="Daily Reports"
        subtitle="Branch Manager & Group Executive daily operational reports"
        icon={ClipboardList}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openNewForm("branch_manager")}>
              <Plus className="w-4 h-4 mr-1.5" /> Branch Report
            </Button>
            {canSubmitExec && (
              <Button size="sm" onClick={() => openNewForm("group_exec")}>
                <Plus className="w-4 h-4 mr-1.5" /> Group Exec Report
              </Button>
            )}
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading reports…</div>
        ) : visibleReports.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No daily reports yet</p>
            <p className="text-sm text-gray-400 mt-1">Submit the first report using the button above</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...visibleReports].sort((a,b) => b.date.localeCompare(a.date)).map(rpt => (
                <TableRow key={rpt.id}>
                  <TableCell className="font-medium text-gray-900">{rpt.date}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${rpt.type === "group_exec" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {rpt.type === "group_exec" ? "Group Exec" : "Branch Manager"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">{rpt.submittedByName}</TableCell>
                  <TableCell className="text-sm text-gray-500">{companies.find(c => c.id === rpt.companyId)?.name ?? rpt.companyId}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[rpt.status]}`}>
                      {STATUS_LABELS[rpt.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewReport(rpt)} title="View"><Eye className="w-4 h-4 text-gray-400" /></Button>
                      {rpt.status === "submitted" && isGM && (
                        <Button variant="ghost" size="sm" className="text-indigo-600 text-xs" onClick={() => updateStatus(rpt.id, "reviewed_gm", { reviewedByGM: session?.name, reviewedAt: new Date().toISOString() })}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> GM Review
                        </Button>
                      )}
                      {rpt.status === "reviewed_gm" && isCEO && (
                        <Button variant="ghost" size="sm" className="text-green-700 text-xs" onClick={() => updateStatus(rpt.id, "approved_ceo", { approvedByCEO: session?.name, approvedAt: new Date().toISOString() })}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> CEO Approve
                        </Button>
                      )}
                      {(isCEO || rpt.submittedBy === session?.id) && (
                        <Button variant="ghost" size="icon" onClick={() => deleteReport(rpt.id)} title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── New Report Form Dialog ── */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {formType === "group_exec" ? "PHIDTECH HOLDING LTD — Group Daily Executive Report" : "Branch Manager Daily Report"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
              <Field label="Tarehe (Date)" type="date" value={form.date ?? ""} onChange={v => updateForm(["date"], v)} />
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Company</label>
                <Select value={form.companyId ?? cid} onValueChange={v => updateForm(["companyId"], v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── MICROFINANCE (group exec only) ── */}
            {formType === "group_exec" && (
              <SectionCard title="1. MICROFINANCE DIVISION" open={!!openSections.micro} onToggle={() => toggleSection("micro")}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Marejesho ya mikopo (TZS)" value={mf.marejesheoMikopo} onChange={v => updateForm(["microfinanceDivision","marejesheoMikopo"],v)} placeholder="TZS…" />
                  <Field label="Mikopo mipya (TZS)" value={mf.mikopoMipya} onChange={v => updateForm(["microfinanceDivision","mikopoMipya"],v)} placeholder="TZS…" />
                  <Field label="Wateja waliolipa" value={mf.watejaWaliolipa} onChange={v => updateForm(["microfinanceDivision","watejaWaliolipa"],v)} />
                  <Field label="Wateja wapya" value={mf.watejaMpya} onChange={v => updateForm(["microfinanceDivision","watejaMpya"],v)} />
                  <Field label="Mikopo iliyochelewa (TZS)" value={mf.mikopoIliyochelewa} onChange={v => updateForm(["microfinanceDivision","mikopoIliyochelewa"],v)} placeholder="TZS…" />
                  <Field label="Branch Bora" value={mf.branchBora} onChange={v => updateForm(["microfinanceDivision","branchBora"],v)} />
                  <Field label="Branch Inayohitaji Ufuatiliaji" value={mf.branchUfuatiliaji} onChange={v => updateForm(["microfinanceDivision","branchUfuatiliaji"],v)} />
                </div>
                <TextareaField label="Majina ya wahusika na kiwango (1-5)" value={mf.wahusika} onChange={v => updateForm(["microfinanceDivision","wahusika"],v)} placeholder={"1.\n2.\n3.\n4.\n5."} />
              </SectionCard>
            )}

            {/* ── ICT (group exec only) ── */}
            {formType === "group_exec" && (
              <SectionCard title="2. ICT & SYSTEMS DIVISION" open={!!openSections.ict} onToggle={() => toggleSection("ict")}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Projects zinazoendelea" value={ict.projectsZinazoendela} onChange={v => updateForm(["ictDivision","projectsZinazoendela"],v)} />
                  <Field label="Projects mpya leo" value={ict.projectsMpya} onChange={v => updateForm(["ictDivision","projectsMpya"],v)} />
                  <Field label="Projects zilizokamilika" value={ict.projectsZilizokamilika} onChange={v => updateForm(["ictDivision","projectsZilizokamilika"],v)} />
                  <Field label="Mapato ya leo (TZS)" value={ict.mapatoLeo} onChange={v => updateForm(["ictDivision","mapatoLeo"],v)} placeholder="TZS…" />
                </div>
                <TextareaField label="Changamoto" value={ict.changamoto} onChange={v => updateForm(["ictDivision","changamoto"],v)} />
              </SectionCard>
            )}

            {/* ── SOFTWARE SUBSCRIPTION ── */}
            <SectionCard title={`${formType === "group_exec" ? "3." : "1."} SOFTWARE SUBSCRIPTION DIVISION`} open={!!openSections.subscription} onToggle={() => toggleSection("subscription")}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Wateja wanaolipia mfumo" value={sd.watejaMfumo} onChange={v => updateForm(["subscriptionDivision","watejaMfumo"],v)} />
                <Field label="Subscriptions zilizolipwa leo" value={sd.subscriptionZilizolipwa} onChange={v => updateForm(["subscriptionDivision","subscriptionZilizolipwa"],v)} />
                <Field label="Mapato ya subscription leo (TZS)" value={sd.mapato} onChange={v => updateForm(["subscriptionDivision","mapato"],v)} placeholder="TZS…" />
                <Field label="Wateja waliochelewa kulipa" value={sd.watejaChelewa} onChange={v => updateForm(["subscriptionDivision","watejaChelewa"],v)} />
                <Field label="MRR — Monthly Recurring Revenue (TZS)" value={sd.mrr} onChange={v => updateForm(["subscriptionDivision","mrr"],v)} placeholder="TZS…" />
              </div>
            </SectionCard>

            {/* ── BUSINESS CONSULTANCY ── */}
            <SectionCard title={`${formType === "group_exec" ? "4." : "2."} BUSINESS CONSULTANCY`} open={!!openSections.consultancy} onToggle={() => toggleSection("consultancy")}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Usajili wa Kampuni" value={cd.usajiliKampuni} onChange={v => updateForm(["consultancyDivision","usajiliKampuni"],v)} />
                <Field label="Usajili wa Majina ya Biashara" value={cd.usajiliMajina} onChange={v => updateForm(["consultancyDivision","usajiliMajina"],v)} />
                <Field label="Maombi ya Leseni" value={cd.maombiLeseni} onChange={v => updateForm(["consultancyDivision","maombiLeseni"],v)} />
                <Field label="Mapato ya leo (TZS)" value={cd.mapatoLeo} onChange={v => updateForm(["consultancyDivision","mapatoLeo"],v)} placeholder="TZS…" />
              </div>
            </SectionCard>

            {/* ── MEDIA DIVISION ── */}
            <SectionCard title={`${formType === "group_exec" ? "5." : "3."} MEDIA DIVISION`} open={!!openSections.media} onToggle={() => toggleSection("media")}>
              {/* Facebook */}
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Facebook Reach</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Engagements" value={md.facebook?.engagements??""} onChange={v => updateForm(["mediaDivision","facebook","engagements"],v)} />
                <Field label="Subscribers" value={md.facebook?.subscribers??""} onChange={v => updateForm(["mediaDivision","facebook","subscribers"],v)} />
                <Field label="Stories per day" value={md.facebook?.storiesPerDay??""} onChange={v => updateForm(["mediaDivision","facebook","storiesPerDay"],v)} />
                <Field label="Revenue" value={md.facebook?.revenue??""} onChange={v => updateForm(["mediaDivision","facebook","revenue"],v)} />
              </div>
              {/* TikTok */}
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide mt-2">TikTok Views</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Views" value={md.tiktok?.views??""} onChange={v => updateForm(["mediaDivision","tiktok","views"],v)} />
                <Field label="Followers" value={md.tiktok?.followers??""} onChange={v => updateForm(["mediaDivision","tiktok","followers"],v)} />
                <Field label="Stories per day" value={md.tiktok?.storiesPerDay??""} onChange={v => updateForm(["mediaDivision","tiktok","storiesPerDay"],v)} />
                <Field label="Subscribers" value={md.tiktok?.subscribers??""} onChange={v => updateForm(["mediaDivision","tiktok","subscribers"],v)} />
                <Field label="Revenue" value={md.tiktok?.revenue??""} onChange={v => updateForm(["mediaDivision","tiktok","revenue"],v)} />
              </div>
              {/* Instagram */}
              <p className="text-xs font-bold text-pink-600 uppercase tracking-wide mt-2">Instagram Reach</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Views" value={md.instagram?.views??""} onChange={v => updateForm(["mediaDivision","instagram","views"],v)} />
                <Field label="Followers" value={md.instagram?.followers??""} onChange={v => updateForm(["mediaDivision","instagram","followers"],v)} />
                <Field label="Stories per day" value={md.instagram?.storiesPerDay??""} onChange={v => updateForm(["mediaDivision","instagram","storiesPerDay"],v)} />
                <Field label="Revenue" value={md.instagram?.revenue??""} onChange={v => updateForm(["mediaDivision","instagram","revenue"],v)} />
              </div>
              {/* YouTube */}
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide mt-2">YouTube Channel</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Subscribers" value={md.youtube?.subscribers??""} onChange={v => updateForm(["mediaDivision","youtube","subscribers"],v)} />
                <Field label="Watching hours" value={md.youtube?.watchingHours??""} onChange={v => updateForm(["mediaDivision","youtube","watchingHours"],v)} />
                <Field label="Stories per day" value={md.youtube?.storiesPerDay??""} onChange={v => updateForm(["mediaDivision","youtube","storiesPerDay"],v)} />
                <Field label="Reach" value={md.youtube?.reach??""} onChange={v => updateForm(["mediaDivision","youtube","reach"],v)} />
              </div>
              <Field label="Mapato ya matangazo (TZS)" value={md.mapato} onChange={v => updateForm(["mediaDivision","mapato"],v)} placeholder="TZS…" />
              <TextareaField label="Wateja wapya wa matangazo (1–5)" value={md.watejaMpya} onChange={v => updateForm(["mediaDivision","watejaMpya"],v)} placeholder={"1.\n2.\n3.\n4.\n5."} />
            </SectionCard>

            {/* ── FEDHA ZA KAMPUNI ── */}
            <SectionCard title={`${formType === "group_exec" ? "6." : "4."} FEDHA ZA KAMPUNI`} open={!!openSections.fedha} onToggle={() => toggleSection("fedha")}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mapato ya leo (TZS)" value={fk.mapatoLeo} onChange={v => updateForm(["fedhaZaKampuni","mapatoLeo"],v)} placeholder="TZS…" />
                <Field label="Matumizi ya leo (TZS)" value={fk.matumiziLeo} onChange={v => updateForm(["fedhaZaKampuni","matumiziLeo"],v)} placeholder="TZS…" />
                <Field label="Net Income (TZS)" value={fk.netIncome} onChange={v => updateForm(["fedhaZaKampuni","netIncome"],v)} placeholder="TZS…" />
                <Field label="Bank Balance (TZS)" value={fk.bankBalance} onChange={v => updateForm(["fedhaZaKampuni","bankBalance"],v)} placeholder="TZS XX,XXX,XXX" />
                <Field label="Mobile Wallet Balance (TZS)" value={fk.mobileWalletBalance} onChange={v => updateForm(["fedhaZaKampuni","mobileWalletBalance"],v)} placeholder="TZS XX,XXX,XXX" />
              </div>
            </SectionCard>

            {/* ── HUDUMA NYINGINE ── */}
            <SectionCard title={`${formType === "group_exec" ? "7." : "5."} HUDUMA NYINGINE`} open={!!openSections.huduma} onToggle={() => toggleSection("huduma")}>
              <div className="space-y-2">
                <HudumaRow label="PHOTOCOPY" item={hn.photocopy} onChange={v => updateForm(["hudumaNyingine","photocopy"],v)} />
                <HudumaRow label="VYETI VYA KUZALIWA/KIFO" item={hn.vyeti} onChange={v => updateForm(["hudumaNyingine","vyeti"],v)} />
                <HudumaRow label="LESENI" item={hn.leseni} onChange={v => updateForm(["hudumaNyingine","leseni"],v)} />
                <HudumaRow label="MAOMBI YA VYUO" item={hn.maombiVyuo} onChange={v => updateForm(["hudumaNyingine","maombiVyuo"],v)} />
                <HudumaRow label="MAOMBI YA MKOPO WA JUU" item={hn.maombiMkopo} onChange={v => updateForm(["hudumaNyingine","maombiMkopo"],v)} />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div><span className="font-semibold">Imeandaliwa na:</span> {formType === "group_exec" ? "Group Accountant" : "Branch Manager"}</div>
                <div><span className="font-semibold">Imehakikiwa na:</span> {formType === "group_exec" ? "General Manager" : "General Manager"}</div>
              </div>
            </SectionCard>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="outline" disabled={saving} onClick={() => saveReport("draft")}>Save Draft</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={() => saveReport("submitted")}>
              {saving ? "Submitting…" : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Report Dialog ── */}
      <Dialog open={!!viewReport} onOpenChange={v => { if (!v) setViewReport(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewReport?.type === "group_exec" ? "Group Daily Executive Report" : "Branch Manager Daily Report"}</DialogTitle>
          </DialogHeader>
          {viewReport && <ReportView report={viewReport} companies={companies} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewReport(null)}>Close</Button>
            {viewReport?.status === "submitted" && isGM && (
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { updateStatus(viewReport.id, "reviewed_gm", { reviewedByGM: session?.name, reviewedAt: new Date().toISOString() }); setViewReport(null); }}>
                <CheckCircle className="w-4 h-4 mr-1.5" /> Mark as GM Reviewed
              </Button>
            )}
            {viewReport?.status === "reviewed_gm" && isCEO && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { updateStatus(viewReport.id, "approved_ceo", { approvedByCEO: session?.name, approvedAt: new Date().toISOString() }); setViewReport(null); }}>
                <CheckCircle className="w-4 h-4 mr-1.5" /> CEO Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// ── Read-only report view ─────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 border-b pb-1">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 min-w-52 shrink-0">{label}:</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ReportView({ report, companies }: { report: DailyReport; companies: Company[] }) {
  const mf  = report.microfinanceDivision;
  const ict = report.ictDivision;
  const sd  = report.subscriptionDivision;
  const cd  = report.consultancyDivision;
  const md  = report.mediaDivision;
  const fk  = report.fedhaZaKampuni;
  const hn  = report.hudumaNyingine as Record<string, HudumaItem> | undefined;
  const num = report.type === "group_exec";

  return (
    <div className="space-y-5 text-sm">
      {/* Header */}
      <div className="p-3 bg-gray-50 rounded-lg grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">Type:</span> <strong>{report.type === "group_exec" ? "Group Daily Executive" : "Branch Manager"}</strong></div>
        <div><span className="text-gray-500">Tarehe:</span> <strong>{report.date}</strong></div>
        <div><span className="text-gray-500">Submitted by:</span> <strong>{report.submittedByName}</strong></div>
        <div><span className="text-gray-500">Company:</span> <strong>{companies.find(c => c.id === report.companyId)?.name ?? report.companyId}</strong></div>
        <div><span className="text-gray-500">Status:</span> <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[report.status]}`}>{STATUS_LABELS[report.status]}</span></div>
        {report.reviewedByGM && <div><span className="text-gray-500">GM Review:</span> <strong>{report.reviewedByGM}</strong></div>}
        {report.approvedByCEO && <div><span className="text-gray-500">CEO Approved:</span> <strong>{report.approvedByCEO}</strong></div>}
      </div>

      {mf && <Section title={`${num ? "1. " : ""}Microfinance Division`}>
        <Row label="Marejesho ya mikopo" value={mf.marejesheoMikopo} />
        <Row label="Mikopo mipya" value={mf.mikopoMipya} />
        <Row label="Wateja waliolipa" value={mf.watejaWaliolipa} />
        <Row label="Wateja wapya" value={mf.watejaMpya} />
        <Row label="Mikopo iliyochelewa" value={mf.mikopoIliyochelewa} />
        <Row label="Branch Bora" value={mf.branchBora} />
        <Row label="Branch Ufuatiliaji" value={mf.branchUfuatiliaji} />
        {mf.wahusika && <div className="text-sm"><span className="text-gray-500">Wahusika:</span><pre className="mt-1 font-medium text-gray-900 whitespace-pre-wrap text-xs bg-gray-50 rounded p-2">{mf.wahusika}</pre></div>}
      </Section>}

      {ict && <Section title={`${num ? "2. " : ""}ICT & Systems Division`}>
        <Row label="Projects zinazoendelea" value={ict.projectsZinazoendela} />
        <Row label="Projects mpya leo" value={ict.projectsMpya} />
        <Row label="Projects zilizokamilika" value={ict.projectsZilizokamilika} />
        <Row label="Mapato ya leo" value={ict.mapatoLeo} />
        <Row label="Changamoto" value={ict.changamoto} />
      </Section>}

      {sd && <Section title={`${num ? "3. " : "1. "}Software Subscription Division`}>
        <Row label="Wateja wanaolipia mfumo" value={sd.watejaMfumo} />
        <Row label="Subscriptions zilizolipwa leo" value={sd.subscriptionZilizolipwa} />
        <Row label="Mapato ya subscription leo" value={sd.mapato} />
        <Row label="Wateja waliochelewa kulipa" value={sd.watejaChelewa} />
        <Row label="MRR" value={sd.mrr} />
      </Section>}

      {cd && <Section title={`${num ? "4. " : "2. "}Business Consultancy`}>
        <Row label="Usajili wa Kampuni" value={cd.usajiliKampuni} />
        <Row label="Usajili wa Majina ya Biashara" value={cd.usajiliMajina} />
        <Row label="Maombi ya Leseni" value={cd.maombiLeseni} />
        <Row label="Mapato ya leo" value={cd.mapatoLeo} />
      </Section>}

      {md && <Section title={`${num ? "5. " : "3. "}Media Division`}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-blue-600 mb-1">Facebook</p>
            <Row label="Engagements" value={md.facebook?.engagements} />
            <Row label="Subscribers" value={md.facebook?.subscribers} />
            <Row label="Stories/day" value={md.facebook?.storiesPerDay} />
            <Row label="Revenue" value={md.facebook?.revenue} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-700 mb-1">TikTok</p>
            <Row label="Views" value={md.tiktok?.views} />
            <Row label="Followers" value={md.tiktok?.followers} />
            <Row label="Subscribers" value={md.tiktok?.subscribers} />
            <Row label="Revenue" value={md.tiktok?.revenue} />
          </div>
          <div>
            <p className="text-xs font-bold text-pink-600 mb-1">Instagram</p>
            <Row label="Views" value={md.instagram?.views} />
            <Row label="Followers" value={md.instagram?.followers} />
            <Row label="Stories/day" value={md.instagram?.storiesPerDay} />
            <Row label="Revenue" value={md.instagram?.revenue} />
          </div>
          <div>
            <p className="text-xs font-bold text-red-600 mb-1">YouTube</p>
            <Row label="Subscribers" value={md.youtube?.subscribers} />
            <Row label="Watching hours" value={md.youtube?.watchingHours} />
            <Row label="Stories/day" value={md.youtube?.storiesPerDay} />
            <Row label="Reach" value={md.youtube?.reach} />
          </div>
        </div>
        <Row label="Mapato ya matangazo" value={md.mapato} />
        {md.watejaMpya && <div><span className="text-gray-500">Wateja wapya:</span><pre className="mt-1 text-xs bg-gray-50 rounded p-2 whitespace-pre-wrap font-medium text-gray-900">{md.watejaMpya}</pre></div>}
      </Section>}

      {fk && <Section title={`${num ? "6. " : "4. "}Fedha za Kampuni`}>
        <Row label="Mapato ya leo" value={fk.mapatoLeo} />
        <Row label="Matumizi ya leo" value={fk.matumiziLeo} />
        <Row label="Net Income" value={fk.netIncome} />
        <Row label="Bank Balance" value={fk.bankBalance} />
        <Row label="Mobile Wallet Balance" value={fk.mobileWalletBalance} />
      </Section>}

      {hn && <Section title={`${num ? "7. " : "5. "}Huduma Nyingine`}>
        <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 uppercase pb-1 border-b">
          <span>Huduma</span><span>Idadi</span><span>Kiasi</span>
        </div>
        {["photocopy","vyeti","leseni","maombiVyuo","maombiMkopo"].map(k => {
          const labels: Record<string,string> = { photocopy:"Photocopy", vyeti:"Vyeti Kuzaliwa/Kifo", leseni:"Leseni", maombiVyuo:"Maombi ya Vyuo", maombiMkopo:"Maombi ya Mkopo" };
          const item = hn[k];
          if (!item?.idadi && !item?.kiasi) return null;
          return (
            <div key={k} className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-700 font-medium">{labels[k]}</span>
              <span>{item?.idadi || "—"}</span>
              <span>{item?.kiasi || "—"}</span>
            </div>
          );
        })}
      </Section>}

      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div><span className="font-semibold">Imeandaliwa na:</span> {report.type === "group_exec" ? "Group Accountant" : "Branch Manager"} — {report.submittedByName}</div>
        <div><span className="font-semibold">Imehakikiwa na:</span> {report.reviewedByGM ?? "General Manager (pending)"}</div>
      </div>
    </div>
  );
}
