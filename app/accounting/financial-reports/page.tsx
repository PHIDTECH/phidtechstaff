"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import { usePermissionGuard } from "@/lib/usePermissionGuard";
import { getActiveCid } from "@/lib/getActiveCid";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Printer, Download, Upload, RefreshCw, Users, ShoppingCart, Receipt, DollarSign, TrendingUp, Activity, FileText, Wallet, CreditCard, Landmark, UserCheck, Briefcase, Scale, Megaphone } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
const GROUP_KEY     = "phidtech_group_company";

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}

interface Session { id: string; name: string; role: string; position?: string; isSuperAdmin: boolean; companyId: string; }
interface Company { id: string; name: string; }
interface FloatUpdate { id: string; date: string; type?: "credit" | "debit"; amount?: number; balance: number; description: string; updatedBy: string; createdAt: string; }
interface AccountFloat { id: string; companyId: string; accountType: string; provider: string; accountName: string; accountNumber?: string; currency: string; currentBalance: number; lastUpdatedAt: string; createdAt: string; history: FloatUpdate[]; }
type ReportType = "customers" | "sales" | "marketing_expenses" | "office_expenses" | "staff_claims" | "payroll" | "invoices" | "petty_cash" | "loan_customers" | "loan_interest" | "revenue_summary" | "profit_loss" | "assets" | "balance_sheet" | "cashflow" | "microfinance_customers" | "marketing_customers" | "account_floats" | "debtors" | "creditors" | "projected_budget" | "projected_income";
type DatePreset  = "all" | "today" | "week" | "month" | "year" | "custom";

const REPORT_TYPES: { key: ReportType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: "customers",          label: "All Customers",      icon: Users,        color: "text-blue-600",    bg: "bg-blue-50"    },
  { key: "sales",              label: "Customer Sales",     icon: ShoppingCart, color: "text-green-600",   bg: "bg-green-50"   },
  { key: "marketing_expenses", label: "Marketing Expenses", icon: Receipt,      color: "text-orange-600",  bg: "bg-orange-50"  },
  { key: "office_expenses",    label: "Office Expenses",    icon: DollarSign,   color: "text-purple-600",  bg: "bg-purple-50"  },
  { key: "staff_claims",       label: "Staff Expense Claims", icon: UserCheck,  color: "text-cyan-600",    bg: "bg-cyan-50"    },
  { key: "payroll",            label: "Payroll",            icon: Wallet,       color: "text-indigo-600",  bg: "bg-indigo-50"  },
  { key: "invoices",           label: "Invoices",           icon: FileText,     color: "text-pink-600",    bg: "bg-pink-50"    },
  { key: "petty_cash",         label: "Petty Cash",         icon: CreditCard,   color: "text-teal-600",    bg: "bg-teal-50"    },
  { key: "loan_customers",     label: "Loan Customers",     icon: Landmark,     color: "text-amber-600",   bg: "bg-amber-50"   },
  { key: "loan_interest",      label: "Loan Interest",      icon: TrendingUp,   color: "text-lime-600",    bg: "bg-lime-50"    },
  { key: "revenue_summary",    label: "Revenue Summary",    icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "profit_loss",        label: "Profit & Loss",      icon: Activity,     color: "text-red-600",     bg: "bg-red-50"     },
  { key: "assets",             label: "Assets",             icon: Briefcase,    color: "text-slate-600",   bg: "bg-slate-50"   },
  { key: "balance_sheet",         label: "Balance Sheet",         icon: Scale,     color: "text-violet-600",  bg: "bg-violet-50"  },
  { key: "cashflow",              label: "Cash Flow",             icon: Activity,  color: "text-sky-600",     bg: "bg-sky-50"     },
  { key: "microfinance_customers",label: "Microfinance Customers",icon: Landmark,  color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
  { key: "marketing_customers",   label: "Marketing Customers",   icon: Megaphone, color: "text-rose-600",    bg: "bg-rose-50"    },
  { key: "account_floats",        label: "Account Floats",         icon: Wallet,    color: "text-teal-700",    bg: "bg-teal-50"    },
  { key: "debtors",               label: "Debtors (Receivables)",  icon: Users,     color: "text-red-600",     bg: "bg-red-50"     },
  { key: "creditors",             label: "Creditors (Payables)",   icon: CreditCard,color: "text-orange-700",  bg: "bg-orange-50"  },
  { key: "projected_budget",      label: "Projected Expenses",     icon: BarChart3,  color: "text-blue-700",   bg: "bg-blue-50"    },
  { key: "projected_income",      label: "Projected Income",       icon: TrendingUp, color: "text-green-700",  bg: "bg-green-50"   },
];

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "all",    label: "All Time"   },
  { key: "today",  label: "Today"      },
  { key: "week",   label: "This Week"  },
  { key: "month",  label: "This Month" },
  { key: "year",   label: "This Year"  },
  { key: "custom", label: "Custom"     },
];

function getDateRange(preset: DatePreset, from: string, to: string): [Date, Date] {
  if (preset === "all") return [new Date(0), new Date(32503680000000)];
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today")  return [today, new Date(today.getTime() + 86_399_999)];
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
  if (preset === "year")
    return [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)];
  const s = from ? new Date(from) : new Date(0);
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

