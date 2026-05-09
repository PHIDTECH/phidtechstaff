import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/serverDb";
import { sendSms } from "@/lib/beemSms";

interface SmsLog {
  id: string; to: string; recipientName: string; message: string;
  status: string; sentAt: string; trigger?: string;
}

export async function GET() {
  return NextResponse.json(readDb<SmsLog[]>("sms_log", []));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, recipientName, message } = body;

    if (!phone?.trim())   return NextResponse.json({ error: "phone required." }, { status: 400 });
    if (!message?.trim()) return NextResponse.json({ error: "message required." }, { status: 400 });

    const ok = await sendSms(phone, recipientName ?? phone, message, "manual");
    return NextResponse.json({ success: ok, sent: ok });
  } catch (e) {
    console.error("POST /api/messages:", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
