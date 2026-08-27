/**
 * POST /api/attendance/signin-reminder
 *
 * ONE reminder per staff per day (Mon-Fri, EAT):
 *   - Fires at 08:10–08:59 EAT (10 minutes after sign-in time)
 *   - Only sent to staff who have NOT yet clocked in
 *   - Deduplicates per (userId + date) — max once per day regardless of page loads
 */

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";
import type { AppNotification } from "@/app/api/notifications/route";

interface User {
  id: string; name: string; phone?: string; companyId: string;
  status?: string; role?: string; exitDate?: string;
  [key: string]: unknown;
}
interface AttendanceRecord {
  id: string; userId: string; date: string; clockIn?: string;
  [key: string]: unknown;
}
interface SigninReminderLog {
  userId: string; date: string;
}

const INACTIVE_STATUSES = new Set(["terminated","resigned","suspended","inactive","dismissed","retired"]);

export async function POST() {
  try {
    // Work in EAT (UTC+3)
    const now = new Date();
    const eatOffset = 3 * 60;
    const eatMs  = now.getTime() + (now.getTimezoneOffset() + eatOffset) * 60_000;
    const eatNow = new Date(eatMs);

    const dayOfWeek = eatNow.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (!isWeekday) {
      return NextResponse.json({ skipped: true, reason: "Weekend" });
    }

    const hourEAT   = eatNow.getHours();
    const minuteEAT = eatNow.getMinutes();
    const todayStr  = eatNow.toISOString().slice(0, 10);
    const timeStr   = `${String(hourEAT).padStart(2,"0")}:${String(minuteEAT).padStart(2,"0")}`;

    // Only fire in the 08:10–08:59 window (10 min after sign-in time)
    const inWindow = hourEAT === 8 && minuteEAT >= 10;
    if (!inWindow) {
      return NextResponse.json({ skipped: true, reason: `Outside reminder window (need 08:10–08:59 EAT, now ${timeStr})` });
    }

    const users      = readDb<User[]>("users", []);
    const attendance = readDb<AttendanceRecord[]>("attendance", []);
    const logs       = readDb<SigninReminderLog[]>("signin_reminder_log", []);

    // Already reminded today (once per day per user, regardless of slot)
    const alreadySent = new Set(
      logs.filter(l => l.date === todayStr).map(l => l.userId)
    );

    // Staff who have clocked in today
    const clockedInToday = new Set(
      attendance.filter(a => a.date === todayStr && a.clockIn).map(a => a.userId)
    );

    // Active staff only
    const activeStaff = users.filter(u => {
      if (!u.id) return false;
      if (INACTIVE_STATUSES.has((u.status ?? "").toLowerCase())) return false;
      if (u.exitDate && todayStr >= u.exitDate) return false;
      return true;
    });

    const newLogs: SigninReminderLog[] = [];
    const newNotifs: AppNotification[] = [];
    let smsSentCount = 0;

    for (const user of activeStaff) {
      if (alreadySent.has(user.id)) continue;       // already reminded today
      if (clockedInToday.has(user.id)) continue;    // already signed in

      const msg   = `Dear ${user.name}, it is ${timeStr} EAT and you have not signed in today. Please clock in immediately. - PHIDTECH`;
      const title = `Sign-in Reminder — ${user.name}`;

      newNotifs.push({
        id: `notif-signin-${user.id}-${todayStr}`,
        type: "late_checkin",
        title,
        message: msg,
        userId: user.id,
        companyId: user.companyId,
        urgency: "warning",
        smsSent: false,
        read: false,
        createdAt: new Date().toISOString(),
      } as AppNotification);

      if (user.phone) {
        const result = await sendSms(user.phone, user.name, msg, "signin_reminder");
        if (result.ok) {
          smsSentCount++;
          newNotifs[newNotifs.length - 1].smsSent = true;
        }
      }

      newLogs.push({ userId: user.id, date: todayStr });
    }

    if (newLogs.length > 0) {
      writeDb("signin_reminder_log", [...logs, ...newLogs].slice(-5000));
    }
    if (newNotifs.length > 0) {
      const existing    = readDb<AppNotification[]>("notifications", []);
      const existingIds = new Set(existing.map(n => n.id));
      const fresh       = newNotifs.filter(n => !existingIds.has(n.id));
      if (fresh.length > 0) writeDb("notifications", [...existing, ...fresh]);
    }

    return NextResponse.json({
      ran: todayStr, time: timeStr,
      reminded: newNotifs.length, smsSent: smsSentCount,
    });
  } catch (e) {
    console.error("[signin-reminder]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const logs = readDb<SigninReminderLog[]>("signin_reminder_log", []);
  return NextResponse.json({
    today: todayStr,
    remindedToday: logs.filter(l => l.date === todayStr).length,
  });
}
