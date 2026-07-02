import { NextResponse } from "next/server";
import { readDb } from "@/lib/serverDb";

interface BeemSettings { apiKey: string; secretKey: string; senderId: string; }

export async function GET() {
  const s = readDb<BeemSettings>("beem_settings", { apiKey: "", secretKey: "", senderId: "INFO" });
  const sid = s.senderId || "INFO";
  try {
    if (!s.apiKey || !s.secretKey)
      return NextResponse.json({ balance: null, senderId: sid, error: "Not configured" });

    const credentials = Buffer.from(`${s.apiKey}:${s.secretKey}`).toString("base64");
    const res = await fetch("https://apisms.beem.africa/v1/vendors/balance", {
      headers: { Authorization: `Basic ${credentials}` },
      cache: "no-store",
    });
    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try { const b = await res.json(); errText = (b.message as string) || errText; } catch {}
      return NextResponse.json({ balance: null, senderId: sid, error: errText });
    }
    const data = await res.json();
    return NextResponse.json({
      balance: data.data?.credit_balance ?? data.balance ?? null,
      senderId: sid,
    });
  } catch (e) {
    return NextResponse.json({ balance: null, senderId: sid, error: String(e) });
  }
}
