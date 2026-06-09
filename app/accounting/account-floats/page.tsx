"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Plus, Edit, Trash2, RefreshCw, Building2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getActiveCid } from "@/lib/getActiveCid";

const SESSION_KEY  = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";

interface Session { id: string; name: string; role: string; position: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }
interface FloatUpdate { id: string; date: string; type?: "credit" | "debit"; amount?: number; balance: number; description: string; updatedBy: string; createdAt: string; reference?: string; }
interface AccountFloat {
  id: string; companyId: string; accountType: "mobile_money" | "bank";
  provider: string; accountName: string; accountNumber?: string;
  currency: string; currentBalance: number;
  lastUpdatedAt: string; updatedBy?: string; createdAt: string;
  history: FloatUpdate[];
}

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

const MOBILE_MONEY = ["M-Pesa (Vodacom)", "Airtel Money", "Halopesa (TTCL)", "T-Pesa (TTCL)", "Tigopesa (MIC)", "Mpesa Lipa"];
const BANKS = ["CRDB Bank", "NMB Bank", "NBC Bank", "Stanbic Bank", "Equity Bank", "Absa Bank", "Standard Chartered", "DTB Bank", "KCB Bank", "Azania Bank", "PBZ Bank", "TIB Bank", "BOT (Central Bank)", "Other Bank"];

const PROVIDER_COLORS: Record<string, string> = {
  "M-Pesa": "bg-red-50 text-red-700",
  "Airtel": "bg-red-50 text-red-800",
  "Halo": "bg-blue-50 text-blue-700",
  "Tigo": "bg-blue-50 text-blue-800",
  "T-Pesa": "bg-teal-50 text-teal-700",
  "CRDB": "bg-green-50 text-green-700",
  "NMB": "bg-orange-50 text-orange-700",
  "NBC": "bg-purple-50 text-purple-700",
  "Stanbic": "bg-indigo-50 text-indigo-700",
};
function providerColor(p: string) {
  const key = Object.keys(PROVIDER_COLORS).find(k => p.toLowerCase().includes(k.toLowerCase()));
  return key ? PROVIDER_COLORS[key] : "bg-gray-100 text-gray-700";
}

const emptyForm = () => ({
  accountType: "bank" as "mobile_money" | "bank",
  provider: "", accountName: "", accountNumber: "",
  currentBalance: "", companyId: "",
});
const emptyUpdate = () => ({ date: new Date().toISOString().slice(0, 10), balance: "", description: "" });

