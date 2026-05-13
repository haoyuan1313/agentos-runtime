import { v4 as uuid } from "uuid";
import { TelemetryEvent } from "@/types/telemetry";

// ── In-Memory Ring Buffer Event Store ──────────────────────────────────
// Stores last N events in memory for real-time querying.
// Follows AIOS observability standard: ring buffer + per-type stats.

const RING_BUFFER_SIZE = 1000;

const eventBuffer: TelemetryEvent[] = [];
let bufferIndex = 0;
let totalIngested = 0;

// Per-type stats
const eventStats = new Map<
  string,
  { emitted: number; errors: number; lastEmittedAt: string | null }
>();

// SSE subscribers — Map<clientId, ReadableStreamController>
const subscribers = new Map<string, ReadableStreamDefaultController>();

export function ingestEvent(raw: unknown): TelemetryEvent {
  // In production: validate via TelemetryEventSchema.parse(raw)
  const event = raw as TelemetryEvent;

  // Ring buffer write
  if (eventBuffer.length < RING_BUFFER_SIZE) {
    eventBuffer.push(event);
  } else {
    eventBuffer[bufferIndex % RING_BUFFER_SIZE] = event;
  }
  bufferIndex++;
  totalIngested++;

  // Per-type stats
  const stats = eventStats.get(event.eventType) ?? {
    emitted: 0,
    errors: 0,
    lastEmittedAt: null,
  };
  stats.emitted++;
  stats.lastEmittedAt = event.timestamp;
  if (event.errorMessage) stats.errors++;
  eventStats.set(event.eventType, stats);

  // Push to SSE subscribers
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const [id, controller] of subscribers) {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      subscribers.delete(id);
    }
  }

  return event;
}

export function queryEvents(options: {
  limit?: number;
  eventType?: string;
  agentId?: string;
  since?: string;
}): TelemetryEvent[] {
  let results = [...eventBuffer].filter(Boolean);

  if (options.eventType) {
    results = results.filter((e) => e.eventType === options.eventType);
  }
  if (options.agentId) {
    results = results.filter((e) => e.agentId === options.agentId);
  }
  if (options.since) {
    results = results.filter((e) => e.timestamp >= options.since!);
  }

  const limit = options.limit ?? 100;
  return results.slice(-limit);
}

export function getStats() {
  const entries = Array.from(eventStats.entries()).map(([type, stats]) => ({
    eventType: type,
    ...stats,
  }));

  return {
    totalIngested,
    bufferSize: eventBuffer.length,
    ringBufferSize: RING_BUFFER_SIZE,
    byType: entries,
  };
}

export function addSubscriber(
  clientId: string,
  controller: ReadableStreamDefaultController
) {
  subscribers.set(clientId, controller);
}

export function removeSubscriber(clientId: string) {
  subscribers.delete(clientId);
}

export function getSubscriberCount(): number {
  return subscribers.size;
}
