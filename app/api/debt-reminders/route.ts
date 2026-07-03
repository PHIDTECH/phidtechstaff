/**
 * POST /api/debt-reminders
 *
 * UNIFIED REMINDER RULES (all payment plans):
 *   • 1 day BEFORE due date   → advance warning
 *   • ON due date (day 0)      → due today
 *   • EVERY day AFTER due date → overdue, until marked paid
 *
 * Plan-specific due date logic:
 *   • once      — uses sale.dueDate directly
 *   • monthly   — due date = last day of current month
 *   • 3months / 6months / yearly — recurring; checks both the next upcoming due
 *                 AND any overdue cycle where balance is still outstanding
 *
 * Safe to call on every page load — deduplicates by (saleId + todayDate).
 */

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";
import type { AppNotification } from "@/app/api/notifications/route";

interface Sale {
  id: string; companyId: string; date: string;
  customerName: string; customerPhone?: string;
  amount: number; paid: number; balance: number;
  status: string;
  paymentPlan?: "once" | "monthly" | "3months" | "6months" | "yearly";
  dueDate?: string;
  [key: string]: unknown;
}

const PLAN_MONTHS: Record<string, number> = { "3months": 3, "6months": 6, "yearly": 12 };

function fmt(n: number) { return `TZS ${Math.round(n).toLocaleString()}`; }

/** Days difference: positive = today is past dueStr, negative = today is before dueStr */
function daysDiff(dueStr: string, today: Date): number {
  const due = new Date(dueStr); due.setHours(0,0,0,0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
}

/** Last day of the current month as YYYY-MM-DD */
function endOfMonth(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return d.toISOString().slice(0,10);
}

/**
 * Returns all due dates that are relevant for "overdue + upcoming" checking.
 * For recurring plans, we return the last PAST due date (overdue cycle check)
 * AND the next FUTURE due date (advance warning).
 */
function getRelevantDueDates(sale: Sale, today: Date): string[] {
  const plan = sale.paymentPlan ?? "once";

  if (plan === "once") {
    return sale.dueDate ? [sale.dueDate] : [];
  }

  if (plan === "monthly") {
    // Monthly: due = last day of current month
    return [endOfMonth(today)];
  }

  // 3months / 6months / yearly — recurring
  const months = PLAN_MONTHS[plan];
  if (!months || !sale.dueDate) return [];

  const base = new Date(sale.dueDate); base.setHours(0,0,0,0);
  const dates: string[] = [];

  // Walk forward until we pass today
  const cur = new Date(base);
  while (cur <= today) {
    dates.push(cur.toISOString().slice(0,10));
    cur.setMonth(cur.getMonth() + months);
  }
  // Also include the next upcoming date (for advance warning)
  dates.push(cur.toISOString().slice(0,10));

  // Return last past date (overdue) + next future date (warning)
  const past   = dates.filter(d => d <= today.toISOString().slice(0,10));
  const future = dates.filter(d => d >  today.toISOString().slice(0,10));
  return [
    ...(past.length   ? [past[past.length - 1]]   : []),
    ...(future.length ? [future[0]]                : []),
  ];
}

/** Checks whether today falls on a reminder day relative to dueStr */
function getReminderInfo(dueStr: string, today: Date, customerName: string, balance: number, plan: string):
  { shouldNotify: boolean; message: string; urgency: string } {

  const diff = daysDiff(dueStr, today); // positive = overdue

  if (diff === -1) {
    return {
      shouldNotify: true,
      urgency: "warning",
      message: `Dear ${customerName}, your payment of ${fmt(balance)} is due TOMORROW (${dueStr}). Please prepare to settle. - PHIDTECH`,
    };
  }
  if (diff === 0) {
    return {
      shouldNotify: true,
      urgency: "due_today",
      message: `Dear ${customerName}, your payment of ${fmt(balance)} is DUE TODAY (${dueStr}). Please settle now. - PHIDTECH`,
    };
  }
  if (diff > 0) {
    return {
      shouldNotify: true,
      urgency: "overdue",
      message: `Dear ${customerName}, your payment of ${fmt(balance)} was due on ${dueStr} (${diff} day${diff===1?"":"s"} overdue). Please settle immediately. - PHIDTECH`,
    };
  }
  return { shouldNotify: false, message: "", urgency: "" };
}

export async function POST() {
  try {
    const today    = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().slice(0,10);

    const sales         = readDb<Sale[]>("accounting_sales", []);
    const notifications = readDb<AppNotification[]>("notifications", []);
    const created: AppNotification[] = [];

    // Deduplicate: skip sales already reminded today
    const sentToday = new Set(
      notifications
        .filter(n => n.type === "debt_reminder" && n.createdAt.startsWith(todayStr))
        .map(n => String(n.saleId))
    );

    for (const sale of sales) {
      // Skip fully paid or zero-balance
      if (Number(sale.balance ?? 0) <= 0 || sale.status === "paid") continue;
      // Already reminded today
      if (sentToday.has(sale.id)) continue;

      const balance = Number(sale.balance);
      const phone   = sale.customerPhone ?? "";

      const dueDates = getRelevantDueDates(sale, today);
      if (dueDates.length === 0) continue;

      // Find the most urgent reminder across all applicable due dates
      let bestInfo: ReturnType<typeof getReminderInfo> | null = null;
      for (const dueStr of dueDates) {
        const info = getReminderInfo(dueStr, today, sale.customerName, balance, sale.paymentPlan ?? "once");
        if (!info.shouldNotify) continue;
        // Prefer overdue > due_today > warning
        if (!bestInfo ||
          (info.urgency === "overdue"   && bestInfo.urgency !== "overdue") ||
          (info.urgency === "due_today" && bestInfo.urgency === "warning")) {
          bestInfo = info;
        }
      }
      if (!bestInfo?.shouldNotify) continue;

      // Send SMS
      let smsSent = false;
      if (phone) {
        const result = await sendSms(phone, sale.customerName, bestInfo.message, "debt_reminder");
        smsSent = result.ok;
      }

      const notif: AppNotification = {
        id: `notif-dr-${sale.id}-${todayStr}`,
        type: "debt_reminder",
        title: `Payment Reminder — ${sale.customerName}`,
        message: bestInfo.message,
        saleId: sale.id,
        customerName: sale.customerName,
        customerPhone: phone,
        companyId: sale.companyId,
        amount: balance,
        urgency: bestInfo.urgency,
        smsSent,
        read: false,
        createdAt: new Date().toISOString(),
      };

      created.push(notif);
      sentToday.add(sale.id);
    }

    if (created.length > 0) {
      const existing = readDb<AppNotification[]>("notifications", []);
      writeDb("notifications", [...existing, ...created]);
    }

    return NextResponse.json({
      ran: todayStr,
      reminders: created.length,
      details: created.map(n => ({
        customer: n.customerName,
        urgency: n.urgency,
        smsSent: n.smsSent,
        amount: n.amount,
      })),
    });
  } catch (e) {
    console.error("[debt-reminders]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const todayStr = new Date().toISOString().slice(0,10);
  const notifications = readDb<AppNotification[]>("notifications", []);
  const todayReminders = notifications.filter(
    n => n.type === "debt_reminder" && n.createdAt.startsWith(todayStr)
  );
  return NextResponse.json({ today: todayStr, count: todayReminders.length, reminders: todayReminders });
}
