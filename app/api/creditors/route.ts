import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

export interface Creditor {
  id: string; companyId: string;
  name: string; contact?: string; email?: string; phone?: string;
  category: string; description?: string;
  amount: number; amountPaid: number; balance: number;
  dueDate?: string; status: "pending" | "partial" | "paid" | "overdue";
  notes?: string; createdAt: string; updatedAt: string;
}

export async function GET() {
  return NextResponse.json(readDb<Creditor[]>("creditors", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    const list = readDb<Creditor[]>("creditors", []);
    const now = new Date().toISOString();
    const amount = Number(body.amount ?? 0);
    const amountPaid = Number(body.amountPaid ?? 0);
    const item: Creditor = {
      ...body,
      id: `cred-${Date.now()}`,
      amount, amountPaid,
      balance: amount - amountPaid,
      createdAt: now, updatedAt: now,
    };
    list.push(item);
    writeDb("creditors", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const list = readDb<Creditor[]>("creditors", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const amount = Number(body.amount ?? list[idx].amount);
    const amountPaid = Number(body.amountPaid ?? list[idx].amountPaid);
    list[idx] = { ...list[idx], ...body, amount, amountPaid, balance: amount - amountPaid, updatedAt: new Date().toISOString() };
    writeDb("creditors", list);
    return NextResponse.json(list[idx]);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    writeDb("creditors", readDb<Creditor[]>("creditors", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
