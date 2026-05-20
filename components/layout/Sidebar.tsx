"use client";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CheckSquare, Calendar, DollarSign,
  BookOpen, UserCheck, Target, Bell, Settings, ChevronDown,
  ChevronRight, Building2, ShoppingCart, Megaphone, Package,
  Receipt, BarChart3, FileText, Warehouse, TrendingUp, Briefcase,
  Clock, HelpCircle, X, Menu, Percent, Wrench, Activity, Scale, MapPin,
  Users2, MessageSquarePlus, MessageSquare, Landmark, Radio, BadgeCheck, Music, Film
} from "lucide-react";
import { useState, useEffect } from "react";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

// Module-level company cache — avoids a network round-trip on every navigation
let _sbCoCache: {id:string;name:string}[] | null = null;
let _sbCoCacheAt = 0;
const SB_CO_TTL = 60_000;

// Map permission keys to route prefixes
const PERM_ROUTES: Record<string, string[]> = {
  dashboard:         ["/dashboard"],
  users:             ["/users"],
  attendance:        ["/attendance"],
  leave:             ["/leave"],
  payroll:           ["/payroll"],
  tasks:             ["/tasks"],
  kpis:              ["/kpis"],
  assets:            ["/assets"],
  expenses:          ["/expenses"],
  office_expenses:   ["/accounting/office-expenses"],
  loan_interest:     ["/accounting/loan-interest"],
  financial_reports: ["/accounting/financial-reports"],
  accounting:        ["/accounting"],
  invoices:          ["/invoices"],
  petty_cash:        ["/petty-cash"],
  customers:              ["/customers"],
  media_customers:        ["/media-customers"],
  business_customers:     ["/business-customers"],
  licence_customers:      ["/licence-customers"],
  entertainment_customers:["/entertainment-customers"],
  movies_customers:       ["/movies-customers"],
  sales:             ["/sales", "/quotations", "/tickets"],
  commissions:       ["/commissions"],
  marketing:         ["/marketing"],
  inventory:         ["/inventory", "/vendors"],
  documents:         ["/documents"],
  reports:           ["/reports"],
  services:          ["/services"],
  messages:          ["/messages"],
  admin:             ["/admin", "/notifications"],
  loans:             ["/loans"],
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ALL_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Human Resources",
    items: [
      { label: "Users & Roles", href: "/users", icon: Users },
      { label: "Attendance", href: "/attendance", icon: Clock },
      { label: "Leave Management", href: "/leave", icon: Calendar },
      { label: "Payroll & Salary", href: "/payroll", icon: DollarSign },
      { label: "Staff Meeting", href: "/staff-meetings", icon: Users2 },
    ]
  },
  {
    title: "Operations",
    items: [
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "KPIs & Reports", href: "/kpis", icon: Target },
    ]
  },
  {
    title: "Finance",
    items: [
      { label: "Accounting",           href: "/accounting",                 icon: BookOpen     },
      { label: "Customer Sales",       href: "/accounting/sales",           icon: ShoppingCart },
      { label: "Staff Expense Claims", href: "/accounting/expenses",        icon: Receipt      },
      { label: "Office Expenses",      href: "/accounting/office-expenses", icon: DollarSign   },
      { label: "Profit & Loss",        href: "/accounting/profit-loss",     icon: TrendingUp   },
      { label: "Balance Sheet",        href: "/accounting/balance-sheet",   icon: Scale        },
      { label: "Cash Flow",            href: "/accounting/cashflow",        icon: Activity     },
      { label: "Invoices",             href: "/invoices",                   icon: FileText     },
      { label: "Petty Cash",           href: "/petty-cash",                 icon: DollarSign   },
      { label: "Interest from Loans",  href: "/accounting/loan-interest",   icon: TrendingUp   },
      { label: "Assets",               href: "/assets",                      icon: Briefcase    },
      { label: "Marketing Expenses",    href: "/expenses",                    icon: Receipt      },
      { label: "Reports",               href: "/accounting/financial-reports", icon: BarChart3    },
    ]
  },
  {
    title: "Sales & CRM",
    items: [
      { label: "Customers",       href: "/customers",   icon: UserCheck  },
      { label: "Sales Pipeline",  href: "/sales",       icon: TrendingUp },
      { label: "Commissions",     href: "/commissions", icon: Percent    },
      { label: "Loan Customers",           href: "/loans",                    icon: DollarSign },
      { label: "Microfinance Customers",    href: "/microfinance-customers",   icon: Landmark   },
      { label: "Marketing Customers",       href: "/marketing-customers",      icon: Megaphone  },
      { label: "Media Customers",            href: "/media-customers",          icon: Radio      },
      { label: "Business Customers",         href: "/business-customers",       icon: Building2  },
      { label: "Licence Customers",          href: "/licence-customers",        icon: BadgeCheck },
      { label: "Entertainment Customers",    href: "/entertainment-customers",  icon: Music      },
      { label: "Movies Customers",           href: "/movies-customers",         icon: Film       },
      { label: "Quotations",               href: "/quotations",               icon: FileText   },
      { label: "Support Tickets", href: "/tickets",     icon: HelpCircle },
    ]
  },
  {
    title: "Marketing",
    items: [
      { label: "Campaigns", href: "/marketing", icon: Megaphone },
      { label: "Marketing Report", href: "/marketing-reports", icon: MessageSquarePlus },
    ]
  },
  {
    title: "Inventory",
    items: [
      { label: "Products",        href: "/inventory/products", icon: Package   },
      { label: "Stock",           href: "/inventory/stock",    icon: Warehouse },
      { label: "Purchase Orders", href: "/inventory/orders",   icon: ShoppingCart },
      { label: "Vendors",         href: "/vendors",            icon: Building2 },
    ]
  },
  {
    title: "Services",
    items: [
      { label: "Services & Pricing", href: "/services", icon: Wrench },
    ]
  },
  {
    title: "Messages",
    items: [
      { label: "SMS Messages", href: "/messages", icon: MessageSquare },
    ]
  },
  {
    title: "System",
    items: [
      { label: "Documents",               href: "/documents",     icon: FileText  },
      { label: "Branches",                href: "/admin#branches",icon: MapPin    },
      { label: "Admin Panel",             href: "/admin",         icon: Settings  },
    ]
  },
];

