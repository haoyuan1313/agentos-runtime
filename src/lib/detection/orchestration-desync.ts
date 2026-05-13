import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// Detects when agents disagree about execution state.
// If one agent reports trade:opened while another reports trade:failed
// for the same execution within a short window, orchestration is desynchronized.
//
// Also catches explicitly flagged orchestration_desync events.

const DESYNC_WINDOW_MS = 5000;

interface ExecutionState {
  executionId: string;
  status: "success" | "failure";
  agentId: string;
  reportedAt: number;
}

export class OrchestrationDesyncDetector implements Detector {
  name = "orchestration-desync";
  description = "Detects agents disagreeing on execution state";

  private executions = new Map<string, ExecutionState[]>();

  process(event: TelemetryEvent): Incident | null {
    // Explicit desync event
    if (event.eventType === "trade:orchestration_desync") {
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "critical",
        title: `Orchestration desync: ${event.agentName}`,
        description: `Agent ${event.agentName} detected orchestration state disagreement. ${event.evidence ?? ""} Agents may be operating on inconsistent views of execution state, potentially leading to duplicate trades or missed executions.`,
        detectorName: this.name,
        affectedAgentIds: [event.agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: event.evidence ?? `Orchestration desync reported by ${event.agentName}.`,
        riskCategory: "orchestration_health",
        financialImpactUsd: event.exposureUsd ?? null,
      };
      return incident;
    }

    // Track execution state from agent events
    if (!event.executionId) return null;

    const isTradeEvent =
      event.eventType === "trade:opened" ||
      event.eventType === "trade:closed" ||
      event.eventType === "trade:failed";

    if (!isTradeEvent) return null;

    const status: "success" | "failure" =
      event.eventType === "trade:failed" ? "failure" : "success";

    const entry = this.executions.get(event.executionId) ?? [];
    const now = Date.now();

    // Check for conflicting states
    const conflict = entry.find(
      (e) => e.status !== status && now - e.reportedAt < DESYNC_WINDOW_MS
    );

    if (conflict) {
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "critical",
        title: `Orchestration desync detected: ${event.executionId.slice(0, 8)}...`,
        description: `Agent ${event.agentName} reports ${status} for execution ${event.executionId.slice(0, 8)}... while agent ${conflict.agentId} reported ${conflict.status}. Agents have inconsistent views of execution state — orchestration integrity is compromised.`,
        detectorName: this.name,
        affectedAgentIds: [event.agentId, conflict.agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: `Execution ${event.executionId}: Agent ${conflict.agentId} reported ${conflict.status} at ${new Date(conflict.reportedAt).toISOString()}, Agent ${event.agentId} reported ${status} at ${new Date().toISOString()}. ${DESYNC_WINDOW_MS / 1000}s window.`,
        riskCategory: "orchestration_health",
        financialImpactUsd: event.exposureUsd ?? null,
      };

      this.executions.delete(event.executionId);
      return incident;
    }

    // Nonce conflict
    if (event.eventType === "trade:nonce_conflict") {
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "high",
        title: `Nonce conflict: ${event.agentName}`,
        description: `Agent ${event.agentName} detected a nonce conflict on wallet ${event.wallet ?? "unknown"}. Nonce: ${event.nonce ?? "unknown"}. ${event.evidence ?? ""}`,
        detectorName: this.name,
        affectedAgentIds: [event.agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: event.evidence ?? `Nonce conflict for wallet ${event.wallet ?? "unknown"}, nonce ${event.nonce ?? "unknown"}.`,
        riskCategory: "wallet_risk",
        financialImpactUsd: null,
      };
      return incident;
    }

    // Wallet mismatch
    if (event.eventType === "trade:wallet_mismatch") {
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "high",
        title: `Wallet mismatch: ${event.agentName}`,
        description: `Agent ${event.agentName} detected a wallet mismatch. ${event.evidence ?? ""} The executing wallet does not match the expected wallet for this agent.`,
        detectorName: this.name,
        affectedAgentIds: [event.agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: event.evidence ?? `Wallet mismatch reported by agent ${event.agentName}.`,
        riskCategory: "wallet_risk",
        financialImpactUsd: event.exposureUsd ?? null,
      };
      return incident;
    }

    entry.push({ executionId: event.executionId, status, agentId: event.agentId, reportedAt: now });

    // Evict old
    const cutoff = now - DESYNC_WINDOW_MS;
    this.executions.set(
      event.executionId,
      entry.filter((e) => e.reportedAt > cutoff)
    );

    return null;
  }

  reset(): void {
    this.executions.clear();
  }
}
