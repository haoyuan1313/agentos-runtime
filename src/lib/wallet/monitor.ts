import { queryEvents } from "@/lib/event-store";
import { WalletState } from "@/types/telemetry";

// Wallet operational monitor — tracks per-wallet health from telemetry.
// Computes pending tx count, failure rate, duplicate nonce risk,
// exposure, retry amplification, and confirmation latency.

export function getWalletStates(): WalletState[] {
  const events = queryEvents({ limit: 1000 });
  const walletMap = new Map<string, WalletState>();

  for (const event of events) {
    const wallet = event.wallet;
    if (!wallet) continue;

    let ws = walletMap.get(wallet);
    if (!ws) {
      ws = {
        address: wallet,
        agentId: event.agentId,
        agentName: event.agentName,
        pendingTxCount: 0,
        failedTxCount: 0,
        confirmedTxCount: 0,
        duplicateNonceRisk: false,
        currentExposureUsd: 0,
        retryAmplificationCount: 0,
        avgConfirmationLatencyMs: null,
        status: "healthy",
        recentTxs: [],
      };
      walletMap.set(wallet, ws);
    }

    // Keep agent name current
    ws.agentName = event.agentName;

    switch (event.eventType) {
      case "onchain:tx_submitted":
        ws.pendingTxCount++;
        if (event.onchainTxHash) {
          ws.recentTxs.push({
            hash: event.onchainTxHash,
            status: "pending",
            nonce: event.nonce,
            age: Math.floor((Date.now() - new Date(event.timestamp).getTime()) / 1000),
          });
        }
        break;
      case "onchain:tx_confirmed":
        ws.pendingTxCount = Math.max(0, ws.pendingTxCount - 1);
        ws.confirmedTxCount++;
        // Update matching tx
        for (const tx of ws.recentTxs) {
          if (tx.hash === event.onchainTxHash) {
            tx.status = "confirmed";
            tx.age = 0;
          }
        }
        break;
      case "onchain:tx_failed":
        ws.pendingTxCount = Math.max(0, ws.pendingTxCount - 1);
        ws.failedTxCount++;
        for (const tx of ws.recentTxs) {
          if (tx.hash === event.onchainTxHash) {
            tx.status = "failed";
          }
        }
        break;
      case "trade:opened":
        if (event.exposureUsd) ws.currentExposureUsd += event.exposureUsd;
        break;
      case "trade:closed":
        if (event.exposureUsd) ws.currentExposureUsd = Math.max(0, ws.currentExposureUsd - event.exposureUsd);
        break;
      case "trade:duplicate_attempt":
      case "trade:retry_amplification":
        ws.retryAmplificationCount++;
        break;
      case "trade:nonce_conflict":
        ws.duplicateNonceRisk = true;
        break;
      case "trade:exposure_breach":
        if (event.exposureUsd) ws.currentExposureUsd = event.exposureUsd;
        break;
    }
  }

  // Keep only last 20 txs
  for (const ws of walletMap.values()) {
    ws.recentTxs = ws.recentTxs.slice(-20);

    // Compute confirmation latency from confirmed tx timestamps
    const confirmedTxs = events.filter(
      (e) => e.wallet === ws.address && e.eventType === "onchain:tx_confirmed" && e.durationMs
    );
    if (confirmedTxs.length > 0) {
      ws.avgConfirmationLatencyMs =
        confirmedTxs.reduce((sum, e) => sum + (e.durationMs ?? 0), 0) / confirmedTxs.length;
    }

    // Determine wallet status
    if (ws.pendingTxCount > 5 || ws.failedTxCount > 3 || ws.duplicateNonceRisk) {
      ws.status = "critical";
    } else if (ws.pendingTxCount > 2 || ws.failedTxCount > 0 || ws.retryAmplificationCount > 0) {
      ws.status = "warning";
    } else {
      ws.status = "healthy";
    }
  }

  return Array.from(walletMap.values());
}
