import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

export const dynamic = "force-dynamic";

interface MediaCustomer {
  id: string; companyId: string;
  name: string; phone: string;
  email?: string; address?: string;
  mediaOutlet?: string;
  mediaType?: string;
  contactPerson?: string;
  notes?: string;
  createdAt: string;
  [key: string]: unknown;
}

export async function GET() {
  return NextResponse.json(readDb<MediaCustomer[]>("media-customers", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const list = readDb<MediaCustomer[]>("media-customers", []);
    if (Array.isArray(body)) {
      const items: MediaCustomer[] = body.map((b, i) => ({
        ...b,
        id: b.id ?? `mdc-${Date.now()}-${i}`,
        createdAt: b.createdAt ?? new Date().toISOString(),
      }));
      writeDb("media-customers", [...list, ...items]);
      return NextResponse.json(items, { status: 201 });
    }
    if (!body.name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!body.phone?.trim()) return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    const item: MediaCustomer = { ...body, id: body.id ?? `mdc-${Date.now()}`, createdAt: body.createdAt ?? new Date().toISOString() };
    list.push(item);
    writeDb("media-customers", list);
    return NextResponse.json(item, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<MediaCustomer[]>("media-customers", []);
    const idx = list.findIndex(x => x.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeDb("media-customers", list);
    return NextResponse.json(list[idx]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const list = readDb<MediaCustomer[]>("media-customers", []);
    writeDb("media-customers", list.filter(x => x.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Server error." }, { status: 500 }); }
}
