import { NextResponse } from "next/server";
import { readDb } from "@/lib/serverDb";

interface BeemSettings { apiKey: string; secretKey: string; senderId: string; }

export async function GET() {
  try {
    const s = readDb<BeemSettings>("beem_settings", { apiKey: "", secretKey: "", senderId: "" });
    if (!s.apiKey || !s.secretKey) return NextResponse.json({ balance: null, error: "Not configured" });

    const credentials = Buffer.from(`${s.apiKey}:${s.secretKey}`).toString("base64");
    const res = await fetch("https://apisms.beem.africa/v1/vendors/balance", {
      headers: { Authorization: `Basic ${credentials}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ balance: null, error: "Failed to fetch" });
    const data = await res.json();
    return NextResponse.json({ balance: data.data?.credit_balance ?? data.balance ?? null, senderId: s.senderId });
  } catch {
    return NextResponse.json({ balance: null, error: "Network error" });
  }
}
