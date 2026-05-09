import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";

interface SalaryAdvance {
  id: string;
  staffId: string;
  companyId: string;
  amount: number;
  reason: string;
  requestDate: string;
  repaymentDate: string;
  status: "pending" | "manager_approved" | "ceo_approved" | "disbursed" | "rejected";
  managerApprovedBy?: string; managerApprovedAt?: string;
  ceoApprovedBy?: string; ceoApprovedAt?: string;
  disbursedBy?: string; disbursedAt?: string;
  rejectedBy?: string; rejectedAt?: string;
  [key: string]: unknown;
}

export async function GET() {
  const advances = readDb<SalaryAdvance[]>("advances", []);
  return NextResponse.json(advances);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.staffId)   return NextResponse.json({ error: "staffId is required." }, { status: 400 });
    if (!body.companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });
    if (!body.amount)    return NextResponse.json({ error: "amount is required." }, { status: 400 });

    const advances = readDb<SalaryAdvance[]>("advances", []);
    const newAdv: SalaryAdvance = {
      ...body,
      id: body.id ?? `adv_${Date.now()}`,
      requestDate: body.requestDate ?? new Date().toISOString().slice(0, 10),
      status: body.status ?? "pending",
    };
    advances.push(newAdv);
    writeDb("advances", advances);
    return NextResponse.json(newAdv, { status: 201 });
  } catch (err) {
    console.error("POST /api/advances:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const advances = readDb<SalaryAdvance[]>("advances", []);
    const idx = advances.findIndex(a => a.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Advance not found." }, { status: 404 });

    const prev = advances[idx];
    advances[idx] = { ...prev, ...body };
    writeDb("advances", advances);
    if (body.status === "disbursed" && prev.status !== "disbursed") {
      const users = readDb<{id:string;name:string;phone:string}[]>("users", []);
      const staff = users.find(u => u.id === advances[idx].staffId);
      if (staff?.phone) {
        await sendSms(staff.phone, staff.name,
          `Habari ${staff.name}, ombi lako la advance ya mshahara ya TZS ${advances[idx].amount} imelipwa. - PHIDTECH`,
          "advance_disbursed");
      }
    }
    return NextResponse.json(advances[idx]);
  } catch (err) {
    console.error("PUT /api/advances:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const advances = readDb<SalaryAdvance[]>("advances", []);
    writeDb("advances", advances.filter(a => a.id !== id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/advances:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
