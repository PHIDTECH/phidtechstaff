import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/serverDb";

const ADMIN_EMAIL    = "phidtechnology@gmail.com";
const ADMIN_PASSWORD = "Kaijage@@2023";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  position: string;
  companyId: string;
  permissions: string[];
  status: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const emailLC = email.toLowerCase().trim();

    // ── Superadmin check ──────────────────────────────────────────────────────
    if (emailLC === ADMIN_EMAIL.toLowerCase()) {
      // Allow the hardcoded password OR a server-side override stored in data/admin_override.json
      const override = readDb<{ password: string }>("admin_override", { password: "" });
      const validPw  = override.password || ADMIN_PASSWORD;
      if (password !== validPw) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
      return NextResponse.json({
        session: {
          id: "superadmin",
          name: "System Administrator",
          email: ADMIN_EMAIL,
          role: "admin",
          position: "admin",
          companyId: null,
          isSuperAdmin: true,
          permissions: [],
        },
      });
    }

    // ── Staff users check ─────────────────────────────────────────────────────
    const users = readDb<StaffUser[]>("users", []);
    const match = users.find(
      (u) => u.email.toLowerCase().trim() === emailLC && u.password === password
    );

    if (!match) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (match.status === "inactive") {
      return NextResponse.json({ error: "Your account has been deactivated. Contact the administrator." }, { status: 403 });
    }

    return NextResponse.json({
      session: {
        id: match.id,
        name: match.name,
        email: match.email,
        role: match.role,
        position: match.position,
        permissions: match.permissions ?? [],
        companyId: match.companyId,
        isSuperAdmin: false,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
