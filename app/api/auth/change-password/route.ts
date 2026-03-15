import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

const ADMIN_EMAIL    = "phidtechnology@gmail.com";
const ADMIN_PASSWORD = "Kaijage@@2023";

interface StaffUser {
  id: string;
  email: string;
  password: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { email, currentPassword, newPassword } = await req.json();

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    const emailLC = email.toLowerCase().trim();

    // ── Superadmin ────────────────────────────────────────────────────────────
    if (emailLC === ADMIN_EMAIL.toLowerCase()) {
      const override = readDb<{ password: string }>("admin_override", { password: "" });
      const validPw  = override.password || ADMIN_PASSWORD;
      if (currentPassword !== validPw) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
      }
      writeDb("admin_override", { password: newPassword });
      return NextResponse.json({ success: true });
    }

    // ── Staff user ────────────────────────────────────────────────────────────
    const users = readDb<StaffUser[]>("users", []);
    const idx = users.findIndex((u) => u.email.toLowerCase().trim() === emailLC);
    if (idx === -1) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (users[idx].password !== currentPassword) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    users[idx] = { ...users[idx], password: newPassword };
    writeDb("users", users);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("change-password error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
