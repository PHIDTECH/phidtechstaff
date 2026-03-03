import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface Company {
  id: string;
  name: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { companies, secret } = await req.json();
    if (secret !== "Kaijage@@2023") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!Array.isArray(companies)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const existing = readDb<Company[]>("companies", []);
    const existingIds = new Set(existing.map((c) => c.id));
    const toAdd = (companies as Company[]).filter((c) => c.id && !existingIds.has(c.id));

    if (toAdd.length > 0) {
      writeDb("companies", [...existing, ...toAdd]);
    }

    return NextResponse.json({ imported: toAdd.length, skipped: companies.length - toAdd.length });
  } catch (err) {
    console.error("Migrate companies error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
