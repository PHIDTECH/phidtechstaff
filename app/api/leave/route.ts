import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";

interface LeaveRequest {
  id: string; companyId: string; userId: string; userName: string;
  type: string; startDate: string; endDate: string; days: number;
  reason: string; status: string; approvedBy?: string; approvedByName?: string; createdAt: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<LeaveRequest[]>("leave", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<LeaveRequest[]>("leave", []);
    const item: LeaveRequest = { ...body, id: body.id ?? `lv_${Date.now()}` };
    list.push(item);
    writeDb("leave", list);
    // Auto-SMS confirmation to the applicant
    if (item.userId) {
      const users = readDb<{id:string;name:string;phone:string}[]>("users", []);
      const staff = users.find(u => u.id === item.userId);
      if (staff?.phone) {
        await sendSms(staff.phone, staff.name,
          `Habari ${staff.name}, ombi lako la likizo (${item.type}) kutoka ${item.startDate} hadi ${item.endDate} limepokelewa na linasubiri idhini. - PHIDTECH`,
          "leave_applied");
      }
    }
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const list = readDb<LeaveRequest[]>("leave", []);
      for (const item of body) {
        if (!item.id) continue;
        const idx = list.findIndex(x => x.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item }; else list.push(item);
      }
      writeDb("leave", list);
      return NextResponse.json({ success: true });
    }
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<LeaveRequest[]>("leave", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("leave", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("leave", readDb<LeaveRequest[]>("leave", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
