"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Printer, Download, RefreshCw, Users, ShoppingCart, Receipt, DollarSign, TrendingUp, Activity, Landmark } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }
type ReportType = "customers" | "sales" | "marketing_expenses" | "office_expenses" | "revenue_summary" | "profit_loss";
type DatePreset  = "today" | "week" | "month" | "year" | "custom";

const REPORT_TYPES = [
  { key: "customers",          label: "All Customers",      icon: Users,        color: "text-blue-600",    bg: "bg-blue-50"    },
  { key: "sales",              label: "Customer Sales",     icon: ShoppingCart, color: "text-green-600",   bg: "bg-green-50"   },
  { key: "marketing_expenses", label: "Marketing Expenses", icon: Receipt,      color: "text-orange-600",  bg: "bg-orange-50"  },
  { key: "office_expenses",    label: "Office Expenses",    icon: DollarSign,   color: "text-purple-600",  bg: "bg-purple-50"  },
  { key: "revenue_summary",    label: "Revenue Summary",    icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "profit_loss",        label: "Profit & Loss",      icon: Activity,     color: "text-red-600",     bg: "bg-red-50"     },
] as const;

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today",  label: "Today"      },
  { key: "week",   label: "This Week"  },
  { key: "month",  label: "This Month" },
  { key: "year",   label: "This Year"  },
  { key: "custom", label: "Custom"     },
];

function getDateRange(preset: DatePreset, from: string, to: string): [Date, Date] {
  const now  = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today")
    return [today, new Date(today.getTime() + 86_399_999)];
  if (preset === "week") {
    const day = today.getDay();
    const mon = new Date(today); mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);   sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
    return [mon, sun];
  }
  if (preset === "month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return [s, e];
  }
  if (preset === "year") {
    return [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)];
  }
  const s = from ? new Date(from) : new Date(2000, 0, 1);
  const e = to   ? new Date(to + "T23:59:59") : new Date();
  return [s, e];
}

function inRange(dateStr: unknown, s: Date, e: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(String(dateStr));
  return !isNaN(d.getTime()) && d >= s && d <= e;
}

type Row = Record<string, unknown>;
type Col  = { key: string; label: string; render?: (r: Row) => string };

