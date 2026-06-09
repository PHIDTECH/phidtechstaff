import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface DailyReport {
  id: string;
  type: "branch_manager" | "group_exec";
  date: string;
  companyId: string;
  submittedBy: string;
  submittedByName: string;
  status: "draft" | "submitted" | "reviewed_gm" | "approved_ceo";
  reviewedByGM?: string; reviewedAt?: string;
  approvedByCEO?: string; approvedAt?: string;
  createdAt: string;
  // Branch manager sections
  subscriptionDivision?: Record<string, string>;
  consultancyDivision?: Record<string, string>;
  mediaDivision?: Record<string, unknown>;
  fedhaZaKampuni?: Record<string, string>;
  hudumaNyingine?: Record<string, unknown>;
  // Group exec extra sections
  microfinanceDivision?: Record<string, unknown>;
  ictDivision?: Record<string, string>;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<DailyReport[]>("daily_reports", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<DailyReport[]>("daily_reports", []);
    const item: DailyReport = { ...body, id: body.id ?? `dr-${Date.now()}`, createdAt: body.createdAt ?? new Date().toISOString() };
    list.push(item);
    writeDb("daily_reports", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id required." }, { status: 400 });
    const list = readDb<DailyReport[]>("daily_reports", []);
    const idx = list.findIndex(r => r.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("daily_reports", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
    const list = readDb<DailyReport[]>("daily_reports", []);
    writeDb("daily_reports", list.filter(r => r.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
