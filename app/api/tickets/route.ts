import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface Ticket {
  id: string; companyId: string; customerId: string;
  subject: string; description: string;
  priority: "low"|"medium"|"high"|"critical";
  status: "open"|"in-progress"|"resolved"|"closed";
  assignedTo?: string; createdAt: string; resolvedAt?: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<Ticket[]>("tickets", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<Ticket[]>("tickets", []);
    const item: Ticket = { ...body, id: body.id ?? `tkt-${Date.now()}` };
    list.push(item);
    writeDb("tickets", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<Ticket[]>("tickets", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("tickets", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("tickets", readDb<Ticket[]>("tickets", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
