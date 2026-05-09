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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, Plus, TrendingUp, TrendingDown, Wallet, Trash2, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; }
interface PettyCash {
  id: string; companyId: string; description: string; amount: number;
  type: "income"|"expense"; category: string; date: string;
  balance: number; createdBy: string; createdByName?: string;
  status?: "pending" | "manager_approved" | "approved" | "rejected";
  managerApprovedBy?: string; disbursedBy?: string;
}

const emptyForm = () => ({
  type: "expense" as PettyCash["type"],
  description: "", category: "", amount: "", date: new Date().toISOString().slice(0, 10),
});

export default function PettyCashPage() {
  usePermissionGuard("petty_cash");
  const [entries, setEntries]                 = useState<PettyCash[]>([]);
  const [staff, setStaff]                     = useState<StaffUser[]>([]);
  const [session, setSession]                 = useState<Session | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [companiesList, setCompaniesList]     = useState<{id:string;name:string}[]>([]);
  const cidRef                                = useRef("");
  const [showDialog, setShowDialog]           = useState(false);
  const [deleteId, setDeleteId]               = useState<string | null>(null);
  const [form, setForm]                       = useState(emptyForm());
  const [formError, setFormError]             = useState("");

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    setSession(sess);
    const cid  = getActiveCid(sess);
    setActiveCompanyId(cid);
    cidRef.current = cid;
    setCompaniesList(lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []));
    try {
      const [pr, ur] = await Promise.all([
        fetch("/api/petty-cash", { cache: "no-store" }),
        fetch("/api/users",     { cache: "no-store" }),
      ]);
      if (pr.ok) setEntries(await pr.json());
      if (ur.ok) setStaff(await ur.json());
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  const cid = cidRef.current || activeCompanyId;
  const companyStaff = cid ? staff.filter(u => u.companyId === cid) : staff;

  const _role = (session?.role ?? "").toLowerCase();
  const _pos  = (session?.position ?? "").toLowerCase();
  const isPCManager    = session?.isSuperAdmin ||
    _role.includes("manager") || _pos.includes("manager") ||
    _role.includes("admin")   || _pos.includes("admin")   ||
    _role.includes("ceo")     || _pos.includes("ceo");
  const isPCAccountant = session?.isSuperAdmin ||
    _role.includes("accountant") || _pos.includes("accountant") ||
    _role.includes("cfo")        || _pos.includes("cfo");
  const canManagePC = isPCManager || isPCAccountant;
  const myOnlyPC    = !canManagePC && !!session?.id;
  const companyPettyCash = (() => {
    const base = cid ? entries.filter(p => p.companyId === cid) : entries;
    return myOnlyPC ? base.filter(p => p.createdBy === session?.id) : base;
  })();

  // Approved entries only count in the ledger / balance
  const approvedEntries  = companyPettyCash.filter(p => !p.status || p.status === "approved");
  const pendingEntries   = companyPettyCash.filter(p => p.status === "pending" || p.status === "manager_approved");
  const currentBalance   = approvedEntries[approvedEntries.length - 1]?.balance || 0;
  const totalIn          = approvedEntries.filter(p => p.type === "income").reduce((s, p) => s + p.amount, 0);
  const totalOut         = approvedEntries.filter(p => p.type === "expense").reduce((s, p) => s + p.amount, 0);
  const txCount          = approvedEntries.length;

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const openAdd = () => { setForm(emptyForm()); setFormError(""); setShowDialog(true); };

  const saveEntry = async () => {
    if (!form.description.trim()) { setFormError("Description is required."); return; }
    if (!form.amount || Number(form.amount) <= 0) { setFormError("Enter a valid amount."); return; }
    const amount = Number(form.amount);
    // Managers/accountants save as approved immediately; regular staff submit as pending
    const entryStatus = canManagePC ? "approved" : "pending";
    const newBalance = entryStatus === "approved"
      ? (form.type === "income" ? currentBalance + amount : currentBalance - amount)
      : 0; // pending entries don't affect balance yet
    const body: PettyCash = {
      id: `pc-${Date.now()}`,
      companyId: cid,
      description: form.description.trim(),
      amount, type: form.type,
      category: form.category.trim() || "General",
      date: form.date || new Date().toISOString().slice(0, 10),
      balance: newBalance,
      createdBy: session?.id ?? "",
      createdByName: session?.name ?? "",
      status: entryStatus,
    };
    await fetch("/api/petty-cash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await reload();
    setShowDialog(false);
  };

  const updateStatus = async (id: string, status: PettyCash["status"]) => {
    const entry = companyPettyCash.find(p => p.id === id);
    if (!entry) return;
    const extra: Record<string, unknown> = {};
    if (status === "manager_approved") extra.managerApprovedBy = session?.name ?? "";
    if (status === "approved") {
      // Calculate the correct running balance by appending to current approved balance
      extra.disbursedBy = session?.name ?? "";
      const newBal = entry.type === "income" ? currentBalance + entry.amount : currentBalance - entry.amount;
      extra.balance = newBal;
    }
    await fetch("/api/petty-cash", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, ...extra }) });
    await reload();
  };

  const deleteEntry = async (id: string) => {
    await fetch(`/api/petty-cash?id=${id}`, { method: "DELETE" });
    await reload();
    setDeleteId(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Petty Cash"
        subtitle="Manage petty cash float, transactions and reconciliation"
        icon={Wallet}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> {canManagePC ? "Add Entry" : "Request Cash"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Current Balance"   value={formatCurrency(currentBalance)} icon={Wallet}      iconBg="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard title="Total Received"    value={formatCurrency(totalIn)}        icon={TrendingUp}  iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatCard title="Total Spent"       value={formatCurrency(totalOut)}       icon={TrendingDown} iconBg="bg-red-50"    iconColor="text-red-500" />
        <StatCard title="Pending Requests" value={pendingEntries.length}           icon={Clock}       iconBg="bg-amber-50"  iconColor="text-amber-600" subtitle="Awaiting approval" />
      </div>

      <Tabs defaultValue="ledger">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="ledger">Transaction Register</TabsTrigger>
            {(canManagePC || pendingEntries.length > 0) && (
              <TabsTrigger value="requests" className="relative">
                Approval Requests
                {pendingEntries.length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingEntries.length}</span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="ledger">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 opacity-80" />
                <p className="font-medium opacity-80">Petty Cash Float</p>
              </div>
              <p className="text-3xl font-bold mb-1">{formatCurrency(currentBalance)}</p>
              <p className="text-sm opacity-70">Available Balance</p>
              <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs opacity-60 mb-0.5">Total In</p>
                  <p className="font-semibold text-green-300">+{formatCurrency(totalIn)}</p>
                </div>
                <div>
                  <p className="text-xs opacity-60 mb-0.5">Total Out</p>
                  <p className="font-semibold text-red-300">-{formatCurrency(totalOut)}</p>
                </div>
              </div>
            </div>

            {/* Approved Transactions */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Approved Transactions</h3>
              </div>
              {approvedEntries.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-2 text-center">
                  <Wallet className="w-8 h-8 text-gray-200" />
                  <p className="text-sm text-gray-400">No approved transactions yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      {!cid && <TableHead>Subsidiary</TableHead>}
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...approvedEntries].reverse().map(entry => {
                      const creator = companyStaff.find(u => u.id === entry.createdBy);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm text-gray-600">{formatDate(entry.date)}</TableCell>
                          {!cid && (
                            <TableCell className="text-xs text-gray-500 font-medium">
                              {companiesList.find(c => c.id === entry.companyId)?.name ?? entry.companyId}
                            </TableCell>
                          )}
                          <TableCell>
                            <p className="font-medium text-gray-800 text-sm">{entry.description}</p>
                            <p className="text-xs text-gray-400">{entry.createdByName ?? creator?.name}</p>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{entry.category}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              entry.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>{entry.type}</span>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            entry.type === "income" ? "text-green-700" : "text-red-600"
                          }`}>
                            {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-900">{formatCurrency(entry.balance)}</TableCell>
                          <TableCell>
                            {canManagePC && (
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(entry.id)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Pending Cash Requests</h3>
              <p className="text-xs text-gray-400 mt-0.5">Review and approve petty cash requests from staff</p>
            </div>
            {pendingEntries.length === 0 ? (
              <div className="flex flex-col items-center py-14 gap-2 text-center">
                <CheckCircle className="w-8 h-8 text-green-200" />
                <p className="text-sm text-gray-400">No pending requests</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested By</TableHead>
                    {!cid && <TableHead>Subsidiary</TableHead>}
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEntries.map(entry => {
                    const creator = companyStaff.find(u => u.id === entry.createdBy);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <p className="font-medium text-gray-800 text-sm">{entry.createdByName ?? creator?.name ?? "Unknown"}</p>
                        </TableCell>
                        {!cid && (
                          <TableCell className="text-xs text-gray-500 font-medium">
                            {companiesList.find(c => c.id === entry.companyId)?.name ?? entry.companyId}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-gray-700">{entry.description}</TableCell>
                        <TableCell className="text-sm text-gray-500">{entry.category}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            entry.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>{entry.type}</span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{formatDate(entry.date)}</TableCell>
                        <TableCell className="text-right font-semibold text-gray-900">{formatCurrency(entry.amount)}</TableCell>
                        <TableCell>
                          {(() => {
                            const s = entry.status;
                            const badge = s === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700";
                            const label = s === "pending" ? "⏳ Pending Manager" : "🔵 Pending Accountant";
                            return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge}`}>{label}</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {entry.status === "pending" && isPCManager && (
                              <>
                                <Button variant="ghost" size="sm" className="text-blue-600 text-xs" onClick={() => updateStatus(entry.id, "manager_approved")}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500 text-xs" onClick={() => updateStatus(entry.id, "rejected")}>
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {entry.status === "manager_approved" && isPCAccountant && (
                              <>
                                <Button variant="ghost" size="sm" className="text-green-600 text-xs" onClick={() => updateStatus(entry.id, "approved")}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Disburse
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500 text-xs" onClick={() => updateStatus(entry.id, "rejected")}>
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {canManagePC && (
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 h-7 w-7" onClick={() => setDeleteId(entry.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
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
      </Tabs>

      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{canManagePC ? "Add Petty Cash Entry" : "Request Petty Cash"}</DialogTitle></DialogHeader>
          {!canManagePC && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Your request will be sent to a manager for approval before disbursement.
            </p>
          )}
          <div className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
              <Select value={form.type} onValueChange={v => sf({ type: v as PettyCash["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income (Top-up)</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description *</label>
              <Input placeholder="Enter description" value={form.description} onChange={e => sf({ description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Input placeholder="e.g. Stationery" value={form.category} onChange={e => sf({ category: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS) *</label>
                <Input type="number" placeholder="0" value={form.amount} onChange={e => sf({ amount: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date</label>
              <Input type="date" value={form.date} onChange={e => sf({ date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveEntry}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Entry</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this entry? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteEntry(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
