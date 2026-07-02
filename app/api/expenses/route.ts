import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";

interface Expense {
  id: string; companyId: string; userId: string; title: string;
  category: string; amount: number; description: string;
  status: "pending" | "manager_approved" | "ceo_approved" | "disbursed" | "rejected" | string;
  submittedAt: string;
  managerApprovedBy?: string; managerApprovedAt?: string;
  ceoApprovedBy?: string; ceoApprovedAt?: string;
  disbursedBy?: string; disbursedAt?: string;
  rejectedBy?: string; rejectedAt?: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<Expense[]>("expenses", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: "title required." }, { status: 400 });
    const list = readDb<Expense[]>("expenses", []);
    const item: Expense = { ...body, id: body.id ?? `exp-${Date.now()}` };
    list.push(item);
    console.log(`[POST /api/expenses] Adding expense ${item.id}, list size before write: ${list.length}`);
    writeDb("expenses", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    // Bulk upsert
    if (Array.isArray(body)) {
      const list = readDb<Expense[]>("expenses", []);
      for (const item of body) {
        if (!item.id) continue;
        const idx = list.findIndex(x => x.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item }; else list.push(item);
      }
      writeDb("expenses", list);
      return NextResponse.json({ success: true });
    }
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<Expense[]>("expenses", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const prev = list[idx];
    list[idx] = { ...prev, ...body };
    writeDb("expenses", list);
    // Auto-SMS when expense is disbursed
    if (body.status === "disbursed" && prev.status !== "disbursed") {
      const users = readDb<{id:string;name:string;phone:string}[]>("users", []);
      const staff = users.find(u => u.id === list[idx].userId);
      if (staff?.phone) {
        await sendSms(staff.phone, staff.name,
          `Habari ${staff.name}, madai yako ya gharama ya TZS ${list[idx].amount} yameidhinishwa na kulipwa. Asante. - PHIDTECH`,
          "expense_disbursed");
      }
    }
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id    = searchParams.get("id");
    const clear = searchParams.get("clear");
    if (clear === "all") {
      const count = readDb<Expense[]>("expenses", []).length;
      writeDb("expenses", []);
      return NextResponse.json({ success: true, deleted: count });
    }
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("expenses", readDb<Expense[]>("expenses", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
