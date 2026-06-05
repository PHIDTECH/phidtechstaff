import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

export interface AccountFloat {
  id: string;
  companyId: string;
  accountType: "mobile_money" | "bank";
  provider: string;       // e.g. "M-Pesa", "CRDB Bank"
  accountName: string;    // e.g. "PHIDTECH ICT Operations"
  accountNumber?: string;
  currency: string;       // TZS
  currentBalance: number;
  lastUpdatedAt: string;  // ISO date of last balance update
  updatedBy?: string;
  createdAt: string;
  history: FloatUpdate[];
}

export interface FloatUpdate {
  id: string;
  date: string;           // YYYY-MM-DD
  balance: number;
  description: string;
  updatedBy: string;
  createdAt: string;
}

export async function GET() {
  const floats = readDb<AccountFloat[]>("account_floats", []);
  return NextResponse.json(floats);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    if (!body.provider)  return NextResponse.json({ error: "provider required." },  { status: 400 });

    const floats = readDb<AccountFloat[]>("account_floats", []);
    const now = new Date().toISOString();

    if (body._action === "update_balance") {
      // Add a balance update entry to an existing float
      const idx = floats.findIndex(f => f.id === body.id);
      if (idx === -1) return NextResponse.json({ error: "Float not found." }, { status: 404 });
      const upd: FloatUpdate = {
        id: `fupd_${Date.now()}`,
        date: body.date ?? now.slice(0, 10),
        balance: Number(body.balance),
        description: body.description ?? "",
        updatedBy: body.updatedBy ?? "",
        createdAt: now,
      };
      floats[idx].history = [upd, ...(floats[idx].history ?? [])];
      floats[idx].currentBalance = upd.balance;
      floats[idx].lastUpdatedAt  = now;
      floats[idx].updatedBy      = upd.updatedBy;
      writeDb("account_floats", floats);
      return NextResponse.json(floats[idx]);
    }

    const newFloat: AccountFloat = {
      id: body.id ?? `flt_${Date.now()}`,
      companyId: body.companyId,
      accountType: body.accountType ?? "bank",
      provider: body.provider,
      accountName: body.accountName ?? body.provider,
      accountNumber: body.accountNumber ?? "",
      currency: body.currency ?? "TZS",
      currentBalance: Number(body.currentBalance) || 0,
      lastUpdatedAt: now,
      updatedBy: body.updatedBy ?? "",
      createdAt: now,
      history: body.currentBalance > 0 ? [{
        id: `fupd_${Date.now()}`,
        date: now.slice(0, 10),
        balance: Number(body.currentBalance),
        description: "Opening balance",
        updatedBy: body.updatedBy ?? "",
        createdAt: now,
      }] : [],
    };
    floats.push(newFloat);
    writeDb("account_floats", floats);
    return NextResponse.json(newFloat, { status: 201 });
  } catch (err) {
    console.error("POST /api/account-floats:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const floats = readDb<AccountFloat[]>("account_floats", []);
    const idx = floats.findIndex(f => f.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Float not found." }, { status: 404 });
    floats[idx] = { ...floats[idx], ...body, history: floats[idx].history };
    writeDb("account_floats", floats);
    return NextResponse.json(floats[idx]);
  } catch (err) {
    console.error("PUT /api/account-floats:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const floats = readDb<AccountFloat[]>("account_floats", []);
    writeDb("account_floats", floats.filter(f => f.id !== id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/account-floats:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
