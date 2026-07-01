/**
 * POST /api/task-reminders
 * Scans all tasks that are due today or overdue and not completed.
 * Sends a daily SMS to assigned staff until task is marked complete.
 * Safe to call on every page load — deduplicates per task per day.
 */

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";

interface Task {
  id: string; companyId: string; title: string; description?: string;
  assignedTo: string; assignedBy?: string; department?: string;
  priority?: string; status: string; dueDate: string; createdAt: string;
  [key: string]: unknown;
}

interface User { id: string; name: string; phone?: string; }

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

    const dueTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      if (["completed", "done", "cancelled"].includes((t.status ?? "").toLowerCase())) return false;
      const due = new Date(t.dueDate); due.setHours(0,0,0,0);
      return due <= today; // due today or overdue
    });

    const newLogs: ReminderLog[] = [];
    let sent = 0;

    for (const task of dueTasks) {
      const key = `${task.id}|${todayStr}`;
      if (sentToday.has(key)) continue;

      const staff = users.find(u => u.id === task.assignedTo);
      if (!staff?.phone) { newLogs.push({ taskId: task.id, date: todayStr, smsSent: false }); continue; }

      const due      = new Date(task.dueDate); due.setHours(0,0,0,0);
      const overdue  = Math.floor((today.getTime() - due.getTime()) / 86400000);
      const msg = overdue > 0
        ? `Habari ${staff.name}, kazi "${task.title}" imechelewa kwa siku ${overdue}. Tafadhali ikamilishe haraka. - PHIDTECH`
        : `Habari ${staff.name}, kazi "${task.title}" inahitaji kukamilishwa LEO. - PHIDTECH`;

      const result = await sendSms(staff.phone, staff.name, msg, "task_due_reminder");
      newLogs.push({ taskId: task.id, date: todayStr, smsSent: result.ok });
      if (result.ok) sent++;
    }

    // Save logs (keep last 2000)
    if (newLogs.length > 0) {
      writeDb("task_reminder_log", [...logs, ...newLogs].slice(-2000));
    }

    return NextResponse.json({ ran: todayStr, dueTasks: dueTasks.length, smsSent: sent });
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
