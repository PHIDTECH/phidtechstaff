import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface PendingPayment {
  id: string;
  companyId: string;
  customerName: string;
  phone?: string;
  email?: string;
  amountNegotiated: number;
  amountPaid?: number;
  promisedDate: string;
  status: "pending" | "partial" | "paid" | "overdue";
  notes?: string;
  addedBy: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function GET() {
  const items = readDb<PendingPayment[]>("pending_payments", []);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customerName?.trim()) return NextResponse.json({ error: "customerName is required." }, { status: 400 });
    if (!body.companyId)            return NextResponse.json({ error: "companyId is required." },    { status: 400 });
    if (!body.amountNegotiated)     return NextResponse.json({ error: "amountNegotiated is required." }, { status: 400 });
    if (!body.promisedDate)         return NextResponse.json({ error: "promisedDate is required." },  { status: 400 });

    const items = readDb<PendingPayment[]>("pending_payments", []);
    const newItem: PendingPayment = {
      ...body,
      id: body.id ?? `pp_${Date.now()}`,
      status: body.status ?? "pending",
      createdAt: body.createdAt ?? new Date().toISOString(),
    };
    items.push(newItem);
    writeDb("pending_payments", items);
    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    console.error("POST /api/pending-payments:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const items = readDb<PendingPayment[]>("pending_payments", []);
    const idx = items.findIndex(i => i.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });

    items[idx] = { ...items[idx], ...body, updatedAt: new Date().toISOString() };
    writeDb("pending_payments", items);
    return NextResponse.json(items[idx]);
  } catch (err) {
    console.error("PUT /api/pending-payments:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const items = readDb<PendingPayment[]>("pending_payments", []);
    writeDb("pending_payments", items.filter(i => i.id !== id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/pending-payments:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
