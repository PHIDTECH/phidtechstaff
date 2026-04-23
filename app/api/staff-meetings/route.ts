import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface StaffMeeting {
  id: string;
  companyId: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  type: "regular" | "emergency" | "training" | "review";
  agenda: string;
  feedback?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: "scheduled" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

function getId() { return 'sm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }

export async function GET(request: NextRequest) {
  try {
    const meetings = readDb<StaffMeeting[]>("staff-meetings", []);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    let filtered = companyId ? meetings.filter(m => m.companyId === companyId) : meetings;
    filtered.sort((a, b) => new Date(b.date + ' ' + (b.time || '00:00')).getTime() - new Date(a.date + ' ' + (a.time || '00:00')).getTime());
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Staff meetings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch staff meetings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, title, date, type, createdBy } = body;
    if (!companyId || !title || !date || !type || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const meetings = readDb<StaffMeeting[]>("staff-meetings", []);
    const newMeeting: StaffMeeting = {
      ...body,
      id: body.id ?? getId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    meetings.push(newMeeting);
    writeDb("staff-meetings", meetings);
    return NextResponse.json(newMeeting, { status: 201 });
  } catch (error) {
    console.error("Staff meetings POST error:", error);
    return NextResponse.json({ error: "Failed to create staff meeting" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Meeting ID is required" }, { status: 400 });
    const meetings = readDb<StaffMeeting[]>("staff-meetings", []);
    const idx = meetings.findIndex(m => m.id === id);
    if (idx === -1) return NextResponse.json({ error: "Staff meeting not found" }, { status: 404 });
    meetings[idx] = { ...meetings[idx], ...updates, updatedAt: new Date().toISOString() };
    writeDb("staff-meetings", meetings);
    return NextResponse.json(meetings[idx]);
  } catch (error) {
    console.error("Staff meetings PUT error:", error);
    return NextResponse.json({ error: "Failed to update staff meeting" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Meeting ID is required" }, { status: 400 });
    const meetings = readDb<StaffMeeting[]>("staff-meetings", []);
    writeDb("staff-meetings", meetings.filter(m => m.id !== id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff meetings DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete staff meeting" }, { status: 500 });
  }
}
