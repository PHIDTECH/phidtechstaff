"use client";
export const dynamic = "force-dynamic";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Download, TrendingUp, DollarSign, Users, Target, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

const ACTIVE_KEY = "phidtech_active_company";
const USERS_KEY = "phidtech_users";

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function lsStr(key: string, fallback = ""): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

export default function ReportsPage() {
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [staffUsers, setStaffUsers] = useState<{id:string;companyId:string;status:string;department?:string;role?:string;salary?:number}[]>([]);

  useEffect(() => {
    const load = () => {
      setActiveCompanyId(lsStr(ACTIVE_KEY));
      setStaffUsers(lsGet(USERS_KEY, []));
    };
    load();
    window.addEventListener("phidtech_companies_updated", load);
    return () => window.removeEventListener("phidtech_companies_updated", load);
  }, []);

  const companyStaff = staffUsers.filter(u => u.companyId === activeCompanyId);
  const activeStaff = companyStaff.filter(u => u.status === "active").length;
  const totalStaff = companyStaff.length;

  const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <BarChart3 className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500">No {label} data yet</p>
      <p className="text-xs text-gray-400 mt-1">Data will appear here once you start adding records</p>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive business performance reports and insights"
        icon={BarChart3}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export Excel
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Monthly Revenue" value="TSh 0" icon={DollarSign} iconBg="bg-green-50" iconColor="text-green-600" subtitle="No data yet" />
        <StatCard title="Net Profit" value="TSh 0" icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" subtitle="No data yet" />
        <StatCard title="Active Staff" value={activeStaff} icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600" subtitle={`${totalStaff} total`} />
        <StatCard title="KPIs On-Track" value="0/0" icon={Target} iconBg="bg-orange-50" iconColor="text-orange-600" subtitle="No KPIs added" />
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">Reports will populate automatically as you add financial, sales, HR and task data to the system.</p>
      </div>

      <Tabs defaultValue="financial">
        <TabsList className="mb-6">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="hr">HR & Attendance</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <EmptyState label="financial" />
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <EmptyState label="sales" />
          </div>
        </TabsContent>

        <TabsContent value="hr">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Staff Overview</h3>
            {companyStaff.length === 0 ? (
              <EmptyState label="HR" />
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Total Staff", value: totalStaff },
                  { label: "Active", value: activeStaff },
                  { label: "Inactive", value: companyStaff.filter(u => u.status !== "active").length },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="productivity">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <EmptyState label="productivity" />
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
