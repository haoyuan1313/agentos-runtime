import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector, addIncident } from "./types";

// Detector registry — populated at startup
const detectors: Detector[] = [];

export function registerDetector(detector: Detector): void {
  detectors.push(detector);
}

export function getDetectors(): Detector[] {
  return detectors;
}

export function getDetectorStatuses(): { name: string; status: string; lastRun: string | null }[] {
  return detectors.map((d) => ({
    name: d.name,
    status: "active",
    lastRun: new Date().toISOString(),
  }));
}

export function runDetectors(event: TelemetryEvent): Incident[] {
  const incidents: Incident[] = [];

  for (const detector of detectors) {
    try {
      const incident = detector.process(event);
      if (incident) {
        addIncident(incident);
        incidents.push(incident);
      }
    } catch (err) {
      // Detector failure must never crash the system — AIOS failure isolation
      console.error(`Detector ${detector.name} failed processing event ${event.id}:`, err);
    }
  }

  return incidents;
}

// Export this for the agents/status route
export { detectors };
