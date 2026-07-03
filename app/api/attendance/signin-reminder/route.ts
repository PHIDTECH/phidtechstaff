/**
 * POST /api/attendance/signin-reminder
 *
 * TWO reminders per staff per day (Mon-Fri, EAT):
 *   1. ADVANCE  — at 07:40-07:59 EAT: "Sign in starts in ~10 minutes"
 *   2. OVERDUE  — at 08:00+ EAT:      "You have not signed in" (max 2 per day: once at 08:xx, once at 10:xx)
 *
 * Deduplicates per (userId + date + slot) so safe to call on every page load.
 * Slots: "advance" | "late1" (08:00-09:59) | "late2" (10:00+)
 */

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";
import type { AppNotification } from "@/app/api/notifications/route";

interface User {
  id: string; name: string; phone?: string; companyId: string;
  status?: string; role?: string;
  [key: string]: unknown;
}
interface AttendanceRecord {
  id: string; userId: string; date: string; clockIn?: string;
  [key: string]: unknown;
}
interface SigninReminderLog {
  userId: string; date: string; slot: "advance" | "late1" | "late2";
}

const INACTIVE_STATUSES = new Set(["terminated","resigned","suspended","inactive","dismissed"]);
const SIGN_IN_HOUR   = 8;  // 08:00 EAT
const SIGN_IN_MINUTE = 0;
const ADVANCE_WINDOW_START = 40; // 07:40 EAT — start sending advance reminder
const ADVANCE_WINDOW_END   = 59; // 07:59 EAT — stop advance reminder

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

    // Determine which slot we're in
    const isAdvanceWindow = hourEAT === (SIGN_IN_HOUR - 1) &&
                            minuteEAT >= ADVANCE_WINDOW_START &&
                            minuteEAT <= ADVANCE_WINDOW_END;
    const isLate1 = hourEAT === SIGN_IN_HOUR; // 08:xx
    const isLate2 = hourEAT >= 10 && hourEAT < 12; // 10:xx–11:xx (second late reminder)

    if (!isAdvanceWindow && !isLate1 && !isLate2) {
      return NextResponse.json({ skipped: true, reason: `No active reminder window at ${timeStr} EAT` });
    }

    const slot: "advance" | "late1" | "late2" = isAdvanceWindow ? "advance" : isLate1 ? "late1" : "late2";

    const users      = readDb<User[]>("users", []);
    const attendance = readDb<AttendanceRecord[]>("attendance", []);
    const logs       = readDb<SigninReminderLog[]>("signin_reminder_log", []);

    // Already sent this slot today for each user
    const alreadySent = new Set(
      logs
        .filter(l => l.date === todayStr && l.slot === slot)
        .map(l => l.userId)
    );

    // Staff who clocked in today
    const clockedInToday = new Set(
      attendance
        .filter(a => a.date === todayStr && a.clockIn)
        .map(a => a.userId)
    );

    // Active staff only
    const activeStaff = users.filter(u => {
      if (!u.id) return false;
      if (INACTIVE_STATUSES.has((u.status ?? "").toLowerCase())) return false;
      return true;
    });

    const newLogs: SigninReminderLog[] = [];
    const newNotifs: AppNotification[] = [];
    let smsSentCount = 0;

    for (const user of activeStaff) {
      if (alreadySent.has(user.id)) continue;

      // For late slots — only remind those who haven't clocked in yet
      if (slot !== "advance" && clockedInToday.has(user.id)) continue;

      let msg: string;
      let title: string;
      let urgency: string;

      if (slot === "advance") {
        msg     = `Dear ${user.name}, your sign-in time starts at 08:00 AM in about 10 minutes. Please be ready. - PHIDTECH`;
        title   = `Sign-in in 10 minutes - ${user.name}`;
        urgency = "reminder";
      } else if (slot === "late1") {
        msg     = `Dear ${user.name}, it is now ${timeStr} EAT and you have not signed in today. Please clock in immediately. - PHIDTECH`;
        title   = `Sign-in Reminder (08:xx) - ${user.name}`;
        urgency = "warning";
      } else {
        msg     = `Dear ${user.name}, it is now ${timeStr} EAT. You are late - you still have not signed in today. Please clock in now or inform your supervisor. - PHIDTECH`;
        title   = `Sign-in Reminder (Late) - ${user.name}`;
        urgency = "overdue";
      }

      // In-app notification
      newNotifs.push({
        id: `notif-signin-${user.id}-${todayStr}-${slot}`,
        type: "late_checkin",
        title,
        message: msg,
        userId: user.id,
        companyId: user.companyId,
        urgency,
        smsSent: false,
        read: false,
        createdAt: new Date().toISOString(),
      } as AppNotification);

      // SMS
      let smsSent = false;
      if (user.phone) {
        const result = await sendSms(user.phone, user.name, msg, `signin_reminder_${slot}`);
        smsSent = result.ok;
        if (smsSent) {
          smsSentCount++;
          newNotifs[newNotifs.length - 1].smsSent = true;
        }
      }

      newLogs.push({ userId: user.id, date: todayStr, slot });
      void smsSent;
    }

    // Persist logs and notifications
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
      ran: todayStr, slot, time: timeStr,
      reminded: newNotifs.length, smsSent: smsSentCount,
      staff: newNotifs.map(n => ({ name: n.title, slot, smsSent: n.smsSent })),
    });
  } catch (e) {
    console.error("[signin-reminder]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const logs = readDb<SigninReminderLog[]>("signin_reminder_log", []);
  const today = logs.filter(l => l.date === todayStr);
  return NextResponse.json({
    today: todayStr,
    advance: today.filter(l => l.slot === "advance").length,
    late1:   today.filter(l => l.slot === "late1").length,
    late2:   today.filter(l => l.slot === "late2").length,
    total:   today.length,
  });
}
