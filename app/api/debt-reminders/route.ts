/**
 * POST /api/debt-reminders
 * Scans all sales with outstanding balance and:
 *   - Monthly plan: sends reminder on day 25, 27, 30 of current month
 *   - 3months/6months/yearly plan: sends reminder 3 days before and on due date
 *   - Once plan: sends reminder every 3 days after due date until paid
 * Creates in-app notifications and attempts SMS via Africa's Talking.
 * Safe to call on every page load — deduplicates by (saleId + todayDate).
 */

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/smsService";
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

function formatCurr(n: number) {
  return `TZS ${Math.round(n).toLocaleString()}`;
}

function nextDueDate(firstDue: string, plan: string): string | null {
  const months = PLAN_MONTHS[plan];
  if (!months) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const base  = new Date(firstDue);
  while (base <= today) {
    base.setMonth(base.getMonth() + months);
  }
  return base.toISOString().slice(0,10);
}

export async function POST() {
  try {
    const today   = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().slice(0,10);
    const dom      = today.getDate(); // day of month

    const sales         = readDb<Sale[]>("accounting_sales", []);
    const notifications = readDb<AppNotification[]>("notifications", []);
    const created: AppNotification[] = [];

    // Build set of already-sent reminders today: "saleId|todayStr"
    const sentToday = new Set(
      notifications
        .filter(n => n.type === "debt_reminder" && n.createdAt.startsWith(todayStr))
        .map(n => `${n.saleId}|${todayStr}`)
    );

    for (const sale of sales) {
      if (Number(sale.balance ?? 0) <= 0 || sale.status === "paid") continue;
      const plan  = sale.paymentPlan ?? "once";
      const phone = sale.customerPhone ?? "";
      const balance = Number(sale.balance);
      const key = `${sale.id}|${todayStr}`;
      if (sentToday.has(key)) continue;

      let shouldNotify = false;
      let message = "";

      if (plan === "monthly") {
        // Notify on day 25, 27, 30
        if ([25, 27, 28, 29, 30, 31].includes(dom)) {
          shouldNotify = true;
          message = `Dear ${sale.customerName}, your monthly payment of ${formatCurr(balance)} is due. Please settle by end of month. — PHIDTECH`;
        }
      } else if (plan === "once") {
        if (!sale.dueDate) continue;
        const due = new Date(sale.dueDate); due.setHours(0,0,0,0);
        const daysPast = Math.floor((today.getTime() - due.getTime()) / 86400000);
        if (daysPast >= 0 && daysPast % 3 === 0) {
          shouldNotify = true;
          message = `Dear ${sale.customerName}, your payment of ${formatCurr(balance)} was due on ${sale.dueDate}. Please settle immediately. — PHIDTECH`;
        }
      } else {
        // 3months / 6months / yearly
        const upcomingDue = nextDueDate(sale.dueDate ?? sale.date, plan);
        if (!upcomingDue) continue;
        const due = new Date(upcomingDue); due.setHours(0,0,0,0);
        const daysUntil = Math.floor((due.getTime() - today.getTime()) / 86400000);
        if (daysUntil <= 3) {
          shouldNotify = true;
          message = `Dear ${sale.customerName}, your ${plan} payment of ${formatCurr(balance)} is due on ${upcomingDue}. — PHIDTECH`;
        }
      }

      if (!shouldNotify) continue;

      // Attempt SMS
      let smsSent = false;
      if (phone) {
        const result = await sendSms(phone, message);
        smsSent = result.success;
      }

      // Create in-app notification
      const notif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        type: "debt_reminder",
        title: `Payment Reminder — ${sale.customerName}`,
        message,
        saleId: sale.id,
        customerName: sale.customerName,
        customerPhone: phone,
        companyId: sale.companyId,
        amount: balance,
        smsSent,
        read: false,
        createdAt: new Date().toISOString(),
      };

      created.push(notif);
      sentToday.add(key);
    }

    if (created.length > 0) {
      const existing = readDb<AppNotification[]>("notifications", []);
      writeDb("notifications", [...existing, ...created]);
    }

    return NextResponse.json({
      ran: todayStr,
      reminders: created.length,
      details: created.map(n => ({ customer: n.customerName, smsSent: n.smsSent, amount: n.amount })),
    });
  } catch (e) {
    console.error("[debt-reminders]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Also allow GET (just returns today's reminders count without creating new ones)
export async function GET() {
  const todayStr = new Date().toISOString().slice(0,10);
  const notifications = readDb<AppNotification[]>("notifications", []);
  const todayReminders = notifications.filter(
    n => n.type === "debt_reminder" && n.createdAt.startsWith(todayStr)
  );
  return NextResponse.json({ today: todayStr, count: todayReminders.length, reminders: todayReminders });
}
