import { TelemetryEvent, Incident } from "@/types/telemetry";

// Each detector implements this interface.
// Detectors are called on every ingested event and can emit incidents
// when a failure pattern is detected.

export interface Detector {
  name: string;
  description: string;
  /** Process an incoming event. Returns incident if pattern detected. */
  process(event: TelemetryEvent): Incident | null;
  /** Reset internal state (for demo/testing). */
  reset(): void;
}

// In-memory incident store
const incidents: Incident[] = [];

export function addIncident(incident: Incident): Incident {
  // Deduplicate: don't add if same detector + same agent within 30s
  const recent = incidents.find(
    (i) =>
      i.detectorName === incident.detectorName &&
      i.affectedAgentIds.some((id) => incident.affectedAgentIds.includes(id)) &&
      i.status === "active" &&
      Date.now() - new Date(i.detectedAt).getTime() < 30000
  );

  if (!recent) {
    incidents.unshift(incident);
  }

  return incident;
}

export function getActiveIncidents(): Incident[] {
  return incidents.filter((i) => i.status === "active");
}

export function getAllIncidents(limit = 50): Incident[] {
  return incidents.slice(0, limit);
}

export function resolveIncident(id: string): void {
  const incident = incidents.find((i) => i.id === id);
  if (incident) incident.status = "resolved";
}
