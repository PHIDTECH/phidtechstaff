import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface Asset {
  id: string; companyId: string; name: string; category: string;
  serialNumber: string; purchaseDate: string; purchaseCost: number;
  currentValue: number; depreciationRate: number;
  assignedTo: string; location: string;
  status: "active" | "maintenance" | "disposed";
  nextMaintenance?: string; notes?: string; createdAt: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<Asset[]>("assets", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.companyId) return NextResponse.json({ error: "companyId required." }, { status: 400 });
    if (!body.name?.trim()) return NextResponse.json({ error: "name required." }, { status: 400 });
    const list = readDb<Asset[]>("assets", []);
    const item: Asset = { ...body, id: body.id ?? `AST-${Date.now().toString().slice(-6)}`, createdAt: body.createdAt ?? new Date().toISOString() };
    list.push(item);
    writeDb("assets", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<Asset[]>("assets", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("assets", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    writeDb("assets", readDb<Asset[]>("assets", []).filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
