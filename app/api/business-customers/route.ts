import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

export const dynamic = "force-dynamic";

interface BusinessCustomer {
  id: string; companyId: string;
  name: string; phone: string;
  email?: string; address?: string;
  businessName?: string;
  businessType?: string;
  registrationNo?: string;
  contactPerson?: string;
  notes?: string;
  createdAt: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<BusinessCustomer[]>("business-customers", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const list = readDb<BusinessCustomer[]>("business-customers", []);
    if (Array.isArray(body)) {
      const items: BusinessCustomer[] = body.map((b, i) => ({
        ...b,
        id: b.id ?? `bsc-${Date.now()}-${i}`,
        createdAt: b.createdAt ?? new Date().toISOString(),
      }));
      writeDb("business-customers", [...list, ...items]);
      return NextResponse.json(items, { status: 201 });
    }
    if (!body.name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!body.phone?.trim()) return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    const item: BusinessCustomer = { ...body, id: body.id ?? `bsc-${Date.now()}`, createdAt: body.createdAt ?? new Date().toISOString() };
    list.push(item);
    writeDb("business-customers", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<BusinessCustomer[]>("business-customers", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("business-customers", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<BusinessCustomer[]>("business-customers", []);
    writeDb("business-customers", list.filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
