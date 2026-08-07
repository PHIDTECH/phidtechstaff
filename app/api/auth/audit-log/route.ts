import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/serverDb";
export const dynamic = "force-dynamic";

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export async function GET() {
  const logs = readDb<AuditEntry[]>("audit_log", []);
  // Return newest first, max 500
  return NextResponse.json([...logs].reverse().slice(0, 500));
}
