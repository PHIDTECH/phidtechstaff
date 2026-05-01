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
import { DollarSign, Plus, TrendingUp, TrendingDown, Wallet, Trash2, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

interface Session { id: string; name: string; role: string; isSuperAdmin: boolean; companyId: string; }
interface StaffUser { id: string; name: string; companyId: string; }
interface PettyCash {
  id: string; companyId: string; description: string; amount: number;
  type: "income"|"expense"; category: string; date: string;
  balance: number; createdBy: string;
}

const emptyForm = () => ({
  type: "expense" as PettyCash["type"],
  description: "", category: "", amount: "", date: new Date().toISOString().slice(0, 10),
});

export default function PettyCashPage() {
  usePermissionGuard("petty_cash");
  const [entries, setEntries]             = useState<PettyCash[]>([]);
  const [staff, setStaff]                 = useState<StaffUser[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [companiesList, setCompaniesList]     = useState<{id:string;name:string}[]>([]);
  const cidRef                            = useRef("");
  const [showDialog, setShowDialog]       = useState(false);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [formError, setFormError]         = useState("");

  const reload = async () => {
    const sess = lsGet<Session>(SESSION_KEY, null as never);
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
  const companyPettyCash = cid ? entries.filter(p => p.companyId === cid) : entries;
  const companyStaff     = cid ? staff.filter(u => u.companyId === cid) : staff;

  const currentBalance = companyPettyCash[companyPettyCash.length - 1]?.balance || 0;
  const totalIn        = companyPettyCash.filter(p => p.type === "income").reduce((s, p) => s + p.amount, 0);
  const totalOut       = companyPettyCash.filter(p => p.type === "expense").reduce((s, p) => s + p.amount, 0);
  const txCount        = companyPettyCash.length;

  const sf = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const openAdd = () => { setForm(emptyForm()); setFormError(""); setShowDialog(true); };

  const saveEntry = async () => {
    if (!form.description.trim()) { setFormError("Description is required."); return; }
    if (!form.amount || Number(form.amount) <= 0) { setFormError("Enter a valid amount."); return; }
    const lastBalance = currentBalance;
    const amount = Number(form.amount);
    const newBalance = form.type === "income" ? lastBalance + amount : lastBalance - amount;
    const sess = lsGet<Session>(SESSION_KEY, null as never);
    const body: PettyCash = {
      id: `pc-${Date.now()}`,
      companyId: cid,
      description: form.description.trim(),
      amount, type: form.type,
      category: form.category.trim() || "General",
      date: form.date || new Date().toISOString().slice(0, 10),
      balance: newBalance,
      createdBy: sess?.id ?? "",
    };
    await fetch("/api/petty-cash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await reload();
    setShowDialog(false);
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
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Current Balance" value={formatCurrency(currentBalance)} icon={Wallet} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Total Received" value={formatCurrency(totalIn)} icon={TrendingUp} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Total Spent" value={formatCurrency(totalOut)} icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-500" />
        <StatCard title="Transactions" value={txCount} icon={DollarSign} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="This month" />
      </div>

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

        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Transaction Register</h3>
          </div>
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
              {[...companyPettyCash].reverse().map(entry => {
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
                      <p className="text-xs text-gray-400">{creator?.name}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{entry.category}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        entry.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {entry.type}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${
                      entry.type === "income" ? "text-green-700" : "text-red-600"
                    }`}>
                      {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900">{formatCurrency(entry.balance)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(entry.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Petty Cash Entry</DialogTitle></DialogHeader>
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