export default function FinancialReportsPage() {
  usePermissionGuard("financial_reports");

  const [report, setReport] = useState<ReportType>("customers");
  const [preset, setPreset] = useState<DatePreset>("month");
  const [from, setFrom]     = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); });
  const [to,   setTo]       = useState(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);

  const [session,   setSession]   = useState<Session | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cid,       setCid]       = useState("");

  const [customers, setCustomers] = useState<Row[]>([]);
  const [sales,     setSales]     = useState<Row[]>([]);
  const [mktExp,    setMktExp]    = useState<Row[]>([]);
  const [offExp,    setOffExp]    = useState<Row[]>([]);
  const [loanInt,   setLoanInt]   = useState<Row[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sess = lsGet<Session>(SESSION_KEY, null as never);
      setSession(sess);
      const activeCid = getActiveCid(sess);
      setCid(activeCid);
      setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
      const [r1, r2, r3, r4, r5] = await Promise.all([
        fetch("/api/customers",        { cache: "no-store" }),
        fetch("/api/accounting/sales", { cache: "no-store" }),
        fetch("/api/expenses",         { cache: "no-store" }),
        fetch("/api/office-expenses",  { cache: "no-store" }),
        fetch("/api/loan-interest",    { cache: "no-store" }),
      ]);
      if (r1.ok) setCustomers(await r1.json());
      if (r2.ok) setSales(await r2.json());
      if (r3.ok) setMktExp(await r3.json());
      if (r4.ok) setOffExp(await r4.json());
      if (r5.ok) setLoanInt(await r5.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filterByCo = (arr: Row[]) => cid ? arr.filter(x => x.companyId === cid) : arr;
  const [start, end] = getDateRange(preset, from, to);

  const fCustomers = filterByCo(customers).filter(x => inRange(x.date || x.createdAt, start, end));
  const fSales     = filterByCo(sales).filter(x => inRange(x.date, start, end));
  const fMkt       = filterByCo(mktExp).filter(x => inRange(x.date || x.createdAt, start, end));
  const fOff       = filterByCo(offExp).filter(x => inRange(x.date, start, end));
  const fLoanInt   = filterByCo(loanInt).filter(x => inRange(x.date, start, end));

  const PAID_EXP   = ["paid","approved","disbursed","ceo_approved","manager_approved"];
  const totalSales   = fSales.reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalLoanRev = fLoanInt.filter(x => ["active","paid"].includes(String(x.status))).reduce((s,x) => s + Number(x.interestRevenue || 0), 0);
  const totalRevenue = totalSales + totalLoanRev;
  const totalMktExp  = fMkt.filter(x => PAID_EXP.includes(String(x.status))).reduce((s,x) => s + Number(x.amount || 0), 0);
  const totalOffExp  = fOff.filter(x => PAID_EXP.includes(String(x.status))).reduce((s,x) => s + Number(x.amount || 0), 0);
  const totalExpenses = totalMktExp + totalOffExp;
  const netProfit     = totalRevenue - totalExpenses;

  const fRevenue: Row[] = [
    ...fSales.map(s => ({ source: "Customer Sale", customerName: s.customerName, date: s.date, amount: s.amount, status: s.status })),
    ...fLoanInt.map(l => ({ source: "Loan Interest", customerName: l.customerName, date: l.date, amount: l.interestRevenue, status: l.status })),
  ];

  const COLUMNS: Record<ReportType, Col[]> = {
    customers: [
      { key: "name",           label: "Customer Name"          },
      { key: "company",        label: "Company"                },
      { key: "type",           label: "Type"                   },
      { key: "phone",          label: "Phone"                  },
      { key: "email",          label: "Email"                  },
      { key: "serviceProduct", label: "Service / Product"      },
      { key: "status",         label: "Status"                 },
      { key: "date",           label: "Date", render: r => formatDate(String(r.date || r.createdAt || "")) },
    ],
    sales: [
      { key: "customerName", label: "Customer"                                                         },
      { key: "date",         label: "Date",    render: r => formatDate(String(r.date || ""))           },
      { key: "amount",       label: "Amount",  render: r => formatCurrency(Number(r.amount || 0))      },
      { key: "paid",         label: "Paid",    render: r => formatCurrency(Number(r.paid || 0))        },
      { key: "balance",      label: "Balance", render: r => formatCurrency(Number(r.balance || 0))     },
      { key: "status",       label: "Status"                                                           },
      { key: "notes",        label: "Notes"                                                            },
    ],
    marketing_expenses: [
      { key: "userName",    label: "Employee"                                                          },
      { key: "title",       label: "Title"                                                             },
      { key: "category",    label: "Category"                                                          },
      { key: "amount",      label: "Amount",   render: r => formatCurrency(Number(r.amount || 0))     },
      { key: "date",        label: "Date",     render: r => formatDate(String(r.date || r.createdAt || "")) },
      { key: "status",      label: "Status"                                                            },
      { key: "paymentMode", label: "Payment Mode"                                                     },
    ],
    office_expenses: [
      { key: "title",       label: "Title"                                                             },
      { key: "category",    label: "Category"                                                          },
      { key: "amount",      label: "Amount",   render: r => formatCurrency(Number(r.amount || 0))     },
      { key: "date",        label: "Date",     render: r => formatDate(String(r.date || ""))          },
      { key: "status",      label: "Status"                                                            },
      { key: "recordedBy",  label: "Recorded By"                                                      },
      { key: "paymentMode", label: "Payment Mode"                                                     },
    ],
    revenue_summary: [
      { key: "source",       label: "Source"                                                           },
      { key: "customerName", label: "Customer"                                                         },
      { key: "date",         label: "Date",    render: r => formatDate(String(r.date || ""))           },
      { key: "amount",       label: "Revenue", render: r => formatCurrency(Number(r.amount || 0))      },
      { key: "status",       label: "Status"                                                           },
    ],
    profit_loss: [],
  };

  const DATA: Record<ReportType, Row[]> = {
    customers:          fCustomers,
    sales:              fSales,
    marketing_expenses: fMkt,
    office_expenses:    fOff,
    revenue_summary:    fRevenue,
    profit_loss:        [],
  };

  const cfg  = REPORT_TYPES.find(r => r.key === report)!;
  const cols = COLUMNS[report];
  const data = DATA[report];
  const companyName  = companies.find(c => c.id === cid)?.name ?? "All Companies";
  const dateLabel    = preset === "custom" ? `${from} to ${to}` : DATE_PRESETS.find(p => p.key === preset)?.label ?? "";

  // ─── Print ───
  const printReport = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const header = `<h1 style="margin:0">${cfg.label} Report</h1><p style="color:#666;margin:4px 0 16px">${companyName} &nbsp;|&nbsp; ${dateLabel} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>`;
    const style  = `<style>*{font-family:Arial,sans-serif;font-size:12px}body{padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:bold}tr:nth-child(even){background:#fafafa}.section{margin-top:20px}.section h2{font-size:14px;margin-bottom:8px}.total{font-weight:bold;background:#e9f7ef}.loss{background:#fdecea}.net-positive{color:#16a34a}.net-negative{color:#dc2626}</style>`;
    if (report === "profit_loss") {
      w.document.write(`<html><head>${style}</head><body>${header}
        <div class="section"><h2>Revenue</h2><table>
          <tr><th>Description</th><th>Amount</th></tr>
          <tr><td>Customer Sales</td><td>${formatCurrency(totalSales)}</td></tr>
          <tr><td>Loan Interest Revenue</td><td>${formatCurrency(totalLoanRev)}</td></tr>
          <tr class="total"><td>Total Revenue</td><td>${formatCurrency(totalRevenue)}</td></tr>
        </table></div>
        <div class="section"><h2>Expenses</h2><table>
          <tr><th>Description</th><th>Amount</th></tr>
          <tr><td>Marketing Expenses</td><td>${formatCurrency(totalMktExp)}</td></tr>
          <tr><td>Office Expenses</td><td>${formatCurrency(totalOffExp)}</td></tr>
          <tr class="${netProfit >= 0 ? "total" : "loss"}"><td>Total Expenses</td><td>${formatCurrency(totalExpenses)}</td></tr>
        </table></div>
        <div class="section"><h2>Net ${netProfit >= 0 ? "Profit" : "Loss"}</h2><table>
          <tr class="${netProfit >= 0 ? "total" : "loss"}"><td><strong>Net ${netProfit >= 0 ? "Profit" : "Loss"}</strong></td>
          <td class="${netProfit >= 0 ? "net-positive" : "net-negative"}"><strong>${formatCurrency(Math.abs(netProfit))}</strong></td></tr>
        </table></div>
      </body></html>`);
    } else {
      const thead = cols.map(c => `<th>${c.label}</th>`).join("");
      const tbody = data.map(row => `<tr>${cols.map(c => `<td>${c.render ? c.render(row) : (row[c.key] ?? "")}</td>`).join("")}</tr>`).join("");
      w.document.write(`<html><head>${style}</head><body>${header}<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></body></html>`);
    }
    w.document.close(); w.print();
  };

  // ─── CSV ───
  const downloadCSV = () => {
    let content: string;
    if (report === "profit_loss") {
      content = ["Category,Description,Amount",
        `Revenue,Customer Sales,${totalSales}`,
        `Revenue,Loan Interest,${totalLoanRev}`,
        `Revenue,Total Revenue,${totalRevenue}`,
        `Expenses,Marketing Expenses,${totalMktExp}`,
        `Expenses,Office Expenses,${totalOffExp}`,
        `Expenses,Total Expenses,${totalExpenses}`,
        `Net,${netProfit >= 0 ? "Profit" : "Loss"},${Math.abs(netProfit)}`,
      ].join("\n");
    } else {
      const h = cols.map(c => `"${c.label}"`).join(",");
      const r = data.map(row => cols.map(c => `"${c.render ? c.render(row) : (row[c.key] ?? "")}"`).join(",")).join("\n");
      content = `${h}\n${r}`;
    }
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${cfg.label.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl"><BarChart3 className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Financial Reports</h1>
              <p className="text-sm text-gray-500">Print and download financial reports • {companyName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-1.5" /> Download CSV
            </Button>
            <Button size="sm" onClick={printReport} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-1.5" /> Print Report
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Report type list */}
          <div className="lg:w-56 bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-1 h-fit">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">Report Type</p>
            {REPORT_TYPES.map(rt => {
              const Icon = rt.icon;
              const active = report === rt.key;
              return (
                <button key={rt.key} onClick={() => setReport(rt.key as ReportType)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? `${rt.bg} ${rt.color}` : "text-gray-600 hover:bg-gray-50"}`}>
                  <Icon className="w-4 h-4 shrink-0" />{rt.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 space-y-3">
            {/* Date filter bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map(p => (
                  <button key={p.key} onClick={() => setPreset(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${preset === p.key ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              {preset === "custom" && (
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-36 text-sm" value={from} onChange={e => setFrom(e.target.value)} />
                  <span className="text-gray-400 text-sm">to</span>
                  <Input type="date" className="w-36 text-sm" value={to}   onChange={e => setTo(e.target.value)} />
                </div>
              )}
              <span className="ml-auto text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                {report !== "profit_loss" ? `${data.length} records • ` : ""}{dateLabel}
              </span>
            </div>

            {/* P&L view */}
            {report === "profit_loss" ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 bg-gray-50 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900 text-lg">Profit & Loss Statement</h2>
                  <p className="text-sm text-gray-500">{companyName} &nbsp;·&nbsp; {dateLabel}</p>
                </div>
                <div className="p-5 space-y-8 max-w-xl">
                  {/* Revenue */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Revenue</h3>
                    <div className="divide-y divide-gray-50">
                      {[
                        { label: "Customer Sales",        value: totalSales    },
                        { label: "Loan Interest Revenue", value: totalLoanRev  },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between py-2.5">
                          <span className="text-sm text-gray-700">{r.label}</span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(r.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between py-2.5 border-t-2 border-green-200 mt-1">
                      <span className="font-bold text-green-800">Total Revenue</span>
                      <span className="font-bold text-green-700">{formatCurrency(totalRevenue)}</span>
                    </div>
                  </div>
                  {/* Expenses */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Expenses</h3>
                    <div className="divide-y divide-gray-50">
                      {[
                        { label: "Marketing Expenses", value: totalMktExp },
                        { label: "Office Expenses",    value: totalOffExp },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between py-2.5">
                          <span className="text-sm text-gray-700">{r.label}</span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(r.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between py-2.5 border-t-2 border-red-200 mt-1">
                      <span className="font-bold text-red-800">Total Expenses</span>
                      <span className="font-bold text-red-700">{formatCurrency(totalExpenses)}</span>
                    </div>
                  </div>
                  {/* Net */}
                  <div className={`rounded-xl p-5 ${netProfit >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Net {netProfit >= 0 ? "Profit" : "Loss"}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{formatCurrency(totalRevenue)} revenue − {formatCurrency(totalExpenses)} expenses</p>
                      </div>
                      <span className={`text-3xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {formatCurrency(Math.abs(netProfit))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard table */
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" /> Loading data...
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {cols.map(c => (
                          <th key={c.key} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.length === 0 ? (
                        <tr><td colSpan={cols.length} className="text-center py-14 text-gray-400">No records found for this period.</td></tr>
                      ) : data.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          {cols.map(c => (
                            <td key={c.key} className="px-4 py-3 text-gray-700">
                              {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {data.length > 0 && (report === "sales" || report === "marketing_expenses" || report === "office_expenses" || report === "revenue_summary") && (
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-200">
                          {cols.map((c, i) => (
                            <td key={c.key} className="px-4 py-3 font-bold text-gray-900 text-sm">
                              {i === 0 ? `Total (${data.length})` :
                               c.key === "amount" || c.label === "Amount" || c.label === "Revenue"
                                 ? formatCurrency(data.reduce((s, r) => s + Number(r.amount || r.interestRevenue || 0), 0))
                                 : c.key === "paid"    ? formatCurrency(data.reduce((s,r) => s + Number(r.paid    || 0), 0))
                                 : c.key === "balance" ? formatCurrency(data.reduce((s,r) => s + Number(r.balance || 0), 0))
                                 : ""}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
