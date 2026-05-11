import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface LoanCustomer {
  id: string; companyId: string; customerName: string;
  contactPhone?: string; date: string;
  amountOfLoan: number; interestPerMonth: number; loanPeriod: number;
  status: string; notes?: string; createdAt: string; createdBy?: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<LoanCustomer[]>("loans", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId)    return NextResponse.json({ error: "companyId required." }, { status: 400 });
    if (!body.customerName) return NextResponse.json({ error: "customerName required." }, { status: 400 });
    const list = readDb<LoanCustomer[]>("loans", []);
    const item: LoanCustomer = { ...body, id: body.id ?? `loan-${Date.now()}` };
    list.push(item);
    writeDb("loans", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<LoanCustomer[]>("loans", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("loans", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("loans", readDb<LoanCustomer[]>("loans", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
