import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";
import { checkRateLimit, recordFailedAttempt, clearRateLimit, writeAuditLog, getClientIp } from "@/lib/authSecurity";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL    = "phidtechnology@gmail.com";
const ADMIN_PASSWORD = "Kaijage@@2023";

interface OtpRecord { phone: string; otp: string; expiresAt: number; userId: string; }
interface StaffUser {
  id: string; name: string; email: string; password: string;
  role: string; position: string; companyId: string; branchId?: string;
  permissions: string[]; status: string; phone?: string;
}

// POST ?action=request — verify credentials, send OTP to phone
// POST ?action=verify  — verify OTP, return session
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") ?? "request";
    const body = await req.json();

    if (action === "request") {
      const { email, password } = body;
      if (!email || !password)
        return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

      const emailLC = email.toLowerCase().trim();
      const rateKey = `email:${emailLC}`;

      // Check rate limit
      const rl = checkRateLimit(rateKey);
      if (rl.blocked) {
        writeAuditLog({ userId: "unknown", userName: emailLC, action: "LOGIN_BLOCKED", module: "Auth", details: `Account temporarily locked. Too many failed attempts.`, ipAddress: ip });
        return NextResponse.json({ error: `Too many failed attempts. Account locked for ${rl.minutesLeft} minute(s). Try again later.` }, { status: 429 });
      }

      // SuperAdmin
      if (emailLC === ADMIN_EMAIL.toLowerCase()) {
        const override = readDb<{ password: string }>("admin_override", { password: "" });
        const validPw  = override.password || ADMIN_PASSWORD;
        if (password !== validPw) {
          recordFailedAttempt(rateKey);
          writeAuditLog({ userId: "superadmin", userName: "System Administrator", action: "LOGIN_FAILED", module: "Auth", details: `Failed login attempt for SuperAdmin`, ipAddress: ip });
          return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }
        clearRateLimit(rateKey);
        writeAuditLog({ userId: "superadmin", userName: "System Administrator", action: "LOGIN_SUCCESS", module: "Auth", details: `SuperAdmin logged in (OTP bypassed)`, ipAddress: ip });
        return NextResponse.json({
          bypass: true,
          session: {
            id: "superadmin", name: "System Administrator", email: ADMIN_EMAIL,
            role: "admin", position: "admin", companyId: null,
            isSuperAdmin: true, permissions: [],
          },
        });
      }

      // Staff user — verify credentials
      const users = readDb<StaffUser[]>("users", []);
      const match = users.find(u => u.email.toLowerCase().trim() === emailLC && u.password === password);
      if (!match) {
        const result = recordFailedAttempt(rateKey);
        writeAuditLog({ userId: "unknown", userName: emailLC, action: "LOGIN_FAILED", module: "Auth", details: `Invalid credentials. ${result.attemptsLeft} attempt(s) remaining.`, ipAddress: ip });
        const msg = result.locked
          ? `Too many failed attempts. Account locked for 15 minutes.`
          : `Invalid email or password. ${result.attemptsLeft} attempt(s) remaining before lockout.`;
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      if (match.status === "inactive") {
        writeAuditLog({ userId: match.id, userName: match.name, action: "LOGIN_DENIED", module: "Auth", details: `Login denied — account inactive`, ipAddress: ip });
        return NextResponse.json({ error: "Your account has been deactivated. Contact the administrator." }, { status: 403 });
      }
      if (match.status === "banned") {
        writeAuditLog({ userId: match.id, userName: match.name, action: "LOGIN_DENIED", module: "Auth", details: `Login denied — account banned`, ipAddress: ip });
        return NextResponse.json({ error: "Your account has been suspended. Contact the system administrator." }, { status: 403 });
      }
      if (!match.phone?.trim()) {
        writeAuditLog({ userId: match.id, userName: match.name, action: "LOGIN_DENIED", module: "Auth", details: `Login denied — no phone number on account`, ipAddress: ip });
        return NextResponse.json({ error: "No phone number on your account. Contact your administrator to add one before you can log in." }, { status: 400 });
      }

      // Credentials OK — clear rate limit, send OTP
      clearRateLimit(rateKey);

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000;

      const otps = readDb<OtpRecord[]>("login_otp_records", []).filter(o => o.userId !== match.id);
      writeDb("login_otp_records", [...otps, { phone: match.phone, otp, expiresAt, userId: match.id }]);

      const smsResult = await sendSms(
        match.phone, match.name,
        `Dear ${match.name}, your PHIDTECH MS login OTP is: ${otp}. Valid for 10 minutes. Do not share this code. - PHIDTECH`,
        "login_otp"
      );

      if (!smsResult.ok) {
        writeAuditLog({ userId: match.id, userName: match.name, action: "OTP_SEND_FAILED", module: "Auth", details: `OTP SMS failed: ${smsResult.error ?? "unknown"}`, ipAddress: ip });
        return NextResponse.json({ error: `Failed to send OTP to ${match.phone}. ${smsResult.error ?? ""}` }, { status: 500 });
      }

      writeAuditLog({ userId: match.id, userName: match.name, action: "OTP_SENT", module: "Auth", details: `Login OTP sent to ${match.phone.replace(/(\d{3})\d+(\d{3})/, "$1****$2")}`, ipAddress: ip });
      const masked = match.phone.replace(/(\d{3})\d+(\d{3})/, "$1****$2");
      return NextResponse.json({ success: true, name: match.name, maskedPhone: masked, userId: match.id });
    }

    if (action === "verify") {
      const { userId, otp } = body;
      if (!userId || !otp)
        return NextResponse.json({ error: "User ID and OTP are required." }, { status: 400 });

      const otpRateKey = `otp:${userId}`;
      const rl = checkRateLimit(otpRateKey);
      if (rl.blocked)
        return NextResponse.json({ error: `Too many wrong OTP attempts. Locked for ${rl.minutesLeft} minute(s).` }, { status: 429 });

      const otps = readDb<OtpRecord[]>("login_otp_records", []);
      const record = otps.find(o => o.userId === userId);

      if (!record)
        return NextResponse.json({ error: "No OTP requested. Please start over." }, { status: 400 });
      if (Date.now() > record.expiresAt)
        return NextResponse.json({ error: "OTP has expired. Please log in again." }, { status: 400 });
      if (record.otp !== String(otp).trim()) {
        const result = recordFailedAttempt(otpRateKey);
        const users2 = readDb<StaffUser[]>("users", []);
        const u2 = users2.find(u => u.id === userId);
        writeAuditLog({ userId, userName: u2?.name ?? userId, action: "OTP_FAILED", module: "Auth", details: `Wrong OTP entered. ${result.attemptsLeft} attempt(s) remaining.`, ipAddress: ip });
        return NextResponse.json({ error: `Invalid OTP. ${result.attemptsLeft} attempt(s) remaining.` }, { status: 400 });
      }

      // OTP correct — consume it and clear rate limit
      writeDb("login_otp_records", otps.filter(o => o.userId !== userId));
      clearRateLimit(otpRateKey);

      const users = readDb<StaffUser[]>("users", []);
      const match = users.find(u => u.id === userId);
      if (!match)
        return NextResponse.json({ error: "User not found." }, { status: 404 });

      writeAuditLog({ userId: match.id, userName: match.name, action: "LOGIN_SUCCESS", module: "Auth", details: `Successful login via OTP`, ipAddress: ip });

      return NextResponse.json({
        session: {
          id: match.id, name: match.name, email: match.email,
          role: match.role, position: match.position,
          permissions: match.permissions ?? [],
          companyId: match.companyId, branchId: match.branchId ?? null,
          isSuperAdmin: false,
        },
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("OTP login error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
