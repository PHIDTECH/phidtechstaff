import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface PayrollEntry {
  id: string; staffId: string; companyId: string;
  month: string; year: number;
  basicSalary: number; allowances: unknown[]; deductions: unknown[];
  grossSalary: number; netSalary: number;
  status: string; generatedAt: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<PayrollEntry[]>("payroll", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Support bulk insert (array)
    if (Array.isArray(body)) {
      const list = readDb<PayrollEntry[]>("payroll", []);
      for (const item of body) {
        if (!item.id) continue;
        const idx = list.findIndex(x => x.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item }; else list.push(item);
      }
      writeDb("payroll", list);
      return NextResponse.json({ success: true, count: body.length });
    }
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    const list = readDb<PayrollEntry[]>("payroll", []);
    const item: PayrollEntry = { ...body, id: body.id ?? `pr-${Date.now()}` };
    list.push(item);
    writeDb("payroll", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const list = readDb<PayrollEntry[]>("payroll", []);
      for (const item of body) {
        if (!item.id) continue;
        const idx = list.findIndex(x => x.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item }; else list.push(item);
      }
      writeDb("payroll", list);
      return NextResponse.json({ success: true });
    }
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<PayrollEntry[]>("payroll", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("payroll", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const companyId = url.searchParams.get("companyId");
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    // Delete single by id
    if (id) {
      writeDb("payroll", readDb<PayrollEntry[]>("payroll", []).filter(x => x.id !== id));
      return NextResponse.json({ success: true });
    }
    // Delete all for a company/month/year (re-run payroll)
    if (companyId && month && year) {
      writeDb("payroll", readDb<PayrollEntry[]>("payroll", []).filter(x =>
        !(x.companyId === companyId && x.month === month && x.year === Number(year))
      ));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Missing id or filter params." }, { status: 400 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