export default function ReportsPage() {
  usePermissionGuard("financial_reports");

  const [report, setReport] = useState<ReportType>("customers");
  const [preset, setPreset] = useState<DatePreset>("all");
  const [from, setFrom]     = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); });
  const [to,   setTo]       = useState(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);

  const [session,   setSession]   = useState<Session | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cid,       setCid]       = useState("");
  const [groupCid,  setGroupCid]  = useState("");

  const [customers,  setCustomers]  = useState<Row[]>([]);
  const [sales,      setSales]      = useState<Row[]>([]);
  const [mktExp,     setMktExp]     = useState<Row[]>([]);
  const [offExp,     setOffExp]     = useState<Row[]>([]);
  const [loanInt,    setLoanInt]    = useState<Row[]>([]);
  const [loanCust,   setLoanCust]   = useState<Row[]>([]);
  const [payroll,    setPayroll]    = useState<Row[]>([]);
  const [invoices,   setInvoices]   = useState<Row[]>([]);
  const [pettyCash,  setPettyCash]  = useState<Row[]>([]);
  const [assets,     setAssets]     = useState<Row[]>([]);
  const [mfCusts,    setMfCusts]    = useState<Row[]>([]);
  const [mktCusts,   setMktCusts]   = useState<Row[]>([]);
  const [floats,     setFloats]     = useState<AccountFloat[]>([]);
  const [creditors,      setCreditors]      = useState<Row[]>([]);
  const [projected,      setProjected]      = useState<Row[]>([]);
  const [projectedIncome,setProjectedIncome] = useState<Row[]>([]);
  const [importing,  setImporting]  = useState(false);
  const [importMsg,  setImportMsg]  = useState<{type:"success"|"error";text:string}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const sess = lsGet<Session>(SESSION_KEY, null as never);
      setSession(sess);
      const activeCid = getActiveCid(sess);
      setCid(activeCid);
      setGroupCid(lsGet<string>(GROUP_KEY, ""));
      setCompanies(lsGet<Company[]>(COMPANIES_KEY, []));
      const results = await Promise.allSettled([
        fetch("/api/customers",        { cache: "no-store" }),
        fetch("/api/accounting/sales", { cache: "no-store" }),
        fetch("/api/expenses",         { cache: "no-store" }),
        fetch("/api/office-expenses",  { cache: "no-store" }),
        fetch("/api/loan-interest",    { cache: "no-store" }),
        fetch("/api/loans",            { cache: "no-store" }),
        fetch("/api/payroll",          { cache: "no-store" }),
        fetch("/api/invoices",         { cache: "no-store" }),
        fetch("/api/petty-cash",       { cache: "no-store" }),
        fetch("/api/users",            { cache: "no-store" }),
      ]);
      const parse = async (r: PromiseSettledResult<Response>) => r.status === "fulfilled" && r.value.ok ? r.value.json().catch(() => []) : [];
      const [d1,d2,d3,d4,d5,d6,d7,d8,d9,d10] = await Promise.all(results.map(parse));
      setCustomers(d1); setSales(d2); setMktExp(d3); setOffExp(d4);
      setLoanInt(d5);   setLoanCust(d6); setInvoices(d8); setPettyCash(d9);
      // Enrich payroll rows with staff name from users list
      const userMap = new Map<string, string>((d10 as Row[]).map(u => [String(u.id), String(u.name)]));
      setPayroll((d7 as Row[]).map(p => ({ ...p, staffName: userMap.get(String(p.staffId)) || String(p.staffId) })));
      // Fetch assets separately
      try {
        const [ar, mfr, mktr, flr, crr, prr] = await Promise.all([
          fetch("/api/assets",                 { cache: "no-store" }),
          fetch("/api/microfinance-customers", { cache: "no-store" }),
          fetch("/api/marketing-customers",    { cache: "no-store" }),
          fetch("/api/account-floats",         { cache: "no-store" }),
          fetch("/api/creditors",              { cache: "no-store" }),
          fetch("/api/projected",              { cache: "no-store" }),
        ]);
        if (ar.ok)   setAssets(await ar.json());
        if (mfr.ok)  setMfCusts(await mfr.json());
        if (mktr.ok) setMktCusts(await mktr.json());
        if (flr.ok)  setFloats(await flr.json());
        if (crr.ok)  setCreditors(await crr.json());
        if (prr.ok)  setProjected(await prr.json());
        const pir = await fetch("/api/projected-income", { cache: "no-store" });
        if (pir.ok) setProjectedIncome(await pir.json());
      } catch {}
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isGroupView = !cid || cid === groupCid;
  const filterByCo = (arr: Row[]) => isGroupView ? arr : arr.filter(x => x.companyId === cid);
  const [start, end] = getDateRange(preset, from, to);
  const fd = (arr: Row[], ...keys: string[]) =>
    filterByCo(arr).filter(x => inRange(keys.reduce<unknown>((v, k) => v ?? x[k], undefined), start, end));

  const fAssets    = fd(assets, "purchaseDate", "createdAt");
  const fCustomers = fd(customers, "date", "createdAt");
  const fSales     = fd(sales,     "date");
  const fMkt       = fd(mktExp,    "submittedAt", "date", "createdAt");
  const fOff       = fd(offExp,    "date");
  const fLoanInt   = fd(loanInt,   "date", "createdAt");
  const fLoanCust  = fd(loanCust,  "date", "createdAt");
  const fPayroll   = fd(payroll,   "generatedAt");
  const fInvoices  = fd(invoices,  "date", "createdAt", "invoiceDate");
  const fPettyCash = fd(pettyCash, "date");
  const fMfCusts   = filterByCo(mfCusts).filter(x  => inRange(x.createdAt,  start, end)).map((r,i) => ({...r, _num: i+1}));
  const fMktCusts  = filterByCo(mktCusts).filter(x => inRange(x.createdAt,  start, end)).map((r,i) => ({...r, _num: i+1}));

  const fFloats = isGroupView ? floats : floats.filter(f => f.companyId === cid);

  const PAID_EXP     = ["paid","approved","disbursed","ceo_approved","manager_approved"];
  const totalSales   = fSales.reduce((s,x) => s + Number(x.amount || 0), 0);
  const totalLoanRev = fLoanInt.filter(x => ["active","paid"].includes(String(x.status))).reduce((s,x) => s + Number(x.interestRevenue || 0), 0);
  const totalRevenue = totalSales + totalLoanRev;
  const totalMktExp  = fMkt.filter(x => PAID_EXP.includes(String(x.status))).reduce((s,x) => s + Number(x.amount || 0), 0);
  const totalOffExp  = fOff.filter(x => PAID_EXP.includes(String(x.status))).reduce((s,x) => s + Number(x.amount || 0), 0);
  const totalPayroll = fPayroll.filter(x => x.status === "paid").reduce((s,x) => s + Number(x.netSalary || 0), 0);
  const totalExpenses = totalMktExp + totalOffExp + totalPayroll;
  const netProfit     = totalRevenue - totalExpenses;

  const fRevenue: Row[] = [
    ...fSales.map(s => ({ source: "Customer Sale",  customerName: s.customerName, date: s.date, amount: s.amount, status: s.status })),
    ...fLoanInt.map(l => ({ source: "Loan Interest", customerName: l.customerName, date: l.date, amount: l.interestRevenue, status: l.status })),
  ];

  // ── Balance Sheet calculations (company-filtered, all time) ──
  const bsFilter   = (arr: Row[]) => isGroupView ? arr : arr.filter(x => x.companyId === cid);
  const totalAssetValue   = bsFilter(assets).reduce((s,a) => s + Number(a.currentValue ?? a.purchaseCost ?? 0), 0);
  const activeLoanAmt     = bsFilter(loanCust).filter(l => l.status === "active").reduce((s,l) => s + Number(l.amountOfLoan || 0), 0);
  const salesReceivable   = bsFilter(sales).filter(s => Number(s.balance) > 0).reduce((s,x) => s + Number(x.balance || 0), 0);
  const pettyCashBal      = (() => { const pc = bsFilter(pettyCash); return pc.length ? Number(pc[pc.length-1].balance || 0) : 0; })();
  const totalBsAssets     = totalAssetValue + activeLoanAmt + salesReceivable + pettyCashBal;
  const unpaidExpenses    = bsFilter(mktExp).filter(x => ["pending","submitted"].includes(String(x.status))).reduce((s,x) => s + Number(x.amount||0), 0)
                          + bsFilter(offExp).filter(x => ["pending","submitted"].includes(String(x.status))).reduce((s,x) => s + Number(x.amount||0), 0);
  const payrollDue        = bsFilter(payroll).filter(p => p.status !== "paid").reduce((s,p) => s + Number(p.netSalary||0), 0);
  const totalBsLiab       = unpaidExpenses + payrollDue;
  const bsEquity          = totalBsAssets - totalBsLiab;

  // ── Cash Flow calculations (date-filtered) ──
  const cfSalesIn   = fSales.reduce((s,x) => s + Number(x.paid || 0), 0);
  const cfLoanIn    = fLoanInt.filter(x => ["active","paid"].includes(String(x.status))).reduce((s,x) => s + Number(x.interestRevenue||0), 0);
  const cfInflows   = cfSalesIn + cfLoanIn;
  const cfOutflows  = totalMktExp + totalOffExp + totalPayroll;
  const netCashFlow = cfInflows - cfOutflows;

  // ── Merge regular customers + loan customers for All Customers report ──
  const loanCustNorm: Row[] = filterByCo(loanCust)
    .filter(l => inRange(l.date || l.createdAt, start, end))
    .map(l => ({
      id:             l.id,
      companyId:      l.companyId,
      name:           l.customerName,
      company:        "",
      type:           l.type ?? "loan",
      customerType:   "Loan Customer",
      phone:          l.contactPhone ?? "",
      email:          "",
      serviceProduct: `Loan — ${l.loanPeriod ?? ""} mo.`,
      status:         l.status,
      date:           l.date || l.createdAt || "",
      createdAt:      l.createdAt,
    }));

  const existingNames = new Set(fCustomers.map(c => String(c.name ?? "").toLowerCase().trim()));
  const newLoanRows   = loanCustNorm.filter(l => !existingNames.has(String(l.name).toLowerCase().trim()));
  const fAllCustomers = [
    ...fCustomers.map(c => ({ ...c, customerType: c.customerType ?? "Sales Customer" })),
    ...newLoanRows,
  ].map((r, i) => ({ ...r, _rowNum: i + 1 }));

  const COLUMNS: Record<ReportType, Col[]> = {
    customers: [
      { key: "_rowNum",        label: "#"                                                                    },
      { key: "name",           label: "Customer Name"                                                        },
      { key: "company",        label: "Company"                                                              },
      { key: "customerType",   label: "Customer Type"                                                        },
      { key: "phone",          label: "Phone"                                                                },
      { key: "email",          label: "Email"                                                                },
      { key: "serviceProduct", label: "Service / Product"                                                    },
      { key: "status",         label: "Status"                                                               },
      { key: "date",           label: "Date Registered", render: r => formatDate(String(r.date || r.createdAt || "")) },
    ],
    sales: [
      { key: "customerName", label: "Customer"                                                               },
      { key: "date",         label: "Date",          render: r => formatDate(String(r.date || ""))           },
      { key: "amount",       label: "Amount",        render: r => formatCurrency(Number(r.amount   || 0))   },
      { key: "paid",         label: "Paid",          render: r => formatCurrency(Number(r.paid     || 0))   },
      { key: "balance",      label: "Balance",       render: r => formatCurrency(Number(r.balance  || 0))   },
      { key: "status",       label: "Status"                                                                 },
      { key: "notes",        label: "Notes"                                                                  },
    ],
    marketing_expenses: [
      { key: "userName",    label: "Employee"                                                                },
      { key: "title",       label: "Title"                                                                   },
      { key: "category",    label: "Category"                                                                },
      { key: "amount",      label: "Amount",         render: r => formatCurrency(Number(r.amount   || 0))   },
      { key: "date",        label: "Date",           render: r => formatDate(String(r.date || r.createdAt || "")) },
      { key: "status",      label: "Status"                                                                  },
      { key: "paymentMode", label: "Payment Mode"                                                           },
    ],
    office_expenses: [
      { key: "title",       label: "Title"                                                                   },
      { key: "category",    label: "Category"                                                                },
      { key: "amount",      label: "Amount",         render: r => formatCurrency(Number(r.amount   || 0))   },
      { key: "date",        label: "Date",           render: r => formatDate(String(r.date || ""))          },
      { key: "status",      label: "Status"                                                                  },
      { key: "recordedBy",  label: "Recorded By"                                                            },
      { key: "paymentMode", label: "Payment Mode"                                                           },
    ],
    staff_claims: [
      { key: "userName",    label: "Employee"                                                                },
      { key: "title",       label: "Title"                                                                   },
      { key: "category",    label: "Category"                                                                },
      { key: "amount",      label: "Amount",         render: r => formatCurrency(Number(r.amount   || 0))   },
      { key: "date",        label: "Date",           render: r => formatDate(String(r.date || r.createdAt || "")) },
      { key: "status",      label: "Status"                                                                  },
      { key: "description", label: "Description"                                                            },
    ],
    payroll: [
      { key: "staffName",   label: "Staff Name"                                                              },
      { key: "month",       label: "Month"                                                                   },
      { key: "year",        label: "Year"                                                                    },
      { key: "basicSalary", label: "Basic Salary",  render: r => formatCurrency(Number(r.basicSalary || 0))},
      { key: "grossSalary", label: "Gross Salary",  render: r => formatCurrency(Number(r.grossSalary || 0))},
      { key: "netSalary",   label: "Net Salary",    render: r => formatCurrency(Number(r.netSalary   || 0))},
      { key: "status",      label: "Status"                                                                  },
      { key: "generatedAt", label: "Generated",     render: r => formatDate(String(r.generatedAt || ""))   },
    ],
    invoices: [
      { key: "invoiceNumber", label: "Invoice No"                                                            },
      { key: "customerName",  label: "Customer"                                                              },
      { key: "date",          label: "Date",         render: r => formatDate(String(r.date || r.invoiceDate || r.createdAt || "")) },
      { key: "amount",        label: "Amount",       render: r => formatCurrency(Number(r.amount || r.total || 0)) },
      { key: "status",        label: "Status"                                                                },
      { key: "dueDate",       label: "Due Date",     render: r => formatDate(String(r.dueDate || ""))       },
    ],
    petty_cash: [
      { key: "description", label: "Description"                                                             },
      { key: "category",    label: "Category"                                                                },
      { key: "type",        label: "Type"                                                                    },
      { key: "amount",      label: "Amount",         render: r => formatCurrency(Number(r.amount   || 0))   },
      { key: "balance",     label: "Balance",        render: r => formatCurrency(Number(r.balance  || 0))   },
      { key: "date",        label: "Date",           render: r => formatDate(String(r.date || ""))          },
      { key: "createdBy",   label: "Recorded By"                                                            },
    ],
    loan_customers: [
      { key: "customerName",   label: "Customer"                                                             },
      { key: "contactPhone",   label: "Phone"                                                                },
      { key: "date",           label: "Date",        render: r => formatDate(String(r.date || ""))          },
      { key: "amountOfLoan",   label: "Loan Amount", render: r => formatCurrency(Number(r.amountOfLoan || 0)) },
      { key: "interestPerMonth", label: "Rate/Mo",   render: r => `${r.interestPerMonth}%`                  },
      { key: "loanPeriod",     label: "Period",      render: r => `${r.loanPeriod} mo.`                     },
      { key: "status",         label: "Status"                                                               },
    ],
    loan_interest: [
      { key: "customerName",   label: "Customer"                                                             },
      { key: "date",           label: "Date",        render: r => formatDate(String(r.date || ""))          },
      { key: "amountOfLoan",   label: "Loan Amount", render: r => formatCurrency(Number(r.amountOfLoan || 0)) },
      { key: "interestRevenue",label: "Interest Revenue", render: r => formatCurrency(Number(r.interestRevenue || 0)) },
      { key: "status",         label: "Status"                                                               },
    ],
    revenue_summary: [
      { key: "source",       label: "Source"                                                                 },
      { key: "customerName", label: "Customer"                                                               },
      { key: "date",         label: "Date",          render: r => formatDate(String(r.date || ""))           },
      { key: "amount",       label: "Revenue",       render: r => formatCurrency(Number(r.amount || 0))      },
      { key: "status",       label: "Status"                                                                 },
    ],
    profit_loss: [],
    assets: [
      { key: "_assetNum",    label: "#"                                                                         },
      { key: "name",         label: "Asset Name"                                                                },
      { key: "category",     label: "Category"                                                                  },
      { key: "location",     label: "Location"                                                                  },
      { key: "assignedTo",   label: "Assigned To"                                                               },
      { key: "purchaseCost", label: "Purchase Cost", render: r => formatCurrency(Number(r.purchaseCost || 0))  },
      { key: "currentValue", label: "Current Value", render: r => formatCurrency(Number(r.currentValue ?? r.purchaseCost ?? 0)) },
      { key: "status",       label: "Status"                                                                    },
      { key: "purchaseDate", label: "Purchase Date", render: r => r.purchaseDate ? formatDate(String(r.purchaseDate)) : (r.createdAt ? formatDate(String(r.createdAt)) : "") },
    ],
    balance_sheet:          [],
    cashflow:               [],
    account_floats:         [],
    microfinance_customers: [
      { key: "_num",         label: "#"                },
      { key: "name",         label: "Customer Name"   },
      { key: "phone",        label: "Phone"           },
      { key: "businessName", label: "Business / Group" },
      { key: "permitNumber", label: "Permit No."      },
      { key: "permitType",   label: "Permit Type"     },
      { key: "permitExpiry", label: "Expiry Date"     },
      { key: "address",      label: "Address"         },
      { key: "createdAt",    label: "Date Added",     render: r => formatDate(String(r.createdAt || "")) },
    ],
    marketing_customers: [
      { key: "_num",         label: "#"              },
      { key: "name",         label: "Customer Name"  },
      { key: "phone",        label: "Phone"          },
      { key: "businessName", label: "Business Name"  },
      { key: "campaign",     label: "Campaign"       },
      { key: "category",     label: "Category"       },
      { key: "source",       label: "Source"         },
      { key: "email",        label: "Email"          },
      { key: "createdAt",    label: "Date Added",    render: r => formatDate(String(r.createdAt || "")) },
    ],
    debtors: [
      { key: "_rowNum",      label: "#"                                                                  },
      { key: "customerName", label: "Customer"                                                           },
      { key: "date",         label: "Date",         render: r => formatDate(String(r.date || ""))        },
      { key: "amount",       label: "Total Sale",   render: r => formatCurrency(Number(r.amount || 0))  },
      { key: "paid",         label: "Paid",         render: r => formatCurrency(Number(r.paid || 0))    },
      { key: "balance",      label: "Balance Due",  render: r => formatCurrency(Number(r.balance || 0)) },
      { key: "status",       label: "Status"                                                             },
    ],
    creditors: [
      { key: "_rowNum",    label: "#"                                                                        },
      { key: "name",       label: "Creditor Name"                                                            },
      { key: "category",   label: "Category"                                                                 },
      { key: "amount",     label: "Amount Owed",   render: r => formatCurrency(Number(r.amount || 0))       },
      { key: "amountPaid", label: "Amount Paid",   render: r => formatCurrency(Number(r.amountPaid || 0))   },
      { key: "balance",    label: "Balance",       render: r => formatCurrency(Number(r.balance || r.amount || 0)) },
      { key: "dueDate",    label: "Due Date",       render: r => r.dueDate ? formatDate(String(r.dueDate)) : "-" },
      { key: "status",     label: "Status"                                                                   },
      { key: "notes",      label: "Notes"                                                                    },
    ],
    projected_budget: [
      { key: "_rowNum",   label: "#"                                                                    },
      { key: "title",     label: "Title"                                                                },
      { key: "category",  label: "Category"                                                             },
      { key: "amount",    label: "Amount",     render: r => formatCurrency(Number(r.amount || 0))      },
      { key: "period",    label: "Period Type"                                                          },
      { key: "month",     label: "Month"                                                                },
      { key: "year",      label: "Year"                                                                 },
      { key: "priority",  label: "Priority"                                                             },
      { key: "status",    label: "Status"                                                               },
      { key: "notes",     label: "Notes"                                                                },
    ],
    projected_income: [
      { key: "_rowNum",    label: "#"                                                                     },
      { key: "serviceName",label: "Service / Item"                                                        },
      { key: "category",   label: "Category"                                                              },
      { key: "unitPrice",  label: "Unit Price",  render: r => formatCurrency(Number(r.unitPrice || 0))   },
      { key: "units",      label: "Units"                                                                 },
      { key: "amount",     label: "Total Amount",render: r => formatCurrency(Number(r.amount || 0))      },
      { key: "period",     label: "Period"                                                                },
      { key: "month",      label: "Month"                                                                 },
      { key: "year",       label: "Year"                                                                  },
      { key: "status",     label: "Status"                                                                },
    ],
  };

  const DATA: Record<ReportType, Row[]> = {
    customers:          fAllCustomers,
    sales:              fSales,
    marketing_expenses: fMkt,
    office_expenses:    fOff,
    staff_claims:       fMkt,
    payroll:            fPayroll,
    invoices:           fInvoices,
    petty_cash:         fPettyCash,
    loan_customers:     fLoanCust,
    loan_interest:      fLoanInt,
    revenue_summary:    fRevenue,
    profit_loss:             [],
    assets:                  fAssets.map((r, i) => ({ ...r, _assetNum: i + 1 })),
    balance_sheet:           [],
    cashflow:                [],
    account_floats:          [],
    microfinance_customers:  fMfCusts,
    marketing_customers:     fMktCusts,
    debtors:          fSales.filter(s => Number(s.balance) > 0).map((r,i) => ({...r, _rowNum: i+1})),
    creditors:        filterByCo(creditors).map((r,i) => ({...r, _rowNum: i+1})),
    projected_budget: filterByCo(projected).map((r,i) => ({...r, _rowNum: i+1})),
    projected_income: filterByCo(projectedIncome).map((r,i) => ({...r, _rowNum: i+1})),
  };

  const cfg  = REPORT_TYPES.find(r => r.key === report)!;
  const cols = COLUMNS[report];
  const data = DATA[report];
  const companyName = companies.find(c => c.id === cid)?.name ?? "All Companies";
  const dateLabel   = preset === "custom" ? `${from} to ${to}` : DATE_PRESETS.find(p => p.key === preset)?.label ?? "";

  // ─── Print ───
  const printReport = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const header = `<h1 style="margin:0">${cfg.label} Report</h1><p style="color:#666;margin:4px 0 16px">${companyName} &nbsp;|&nbsp; ${dateLabel} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>`;
    const style  = `<style>*{font-family:Arial,sans-serif;font-size:12px}body{padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:bold}tr:nth-child(even){background:#fafafa}.section{margin-top:20px}.section h2{font-size:14px;margin-bottom:8px}.total{font-weight:bold;background:#e9f7ef}.loss{background:#fdecea}.net-positive{color:#16a34a}.net-negative{color:#dc2626}</style>`;
    if (report === "balance_sheet") {
      w.document.write(`<html><head>${style}</head><body>${header}
        <div class="section"><h2>Assets</h2><table>
          <tr><th>Description</th><th>Amount</th></tr>
          <tr><td>Fixed Assets (Book Value)</td><td>${formatCurrency(totalAssetValue)}</td></tr>
          <tr><td>Loan Portfolio (Active)</td><td>${formatCurrency(activeLoanAmt)}</td></tr>
          <tr><td>Sales Receivable</td><td>${formatCurrency(salesReceivable)}</td></tr>
          <tr><td>Cash / Petty Cash Fund</td><td>${formatCurrency(pettyCashBal)}</td></tr>
          <tr class="total"><td>Total Assets</td><td>${formatCurrency(totalBsAssets)}</td></tr>
        </table></div>
        <div class="section"><h2>Liabilities &amp; Equity</h2><table>
          <tr><th>Description</th><th>Amount</th></tr>
          <tr><td>Unpaid Expenses (Payable)</td><td>${formatCurrency(unpaidExpenses)}</td></tr>
          <tr><td>Payroll Due</td><td>${formatCurrency(payrollDue)}</td></tr>
          <tr><td>Total Liabilities</td><td>${formatCurrency(totalBsLiab)}</td></tr>
          <tr class="${bsEquity>=0?'total':'loss'}"><td>Net Equity</td><td>${formatCurrency(bsEquity)}</td></tr>
        </table></div>
      </body></html>`);
    } else if (report === "cashflow") {
      w.document.write(`<html><head>${style}</head><body>${header}
        <div class="section"><h2>Operating Inflows</h2><table>
          <tr><th>Description</th><th>Amount</th></tr>
          <tr><td>Customer Sales Received</td><td>${formatCurrency(cfSalesIn)}</td></tr>
          <tr><td>Loan Interest Collected</td><td>${formatCurrency(cfLoanIn)}</td></tr>
          <tr class="total"><td>Total Inflows</td><td>${formatCurrency(cfInflows)}</td></tr>
        </table></div>
        <div class="section"><h2>Operating Outflows</h2><table>
          <tr><th>Description</th><th>Amount</th></tr>
          <tr><td>Marketing Expenses</td><td>${formatCurrency(totalMktExp)}</td></tr>
          <tr><td>Office Expenses</td><td>${formatCurrency(totalOffExp)}</td></tr>
          <tr><td>Payroll</td><td>${formatCurrency(totalPayroll)}</td></tr>
          <tr class="${netCashFlow>=0?'total':'loss'}"><td>Total Outflows</td><td>${formatCurrency(cfOutflows)}</td></tr>
        </table></div>
        <div class="section"><h2>Net Cash Flow</h2><table>
          <tr class="${netCashFlow>=0?'total':'loss'}"><td><strong>Net Cash Flow</strong></td><td>${formatCurrency(netCashFlow)}</td></tr>
        </table></div>
      </body></html>`);
    } else if (report === "profit_loss") {
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
          <tr><td>Payroll</td><td>${formatCurrency(totalPayroll)}</td></tr>
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
    if (report === "balance_sheet") {
      content = ["Category,Description,Amount",
        `Assets,Fixed Assets (Book Value),${totalAssetValue}`,
        `Assets,Loan Portfolio (Active),${activeLoanAmt}`,
        `Assets,Sales Receivable,${salesReceivable}`,
        `Assets,Cash/Petty Cash,${pettyCashBal}`,
        `Assets,Total Assets,${totalBsAssets}`,
        `Liabilities,Unpaid Expenses,${unpaidExpenses}`,
        `Liabilities,Payroll Due,${payrollDue}`,
        `Liabilities,Total Liabilities,${totalBsLiab}`,
        `Equity,Net Equity,${bsEquity}`,
      ].join("\n");
    } else if (report === "cashflow") {
      content = ["Category,Description,Amount",
        `Inflow,Customer Sales Received,${cfSalesIn}`,
        `Inflow,Loan Interest Collected,${cfLoanIn}`,
        `Inflow,Total Inflows,${cfInflows}`,
        `Outflow,Marketing Expenses,${totalMktExp}`,
        `Outflow,Office Expenses,${totalOffExp}`,
        `Outflow,Payroll,${totalPayroll}`,
        `Outflow,Total Outflows,${cfOutflows}`,
        `Net,Net Cash Flow,${netCashFlow}`,
      ].join("\n");
    } else if (report === "profit_loss") {
      content = ["Category,Description,Amount",
        `Revenue,Customer Sales,${totalSales}`,
        `Revenue,Loan Interest,${totalLoanRev}`,
        `Revenue,Total Revenue,${totalRevenue}`,
        `Expenses,Marketing Expenses,${totalMktExp}`,
        `Expenses,Office Expenses,${totalOffExp}`,
        `Expenses,Payroll,${totalPayroll}`,
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

  const API_ENDPOINTS: Record<string, string> = {
    customers: "/api/customers",
    sales: "/api/accounting/sales",
    debtors: "/api/accounting/sales",
    marketing_expenses: "/api/expenses",
    office_expenses: "/api/office-expenses",
    staff_claims: "/api/expenses",
    payroll: "/api/payroll",
    invoices: "/api/invoices",
    petty_cash: "/api/petty-cash",
    loan_customers: "/api/loans",
    loan_interest: "/api/loan-interest",
    assets: "/api/assets",
    microfinance_customers: "/api/microfinance-customers",
    marketing_customers: "/api/marketing-customers",
  };

  const parseCSV = (text: string): Row[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
    const keyMap: Record<string, string> = {
      "#": "_rowNum", "Customer Name": "name", "Customer": "customerName",
      "Company": "company", "Customer Type": "customerType", "Phone": "phone",
      "Email": "email", "Service / Product": "serviceProduct", "Status": "status",
      "Date": "date", "Date Registered": "date", "Amount": "amount", "Paid": "paid",
      "Balance": "balance", "Notes": "notes", "Employee": "userName", "Title": "title",
      "Category": "category", "Payment Mode": "paymentMode", "Description": "description",
      "Staff Name": "staffName", "Month": "month", "Year": "year", "Basic Salary": "basicSalary",
      "Gross Salary": "grossSalary", "Net Salary": "netSalary", "Generated": "generatedAt",
      "Invoice No": "invoiceNumber", "Due Date": "dueDate", "Type": "type", "Recorded By": "createdBy",
      "Loan Amount": "amountOfLoan", "Rate/Mo": "interestPerMonth", "Period": "loanPeriod",
      "Interest Revenue": "interestRevenue", "Asset Name": "name", "Location": "location",
      "Purchase Date": "purchaseDate", "Purchase Cost": "purchaseCost", "Current Value": "currentValue",
    };
    return lines.slice(1).map(line => {
      const vals = line.match(/("([^"]*)"|[^,]*)/g) || [];
      const row: Row = {};
      headers.forEach((h, i) => {
        const key = keyMap[h] || h.toLowerCase().replace(/\s+/g, "_");
        let val = (vals[i] || "").replace(/^"|"$/g, "").trim();
        if (val.startsWith("TSh ")) val = val.replace(/TSh\s*/g, "").replace(/,/g, "");
        if (val.endsWith("%")) val = val.replace(/%$/, "");
        if (val.endsWith(" mo.")) val = val.replace(/ mo\.$/, "");
        row[key] = val;
      });
      if (!row.id) row.id = `imp_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
      if (!row.companyId && cid) row.companyId = cid;
      if (!row.createdAt) row.createdAt = new Date().toISOString();
      return row;
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const endpoint = API_ENDPOINTS[report];
    if (!endpoint) {
      setImportMsg({ type: "error", text: `Import not supported for ${cfg.label}` });
      setTimeout(() => setImportMsg(null), 4000);
      return;
    }
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) throw new Error("No valid rows found in CSV");
      let imported = 0;
      for (const row of rows) {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        if (res.ok) imported++;
      }
      setImportMsg({ type: "success", text: `Successfully imported ${imported} of ${rows.length} records` });
      await loadData();
    } catch (err) {
      setImportMsg({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setImportMsg(null), 5000);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl"><BarChart3 className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reports</h1>
              <p className="text-sm text-gray-500">Print and download reports • {companyName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing || !API_ENDPOINTS[report]}>
              <Upload className={`w-4 h-4 mr-1.5 ${importing ? "animate-pulse" : ""}`} /> {importing ? "Importing..." : "Import CSV"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-1.5" /> Download CSV
            </Button>
            <Button size="sm" onClick={printReport} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-1.5" /> Print Report
            </Button>
          </div>
        </div>
        {importMsg && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${importMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {importMsg.text}
          </div>
        )}

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
                {!["profit_loss","balance_sheet","cashflow","account_floats"].includes(report) ? `${data.length} records • ` : ""}{report === "account_floats" ? `${fFloats.length} accounts • ` : ""}{dateLabel}
              </span>
            </div>

            {/* Balance Sheet view */}
            {report === "balance_sheet" ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 bg-gray-50 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900 text-lg">Balance Sheet</h2>
                  <p className="text-sm text-gray-500">{companyName} &nbsp;·&nbsp; As of today</p>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Assets</h3>
                    <div className="divide-y divide-gray-50">
                      {[
                        { label: "Fixed Assets (Book Value)", value: totalAssetValue, href: null },
                        { label: "Loan Portfolio (Active)",   value: activeLoanAmt,   href: null },
                        { label: "Accounts Receivable (Debtors)", value: salesReceivable, href: "/accounting/debtors" },
                        { label: "Cash / Petty Cash Fund",    value: pettyCashBal,    href: null },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between py-2.5">
                          {r.href ? (
                            <a href={r.href} className="text-sm text-blue-600 hover:underline font-medium">{r.label} ↗</a>
                          ) : (
                            <span className="text-sm text-gray-700">{r.label}</span>
                          )}
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(r.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between py-2.5 border-t-2 border-violet-200 mt-1">
                      <span className="font-bold text-violet-800">Total Assets</span>
                      <span className="font-bold text-violet-700">{formatCurrency(totalBsAssets)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Liabilities &amp; Equity</h3>
                    <div className="divide-y divide-gray-50">
                      {[
                        { label: "Unpaid Expenses (Payable)", value: unpaidExpenses },
                        { label: "Payroll Due",               value: payrollDue     },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between py-2.5">
                          <span className="text-sm text-gray-700">{r.label}</span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(r.value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2.5">
                        <span className="text-sm text-gray-500 font-semibold">Total Liabilities</span>
                        <span className="text-sm font-bold">{formatCurrency(totalBsLiab)}</span>
                      </div>
                    </div>
                    <div className={`flex justify-between py-2.5 border-t-2 mt-1 ${bsEquity >= 0 ? "border-green-200" : "border-red-200"}`}>
                      <span className={`font-bold ${bsEquity >= 0 ? "text-green-800" : "text-red-800"}`}>Net Equity</span>
                      <span className={`font-bold ${bsEquity >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(bsEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : report === "cashflow" ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 bg-gray-50 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900 text-lg">Cash Flow Statement</h2>
                  <p className="text-sm text-gray-500">{companyName} &nbsp;·&nbsp; {dateLabel}</p>
                </div>
                <div className="p-5 space-y-8 max-w-xl">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Operating Inflows</h3>
                    <div className="divide-y divide-gray-50">
                      {[
                        { label: "Customer Sales Received",  value: cfSalesIn  },
                        { label: "Loan Interest Collected",  value: cfLoanIn   },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between py-2.5">
                          <span className="text-sm text-gray-700">{r.label}</span>
                          <span className="text-sm font-medium text-green-700">+{formatCurrency(r.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between py-2.5 border-t-2 border-green-200 mt-1">
                      <span className="font-bold text-green-800">Total Inflows</span>
                      <span className="font-bold text-green-700">{formatCurrency(cfInflows)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Operating Outflows</h3>
                    <div className="divide-y divide-gray-50">
                      {[
                        { label: "Marketing Expenses", value: totalMktExp  },
                        { label: "Office Expenses",    value: totalOffExp  },
                        { label: "Payroll",            value: totalPayroll },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between py-2.5">
                          <span className="text-sm text-gray-700">{r.label}</span>
                          <span className="text-sm font-medium text-red-600">−{formatCurrency(r.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between py-2.5 border-t-2 border-red-200 mt-1">
                      <span className="font-bold text-red-800">Total Outflows</span>
                      <span className="font-bold text-red-700">{formatCurrency(cfOutflows)}</span>
                    </div>
                  </div>
                  <div className={`rounded-xl p-5 ${netCashFlow >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Net Cash Flow</p>
                        <p className="text-sm text-gray-500 mt-0.5">{formatCurrency(cfInflows)} in − {formatCurrency(cfOutflows)} out</p>
                      </div>
                      <span className={`text-3xl font-bold ${netCashFlow >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {formatCurrency(Math.abs(netCashFlow))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* P&L / special views */}
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
                        { label: "Marketing Expenses", value: totalMktExp  },
                        { label: "Office Expenses",    value: totalOffExp  },
                        { label: "Payroll",             value: totalPayroll },
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
            ) : report === "account_floats" ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 bg-gray-50 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900 text-lg">Account Floats Summary</h2>
                  <p className="text-sm text-gray-500">{companyName} &nbsp;·&nbsp; {fFloats.length} account{fFloats.length !== 1 ? "s" : ""}</p>
                </div>
                {fFloats.length === 0 ? (
                  <div className="py-14 text-center text-gray-400 text-sm">No account floats found.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {/* Summary cards */}
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fFloats.map(fl => (
                        <div key={fl.id} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${fl.accountType === "mobile_money" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                              {fl.provider}
                            </span>
                            <span className="text-xs text-gray-400">{fl.currency ?? "TZS"}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 mb-1">{fl.accountName}</p>
                          {fl.accountNumber && <p className="text-xs text-gray-400 font-mono mb-2">{fl.accountNumber}</p>}
                          <p className="text-2xl font-bold text-blue-700">{formatCurrency(fl.currentBalance)}</p>
                          <p className="text-xs text-gray-400 mt-1">Date Added: {fl.createdAt ? formatDate(fl.createdAt.slice(0,10)) : "—"}</p>
                          <p className="text-xs text-gray-400">Last Updated: {fl.lastUpdatedAt ? formatDate(fl.lastUpdatedAt.slice(0,10)) : "—"}</p>
                        </div>
                      ))}
                    </div>
                    {/* Total */}
                    <div className="px-5 py-3 flex justify-between items-center bg-teal-50">
                      <span className="font-bold text-teal-800">Total Float Balance</span>
                      <span className="font-bold text-teal-700 text-lg">{formatCurrency(fFloats.reduce((s,f) => s + f.currentBalance, 0))}</span>
                    </div>
                    {/* Transaction history per float */}
                    {fFloats.map(fl => fl.history && fl.history.length > 0 && (
                      <div key={`hist-${fl.id}`} className="p-5">
                        <p className="text-sm font-semibold text-gray-700 mb-3">{fl.provider} — {fl.accountName} &nbsp; Transaction History</p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-3 py-2">Date</th>
                              <th className="text-left px-3 py-2">Type</th>
                              <th className="text-right px-3 py-2">Amount</th>
                              <th className="text-right px-3 py-2">Balance</th>
                              <th className="text-left px-3 py-2">Description</th>
                              <th className="text-left px-3 py-2">By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fl.history.map(h => (
                              <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-600">{h.date}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${h.type === "debit" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                                    {h.type === "debit" ? "▼ Debit" : "▲ Credit"}
                                  </span>
                                </td>
                                <td className={`px-3 py-2 text-right font-semibold ${h.type === "debit" ? "text-red-600" : "text-green-700"}`}>
                                  {h.type === "debit" ? "-" : "+"}{formatCurrency(h.amount ?? 0)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatCurrency(h.balance)}</td>
                                <td className="px-3 py-2 text-gray-600">{h.description}</td>
                                <td className="px-3 py-2 text-gray-400">{h.updatedBy || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : !["balance_sheet","cashflow"].includes(report) ? (
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
            ) : null}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
