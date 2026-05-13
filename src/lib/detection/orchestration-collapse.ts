import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// Detects when multiple agents fail within a short window.
// Indicates orchestration collapse — the orchestrator may be failing
// or there's a systemic issue.

const COLLAPSE_WINDOW_MS = 5000; // 5s for faster demo visibility
const COLLAPSE_THRESHOLD = 2; // ≥ 2 agent failures in window

export class OrchestrationCollapseDetector implements Detector {
  name = "orchestration-collapse";
  description = "Detects multiple agent failures suggesting orchestration collapse";

  private agentFailures: { agentId: string; agentName: string; timestamp: number; error: string }[] = [];

  process(event: TelemetryEvent): Incident | null {
    if (event.eventType !== "agent:failed") return null;

    const now = Date.now();
    this.agentFailures.push({
      agentId: event.agentId,
      agentName: event.agentName,
      timestamp: now,
      error: event.errorMessage ?? "unknown",
    });

    // Evict old entries
    const cutoff = now - COLLAPSE_WINDOW_MS;
    this.agentFailures = this.agentFailures.filter((f) => f.timestamp > cutoff);

    if (this.agentFailures.length >= COLLAPSE_THRESHOLD) {
      const failed = this.agentFailures.map((f) => `${f.agentName}: ${f.error}`);
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "critical",
        title: "Orchestration collapse detected",
        description: `${this.agentFailures.length} agents failed within ${COLLAPSE_WINDOW_MS / 1000}s. Failed agents: ${failed.join(", ")}. This suggests a systemic issue — possibly orchestrator failure, shared dependency outage, or chain congestion.`,
        detectorName: this.name,
        affectedAgentIds: this.agentFailures.map((f) => f.agentId),
        relatedEventIds: [event.id],
        status: "active",
        evidence: `${this.agentFailures.length} agent failures in ${COLLAPSE_WINDOW_MS / 1000}s window: ${failed.join("; ")}`,
        riskCategory: "orchestration_health",
        financialImpactUsd: null,
      };

      this.agentFailures = [];
      return incident;
    }

    return null;
  }

  reset(): void {
    this.agentFailures = [];
  }
}
