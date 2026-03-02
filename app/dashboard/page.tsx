"use client";
export const dynamic = "force-dynamic";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/shared/StatCard";
import {
  Users, DollarSign, CheckSquare, AlertCircle,
  Calendar, ArrowRight, Building2
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

const SESSION_KEY = "phidtech_session";
const COMPANIES_KEY = "phidtech_companies";
const ACTIVE_KEY = "phidtech_active_company";
const USERS_KEY = "phidtech_users";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = ""): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [session, setSession] = useState<{name:string;isSuperAdmin:boolean;companyId:string|null} | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [activeCompanyName, setActiveCompanyName] = useState("");
  const [staffUsers, setStaffUsers] = useState<{id:string;companyId:string;status:string}[]>([]);

  const reload = () => {
    const sess = lsGet<{name:string;isSuperAdmin:boolean;companyId:string|null}>(SESSION_KEY, null as never);
    setSession(sess);
    const cid = lsStr(ACTIVE_KEY);
    setActiveCompanyId(cid);
    const companies = lsGet<{id:string;name:string}[]>(COMPANIES_KEY, []);
    const co = companies.find(c => c.id === cid);
    setActiveCompanyName(co?.name ?? "");
    setStaffUsers(lsGet(USERS_KEY, []));
  };

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener("phidtech_companies_updated", onUpdate);
    window.addEventListener("phidtech_session_updated", onUpdate);
    return () => {
      window.removeEventListener("phidtech_companies_updated", onUpdate);
      window.removeEventListener("phidtech_session_updated", onUpdate);
    };
  }, []);

  const firstName = session?.name?.split(" ")[0] ?? "";
  const activeUsers = staffUsers.filter(u => u.companyId === activeCompanyId && u.status === "active").length;
  const totalStaff = staffUsers.filter(u => u.companyId === activeCompanyId).length;

  return (
    <MainLayout>
      {/* Welcome Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {getGreeting()}{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-sm text-gray-500">{activeCompanyName || "No company selected"} · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Staff"
          value={totalStaff}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="Registered employees"
        />
        <StatCard
          title="Active Staff"
          value={activeUsers}
          icon={Users}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          subtitle="Currently active"
        />
        <StatCard
          title="Tasks"
          value={0}
          icon={CheckSquare}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          subtitle="Pending & In-progress"
        />
        <StatCard
          title="Leave Requests"
          value={0}
          icon={Calendar}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          subtitle="Pending approval"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Users & Roles", href: "/users", icon: Users, color: "blue" },
          { label: "Attendance", href: "/attendance", icon: CheckSquare, color: "green" },
          { label: "Leave Management", href: "/leave", icon: Calendar, color: "yellow" },
          { label: "Payroll & Salary", href: "/payroll", icon: DollarSign, color: "purple" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${item.color}-50`}>
                  <Icon className={`w-5 h-5 text-${item.color}-600`} />
                </div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Getting Started</p>
          <p className="text-sm text-blue-700 mt-0.5">Go to <Link href="/admin" className="font-semibold underline">Admin Panel</Link> to add companies, then <Link href="/users" className="font-semibold underline">Users & Roles</Link> to add staff members.</p>
        </div>
      </div>
    </MainLayout>
  );
}
