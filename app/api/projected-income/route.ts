import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

export interface ProjectedIncome {
  id: string; companyId: string;
  serviceId?: string; serviceName: string;
  category: string; unitPrice: number; units: number; amount: number;
  period: "once" | "weekly" | "monthly" | "3months" | "6months" | "yearly";
  month: string; year: number;
  status: "draft" | "confirmed" | "done";
  notes?: string; createdAt: string;
}

export async function GET(req: NextRequest) {
  const url   = new URL(req.url);
  const cid   = url.searchParams.get("companyId");
  const year  = url.searchParams.get("year");
  const month = url.searchParams.get("month");
  let list = readDb<ProjectedIncome[]>("projected_income", []);
  if (cid)   list = list.filter(p => p.companyId === cid);
  if (year)  list = list.filter(p => String(p.year) === year);
  if (month) list = list.filter(p => p.month === month);
  return NextResponse.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<ProjectedIncome[]>("projected_income", []);
    const item: ProjectedIncome = { ...body, id: body.id ?? `pinc-${Date.now()}`, createdAt: body.createdAt ?? new Date().toISOString() };
    list.push(item);
    writeDb("projected_income", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id required." }, { status: 400 });
    const list = readDb<ProjectedIncome[]>("projected_income", []);
    const idx  = list.findIndex(p => p.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("projected_income", list);
    return NextResponse.json(list[idx]);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
    writeDb("projected_income", readDb<ProjectedIncome[]>("projected_income", []).filter(p => p.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
