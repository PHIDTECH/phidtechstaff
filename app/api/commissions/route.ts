import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";

interface Commission {
  id: string; staffId: string; companyId: string;
  customerName: string; month: string; year: number;
  datePaid: string; saleAmount: number; commissionPct: number;
  commissionAmount: number; status: string; createdAt: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<Commission[]>("commissions", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<Commission[]>("commissions", []);
    const item: Commission = { ...body, id: body.id ?? `comm-${Date.now()}` };
    list.push(item);
    writeDb("commissions", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const list = readDb<Commission[]>("commissions", []);
      for (const item of body) {
        if (!item.id) continue;
        const idx = list.findIndex(x => x.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item }; else list.push(item);
      }
      writeDb("commissions", list);
      return NextResponse.json({ success: true });
    }
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<Commission[]>("commissions", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const prev = list[idx];
    list[idx] = { ...prev, ...body };
    writeDb("commissions", list);
    if (body.status === "paid" && prev.status !== "paid") {
      const users = readDb<{id:string;name:string;phone:string}[]>("users", []);
      const staff = users.find(u => u.id === list[idx].staffId);
      if (staff?.phone) {
        await sendSms(staff.phone, staff.name,
          `Habari ${staff.name}, commission yako ya TZS ${list[idx].commissionAmount} kwa ${list[idx].month} ${list[idx].year} imelipwa. - PHIDTECH`,
          "commission_paid");
      }
    }
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("commissions", readDb<Commission[]>("commissions", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
