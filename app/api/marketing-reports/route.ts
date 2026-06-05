import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface MarketingReport {
  id: string;
  companyId: string;
  staffId: string;
  date: string;
  campaign?: string;
  activities: string;
  leadsGenerated: number;
  conversions: number;
  feedback: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: "draft" | "submitted";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

function getId() { return 'mr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }

export async function GET(request: NextRequest) {
  try {
    const reports = readDb<MarketingReport[]>("marketing-reports", []);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const staffId = searchParams.get('staffId');
    let filtered = reports;
    if (companyId) filtered = filtered.filter(r => r.companyId === companyId);
    if (staffId) filtered = filtered.filter(r => r.staffId === staffId);
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Marketing reports GET error:", error);
    return NextResponse.json({ error: "Failed to fetch marketing reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.staffId || !body.date || !body.createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!body.companyId) body.companyId = "group";
    const reports = readDb<MarketingReport[]>("marketing-reports", []);
    const newReport: MarketingReport = {
      ...body,
      id: body.id ?? getId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reports.push(newReport);
    writeDb("marketing-reports", reports);
    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error("Marketing reports POST error:", error);
    return NextResponse.json({ error: "Failed to create marketing report" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    const reports = readDb<MarketingReport[]>("marketing-reports", []);
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) return NextResponse.json({ error: "Marketing report not found" }, { status: 404 });
    reports[idx] = { ...reports[idx], ...updates, updatedAt: new Date().toISOString() };
    writeDb("marketing-reports", reports);
    return NextResponse.json(reports[idx]);
  } catch (error) {
    console.error("Marketing reports PUT error:", error);
    return NextResponse.json({ error: "Failed to update marketing report" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    writeDb("marketing-reports", readDb<MarketingReport[]>("marketing-reports", []).filter(r => r.id !== id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Marketing reports DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete marketing report" }, { status: 500 });
  }
}
