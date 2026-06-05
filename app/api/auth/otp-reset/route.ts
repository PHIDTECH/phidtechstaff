import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";

interface OtpRecord { phone: string; otp: string; expiresAt: number; }
interface StaffUser { id: string; name: string; phone: string; password: string; [key: string]: unknown; }

// POST ?action=request — send OTP to phone
// POST ?action=verify  — verify OTP + set new password
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") ?? "request";
    const body = await req.json();

    if (action === "request") {
      const { phone } = body;
      if (!phone?.trim()) return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
      const cleaned = phone.replace(/\s+/g, "").replace(/^\+255/, "0");

      const users = readDb<StaffUser[]>("users", []);
      const user = users.find(u => {
        const p = (u.phone ?? "").replace(/\s+/g, "").replace(/^\+255/, "0");
        return p === cleaned;
      });
      if (!user) return NextResponse.json({ error: "No account found with this phone number." }, { status: 404 });

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      const otps = readDb<OtpRecord[]>("otp_records", []).filter(o => o.phone !== cleaned);
      writeDb("otp_records", [...otps, { phone: cleaned, otp, expiresAt }]);

      await sendSms(
        user.phone,
        user.name,
        `Your PHIDTECH MS password reset OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`
      );
      return NextResponse.json({ success: true, name: user.name });
    }

    if (action === "verify") {
      const { phone, otp, newPassword } = body;
      if (!phone || !otp || !newPassword) return NextResponse.json({ error: "Phone, OTP and new password are required." }, { status: 400 });
      if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

      const cleaned = phone.replace(/\s+/g, "").replace(/^\+255/, "0");
      const otps = readDb<OtpRecord[]>("otp_records", []);
      const record = otps.find(o => o.phone === cleaned);

      if (!record) return NextResponse.json({ error: "No OTP requested for this phone." }, { status: 400 });
      if (Date.now() > record.expiresAt) return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
      if (record.otp !== otp) return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 400 });

      const users = readDb<StaffUser[]>("users", []);
      const idx = users.findIndex(u => {
        const p = (u.phone ?? "").replace(/\s+/g, "").replace(/^\+255/, "0");
        return p === cleaned;
      });
      if (idx === -1) return NextResponse.json({ error: "User not found." }, { status: 404 });
      users[idx] = { ...users[idx], password: newPassword };
      writeDb("users", users);

      // Consume OTP
      writeDb("otp_records", otps.filter(o => o.phone !== cleaned));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("OTP reset error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
