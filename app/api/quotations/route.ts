import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface LineItem { description: string; qty: number; unitPrice: number; }
interface Quotation {
  id: string; quoteNumber: string; companyId: string;
  clientName: string; clientEmail?: string; clientPhone?: string; clientAddress?: string;
  validUntil: string; items: LineItem[];
  discount: number; taxRate: number;
  subtotal: number; taxAmount: number; total: number;
  notes?: string;
  status: "draft"|"sent"|"accepted"|"rejected";
  createdAt: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<Quotation[]>("quotations", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<Quotation[]>("quotations", []);
    const item: Quotation = { ...body, id: body.id ?? `quo-${Date.now()}` };
    list.push(item);
    writeDb("quotations", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<Quotation[]>("quotations", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("quotations", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("quotations", readDb<Quotation[]>("quotations", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
