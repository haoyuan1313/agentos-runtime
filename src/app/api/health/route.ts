import { NextRequest, NextResponse } from "next/server";
import { getStats, getSubscriberCount, queryEvents } from "@/lib/event-store";
import { getActiveIncidents } from "@/lib/detection/types";
import { getDetectorStatuses } from "@/lib/detection/run";
import { initDetectors } from "@/lib/detection/init";
import { SystemHealth } from "@/types/telemetry";

initDetectors();

const startTime = Date.now();

export async function GET(_req: NextRequest) {
  const stats = getStats();
  const incidents = getActiveIncidents();
  const detectorStatuses = getDetectorStatuses();
  const subscriberCount = getSubscriberCount();

  const boundaries: SystemHealth["boundaries"] = {
    ingest: stats.totalIngested > 0 ? "ok" : "degraded",
    detection: detectorStatuses.length > 0 ? "ok" : "degraded",
    stream: subscriberCount >= 0 ? "ok" : "degraded",
    wallet: "ok",
    onchain: "ok",
  };

  const health: SystemHealth = {
    status:
      incidents.filter((i) => i.severity === "critical").length > 0
        ? "critical"
        : incidents.length > 0
          ? "degraded"
          : "healthy",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    eventsIngested: stats.totalIngested,
    activeAgents: new Set(queryEvents({ limit: 200 }).map((e) => e.agentId)).size,
    activeIncidents: incidents.length,
    detectors: detectorStatuses,
    boundaries,
  };

  return NextResponse.json(health);
}
