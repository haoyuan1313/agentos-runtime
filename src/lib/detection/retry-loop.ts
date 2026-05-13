import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// Detects when the same error is retried multiple times.
// Implements AIOS anti-pattern: retrying-deterministic-failures.
// If attempt N fails with same error as attempt N-1, skip remaining and flag.

export class RetryLoopDetector implements Detector {
  name = "retry-loop";
  description = "Detects deterministic failures being retried wastefully";

  // Track retry history by (agentId, toolCallId)
  private retryHistory = new Map<string, { lastError: string; attempts: number }>();

  process(event: TelemetryEvent): Incident | null {
    if (event.eventType !== "retry:attempt") return null;

    const key = `${event.agentId}:${event.toolCallId ?? "unknown"}`;

    const history = this.retryHistory.get(key) ?? {
      lastError: "",
      attempts: 0,
    };

    history.attempts++;

    if (event.errorMessage) {
      if (history.lastError && history.lastError === event.errorMessage) {
        // Same error on consecutive attempts → deterministic failure
        const incident: Incident = {
          id: uuid(),
          detectedAt: new Date().toISOString(),
          severity: "high",
          title: `Retry loop detected: ${event.agentName}`,
          description: `Agent ${event.agentName} has retried the same failure ${history.attempts} times. Error: "${event.errorMessage}". This is likely a deterministic failure — retries are wasted. Tool: ${event.toolName ?? "unknown"}, Max retries: ${event.maxRetries ?? "?"}`,
          detectorName: this.name,
          affectedAgentIds: [event.agentId],
          relatedEventIds: [event.id],
          status: "active",
          evidence: `Attempt #${history.attempts} on tool ${event.toolName ?? "unknown"} failed with identical error "${event.errorMessage}". Previous attempt also failed with same error. Deterministic failure detected.`,
          riskCategory: "execution_risk",
          financialImpactUsd: null,
        };

        this.retryHistory.delete(key);
        return incident;
      }

      history.lastError = event.errorMessage;
    }

    this.retryHistory.set(key, history);

    // Also detect retry exhaustion
    if (event.retryAttempt && event.maxRetries && event.retryAttempt >= event.maxRetries) {
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "medium",
        title: `Retries exhausted: ${event.agentName}`,
        description: `Agent ${event.agentName} exhausted all ${event.maxRetries} retry attempts on tool ${event.toolName ?? "unknown"}. Error: "${event.errorMessage ?? "unknown"}".`,
        detectorName: this.name,
        affectedAgentIds: [event.agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: `All ${event.maxRetries} retry attempts exhausted. Last error: "${event.errorMessage ?? "unknown"}".`,
        riskCategory: "execution_risk",
        financialImpactUsd: null,
      };

      this.retryHistory.delete(key);
      return incident;
    }

    return null;
  }

  reset(): void {
    this.retryHistory.clear();
  }
}
