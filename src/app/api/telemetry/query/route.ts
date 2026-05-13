import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getStats, queryEvents } from "@/lib/event-store";

export async function GET(req: NextRequest) {
  const requestId = (req.headers.get("x-request-id") ?? uuid()).slice(0, 128);
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);
  const eventType = url.searchParams.get("eventType") ?? undefined;
  const agentId = url.searchParams.get("agentId") ?? undefined;

  const events = queryEvents({ limit, eventType, agentId });
  const stats = getStats();

  return NextResponse.json({
    events,
    stats,
    meta: { timestamp: new Date().toISOString(), requestId },
  });
}
