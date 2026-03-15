"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { pettyCash, users } from "@/lib/data";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function PettyCashPage() {
  usePermissionGuard("petty_cash");
  const [showDialog, setShowDialog] = useState(false);

  const companyPettyCash = pettyCash.filter(p => p.companyId === "c1");
  const currentBalance = companyPettyCash[companyPettyCash.length - 1]?.balance || 0;
  const totalIn = companyPettyCash.filter(p => p.type === "income").reduce((s, p) => s + p.amount, 0);
  const totalOut = companyPettyCash.filter(p => p.type === "expense").reduce((s, p) => s + p.amount, 0);
  const txCount = companyPettyCash.length;

  return (
    <MainLayout>
      <PageHeader
        title="Petty Cash"
        subtitle="Manage petty cash float, transactions and reconciliation"
        icon={Wallet}
        actions={
          <Button size="sm" onClick={() => setShowDialog(true)}>
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
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...companyPettyCash].reverse().map(entry => {
                const creator = users.find(u => u.id === entry.createdBy);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-gray-600">{formatDate(entry.date)}</TableCell>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Petty Cash Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Income / Expense" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income (Top-up)</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Input placeholder="Enter description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
                <Input placeholder="e.g. Stationery" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS)</label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date</label>
              <Input type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowDialog(false)}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
