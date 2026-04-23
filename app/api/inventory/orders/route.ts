import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface POItem { productId: string; productName: string; quantity: number; unitCost: number; total: number; }
interface PurchaseOrder {
  id: string; companyId: string; vendorId: string; poNumber: string;
  items: POItem[]; total: number;
  status: "draft"|"sent"|"received"|"cancelled";
  orderDate: string; expectedDate: string; receivedDate?: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<PurchaseOrder[]>("inv_orders", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<PurchaseOrder[]>("inv_orders", []);
    const item: PurchaseOrder = { ...body, id: body.id ?? `po-${Date.now()}` };
    list.push(item);
    writeDb("inv_orders", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<PurchaseOrder[]>("inv_orders", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("inv_orders", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("inv_orders", readDb<PurchaseOrder[]>("inv_orders", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
