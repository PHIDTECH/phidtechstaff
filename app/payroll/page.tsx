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
import { DollarSign, Plus, Search, CheckCircle, Clock, Download, Eye, FileText } from "lucide-react";
import { payrolls, salaryAdvances, users } from "@/lib/data";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function PayrollPage() {
  const [search, setSearch] = useState("");
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showSlipDialog, setShowSlipDialog] = useState<typeof payrolls[0] | null>(null);

  const companyPayrolls = payrolls.filter(p => p.companyId === "c1");
  const filtered = companyPayrolls.filter(p => {
    const emp = users.find(u => u.id === p.userId);
    return emp?.name.toLowerCase().includes(search.toLowerCase()) || false;
  });

  const totalGross = companyPayrolls.reduce((s, p) => s + p.grossSalary, 0);
  const totalNet = companyPayrolls.reduce((s, p) => s + p.netSalary, 0);
  const totalDeductions = totalGross - totalNet;
  const paidCount = companyPayrolls.filter(p => p.status === "paid").length;

  return (
    <MainLayout>
      <PageHeader
        title="Payroll & Salary"
        subtitle="Manage payroll processing, salary advances, and payslips"
        icon={DollarSign}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowAdvanceDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Salary Advance
            </Button>
            <Button size="sm">
              <FileText className="w-4 h-4 mr-2" /> Run Payroll
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Gross" value={formatCurrency(totalGross)} icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle="February 2026" />
        <StatCard title="Total Net Pay" value={formatCurrency(totalNet)} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" subtitle="After deductions" />
        <StatCard title="Total Deductions" value={formatCurrency(totalDeductions)} icon={DollarSign} iconBg="bg-red-50" iconColor="text-red-500" subtitle="PAYE, NSSF, etc." />
        <StatCard title="Paid Staff" value={`${paidCount}/${companyPayrolls.length}`} icon={CheckCircle} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle="This month" />
      </div>

      <Tabs defaultValue="payroll">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="payroll">Payroll Register</TabsTrigger>
            <TabsTrigger value="advances">Salary Advances</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select defaultValue="feb-2026">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feb-2026">February 2026</SelectItem>
                <SelectItem value="jan-2026">January 2026</SelectItem>
                <SelectItem value="dec-2025">December 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="payroll">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Payslip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((payroll) => {
                  const emp = users.find(u => u.id === payroll.userId);
                  const totalAllowances = payroll.allowances.reduce((s, a) => s + a.amount, 0);
                  const totalDeducAmt = payroll.deductions.reduce((s, d) => s + d.amount, 0);
                  return (
                    <TableRow key={payroll.id}>
                      <TableCell>
                        {emp && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{getInitials(emp.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                              <p className="text-xs text-gray-400">{emp.position}</p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">{formatCurrency(payroll.basicSalary)}</TableCell>
                      <TableCell className="text-green-700 font-medium">+{formatCurrency(totalAllowances)}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{formatCurrency(payroll.grossSalary)}</TableCell>
                      <TableCell className="text-red-600 font-medium">-{formatCurrency(totalDeducAmt)}</TableCell>
                      <TableCell className="font-bold text-blue-700">{formatCurrency(payroll.netSalary)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(payroll.status)}`}>
                          {payroll.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setShowSlipDialog(payroll)}>
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {/* Summary Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Totals ({companyPayrolls.length} employees)</span>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-gray-600">Gross: <strong className="text-gray-900">{formatCurrency(totalGross)}</strong></span>
                <span className="text-gray-600">Deductions: <strong className="text-red-600">-{formatCurrency(totalDeductions)}</strong></span>
                <span className="text-gray-600">Net: <strong className="text-blue-700">{formatCurrency(totalNet)}</strong></span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advances">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Repayment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryAdvances.filter(a => a.companyId === "c1").map((adv) => {
                  const emp = users.find(u => u.id === adv.userId);
                  const approver = users.find(u => u.id === adv.approvedBy);
                  return (
                    <TableRow key={adv.id}>
                      <TableCell>
                        {emp && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{getInitials(emp.name)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">{formatCurrency(adv.amount)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{adv.reason}</TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDate(adv.requestDate)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{adv.repaymentDate ? formatDate(adv.repaymentDate) : "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(adv.status)}`}>
                          {adv.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{approver?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {adv.status === "pending" && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600 text-xs">Approve</Button>
                              <Button variant="ghost" size="sm" className="text-red-500 text-xs">Reject</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payslip Dialog */}
      <Dialog open={!!showSlipDialog} onOpenChange={() => setShowSlipDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip – {showSlipDialog?.month} {showSlipDialog?.year}</DialogTitle>
          </DialogHeader>
          {showSlipDialog && (() => {
            const emp = users.find(u => u.id === showSlipDialog.userId);
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-bold text-gray-900">{emp?.name}</p>
                    <p className="text-xs text-gray-500">{emp?.position} · {emp?.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Period</p>
                    <p className="font-semibold text-gray-800">{showSlipDialog.month} {showSlipDialog.year}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Earnings</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Basic Salary</span>
                        <span className="font-medium">{formatCurrency(showSlipDialog.basicSalary)}</span>
                      </div>
                      {showSlipDialog.allowances.map(a => (
                        <div key={a.name} className="flex justify-between text-sm">
                          <span className="text-gray-500">{a.name}</span>
                          <span className="text-green-700">+{formatCurrency(a.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5 mt-1">
                        <span>Gross Salary</span>
                        <span>{formatCurrency(showSlipDialog.grossSalary)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Deductions</p>
                    <div className="space-y-1.5">
                      {showSlipDialog.deductions.map(d => (
                        <div key={d.name} className="flex justify-between text-sm">
                          <span className="text-gray-500">{d.name}</span>
                          <span className="text-red-600">-{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5 mt-1">
                        <span>Total Deductions</span>
                        <span className="text-red-600">-{formatCurrency(showSlipDialog.deductions.reduce((s, d) => s + d.amount, 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Net Pay</span>
                  <span className="text-xl font-bold text-green-700">{formatCurrency(showSlipDialog.netSalary)}</span>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlipDialog(null)}>Close</Button>
            <Button><Download className="w-4 h-4 mr-2" />Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Dialog */}
      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Salary Advance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Employee</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.companyId === "c1").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (TZS)</label>
              <Input type="number" placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Repayment Date</label>
              <Input type="date" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reason</label>
              <Input placeholder="Reason for advance" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvanceDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowAdvanceDialog(false)}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
