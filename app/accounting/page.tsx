"use client";
import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { accounts, transactions, users } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const monthlyData = [
  { month: "Sep", income: 55000000, expense: 38000000 },
  { month: "Oct", income: 62000000, expense: 41000000 },
  { month: "Nov", income: 58000000, expense: 39000000 },
  { month: "Dec", income: 75000000, expense: 45000000 },
  { month: "Jan", income: 70000000, expense: 42000000 },
  { month: "Feb", income: 80000000, expense: 48000000 },
];

export default function AccountingPage() {
  const [showTxDialog, setShowTxDialog] = useState(false);

  const companyAccounts = accounts.filter(a => a.companyId === "c1");
  const companyTx = transactions.filter(t => t.companyId === "c1");

  const totalAssets = companyAccounts.filter(a => a.type === "asset").reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = companyAccounts.filter(a => a.type === "liability").reduce((s, a) => s + a.balance, 0);
  const totalIncome = companyAccounts.filter(a => a.type === "income").reduce((s, a) => s + a.balance, 0);
  const totalExpenses = companyAccounts.filter(a => a.type === "expense").reduce((s, a) => s + a.balance, 0);

  const typeColors: Record<string, string> = {
    asset: "bg-blue-50 text-blue-700",
    liability: "bg-red-50 text-red-700",
    equity: "bg-purple-50 text-purple-700",
    income: "bg-green-50 text-green-700",
    expense: "bg-orange-50 text-orange-700",
  };

  return (
    <MainLayout>
      <PageHeader
        title="Accounting"
        subtitle="Chart of accounts, transactions, income & expenses"
        icon={BookOpen}
        actions={
          <>
            <Button variant="outline" size="sm">Export</Button>
            <Button size="sm" onClick={() => setShowTxDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Transaction
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Assets" value={formatCurrency(totalAssets)} icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" trend={8} />
        <StatCard title="Total Liabilities" value={formatCurrency(totalLiabilities)} icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-500" />
        <StatCard title="Total Income" value={formatCurrency(totalIncome)} icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600" trend={14} subtitle="YTD" />
        <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={BarChart3} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle="YTD" />
      </div>

      {/* Income vs Expense Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Income vs Expenses</h3>
            <p className="text-xs text-gray-400">Last 6 months</p>
          </div>
          <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
            Net Profit: {formatCurrency(totalIncome - totalExpenses)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
            <Tooltip formatter={(v: string | number | undefined) => formatCurrency(Number(v ?? 0))} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="income" fill="#10b981" radius={[4,4,0,0]} name="Income" />
            <Bar dataKey="expense" fill="#f97316" radius={[4,4,0,0]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Tabs defaultValue="coa">
        <TabsList className="mb-4">
          <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="cashbook">Cashbook</TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {["asset","liability","equity","income","expense"].map(type => (
                  <React.Fragment key={type}>
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={4}>
                        <span className="font-semibold text-gray-700 uppercase text-xs tracking-wider">{type}s</span>
                      </TableCell>
                    </TableRow>
                    {companyAccounts.filter(a => a.type === type).map(account => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono text-gray-500">{account.code}</TableCell>
                        <TableCell className="font-medium text-gray-800">{account.name}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${typeColors[account.type]}`}>
                            {account.type}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${
                          account.type === "expense" || account.type === "liability" ? "text-red-600" : "text-gray-900"
                        }`}>
                          {formatCurrency(account.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyTx.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-gray-600">{formatDate(tx.date)}</TableCell>
                    <TableCell className="font-medium text-gray-800">{tx.description}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{tx.reference}</TableCell>
                    <TableCell className="text-sm text-gray-600">{tx.category}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        tx.type === "credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {tx.type}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${tx.type === "credit" ? "text-green-700" : "text-red-600"}`}>
                      {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cashbook">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Cash & Bank Summary</h3>
              <div className="space-y-3">
                {companyAccounts.filter(a => a.type === "asset").slice(0, 3).map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{acc.name}</p>
                      <p className="text-xs text-gray-400">Account #{acc.code}</p>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(acc.balance)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex justify-between">
                  <span className="font-semibold text-blue-800">Total Cash & Bank</span>
                  <span className="font-bold text-blue-900">{formatCurrency(companyAccounts.filter(a => a.type === "asset").slice(0,2).reduce((s,a) => s+a.balance, 0))}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Cashbook Entries</h3>
              <div className="space-y-2">
                {companyTx.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === "credit" ? "bg-green-50" : "bg-red-50"
                      }`}>
                        {tx.type === "credit"
                          ? <TrendingUp className="w-4 h-4 text-green-600" />
                          : <TrendingDown className="w-4 h-4 text-red-500" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${tx.type === "credit" ? "text-green-700" : "text-red-600"}`}>
                      {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Transaction Dialog */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Account</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {companyAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.code} – {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Debit/Credit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS)</label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <Input placeholder="Transaction description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reference</label>
                <Input placeholder="REF-2026-001" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date</label>
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTxDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowTxDialog(false)}>Save Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
