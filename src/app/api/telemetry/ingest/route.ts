import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { TelemetryEventSchema } from "@/types/telemetry";
import { ingestEvent } from "@/lib/event-store";
import { createModuleLogger } from "@/lib/logger";
import { runDetectors } from "@/lib/detection/run";
import { initDetectors } from "@/lib/detection/init";

// Register detectors on first request (idempotent)
initDetectors();

const log = createModuleLogger("api:telemetry:ingest");

export async function POST(req: NextRequest) {
  const requestId = (req.headers.get("x-request-id") ?? uuid()).slice(0, 128);
  const start = Date.now();

  try {
    const body = await req.json();
    const parseResult = TelemetryEventSchema.safeParse(body);

    if (!parseResult.success) {
      log.warn({ requestId, errors: parseResult.error.issues }, "Invalid telemetry event");
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.issues,
          meta: { timestamp: new Date().toISOString(), requestId },
        },
        { status: 400 }
      );
    }

    const event = parseResult.data;
    ingestEvent(event);

    // Run detection engines on this event
    const incidents = runDetectors(event);

    const durationMs = Date.now() - start;
    log.info(
      {
        requestId,
        eventId: event.id,
        eventType: event.eventType,
        agentId: event.agentId,
        incidentsDetected: incidents.length,
        durationMs,
      },
      "Telemetry ingested"
    );

    return NextResponse.json({
      ingested: true,
      eventId: event.id,
      incidentsDetected: incidents.map((i) => i.id),
      meta: { timestamp: new Date().toISOString(), requestId, durationMs },
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    log.error({ requestId, err, durationMs }, "Telemetry ingestion failed");
    return NextResponse.json(
      {
        error: "Internal error",
        meta: { timestamp: new Date().toISOString(), requestId },
      },
      { status: 500 }
    );
  }
}
