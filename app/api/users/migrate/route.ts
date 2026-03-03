import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface StaffUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

// POST /api/users/migrate
// Body: { users: StaffUser[], secret: string }
// Merges users from localStorage into the server store (no duplicates by email).
// Protected by a simple secret to prevent abuse.
export async function POST(req: NextRequest) {
  try {
    const { users, secret } = await req.json();

    // Simple guard — uses the same admin password as auth
    const ADMIN_PASSWORD = "Kaijage@@2023";
    if (secret !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!Array.isArray(users)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const existing = readDb<StaffUser[]>("users", []);
    const existingEmails = new Set(existing.map((u) => u.email.toLowerCase()));

    const toAdd = (users as StaffUser[]).filter(
      (u) => u.email && !existingEmails.has(u.email.toLowerCase())
    );

    if (toAdd.length > 0) {
      writeDb("users", [...existing, ...toAdd]);
    }

    return NextResponse.json({ imported: toAdd.length, skipped: users.length - toAdd.length });
  } catch (err) {
    console.error("Migrate error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
