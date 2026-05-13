import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// Detects stuck on-chain transactions.
// If a tx_submitted event has no corresponding tx_confirmed or tx_failed
// within the stall threshold, the transaction is stalled.

const STALL_THRESHOLD_MS = 15000; // 15s without confirmation

interface PendingTx {
  hash: string;
  agentId: string;
  agentName: string;
  wallet: string | null;
  submittedAt: number;
  nonce: number | null;
}

export class TransactionStallDetector implements Detector {
  name = "tx-stall";
  description = "Detects stuck on-chain transactions";

  private pendingTxs = new Map<string, PendingTx>();

  process(event: TelemetryEvent): Incident | null {
    if (event.eventType === "onchain:tx_submitted" && event.onchainTxHash) {
      this.pendingTxs.set(event.onchainTxHash, {
        hash: event.onchainTxHash,
        agentId: event.agentId,
        agentName: event.agentName,
        wallet: event.wallet,
        submittedAt: Date.now(),
        nonce: event.nonce,
      });
    }

    // Clear confirmed or failed
    if (
      (event.eventType === "onchain:tx_confirmed" ||
        event.eventType === "onchain:tx_failed") &&
      event.onchainTxHash
    ) {
      this.pendingTxs.delete(event.onchainTxHash);
    }

    // Also handle trading-specific stall events
    if (event.eventType === "trade:tx_stuck" && event.onchainTxHash) {
      const tx = this.pendingTxs.get(event.onchainTxHash);
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "high",
        title: `Transaction stalled: ${event.agentName}`,
        description: `Agent ${event.agentName} reported transaction ${event.onchainTxHash.slice(0, 10)}... as stuck. ${event.evidence ?? ""} Nonce: ${event.nonce ?? "unknown"}, Wallet: ${event.wallet ?? "unknown"}. This may block subsequent transactions.`,
        detectorName: this.name,
        affectedAgentIds: [event.agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: event.evidence ?? `TX ${event.onchainTxHash} reported stuck by agent ${event.agentName}. Nonce: ${event.nonce ?? "unknown"}.`,
        riskCategory: "execution_risk",
        financialImpactUsd: event.exposureUsd ?? null,
      };

      if (tx) this.pendingTxs.delete(event.onchainTxHash);
      return incident;
    }

    // Periodic check for stalled txs
    const now = Date.now();
    for (const [hash, tx] of this.pendingTxs) {
      if (now - tx.submittedAt > STALL_THRESHOLD_MS) {
        const incident: Incident = {
          id: uuid(),
          detectedAt: new Date().toISOString(),
          severity: "high",
          title: `Transaction stalled: ${tx.agentName}`,
          description: `Transaction ${hash.slice(0, 10)}... from agent ${tx.agentName} has been pending for ${Math.round((now - tx.submittedAt) / 1000)}s without confirmation. Nonce: ${tx.nonce ?? "unknown"}, Wallet: ${tx.wallet ?? "unknown"}. This may indicate network congestion or gas underpayment.`,
          detectorName: this.name,
          affectedAgentIds: [tx.agentId],
          relatedEventIds: [],
          status: "active",
          evidence: `TX ${hash} submitted at ${new Date(tx.submittedAt).toISOString()}, no confirmation after ${Math.round((now - tx.submittedAt) / 1000)}s. Nonce: ${tx.nonce ?? "unknown"}. Wallet: ${tx.wallet ?? "unknown"}.`,
          riskCategory: "execution_risk",
          financialImpactUsd: null,
        };

        this.pendingTxs.delete(hash);
        return incident;
      }
    }

    return null;
  }

  reset(): void {
    this.pendingTxs.clear();
  }
}