export default function AccountFloatsPage() {
  const [floats, setFloats]       = useState<AccountFloat[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [session, setSession]     = useState<Session | null>(null);
  const [cid, setCid]             = useState("");
  const [loading, setLoading]     = useState(true);

  const [showAdd, setShowAdd]     = useState(false);
  const [editFloat, setEditFloat] = useState<AccountFloat | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [formErr, setFormErr]     = useState("");

  const [updateTarget, setUpdateTarget] = useState<AccountFloat | null>(null);
  const [updForm, setUpdForm]           = useState(emptyUpdate());
  const [updErr, setUpdErr]             = useState("");

  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const c = getActiveCid(sess);
    setCid(c);
    setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
    setLoading(true);
    try {
      const r = await fetch("/api/account-floats", { cache: "no-store" });
      if (r.ok) setFloats(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const visible = cid ? floats.filter(f => f.companyId === cid) : floats;
  const mobileFloats = visible.filter(f => f.accountType === "mobile_money");
  const bankFloats   = visible.filter(f => f.accountType === "bank");
  const totalMobile  = mobileFloats.reduce((s, f) => s + f.currentBalance, 0);
  const totalBank    = bankFloats.reduce((s, f) => s + f.currentBalance, 0);
  const totalAll     = totalMobile + totalBank;

  const sf = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));

  const openAdd = () => { setEditFloat(null); setForm({ ...emptyForm(), companyId: cid }); setFormErr(""); setShowAdd(true); };
  const openEdit = (fl: AccountFloat) => {
    setEditFloat(fl);
    setForm({ accountType: fl.accountType, provider: fl.provider, accountName: fl.accountName, accountNumber: fl.accountNumber ?? "", currentBalance: String(fl.currentBalance), companyId: fl.companyId });
    setFormErr(""); setShowAdd(true);
  };

  const saveFloat = async () => {
    if (!form.provider.trim()) { setFormErr("Select or enter a provider."); return; }
    if (!form.companyId) { setFormErr("Select a company."); return; }
    const payload = { ...form, currentBalance: Number(form.currentBalance) || 0, updatedBy: session?.name ?? "" };
    if (editFloat) {
      await fetch("/api/account-floats", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editFloat.id, ...payload }) });
    } else {
      await fetch("/api/account-floats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowAdd(false); await reload();
  };

  const openUpdate = (fl: AccountFloat) => { setUpdateTarget(fl); setUpdForm(emptyUpdate()); setUpdErr(""); };
  const saveUpdate = async () => {
    if (!updForm.balance || isNaN(Number(updForm.balance))) { setUpdErr("Enter a valid balance."); return; }
    if (!updForm.description.trim()) { setUpdErr("Enter a description."); return; }
    await fetch("/api/account-floats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "update_balance", id: updateTarget!.id, date: updForm.date, balance: Number(updForm.balance), description: updForm.description, updatedBy: session?.name ?? "" }),
    });
    setUpdateTarget(null); await reload();
  };

  const doDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/account-floats?id=${deleteId}`, { method: "DELETE" });
    setDeleteId(null); await reload();
  };

  const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const coName = (id: string) => id === "group" ? "Group HQ" : companies.find(c => c.id === id)?.name ?? id;

  const FloatTable = ({ list }: { list: AccountFloat[] }) => (
    list.length === 0
      ? <div className="py-10 text-center text-gray-400 text-sm">No accounts added yet.</div>
      : <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              {!cid && <TableHead>Subsidiary</TableHead>}
              <TableHead>Account No.</TableHead>
              <TableHead className="text-right">Current Balance</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Updated By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(fl => (
              <>
                <TableRow key={fl.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${providerColor(fl.provider)}`}>{fl.provider}</span>
                      <span className="text-sm text-gray-700 font-medium">{fl.accountName}</span>
                    </div>
                  </TableCell>
                  {!cid && <TableCell className="text-xs text-gray-500">{coName(fl.companyId)}</TableCell>}
                  <TableCell className="font-mono text-xs text-gray-500">{fl.accountNumber || "—"}</TableCell>
                  <TableCell className="text-right font-bold text-blue-700 text-base">{formatCurrency(fl.currentBalance)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{fl.createdAt ? formatDate(fl.createdAt.slice(0, 10)) : "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{fl.lastUpdatedAt ? formatDate(fl.lastUpdatedAt.slice(0, 10)) : "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{fl.updatedBy || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-green-700 border-green-200" onClick={() => openUpdate(fl)}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Update
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleExpand(fl.id)}>
                        {expanded.has(fl.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(fl)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(fl.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expanded.has(fl.id) && fl.history && fl.history.length > 0 && (
                  <TableRow key={`${fl.id}-hist`}>
                    <TableCell colSpan={!cid ? 7 : 6} className="bg-slate-50 p-0">
                      <div className="px-6 py-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Balance History</p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400">
                              <th className="text-left pb-1">Date</th>
                              <th className="text-left pb-1 pl-2">Type</th>
                              <th className="text-right pb-1">Amount</th>
                              <th className="text-right pb-1">Balance (TZS)</th>
                              <th className="text-left pb-1 pl-4">Description</th>
                              <th className="text-left pb-1 pl-4">By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fl.history.map(h => (
                              <tr key={h.id} className="border-t border-slate-100">
                                <td className="py-1 text-gray-600 whitespace-nowrap">{h.date}</td>
                                <td className="py-1 pl-2">
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${h.type === "debit" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                                    {h.type === "debit" ? "▼ Debit" : "▲ Credit"}
                                  </span>
                                </td>
                                <td className={`py-1 text-right font-semibold ${h.type === "debit" ? "text-red-600" : "text-green-700"}`}>
                                  {h.type === "debit" ? "-" : "+"}{(h.amount ?? 0).toLocaleString()}
                                </td>
                                <td className="py-1 text-right font-semibold text-blue-700">{h.balance.toLocaleString()}</td>
                                <td className="py-1 pl-4 text-gray-600">{h.description}</td>
                                <td className="py-1 pl-4 text-gray-400">{h.updatedBy || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
  );

  return (
    <MainLayout>
      <PageHeader
        title="Account Floats"
        subtitle="Track mobile money & bank float balances per subsidiary"
        icon={Wallet}
        actions={<Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Account</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Float Balance" value={formatCurrency(totalAll)} icon={Wallet} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle="All accounts combined" />
        <StatCard title="Mobile Money" value={formatCurrency(totalMobile)} icon={Wallet} iconBg="bg-green-50" iconColor="text-green-600" subtitle={`${mobileFloats.length} account(s)`} />
        <StatCard title="Bank Accounts" value={formatCurrency(totalBank)} icon={Building2} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle={`${bankFloats.length} account(s)`} />
        <StatCard title="Total Accounts" value={visible.length} icon={Wallet} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle={cid ? companies.find(c => c.id === cid)?.name ?? "Company" : "All subsidiaries"} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-gray-100" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <Tabs defaultValue="all">
            <div className="px-5 pt-4 border-b border-gray-100 flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All ({visible.length})</TabsTrigger>
                <TabsTrigger value="mobile">Mobile Money ({mobileFloats.length})</TabsTrigger>
                <TabsTrigger value="bank">Bank ({bankFloats.length})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="all"><FloatTable list={visible} /></TabsContent>
            <TabsContent value="mobile"><FloatTable list={mobileFloats} /></TabsContent>
            <TabsContent value="bank"><FloatTable list={bankFloats} /></TabsContent>
          </Tabs>
        </div>
      )}

      {/* Add / Edit Float Dialog */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) setShowAdd(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editFloat ? "Edit Account" : "Add Account Float"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formErr && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600"><AlertCircle className="w-4 h-4 shrink-0" />{formErr}</div>}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Company *</label>
              <Select value={form.companyId} onValueChange={v => sf({ companyId: v })}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group HQ</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Account Type *</label>
              <Select value={form.accountType} onValueChange={v => sf({ accountType: v as "mobile_money" | "bank", provider: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">📱 Mobile Money</SelectItem>
                  <SelectItem value="bank">🏦 Bank Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Provider *</label>
              <Select value={form.provider} onValueChange={v => sf({ provider: v })}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {(form.accountType === "mobile_money" ? MOBILE_MONEY : BANKS).map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Account Name</label>
              <Input value={form.accountName} onChange={e => sf({ accountName: e.target.value })} placeholder="e.g. PHIDTECH ICT Operations Account" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Account Number / Phone</label>
              <Input value={form.accountNumber} onChange={e => sf({ accountNumber: e.target.value })} placeholder="e.g. 255712345678 or 001234567" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Opening Balance (TZS)</label>
              <Input type="number" value={form.currentBalance} onChange={e => sf({ currentBalance: e.target.value })} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={saveFloat}>{editFloat ? "Save Changes" : "Add Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Balance Dialog */}
      <Dialog open={!!updateTarget} onOpenChange={v => { if (!v) setUpdateTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Balance — {updateTarget?.provider}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {updErr && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600"><AlertCircle className="w-4 h-4 shrink-0" />{updErr}</div>}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
              Current Balance: <strong>{formatCurrency(updateTarget?.currentBalance ?? 0)}</strong>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date *</label>
              <Input type="date" value={updForm.date} onChange={e => setUpdForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">New Balance (TZS) *</label>
              <Input type="number" value={updForm.balance} onChange={e => setUpdForm(f => ({ ...f, balance: e.target.value }))} placeholder="Enter current balance as of today" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description / Notes *</label>
              <Textarea value={updForm.description} onChange={e => setUpdForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. End of day balance check, After customer payment of TSh 500,000..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateTarget(null)}>Cancel</Button>
            <Button onClick={saveUpdate}><RefreshCw className="w-4 h-4 mr-2" />Save Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Account?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 py-2">This will permanently delete this account and all its balance history. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
