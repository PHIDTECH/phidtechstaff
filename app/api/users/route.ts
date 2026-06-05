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
    // Check duplicate name within same company
    const nameLower = (body.name ?? "").trim().toLowerCase();
    if (nameLower && users.find(u => u.name.trim().toLowerCase() === nameLower && u.companyId === body.companyId)) {
      return NextResponse.json({ error: "A staff member with this name already exists in this company." }, { status: 409 });
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

// PATCH /api/users?action=dedup — remove exact-name duplicates, keep the one with non-generic position
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("action") === "dedup") {
      const users = readDb<StaffUser[]>("users", []);
      const seen = new Map<string, StaffUser>();
      const GENERIC = ["general staff", "staff", ""];
      const keep: StaffUser[] = [];
      for (const u of users) {
        const key = u.name.trim().toLowerCase() + "__" + u.companyId;
        const existing = seen.get(key);
        if (!existing) {
          seen.set(key, u); keep.push(u);
        } else {
          const existPos = (existing.position ?? "").toLowerCase();
          const thisPos  = (u.position ?? "").toLowerCase();
          if (GENERIC.includes(existPos) && !GENERIC.includes(thisPos)) {
            keep.splice(keep.indexOf(existing), 1, u);
            seen.set(key, u);
          }
        }
      }
      const removed = users.length - keep.length;
      writeDb("users", keep);
      return NextResponse.json({ removed, total: keep.length });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/users error:", err);
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
