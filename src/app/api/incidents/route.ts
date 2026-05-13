import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getActiveIncidents, getAllIncidents, resolveIncident } from "@/lib/detection/types";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const active = url.searchParams.get("active") !== "false";
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  const incidents = active ? getActiveIncidents() : getAllIncidents(limit);

  return NextResponse.json({ incidents, meta: { timestamp: new Date().toISOString() } });
}

export async function PATCH(req: NextRequest) {
  const requestId = (req.headers.get("x-request-id") ?? uuid()).slice(0, 128);

  try {
    const { incidentId } = await req.json();
    resolveIncident(incidentId);
    return NextResponse.json({
      resolved: true,
      incidentId,
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request", meta: { timestamp: new Date().toISOString(), requestId } },
      { status: 400 }
    );
  }
}
