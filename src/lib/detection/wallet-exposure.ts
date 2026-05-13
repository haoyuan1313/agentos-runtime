import { v4 as uuid } from "uuid";
import { TelemetryEvent, Incident } from "@/types/telemetry";
import { Detector } from "./types";

// Detects abnormal wallet exposure growth.
// Tracks cumulative exposure per wallet and fires when it exceeds thresholds.
// Threshold increases are rapid (>50% in 30s) or absolute ($100k+ simulated).

const EXPOSURE_WINDOW_MS = 30000;
const EXPOSURE_SPIKE_RATIO = 1.5; // 50% increase
const EXPOSURE_ABSOLUTE_THRESHOLD = 100000; // $100k

interface WalletExposure {
  address: string;
  agentId: string;
  agentName: string;
  currentExposure: number;
  peakExposure: number;
  trades: number;
  lastUpdated: number;
}

export class WalletExposureDetector implements Detector {
  name = "wallet-exposure";
  description = "Detects abnormal wallet exposure growth";

  private wallets = new Map<string, WalletExposure>();

  process(event: TelemetryEvent): Incident | null {
    const wallet = event.wallet;
    if (!wallet) return null;

    let w = this.wallets.get(wallet);
    if (!w) {
      w = {
        address: wallet,
        agentId: event.agentId,
        agentName: event.agentName,
        currentExposure: 0,
        peakExposure: 0,
        trades: 0,
        lastUpdated: Date.now(),
      };
      this.wallets.set(wallet, w);
    }

    const now = Date.now();

    if (event.eventType === "trade:opened" && event.exposureUsd) {
      const prevExposure = w.currentExposure;
      w.currentExposure += event.exposureUsd;
      w.trades++;
      w.lastUpdated = now;
      w.peakExposure = Math.max(w.peakExposure, w.currentExposure);
      w.agentName = event.agentName; // keep name current

      // Check absolute threshold
      if (w.currentExposure > EXPOSURE_ABSOLUTE_THRESHOLD) {
        const incident: Incident = {
          id: uuid(),
          detectedAt: new Date().toISOString(),
          severity: "critical",
          title: `Wallet exposure breach: ${w.agentName}`,
          description: `Wallet ${wallet.slice(0, 8)}... has exposure of $${w.currentExposure.toLocaleString()} across ${w.trades} trades. This exceeds the $${EXPOSURE_ABSOLUTE_THRESHOLD.toLocaleString()} safety threshold. Agent: ${w.agentName}. Immediate review required.`,
          detectorName: this.name,
          affectedAgentIds: [w.agentId],
          relatedEventIds: [event.id],
          status: "active",
          evidence: `Wallet ${wallet}: exposure $${w.currentExposure.toLocaleString()} > $${EXPOSURE_ABSOLUTE_THRESHOLD.toLocaleString()} threshold. ${w.trades} trades. Peak: $${w.peakExposure.toLocaleString()}.`,
          riskCategory: "wallet_risk",
          financialImpactUsd: w.currentExposure,
        };

        // Reset counter to allow re-triggering on further growth
        w.currentExposure = 0;
        return incident;
      }

      // Check rapid spike
      if (
        prevExposure > 0 &&
        w.currentExposure / prevExposure > EXPOSURE_SPIKE_RATIO &&
        now - w.lastUpdated < EXPOSURE_WINDOW_MS
      ) {
        const incident: Incident = {
          id: uuid(),
          detectedAt: new Date().toISOString(),
          severity: "high",
          title: `Wallet exposure spike: ${w.agentName}`,
          description: `Wallet ${wallet.slice(0, 8)}... exposure spiked from $${prevExposure.toLocaleString()} to $${w.currentExposure.toLocaleString()} (${Math.round((w.currentExposure / prevExposure - 1) * 100)}% increase). Agent: ${w.agentName}. This may indicate retry amplification or uncontrolled position sizing.`,
          detectorName: this.name,
          affectedAgentIds: [w.agentId],
          relatedEventIds: [event.id],
          status: "active",
          evidence: `Exposure spike: $${prevExposure.toLocaleString()} → $${w.currentExposure.toLocaleString()} (${Math.round((w.currentExposure / prevExposure - 1) * 100)}%) in <${EXPOSURE_WINDOW_MS / 1000}s. Wallet: ${wallet}.`,
          riskCategory: "wallet_risk",
          financialImpactUsd: w.currentExposure - prevExposure,
        };

        return incident;
      }
    }

    if (event.eventType === "trade:closed" && event.exposureUsd) {
      w.currentExposure = Math.max(0, w.currentExposure - event.exposureUsd);
      w.lastUpdated = now;
    }

    if (event.eventType === "trade:exposure_breach") {
      const incident: Incident = {
        id: uuid(),
        detectedAt: new Date().toISOString(),
        severity: "critical",
        title: `Exposure limit breach: ${w.agentName}`,
        description: `Agent ${w.agentName} reported an exposure limit breach. ${event.evidence ?? "No additional evidence provided."}`,
        detectorName: this.name,
        affectedAgentIds: [w.agentId],
        relatedEventIds: [event.id],
        status: "active",
        evidence: event.evidence ?? `Exposure breach event from agent ${event.agentName}, wallet ${wallet}.`,
        riskCategory: "wallet_risk",
        financialImpactUsd: event.exposureUsd ?? w.currentExposure,
      };

      return incident;
    }

    return null;
  }

  reset(): void {
    this.wallets.clear();
  }
}
