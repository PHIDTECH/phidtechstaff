import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface Branch {
  id: string;
  companyId: string;
  name: string;
  location: string;
  managerId: string;
  [key: string]: unknown;
}

export async function GET() {
  const branches = readDb<Branch[]>("branches", []);
  return NextResponse.json(branches);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "Branch name is required." }, { status: 400 });
    if (!body.companyId)    return NextResponse.json({ error: "companyId is required." }, { status: 400 });

    const branches = readDb<Branch[]>("branches", []);
    const newBranch: Branch = {
      ...body,
      id: body.id ?? `br_${Date.now()}`,
      managerId: body.managerId ?? "",
    };
    branches.push(newBranch);
    writeDb("branches", branches);
    return NextResponse.json(newBranch, { status: 201 });
  } catch (err) {
    console.error("POST /api/branches:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const branches = readDb<Branch[]>("branches", []);
    const idx = branches.findIndex((b) => b.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Branch not found." }, { status: 404 });

    branches[idx] = { ...branches[idx], ...body };
    writeDb("branches", branches);
    return NextResponse.json(branches[idx]);
  } catch (err) {
    console.error("PUT /api/branches:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const branches = readDb<Branch[]>("branches", []);
    writeDb("branches", branches.filter((b) => b.id !== id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/branches:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
