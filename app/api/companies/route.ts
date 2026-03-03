import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface Company {
  id: string;
  name: string;
  industry?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export async function GET() {
  const companies = readDb<Company[]>("companies", []);
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companies = readDb<Company[]>("companies", []);

    if (companies.find((c) => c.name.toLowerCase() === body.name?.toLowerCase())) {
      return NextResponse.json({ error: "A company with this name already exists." }, { status: 409 });
    }

    const newCompany: Company = {
      ...body,
      id: body.id ?? `c${Date.now()}`,
      createdAt: body.createdAt ?? new Date().toISOString().slice(0, 10),
    };
    companies.push(newCompany);
    writeDb("companies", companies);
    return NextResponse.json(newCompany, { status: 201 });
  } catch (err) {
    console.error("POST /api/companies:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const companies = readDb<Company[]>("companies", []);
    const idx = companies.findIndex((c) => c.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Company not found." }, { status: 404 });

    companies[idx] = { ...companies[idx], ...body };
    writeDb("companies", companies);
    return NextResponse.json(companies[idx]);
  } catch (err) {
    console.error("PUT /api/companies:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const companies = readDb<Company[]>("companies", []);
    writeDb("companies", companies.filter((c) => c.id !== id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/companies:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
