/**
 * POST /api/attendance/late-reminder
 * Runs automatically on Mon–Fri. If it is after 08:00 EAT (UTC+3) and a staff
 * member is active (not terminated/resigned/suspended) and has not yet clocked in
 * today, they receive:
 *   • an in-app notification
 *   • an SMS (if phone is configured and Beem is set up)
 *
 * Safe to call on every attendance page load — deduplicates per (userId + date).
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

const INACTIVE_STATUSES = new Set(["terminated","resigned","suspended","inactive","on_leave","dismissed"]);

export async function POST() {
  try {
    // Work in EAT (UTC+3)
    const now = new Date();
    const eatOffset = 3 * 60; // minutes
    const eatMs = now.getTime() + (now.getTimezoneOffset() + eatOffset) * 60_000;
    const eatNow = new Date(eatMs);

    const dayOfWeek = eatNow.getDay(); // 0=Sun … 6=Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (!isWeekday) {
      return NextResponse.json({ skipped: true, reason: "Weekend" });
    }

    const hourEAT = eatNow.getHours();
    if (hourEAT < 8) {
      return NextResponse.json({ skipped: true, reason: "Before 08:00 EAT" });
    }

    const todayStr = eatNow.toISOString().slice(0, 10);

    const users       = readDb<User[]>("users", []);
    const attendance  = readDb<AttendanceRecord[]>("attendance", []);
    const notifications = readDb<AppNotification[]>("notifications", []);

    // Deduplicate: staff already notified today
    const alreadyNotified = new Set(
      notifications
        .filter(n => n.type === "late_checkin" && n.createdAt.startsWith(todayStr))
        .map(n => n.userId as string)
    );

    // Staff who clocked in today
    const clockedInToday = new Set(
      attendance
        .filter(a => a.date === todayStr && a.clockIn)
        .map(a => a.userId)
    );

    // Find active staff who haven't checked in
    const lateStaff = users.filter(u => {
      if (!u.id) return false;
      if (INACTIVE_STATUSES.has((u.status ?? "").toLowerCase())) return false;
      if (clockedInToday.has(u.id)) return false;
      if (alreadyNotified.has(u.id)) return false;
      return true;
    });

    if (lateStaff.length === 0) {
      return NextResponse.json({ ran: todayStr, reminded: 0, reason: "All checked in or already notified" });
    }

    const newNotifs: AppNotification[] = [];
    const timeStr = `${String(eatNow.getHours()).padStart(2,"0")}:${String(eatNow.getMinutes()).padStart(2,"0")}`;

    for (const user of lateStaff) {
      const msg = `Dear ${user.name}, you have not checked in today (${todayStr}) by 08:00 AM. Please clock in immediately or contact your supervisor. - PHIDTECH`;

      // Send SMS
      let smsSent = false;
      if (user.phone) {
        const result = await sendSms(user.phone, user.name, msg, "late_checkin");
        smsSent = result.ok;
      }

      // In-app notification
      newNotifs.push({
        id: `notif-late-${user.id}-${todayStr}`,
        type: "late_checkin",
        title: `Late Check-in — ${user.name}`,
        message: `${user.name} has not checked in by 08:00 AM on ${todayStr} (checked at ${timeStr} EAT).`,
        userId: user.id,
        companyId: user.companyId,
        smsSent,
        read: false,
        createdAt: new Date().toISOString(),
      } as AppNotification);
    }

    if (newNotifs.length > 0) {
      const existing = readDb<AppNotification[]>("notifications", []);
      writeDb("notifications", [...existing, ...newNotifs]);
    }

    return NextResponse.json({
      ran: todayStr,
      time: timeStr,
      reminded: newNotifs.length,
      staff: newNotifs.map(n => ({ name: n.title, smsSent: n.smsSent })),
    });
  } catch (e) {
    console.error("[late-reminder]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const notifications = readDb<AppNotification[]>("notifications", []);
  const todayLate = notifications.filter(
    n => n.type === "late_checkin" && n.createdAt.startsWith(todayStr)
  );
  return NextResponse.json({ today: todayStr, count: todayLate.length, reminders: todayLate });
}
