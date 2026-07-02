import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

export interface AppNotification {
  id: string;
  type: "debt_reminder" | "late_checkin" | "info" | "warning" | "success";
  title: string;
  message: string;
  saleId?: string;
  userId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  companyId?: string;
  amount?: number;
  urgency?: string;
  smsSent?: boolean;
  read?: boolean;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  const url  = new URL(req.url);
  const cid  = url.searchParams.get("companyId");
  const type = url.searchParams.get("type");
  let list = readDb<AppNotification[]>("notifications", []);
  if (cid)  list = list.filter(n => !n.companyId || n.companyId === cid);
  if (type) list = list.filter(n => n.type === type);
  return NextResponse.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<AppNotification>;
    const list = readDb<AppNotification[]>("notifications", []);
    const item: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type: body.type ?? "info",
      title: body.title ?? "",
      message: body.message ?? "",
      saleId: body.saleId,
      customerId: body.customerId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      companyId: body.companyId,
      amount: body.amount,
      smsSent: body.smsSent ?? false,
      read: false,
      createdAt: new Date().toISOString(),
    };
    list.push(item);
    writeDb("notifications", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, read } = await req.json();
    const list = readDb<AppNotification[]>("notifications", []);
    const idx  = list.findIndex(n => n.id === id);
    if (idx !== -1) { list[idx].read = read ?? true; writeDb("notifications", list); }
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      writeDb("notifications", []);
      return NextResponse.json({ ok: true });
    }
    writeDb("notifications", readDb<AppNotification[]>("notifications", []).filter(n => n.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
