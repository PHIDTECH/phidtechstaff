"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, Search, Trash2, Edit, Clock, CheckCircle, XCircle, CalendarDays, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
function lsGet<T>(k: string, fb: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; } }

interface Session { id: string; name: string; role: string; position: string; isSuperAdmin: boolean; companyId: string; }
interface PendingPayment {
  id: string; companyId: string; customerName: string; phone?: string; email?: string;
  amountNegotiated: number; amountPaid?: number; promisedDate: string;
  status: "pending" | "partial" | "paid" | "overdue"; notes?: string;
  addedBy: string; createdAt: string; _days?: number;
}
interface Company { id: string; name: string; }

const ALLOWED = ["admin","accountant","manager","group_manager","group_ceo","group_cfo","group_controller","group_accountant","general manager","general_manager","controller","co"];
const GRP_ROLES = ["group_manager","group_ceo","group_cfo","group_controller","group_accountant"];

export default function PendingPaymentsPage() {
  const [session,   setSession]   = useState<Session | null>(null);
  const [cid,       setCid]       = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [payments,  setPayments]  = useState<PendingPayment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [sf,        setSf]        = useState("all");
  const [showDlg,   setShowDlg]   = useState(false);
  const [editItem,  setEditItem]  = useState<PendingPayment | null>(null);
  const [form,      setForm]      = useState({ companyId:"", customerName:"", phone:"", email:"", amountNegotiated:"", amountPaid:"", promisedDate:"", notes:"", status:"pending" });
  const [fErr,      setFErr]      = useState("");
  const [delId,     setDelId]     = useState<string|null>(null);
  const [partDlg,   setPartDlg]   = useState<PendingPayment|null>(null);
  const [partAmt,   setPartAmt]   = useState("");

  const reload = async () => {
    setLoading(true);
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    setCid(getActiveCid(sess));
    setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
    try { const r = await fetch("/api/pending-payments",{cache:"no-store"}); if (r.ok) setPayments(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const _r = (session?.role ?? "").toLowerCase();
  const _p = (session?.position ?? "").toLowerCase();
  const isAllowed   = session?.isSuperAdmin || ALLOWED.some(x => _r.includes(x) || _p.includes(x));
  const isGroupLvl  = session?.isSuperAdmin || session?.companyId === "group" || GRP_ROLES.some(x => _r===x||_p===x) || _p==="general manager" || _r==="general manager";
  const canEdit     = isGroupLvl || ["accountant","manager"].some(x => _r.includes(x)||_p.includes(x));

  const coName = (id: string) => companies.find(c => c.id === id)?.name ?? id;

  const today = new Date(); today.setHours(0,0,0,0);
  const dDiff = (d: string) => { const t=new Date(d); t.setHours(0,0,0,0); return Math.ceil((t.getTime()-today.getTime())/86400000); };

  const enriched = (isGroupLvl ? payments : payments.filter(p => p.companyId===cid)).map(p => ({
    ...p, _days: dDiff(p.promisedDate),
    status: (p.status!=="paid" && dDiff(p.promisedDate)<0 ? "overdue" : p.status) as PendingPayment["status"],
  }));

  const visible = enriched.filter(p =>
    (sf==="all"||p.status===sf) &&
    (p.customerName.toLowerCase().includes(search.toLowerCase()) || (p.phone??"").includes(search))
  );

  const cntPending  = enriched.filter(p=>p.status==="pending").length;
  const cntOverdue  = enriched.filter(p=>p.status==="overdue").length;
  const cntWeek     = enriched.filter(p=>p.status!=="paid"&&(p._days??0)>=0&&(p._days??0)<=7).length;
  const totalRem    = enriched.filter(p=>p.status!=="paid").reduce((s,p)=>s+(p.amountNegotiated-(p.amountPaid??0)),0);

  const openAdd = () => { setEditItem(null); setForm({companyId:cid||session?.companyId||"group",customerName:"",phone:"",email:"",amountNegotiated:"",amountPaid:"0",promisedDate:"",notes:"",status:"pending"}); setFErr(""); setShowDlg(true); };
  const openEdit= (p:PendingPayment) => { setEditItem(p); setForm({companyId:p.companyId,customerName:p.customerName,phone:p.phone??"",email:p.email??"",amountNegotiated:String(p.amountNegotiated),amountPaid:String(p.amountPaid??0),promisedDate:p.promisedDate,notes:p.notes??"",status:p.status}); setFErr(""); setShowDlg(true); };

  const save = async () => {
    if (!form.customerName.trim()) { setFErr("Customer name is required."); return; }
    if (!Number(form.amountNegotiated)) { setFErr("Enter a valid amount."); return; }
    if (!form.promisedDate) { setFErr("Promised date is required."); return; }
    const cmpId = form.companyId||cid||session?.companyId||"group";
    const body = {...form, companyId:cmpId, amountNegotiated:Number(form.amountNegotiated), amountPaid:Number(form.amountPaid||0)};
    if (editItem) {
      await fetch("/api/pending-payments",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editItem.id,...body})});
    } else {
      await fetch("/api/pending-payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,addedBy:session?.name??""})});
    }
    setShowDlg(false); reload();
  };

  const del = async (id:string) => { await fetch(`/api/pending-payments?id=${id}`,{method:"DELETE"}); setDelId(null); reload(); };

  const markPaid = async (p:PendingPayment) => {
    await fetch("/api/pending-payments",{method:"PUT",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:p.id,status:"paid",amountPaid:p.amountNegotiated})});
    reload();
  };

  const savePartial = async () => {
    if (!partDlg) return;
    const amt = Number(partAmt);
    if (!amt||amt<=0) return;
    const rem = partDlg.amountNegotiated - amt;
    await fetch("/api/pending-payments",{method:"PUT",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:partDlg.id,amountPaid:amt,status:rem<=0?"paid":"partial"})});
    setPartDlg(null); setPartAmt(""); reload();
  };

  const badge = (s:string) => {
    const cls = s==="pending"?"bg-yellow-100 text-yellow-700":s==="partial"?"bg-blue-100 text-blue-700":s==="paid"?"bg-green-100 text-green-700":"bg-red-100 text-red-600";
    const lbl = s==="pending"?"⏳ Pending":s==="partial"?"🔵 Partial":s==="paid"?"✅ Paid":"🔴 Overdue";
    return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{lbl}</span>;
  };

  if (!loading && !isAllowed) return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <XCircle className="w-10 h-10 text-red-400" />
        <p className="font-semibold text-gray-700">Access Denied</p>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <PageHeader title="Promised Deal & Payments" subtitle="Track customers with negotiated amounts and promised payment dates" icon={Wallet}
        actions={canEdit ? <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2"/>Add Record</Button> : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending" value={cntPending} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" subtitle="Awaiting payment" />
        <StatCard title="Overdue" value={cntOverdue} icon={AlertCircle} iconBg="bg-red-50" iconColor="text-red-600" subtitle="Past promise date" />
        <StatCard title="Due This Week" value={cntWeek} icon={CalendarDays} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle="Next 7 days" />
        <StatCard title="Total Remaining" value={formatCurrency(totalRem)} icon={Wallet} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="Unpaid balance" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <Input placeholder="Search name or phone…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/>
        </div>
        <Select value={sf} onValueChange={setSf}>
          <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Wallet className="w-10 h-10 text-gray-300"/>
            <p className="font-medium text-gray-600">No records found</p>
            {canEdit && <Button size="sm" variant="outline" onClick={openAdd}><Plus className="w-4 h-4 mr-1.5"/>Add Record</Button>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                {isGroupLvl && <TableHead>Company</TableHead>}
                <TableHead>Negotiated</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Promised Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(p => {
                const rem = p.amountNegotiated - (p.amountPaid ?? 0);
                const dd = p._days ?? 0;
                return (
                  <TableRow key={p.id} className={p.status==="overdue"?"bg-red-50/30":""}>
                    <TableCell>
                      <p className="font-medium text-gray-900 text-sm">{p.customerName}</p>
                      {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                    </TableCell>
                    {isGroupLvl && <TableCell className="text-xs text-gray-500">{coName(p.companyId)}</TableCell>}
                    <TableCell className="font-semibold text-gray-800">{formatCurrency(p.amountNegotiated)}</TableCell>
                    <TableCell className="text-green-700">{(p.amountPaid??0)>0?formatCurrency(p.amountPaid??0):"—"}</TableCell>
                    <TableCell className={rem>0?"font-semibold text-red-600":"text-gray-400"}>{rem>0?formatCurrency(rem):"Cleared"}</TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-700">{p.promisedDate}</p>
                      {p.status!=="paid" && (
                        <p className={`text-xs ${dd<0?"text-red-500":dd===0?"text-orange-500":"text-gray-400"}`}>
                          {dd<0?`${Math.abs(dd)}d overdue`:dd===0?"Due today":`${dd}d left`}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{badge(p.status)}</TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[140px] truncate">{p.notes||"—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {canEdit && p.status!=="paid" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600 text-xs px-2 h-7" onClick={()=>markPaid(p)}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1"/>Paid
                            </Button>
                            <Button variant="ghost" size="sm" className="text-blue-600 text-xs px-2 h-7" onClick={()=>{setPartDlg(p);setPartAmt("");}}>
                              💵 Partial
                            </Button>
                          </>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(p)}>
                            <Edit className="w-3.5 h-3.5 text-gray-400"/>
                          </Button>
                        )}
                        {(session?.isSuperAdmin||isGroupLvl) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>setDelId(p.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-400"/>
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

      {/* Add / Edit Dialog */}
      <Dialog open={showDlg} onOpenChange={setShowDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem?"Edit Record":"Add Pending Payment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {fErr && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600"><AlertCircle className="w-4 h-4 shrink-0"/>{fErr}</div>}
            {isGroupLvl && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Company</label>
                <Select value={form.companyId} onValueChange={v=>setForm(f=>({...f,companyId:v}))}>
                  <SelectTrigger><SelectValue placeholder="Select company"/></SelectTrigger>
                  <SelectContent>{companies.filter(c=>c.id!=="group").map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Customer Name *</label>
              <Input placeholder="Full name" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input placeholder="07XXXXXXXX" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <Input placeholder="email@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount Negotiated (TZS) *</label>
                <Input type="number" placeholder="e.g. 500000" value={form.amountNegotiated} onChange={e=>setForm(f=>({...f,amountNegotiated:e.target.value}))}/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount Paid (TZS)</label>
                <Input type="number" placeholder="0" value={form.amountPaid} onChange={e=>setForm(f=>({...f,amountPaid:e.target.value}))}/>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Promised Payment Date *</label>
              <Input type="date" value={form.promisedDate} onChange={e=>setForm(f=>({...f,promisedDate:e.target.value}))}/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
              <Input placeholder="Any additional notes…" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowDlg(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Dialog */}
      <Dialog open={!!partDlg} onOpenChange={()=>{setPartDlg(null);setPartAmt("");}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Partial Payment</DialogTitle></DialogHeader>
          {partDlg && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Customer: <strong>{partDlg.customerName}</strong></p>
              <p className="text-sm text-gray-600">Remaining: <strong className="text-red-600">{formatCurrency(partDlg.amountNegotiated-(partDlg.amountPaid??0))}</strong></p>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount Received (TZS)</label>
                <Input type="number" placeholder="Enter amount received" value={partAmt} onChange={e=>setPartAmt(e.target.value)}/>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=>{setPartDlg(null);setPartAmt("");}}>Cancel</Button>
            <Button onClick={savePartial}>Save Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!delId} onOpenChange={()=>setDelId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Record</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this record? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDelId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={()=>delId&&del(delId)}><Trash2 className="w-4 h-4 mr-2"/>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
