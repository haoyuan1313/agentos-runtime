import { NextResponse } from "next/server";
import { getWalletStates } from "@/lib/wallet/monitor";
import { initDetectors } from "@/lib/detection/init";

initDetectors();

export async function GET() {
  const wallets = getWalletStates();

  const summary = {
    total: wallets.length,
    healthy: wallets.filter((w) => w.status === "healthy").length,
    warning: wallets.filter((w) => w.status === "warning").length,
    critical: wallets.filter((w) => w.status === "critical").length,
    totalExposureUsd: wallets.reduce((sum, w) => sum + w.currentExposureUsd, 0),
    totalPendingTx: wallets.reduce((sum, w) => sum + w.pendingTxCount, 0),
    totalFailedTx: wallets.reduce((sum, w) => sum + w.failedTxCount, 0),
    amplificationCount: wallets.reduce((sum, w) => sum + w.retryAmplificationCount, 0),
  };

  return NextResponse.json({
    wallets,
    summary,
    meta: { timestamp: new Date().toISOString() },
  });
}
