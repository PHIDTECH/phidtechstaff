import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/serverDb";

interface BeemSettings { apiKey: string; secretKey: string; senderId: string; }

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json() as { phone: string };
    if (!phone?.trim()) return NextResponse.json({ error: "phone required" }, { status: 400 });

    const s = readDb<BeemSettings>("beem_settings", { apiKey: "", secretKey: "", senderId: "INFO" });
    if (!s.apiKey || !s.secretKey)
      return NextResponse.json({ ok: false, error: "Beem credentials not configured" });

    let p = phone.trim().replace(/[\s\-\(\)\.]/g, "");
    if (p.startsWith("+")) p = p.slice(1);
    if (p.startsWith("0")) p = "255" + p.slice(1);
    if (!p.startsWith("255")) p = "255" + p;

    const credentials = Buffer.from(`${s.apiKey}:${s.secretKey}`).toString("base64");
    const res = await fetch("https://apisms.beem.africa/v1/send", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source_addr: s.senderId || "INFO",
        schedule_time: "",
        encoding: 0,
        message: `PHIDTECH SMS Test — if you receive this your SMS settings are working correctly. Sender: ${s.senderId || "INFO"}`,
        recipients: [{ recipient_id: 1, dest_addr: p }],
      }),
      cache: "no-store",
    });

    let body: Record<string, unknown> = {};
    try { body = await res.json(); } catch {}

    const ok = res.ok && (body.code === 100 || body.code === 200 ||
      (typeof body.message === "string" && body.message.toLowerCase().includes("success")));

    return NextResponse.json({
      ok,
      httpStatus: res.status,
      beemCode: body.code,
      beemMessage: body.message,
      beemBody: body,
      normalisedPhone: p,
      senderId: s.senderId || "INFO",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
