import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

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
  department?: string;
  phone?: string;
  salary?: number | string;
  allowances?: number | string;
  joinDate?: string;
  [key: string]: unknown;
}

export async function GET() {
  const users = readDb<StaffUser[]>("users", []);
  // Strip passwords from response
  const safe = users.map(({ password: _p, ...rest }) => rest);
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const users = readDb<StaffUser[]>("users", []);

    // Check duplicate email
    if (users.find((u) => u.email.toLowerCase() === body.email?.toLowerCase())) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const newUser: StaffUser = {
      ...body,
      id: body.id ?? `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    users.push(newUser);
    writeDb("users", users);

    const { password: _p, ...safe } = newUser;
    return NextResponse.json(safe, { status: 201 });
  } catch (err) {
    console.error("POST /api/users error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });

    const users = readDb<StaffUser[]>("users", []);
    const idx = users.findIndex((u) => u.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Preserve existing password if not provided
    const updated: StaffUser = {
      ...users[idx],
      ...body,
      password: body.password || users[idx].password,
    };
    users[idx] = updated;
    writeDb("users", users);

    const { password: _p, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (err) {
    console.error("PUT /api/users error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const users = readDb<StaffUser[]>("users", []);
    const filtered = users.filter((u) => u.id !== id);
    writeDb("users", filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/users error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
