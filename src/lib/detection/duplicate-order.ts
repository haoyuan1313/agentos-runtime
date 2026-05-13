import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// Detects repeated identical trade attempts — retry amplification danger.
// If the same agent submits the same trade (market + side) within 10s → duplicate risk.
// If ≥ 2 duplicates detected → incident.

const DUPLICATE_WINDOW_MS = 10000;
const DUPLICATE_THRESHOLD = 2;

interface TradeRecord {
  market: string;
  side: string; // opened/closed
  timestamp: number;
  count: number;
  txs: string[];
}

export class DuplicateOrderDetector implements Detector {
  name = "duplicate-order";
  description = "Detects repeated identical trade attempts indicating retry amplification";

  private recentTrades = new Map<string, TradeRecord[]>();

  process(event: TelemetryEvent): Incident | null {
    const market = event.market;
    if (!market) return null;
    if (event.eventType !== "trade:opened" && event.eventType !== "trade:closed") return null;

    const key = `${event.agentId}:${market}`;
    const now = Date.now();
    const entry = this.recentTrades.get(key) ?? [];
    const side = event.eventType === "trade:opened" ? "open" : "close";

    // Find matching recent trade
    const existing = entry.find(
      (t) =>
        t.market === market &&
        t.side === side &&
        now - t.timestamp < DUPLICATE_WINDOW_MS
    );

    if (existing) {
      existing.count++;
      if (event.onchainTxHash) existing.txs.push(event.onchainTxHash);

      if (existing.count >= DUPLICATE_THRESHOLD) {
        const incident: Incident = {
          id: uuid(),
          detectedAt: new Date().toISOString(),
          severity: "high",
          title: `Duplicate order detected: ${event.agentName} on ${market}`,
          description: `Agent ${event.agentName} submitted ${existing.count} identical ${side} orders for ${market} within ${DUPLICATE_WINDOW_MS / 1000}s. This is retry amplification — each duplicate carries additional gas cost and slippage risk. Wallet: ${event.wallet ?? "unknown"}.`,
          detectorName: this.name,
          affectedAgentIds: [event.agentId],
          relatedEventIds: [event.id],
          status: "active",
          evidence: `${existing.count} ${side} orders for ${market} in ${DUPLICATE_WINDOW_MS / 1000}s window. TXs: ${existing.txs.join(", ")}. Agent: ${event.agentName}, Wallet: ${event.wallet ?? "unknown"}.`,
          riskCategory: "execution_risk",
          financialImpactUsd: event.exposureUsd ? event.exposureUsd * existing.count : null,
        };

        // Clean up
        this.recentTrades.set(key, entry.filter((t) => t !== existing));
        return incident;
      }
    } else {
      entry.push({
        market,
        side,
        timestamp: now,
        count: 1,
        txs: event.onchainTxHash ? [event.onchainTxHash] : [],
      });
    }

    // Evict old entries
    const cutoff = now - DUPLICATE_WINDOW_MS;
    this.recentTrades.set(key, entry.filter((t) => t.timestamp > cutoff));

    return null;
  }

  reset(): void {
    this.recentTrades.clear();
  }
}
