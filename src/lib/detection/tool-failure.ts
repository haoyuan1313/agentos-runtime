import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// Detects tool failure rate exceeding threshold per agent.
// If ≥ 3 tool failures within a 60s window for the same agent → incident.

const FAILURE_WINDOW_MS = 60000;
const FAILURE_THRESHOLD = 3;

export class ToolFailureDetector implements Detector {
  name = "tool-failure";
  description = "Detects excessive tool failure rates per agent";

  private failureWindows = new Map<string, { timestamps: number[]; failures: { toolName: string; error: string }[] }>();

  process(event: TelemetryEvent): Incident | null {
    if (event.eventType !== "tool:failed") return null;

    const agentId = event.agentId;
    const window = this.failureWindows.get(agentId) ?? {
      timestamps: [],
      failures: [],
    };

    const now = Date.now();
    window.timestamps.push(now);
    window.failures.push({
      toolName: event.toolName ?? "unknown",
      error: event.errorMessage ?? "unknown error",
    });

    // Evict old entries outside the window
    const cutoff = now - FAILURE_WINDOW_MS;
    window.timestamps = window.timestamps.filter((t, i) => t > cutoff);
    window.failures = window.failures.slice(-window.timestamps.length);

    this.failureWindows.set(agentId, window);

    if (window.timestamps.length >= FAILURE_THRESHOLD) {
      const uniqueTools = [...new Set(window.failures.map((f) => f.toolName))];
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "high",
        title: `Excessive tool failures: ${event.agentName}`,
        description: `Agent ${event.agentName} has ${window.timestamps.length} tool failures in the last ${FAILURE_WINDOW_MS / 1000}s. Failing tools: ${uniqueTools.join(", ")}. This may indicate a configuration issue, invalid inputs, or a broken dependency.`,
        detectorName: this.name,
        affectedAgentIds: [agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: `${window.timestamps.length} tool failures in ${FAILURE_WINDOW_MS / 1000}s window. Failures: ${window.failures.map((f) => `${f.toolName}: ${f.error}`).join("; ")}`,
        riskCategory: "execution_risk",
        financialImpactUsd: null,
      };

      this.failureWindows.delete(agentId);
      return incident;
    }

    return null;
  }

  reset(): void {
    this.failureWindows.clear();
  }
}
