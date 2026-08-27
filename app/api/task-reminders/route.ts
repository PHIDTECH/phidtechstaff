/**
 * POST /api/task-reminders
 * Scans tasks and sends ONE reminder per task per day:
 *   • 1 day BEFORE due date  — advance warning
 *   • ON due date            — due today
 *   • EVERY day AFTER due date until completed/done/cancelled
 * Safe to call on every page load — deduplicates per (taskId + date).
 */

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";
import type { AppNotification } from "@/app/api/notifications/route";

interface Task {
  id: string; companyId: string; title: string; description?: string;
  assignedTo: string; assignedBy?: string; department?: string;
  priority?: string; status: string; dueDate: string; createdAt: string;
  [key: string]: unknown;
}

interface User { id: string; name: string; phone?: string; companyId?: string; }

interface ReminderLog { taskId: string; date: string; smsSent: boolean; }

export async function POST() {
  try {
    const today    = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().slice(0,10);

    const tasks = readDb<Task[]>("tasks", []);
    const users = readDb<User[]>("users", []);
    const logs  = readDb<ReminderLog[]>("task_reminder_log", []);

    // Set of "taskId|date" already sent today
    const sentToday = new Set(logs.filter(l => l.date === todayStr).map(l => `${l.taskId}|${todayStr}`));

    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0,10);

    const dueTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      if (["completed", "done", "cancelled"].includes((t.status ?? "").toLowerCase())) return false;
      const due = new Date(t.dueDate); due.setHours(0,0,0,0);
      return due <= tomorrow; // 1 day before, on due date, or overdue
    });

    const newLogs: ReminderLog[] = [];
    const newNotifs: AppNotification[] = [];
    let sent = 0;

    for (const task of dueTasks) {
      const key = `${task.id}|${todayStr}`;
      if (sentToday.has(key)) continue;

      const staff = users.find(u => u.id === task.assignedTo);
      const due    = new Date(task.dueDate); due.setHours(0,0,0,0);
      const overdue = Math.floor((today.getTime() - due.getTime()) / 86400000);

      const due2 = new Date(task.dueDate); due2.setHours(0,0,0,0);
      const overdueDays = Math.floor((today.getTime() - due2.getTime()) / 86400000);
      const isTomorrow  = task.dueDate === tomorrowStr;

      const msg = overdueDays > 0
        ? `Dear ${staff?.name ?? "Staff"}, task "${task.title}" is overdue by ${overdueDays} day${overdueDays===1?"":"s"}. Please complete it immediately. - PHIDTECH`
        : isTomorrow
          ? `Dear ${staff?.name ?? "Staff"}, task "${task.title}" is due TOMORROW (${task.dueDate}). Please prepare to complete it. - PHIDTECH`
          : `Dear ${staff?.name ?? "Staff"}, task "${task.title}" is due TODAY. Please complete it. - PHIDTECH`;

      const urgency = overdueDays > 0 ? "overdue" : isTomorrow ? "warning" : "due_today";
      const title   = overdueDays > 0 ? `Task Overdue (${overdueDays}d) — ${task.title}` : isTomorrow ? `Task Due Tomorrow — ${task.title}` : `Task Due Today — ${task.title}`;

      // In-app notification
      newNotifs.push({
        id: `notif-task-${task.id}-${todayStr}`,
        type: "warning",
        title,
        message: msg,
        userId: task.assignedTo,
        companyId: task.companyId,
        urgency,
        smsSent: false,
        read: false,
        createdAt: new Date().toISOString(),
      } as AppNotification);

      // SMS if phone available
      let smsSent = false;
      if (staff?.phone) {
        const result = await sendSms(staff.phone, staff.name, msg, "task_due_reminder");
        smsSent = result.ok;
        if (smsSent) { sent++; newNotifs[newNotifs.length-1].smsSent = true; }
      }
      newLogs.push({ taskId: task.id, date: todayStr, smsSent });
    }

    // Save logs (keep last 2000) and notifications
    if (newLogs.length > 0) {
      writeDb("task_reminder_log", [...logs, ...newLogs].slice(-2000));
    }
    if (newNotifs.length > 0) {
      const existing = readDb<AppNotification[]>("notifications", []);
      // Deduplicate in-app: don't double-write same task today
      const existingIds = new Set(existing.map(n => n.id));
      const fresh = newNotifs.filter(n => !existingIds.has(n.id));
      if (fresh.length > 0) writeDb("notifications", [...existing, ...fresh]);
    }

    return NextResponse.json({ ran: todayStr, dueTasks: dueTasks.length, smsSent: sent, notified: newNotifs.length });
  } catch (e) {
    console.error("[task-reminders]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const todayStr = new Date().toISOString().slice(0,10);
  const logs = readDb<ReminderLog[]>("task_reminder_log", []);
  const today = logs.filter(l => l.date === todayStr);
  return NextResponse.json({ today: todayStr, count: today.length, sent: today.filter(l => l.smsSent).length });
}
