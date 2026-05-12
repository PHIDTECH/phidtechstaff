import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

// Increase body size limit for base64 file uploads (App Router route segment config)
export const maxDuration = 30;

interface Doc {
  id: string;
  companyId: string;
  name: string;
  category: string;
  permissions: string;
  assignedTo?: string;
  assignedToName?: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  version: number;
  dataUrl?: string;
  sharedWithRoles?: string[];
  [key: string]: unknown;
}

export async function GET() {
  const docs = readDb<Doc[]>("documents", []);
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  try {
    const body = JSON.parse(await req.text());
    if (!body.name?.trim()) return NextResponse.json({ error: "Document name is required." }, { status: 400 });
    if (!body.companyId)    return NextResponse.json({ error: "companyId is required." }, { status: 400 });

    const docs = readDb<Doc[]>("documents", []);
    const newDoc: Doc = {
      ...body,
      id: body.id ?? `doc_${Date.now()}`,
      uploadedAt: body.uploadedAt ?? new Date().toISOString(),
      version: body.version ?? 1,
    };
    docs.push(newDoc);
    writeDb("documents", docs);
    return NextResponse.json(newDoc, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = JSON.parse(await req.text());
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const docs = readDb<Doc[]>("documents", []);
    const idx = docs.findIndex(d => d.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    docs[idx] = { ...docs[idx], ...body };
    writeDb("documents", docs);
    return NextResponse.json(docs[idx]);
  } catch (err) {
    console.error("PUT /api/documents:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const docs = readDb<Doc[]>("documents", []);
    writeDb("documents", docs.filter(d => d.id !== id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/documents:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
