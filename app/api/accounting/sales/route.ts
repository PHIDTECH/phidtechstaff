import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";

interface SaleItem { description: string; quantity: number; unitPrice: number; total: number; }
interface Sale {
  id: string; companyId: string; date: string;
  customerId: string; customerName: string; customerPhone: string; customerAddress: string;
  items: SaleItem[]; subtotal: number; tax: number; amount: number;
  paid: number; balance: number;
  status: string; notes: string; createdAt: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<Sale[]>("accounting_sales", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<Sale[]>("accounting_sales", []);
    const item: Sale = { ...body, id: body.id ?? `SAL-${Date.now().toString().slice(-6)}` };
    list.push(item);
    writeDb("accounting_sales", list);
    // SMS: notify customer when payment is recorded
    if (Number(item.paid) > 0 && item.customerPhone && item.customerName) {
      const paid = Number(item.paid); const balance = Number(item.balance);
      const msg = `Dear ${item.customerName}, we have received your payment of TZS ${paid.toLocaleString()}. Balance remaining: TZS ${balance.toLocaleString()}. Thank you for your business! - PHIDTECH`;
      sendSms(item.customerPhone, item.customerName, msg, "payment_received").catch(() => {});
    }
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const list = readDb<Sale[]>("accounting_sales", []);
      for (const item of body) {
        if (!item.id) continue;
        const idx = list.findIndex(x => x.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item }; else list.push(item);
      }
      writeDb("accounting_sales", list);
      return NextResponse.json({ success: true });
    }
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<Sale[]>("accounting_sales", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const prevPaid = Number(list[idx].paid ?? 0);
    list[idx] = { ...list[idx], ...body };
    writeDb("accounting_sales", list);
    const updated = list[idx];
    // SMS: notify customer when additional payment is recorded
    const newPaid = Number(updated.paid ?? 0);
    if (newPaid > prevPaid && updated.customerPhone && updated.customerName) {
      const diff = newPaid - prevPaid; const balance = Number(updated.balance ?? 0);
      const msg = `Dear ${updated.customerName}, we have received your payment of TZS ${diff.toLocaleString()}. Balance remaining: TZS ${balance.toLocaleString()}. Thank you! - PHIDTECH`;
      sendSms(updated.customerPhone, updated.customerName, msg, "payment_received").catch(() => {});
    }
    return NextResponse.json(updated);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("accounting_sales", readDb<Sale[]>("accounting_sales", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