function canAccess(href: string, perms: string[] | null): boolean {
  if (!perms) return true; // superadmin sees everything
  // Use longest-prefix match so /accounting/office-expenses beats /accounting
  let bestPerm: string | null = null;
  let bestLen = -1;
  for (const [perm, routes] of Object.entries(PERM_ROUTES)) {
    for (const r of routes) {
      if ((href === r || href.startsWith(r + "/")) && r.length > bestLen) {
        bestPerm = perm;
        bestLen = r.length;
      }
    }
  }
  if (bestPerm !== null) return perms.includes(bestPerm);
  return true; // routes not in map are always visible
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

function readSessionSync(): {id:string;name:string;role:string;position:string;isSuperAdmin:boolean;companyId?:string;permissions?:string[]} | null {
  try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function readActiveCidSync(): string {
  try { const raw = localStorage.getItem("phidtech_active_company") ?? ""; return raw && raw !== '""' ? raw.replace(/^"|"$/g, "") : ""; } catch { return ""; }
}

export default function Sidebar({ collapsed, onToggle, mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<{id:string;name:string;role:string;position:string;isSuperAdmin:boolean;companyId?:string;permissions?:string[]} | null>(readSessionSync);
  const [myCompanyName, setMyCompanyName] = useState("");
  const [activeCompanyId, setActiveCompanyId] = useState(readActiveCidSync);

  useEffect(() => {
    const load = async () => {
      try {
        const s = localStorage.getItem(SESSION_KEY);
        const rawCid = localStorage.getItem("phidtech_active_company") ?? "";
        const cid = rawCid && rawCid !== '""' ? rawCid.replace(/^"|"$/g, "") : "";
        setActiveCompanyId(cid);
        if (s) {
          let sess = JSON.parse(s);
          setSession(sess);
          // Fetch fresh permissions from server so admin-updated perms apply without logout
          if (sess?.id && !sess?.isSuperAdmin) {
            try {
              const pr = await fetch("/api/users", { cache: "no-store" });
              if (pr.ok) {
                const users: {id:string;permissions?:string[]}[] = await pr.json();
                const freshUser = users.find(u => u.id === sess.id);
                if (freshUser && Array.isArray(freshUser.permissions)) {
                  sess = { ...sess, permissions: freshUser.permissions };
                  setSession(sess);
                  try { localStorage.setItem(SESSION_KEY, JSON.stringify(sess)); } catch {}
                }
              }
            } catch {}
          }
          // Load companies — use module cache to avoid network hit on every navigation
          let companies: {id:string;name:string}[] = [];
          const now = Date.now();
          if (_sbCoCache && now - _sbCoCacheAt < SB_CO_TTL) {
            companies = _sbCoCache;
          } else {
            try {
              const r = await fetch("/api/companies", { cache: "no-store" });
              if (r.ok) {
                companies = await r.json();
                _sbCoCache = companies; _sbCoCacheAt = Date.now();
                try { localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies)); } catch {}
              } else { companies = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []); }
            } catch { companies = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []); }
          }
          if (sess.isSuperAdmin) {
            setMyCompanyName(companies.find(c => c.id === cid)?.name ?? "");
          } else if (sess.companyId) {
            setMyCompanyName(companies.find(c => c.id === sess.companyId)?.name ?? "");
          }
        }
      } catch {}
    };
    load();
    window.addEventListener("phidtech_session_updated", load);
    window.addEventListener("phidtech_companies_updated", load);
    return () => {
      window.removeEventListener("phidtech_session_updated", load);
      window.removeEventListener("phidtech_companies_updated", load);
    };
  }, []);

  const isSuperAdmin = session?.isSuperAdmin === true;
  const isGroupMode  = isSuperAdmin && !activeCompanyId;
  const perms: string[] | null = isSuperAdmin ? null : (session?.permissions ?? []);

  const navigation = ALL_NAV.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.href === "/admin" || item.href === "/admin#branches") return isSuperAdmin;
      // Always visible to all logged-in users (no permission gate)
      if (["/staff-meetings","/marketing-reports","/customers","/microfinance-customers","/marketing-customers","/media-customers","/business-customers","/licence-customers","/entertainment-customers","/movies-customers","/expenses","/accounting/office-expenses"].includes(item.href)) return true;
      return canAccess(item.href, session ? perms : []);
    }),
  })).filter(group => group.items.length > 0);

  const getInitialGroups = () => {
    const active = ALL_NAV.find(g => g.items.some(i => pathname === i.href || pathname.startsWith(i.href + "/")));
    const result = new Set<string>();
    if (active) result.add(active.title);
    return Array.from(result);
  };
  const [expandedGroups, setExpandedGroups] = useState<string[]>(getInitialGroups);
  // Track which parent items with children are expanded; auto-open accounting if on accounting route
  const [expandedItems, setExpandedItems] = useState<string[]>(
    pathname.startsWith("/accounting") ? ["/accounting"] : []
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const toggleItem = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (href === "/accounting") return pathname === "/accounting";
    return pathname.startsWith(href);
  };

  const isParentActive = (href: string) => pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "flex flex-col h-full transition-all duration-300",
        "bg-[#0B1437] text-slate-300",
        collapsed && !mobile ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0 bg-[#0d1845] border-b border-white/5">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${isGroupMode ? "bg-gradient-to-br from-violet-600 to-indigo-700" : "bg-gradient-to-br from-blue-500 to-blue-700"}`}>
              {isGroupMode
                ? <span className="text-base">👑</span>
                : <Building2 className="w-4 h-4 text-white" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate tracking-wide">PHIDTECH MS</p>
              <p className="text-[10px] text-blue-300/70 truncate">
                {isGroupMode ? "Group HQ" : (myCompanyName || "Select company")}
              </p>
            </div>
          </div>
        )}
        {collapsed && !mobile && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto shadow-lg ${isGroupMode ? "bg-gradient-to-br from-violet-600 to-indigo-700" : "bg-gradient-to-br from-blue-500 to-blue-700"}`}>
            {isGroupMode ? <span className="text-base">👑</span> : <Building2 className="w-4 h-4 text-white" />}
          </div>
        )}
        {mobile ? (
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <button onClick={onToggle} className="p-1.5 hover:bg-white/10 rounded-lg ml-auto transition-colors">
            <Menu className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {navigation.map((group, gi) => (
          <div key={group.title} className={cn("mb-0.5", gi > 0 && "mt-1")}>
            {(!collapsed || mobile) && (
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-150 border-l-4 mt-1",
                  expandedGroups.includes(group.title)
                    ? "bg-[#1a2d6d] border-blue-500 text-blue-200"
                    : "bg-[#0f1a4a] border-transparent text-slate-400 hover:bg-[#162050] hover:border-blue-600/50 hover:text-slate-200"
                )}
              >
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  {group.title}
                </span>
                {expandedGroups.includes(group.title)
                  ? <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                }
              </button>
            )}
            {(expandedGroups.includes(group.title) || collapsed) && (
              <div className="mt-0.5 space-y-0.5 px-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const parentActive = isParentActive(item.href);
                  const hasChildren = !!(item.children && item.children.length > 0);
                  const itemExpanded = expandedItems.includes(item.href) || (hasChildren && parentActive);

                  if (hasChildren && (!collapsed || mobile)) {
                    return (
                      <div key={item.href}>
                        <button
                          onClick={() => toggleItem(item.href)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150",
                            parentActive
                              ? "bg-blue-600/20 text-blue-300 font-medium"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <Icon className={cn("w-4 h-4 shrink-0", parentActive ? "text-blue-400" : "text-slate-500")} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {itemExpanded
                            ? <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
                            : <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                          }
                        </button>
                        {itemExpanded && (
                          <div className="ml-4 mt-0.5 border-l-2 border-blue-600/30 pl-3 space-y-0.5 mb-1">
                            {item.children!.map(child => {
                              const CIcon = child.icon;
                              const cActive = isActive(child.href);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={mobile ? onClose : undefined}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md transition-all duration-150",
                                    cActive
                                      ? "bg-blue-600 text-white font-medium shadow-sm shadow-blue-900"
                                      : "text-slate-500 hover:bg-white/5 hover:text-white"
                                  )}
                                >
                                  <CIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={mobile ? onClose : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150",
                        active
                          ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-900/50"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                        collapsed && !mobile && "justify-center px-2"
                      )}
                      title={collapsed && !mobile ? item.label : undefined}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-slate-500 group-hover:text-white")} />
                      {(!collapsed || mobile) && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom user info */}
      {(!collapsed || mobile) && (
        <div className="shrink-0 p-3 border-t border-white/5 bg-[#0d1845]">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-blue-500/30 shadow">
              {getInitials(session?.name ?? "SA")}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{session?.name ?? "System Administrator"}</p>
              <p className="text-[10px] text-blue-300/60 truncate capitalize mt-0.5">
                {session?.isSuperAdmin ? "Super Admin" : (session?.position ?? session?.role ?? "Admin")}
              </p>
              {!session?.isSuperAdmin && myCompanyName && (
                <p className="text-[10px] text-slate-500 truncate">{myCompanyName}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
