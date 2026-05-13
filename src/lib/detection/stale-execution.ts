import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// Detects executions using stale market data.
// If a trade is executed with a timestamp significantly older than the
// most recent market data event for that symbol, the execution is stale.
//
// Also catches explicitly flagged stale_execution events from agents.

const STALE_THRESHOLD_MS = 10000; // Market data > 10s old

interface MarketDataPoint {
  symbol: string;
  price: number | null;
  updatedAt: number;
}

export class StaleExecutionDetector implements Detector {
  name = "stale-execution";
  description = "Detects trades executed against stale market data";

  private marketData = new Map<string, MarketDataPoint>();

  process(event: TelemetryEvent): Incident | null {
    const now = Date.now();

    // Track market data freshness from events
    if (event.market || event.symbol) {
      const symbol = event.market ?? event.symbol!;
      const existing = this.marketData.get(symbol);
      if (!existing || event.timestamp > new Date(existing.updatedAt).toISOString()) {
        this.marketData.set(symbol, {
          symbol,
          price: (event.metadata?.price as number) ?? null,
          updatedAt: now,
        });
      }
    }

    // Explicit stale execution event
    if (event.eventType === "trade:stale_execution") {
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "high",
        title: `Stale market execution: ${event.agentName}`,
        description: `Agent ${event.agentName} executed a trade using outdated market data for ${event.market ?? event.symbol ?? "unknown market"}. ${event.evidence ?? ""} This can result in unfavorable pricing and unexpected slippage.`,
        detectorName: this.name,
        affectedAgentIds: [event.agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: event.evidence ?? `Stale execution on ${event.market ?? event.symbol ?? "unknown"}. Agent: ${event.agentName}.`,
        riskCategory: "market_sync_risk",
        financialImpactUsd: event.exposureUsd ?? null,
      };
      return incident;
    }

    // Check trade events against market data freshness
    if (
      (event.eventType === "trade:opened" || event.eventType === "trade:closed") &&
      event.market
    ) {
      const md = this.marketData.get(event.market);
      const eventTime = new Date(event.timestamp).getTime();

      if (md && !isNaN(eventTime) && now - md.updatedAt > STALE_THRESHOLD_MS) {
        const incident: Incident = {
          id: uuid(),
          detectedAt: new Date().toISOString(),
          severity: "medium",
          title: `Potentially stale execution: ${event.agentName} on ${event.market}`,
          description: `Agent ${event.agentName} executed a trade on ${event.market} but the most recent market data is ${Math.round((now - md.updatedAt) / 1000)}s old. This trade may have executed at unfavorable prices.`,
          detectorName: this.name,
          affectedAgentIds: [event.agentId],
          relatedEventIds: [event.id],
          status: "active",
          evidence: `Trade on ${event.market} at ${event.timestamp}. Last market data: ${Math.round((now - md.updatedAt) / 1000)}s ago. Threshold: ${STALE_THRESHOLD_MS / 1000}s.`,
          riskCategory: "market_sync_risk",
          financialImpactUsd: event.exposureUsd ?? null,
        };
        return incident;
      }
    }

    return null;
  }

  reset(): void {
    this.marketData.clear();
  }
}
