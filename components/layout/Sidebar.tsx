"use client";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CheckSquare, Calendar, DollarSign,
  BookOpen, UserCheck, Target, Bell, Settings, ChevronDown,
  ChevronRight, Building2, ShoppingCart, Megaphone, Package,
  Receipt, BarChart3, FileText, Warehouse, TrendingUp, Briefcase,
  Clock, HelpCircle, X, Menu, Percent, Wrench, Activity, Scale
} from "lucide-react";
import { useState, useEffect } from "react";

const SESSION_KEY   = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}

// Map permission keys to route prefixes
const PERM_ROUTES: Record<string, string[]> = {
  dashboard:   ["/dashboard"],
  users:       ["/users"],
  attendance:  ["/attendance"],
  leave:       ["/leave"],
  payroll:     ["/payroll"],
  tasks:       ["/tasks"],
  kpis:        ["/kpis"],
  assets:      ["/assets"],
  expenses:    ["/expenses"],
  accounting:  ["/accounting"],
  invoices:    ["/invoices"],
  petty_cash:  ["/petty-cash"],
  customers:   ["/customers"],
  sales:       ["/sales", "/quotations", "/tickets"],
  commissions: ["/commissions"],
  marketing:   ["/marketing"],
  inventory:   ["/inventory", "/vendors"],
  documents:   ["/documents"],
  reports:     ["/reports"],
  services:    ["/services"],
  admin:       ["/admin", "/notifications"],
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
    ]
  },
  {
    title: "Operations",
    items: [
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "KPIs & Reports", href: "/kpis", icon: Target },
      { label: "Assets", href: "/assets", icon: Briefcase },
      { label: "Expenses", href: "/expenses", icon: Receipt },
    ]
  },
  {
    title: "Finance",
    items: [
      {
        label: "Accounting",
        href: "/accounting",
        icon: BookOpen,
        children: [
          { label: "Dashboard",     href: "/accounting",                icon: BarChart3   },
          { label: "Customer Sales",href: "/accounting/sales",          icon: ShoppingCart },
          { label: "Profit & Loss", href: "/accounting/profit-loss",    icon: TrendingUp  },
          { label: "Balance Sheet", href: "/accounting/balance-sheet",  icon: Scale       },
          { label: "Cash Flow",     href: "/accounting/cashflow",       icon: Activity    },
        ]
      },
      { label: "Invoices",   href: "/invoices",    icon: FileText  },
      { label: "Petty Cash", href: "/petty-cash",  icon: DollarSign },
    ]
  },
  {
    title: "Sales & CRM",
    items: [
      { label: "Customers",       href: "/customers",   icon: UserCheck  },
      { label: "Sales Pipeline",  href: "/sales",       icon: TrendingUp },
      { label: "Commissions",     href: "/commissions", icon: Percent    },
      { label: "Quotations",      href: "/quotations",  icon: FileText   },
      { label: "Support Tickets", href: "/tickets",     icon: HelpCircle },
    ]
  },
  {
    title: "Marketing",
    items: [
      { label: "Campaigns", href: "/marketing", icon: Megaphone },
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
    title: "System",
    items: [
      { label: "Documents",               href: "/documents",     icon: FileText  },
      { label: "Messages & Notifications",href: "/notifications", icon: Bell      },
      { label: "Reports",                 href: "/reports",       icon: BarChart3 },
      { label: "Admin Panel",             href: "/admin",         icon: Settings  },
    ]
  },
];

function canAccess(href: string, perms: string[] | null): boolean {
  if (!perms) return true; // superadmin sees everything
  for (const [perm, routes] of Object.entries(PERM_ROUTES)) {
    if (routes.some(r => href === r || href.startsWith(r + "/"))) {
      return perms.includes(perm);
    }
  }
  return true; // routes not in map are always visible
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<{id:string;name:string;role:string;position:string;isSuperAdmin:boolean;companyId?:string;permissions?:string[]} | null>(null);
  const [myCompanyName, setMyCompanyName] = useState("");

  useEffect(() => {
    const load = () => {
      try {
        const s = localStorage.getItem(SESSION_KEY);
        if (s) {
          const sess = JSON.parse(s);
          setSession(sess);
          if (!sess.isSuperAdmin && sess.companyId) {
            const companies = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
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
  const perms: string[] | null = isSuperAdmin ? null : (session?.permissions ?? []);

  const navigation = ALL_NAV.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.href === "/admin") return isSuperAdmin;
      return canAccess(item.href, session ? perms : []);
    }),
  })).filter(group => group.items.length > 0);

  const [expandedGroups, setExpandedGroups] = useState<string[]>(ALL_NAV.map(n => n.title));
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
        "flex flex-col h-full bg-gray-900 text-gray-100 transition-all duration-300",
        collapsed && !mobile ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-800 shrink-0">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">PHIDTECH MS</p>
              <p className="text-[10px] text-gray-400">Phid Technologies</p>
            </div>
          </div>
        )}
        {collapsed && !mobile && (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mx-auto">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
        {mobile ? (
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-800 rounded-lg ml-auto"
          >
            <Menu className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {navigation.map((group) => (
          <div key={group.title} className="mb-1">
            {(!collapsed || mobile) && (
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between w-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
              >
                {group.title}
                {expandedGroups.includes(group.title) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
            {(expandedGroups.includes(group.title) || collapsed) && (
              <div className="mt-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const parentActive = isParentActive(item.href);
                  const hasChildren = !!(item.children && item.children.length > 0);
                  const itemExpanded = expandedItems.includes(item.href) || (hasChildren && parentActive);

                  if (hasChildren && (!collapsed || mobile)) {
                    return (
                      <div key={item.href}>
                        {/* Parent item with submenu toggle */}
                        <button
                          onClick={() => toggleItem(item.href)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors rounded-lg mx-2 mb-0.5",
                            parentActive
                              ? "text-blue-400 bg-gray-800"
                              : "text-gray-400 hover:bg-gray-800 hover:text-white"
                          )}
                          style={{ width: "calc(100% - 1rem)" }}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {itemExpanded
                            ? <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
                            : <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                          }
                        </button>
                        {/* Sub-items */}
                        {itemExpanded && (
                          <div className="ml-3 border-l border-gray-700 pl-2 mb-1">
                            {item.children!.map(child => {
                              const CIcon = child.icon;
                              const cActive = isActive(child.href);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={mobile ? onClose : undefined}
                                  className={cn(
                                    "flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors rounded-lg mx-1 mb-0.5",
                                    cActive
                                      ? "bg-blue-600 text-white"
                                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
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
                        "flex items-center gap-3 px-4 py-2 text-sm transition-colors rounded-lg mx-2 mb-0.5",
                        active
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white",
                        collapsed && !mobile && "justify-center px-2"
                      )}
                      title={collapsed && !mobile ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
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
        <div className="border-t border-gray-800 p-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {getInitials(session?.name ?? "SA")}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{session?.name ?? "System Administrator"}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{session?.position ?? session?.role ?? "Admin"}</p>
              {!session?.isSuperAdmin && myCompanyName && (
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{myCompanyName}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
