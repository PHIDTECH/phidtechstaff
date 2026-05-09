import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

interface BeemSettings {
  apiKey: string;
  secretKey: string;
  senderId: string;
}

export async function GET() {
  const settings = readDb<BeemSettings>("beem_settings", {
    apiKey: "", secretKey: "", senderId: "INFO",
  });
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings: BeemSettings = {
      apiKey:    (body.apiKey    ?? "").trim(),
      secretKey: (body.secretKey ?? "").trim(),
      senderId:  (body.senderId  ?? "INFO").trim(),
    };
    writeDb("beem_settings", settings);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/settings/beem:", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
