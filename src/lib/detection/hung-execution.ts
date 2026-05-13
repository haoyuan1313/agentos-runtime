import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// AI Theater detection: agents stuck in RUNNING state without progress.
// If an agent started but hasn't completed/failed within 15s → incident.

const HUNG_THRESHOLD_MS = 8000; // 8s threshold for faster demo visibility

export class HungExecutionDetector implements Detector {
  name = "hung-execution";
  description = "Detects agents stuck in RUNNING state without progress";

  private runningExecutions = new Map<string, { agentId: string; startedAt: number; executionId: string }>();

  process(event: TelemetryEvent): Incident | null {
    // Use event timestamp for faster demo response (wall clock also respected)
    const eventTime = new Date(event.timestamp).getTime();

    if (event.eventType === "agent:started" && event.executionId) {
      this.runningExecutions.set(event.executionId, {
        agentId: event.agentId,
        startedAt: isNaN(eventTime) ? Date.now() : eventTime,
        executionId: event.executionId,
      });
    }

    if (
      (event.eventType === "agent:completed" || event.eventType === "agent:failed") &&
      event.executionId
    ) {
      this.runningExecutions.delete(event.executionId);
    }

    // Check for hung executions on every event (acts as heartbeat)
    const now = Date.now();
    for (const [execId, state] of this.runningExecutions) {
      if (now - state.startedAt > HUNG_THRESHOLD_MS) {
        const incident: Incident = {
          id: uuid(),
          detectedAt: new Date().toISOString(),
          severity: "high",
          title: `Hung execution detected: ${state.agentId}`,
          description: `Agent ${state.agentId} has been in RUNNING state for > ${HUNG_THRESHOLD_MS / 1000}s without completion. Execution ID: ${execId}. This may indicate an orphaned job or crashed worker.`,
          detectorName: this.name,
          affectedAgentIds: [state.agentId],
          relatedEventIds: [],
          status: "active",
          evidence: `Agent ${state.agentId} started at ${new Date(state.startedAt).toISOString()}, execution ${execId}, no completion event received within ${(now - state.startedAt) / 1000}s`,
          riskCategory: "agent_stability",
          financialImpactUsd: null,
        };

        this.runningExecutions.delete(execId);
        return incident;
      }
    }

    return null;
  }

  reset(): void {
    this.runningExecutions.clear();
  }
}
