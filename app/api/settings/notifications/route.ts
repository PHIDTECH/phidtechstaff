import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  leaveRequestAlerts: boolean;
  payrollReminders: boolean;
  invoiceDueAlerts: boolean;
  lowStockAlerts: boolean;
  taskDeadlineReminders: boolean;
  kpiPerformanceAlerts: boolean;
  otpAttendance: boolean;
  otpPaymentReminder: boolean;
  otpTaskReminder: boolean;
  otpLeaveApproval: boolean;
  otpExpenseApproval: boolean;
  otpInvoiceDue: boolean;
  otpLoginTwoFactor: boolean;
  otpPayrollPaid: boolean;
}

const defaults: NotificationSettings = {
  emailNotifications: true,
  smsNotifications: false,
  inAppNotifications: true,
  leaveRequestAlerts: true,
  payrollReminders: true,
  invoiceDueAlerts: true,
  lowStockAlerts: true,
  taskDeadlineReminders: false,
  kpiPerformanceAlerts: true,
  otpAttendance: true,
  otpPaymentReminder: true,
  otpTaskReminder: false,
  otpLeaveApproval: true,
  otpExpenseApproval: true,
  otpInvoiceDue: true,
  otpLoginTwoFactor: true,
  otpPayrollPaid: true,
};

export async function GET() {
  const settings = readDb<NotificationSettings>("notification_settings", defaults);
  return NextResponse.json({ ...defaults, ...settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = readDb<NotificationSettings>("notification_settings", defaults);
    const updated: NotificationSettings = { ...current };
    for (const key of Object.keys(defaults) as (keyof NotificationSettings)[]) {
      if (key in body) updated[key] = Boolean(body[key]);
    }
    writeDb("notification_settings", updated);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/settings/notifications:", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
