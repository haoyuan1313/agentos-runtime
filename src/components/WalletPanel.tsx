"use client";

import { useEffect, useState } from "react";
import { WalletState } from "@/types/telemetry";

export function WalletPanel() {
  const [wallets, setWallets] = useState<WalletState[]>([]);
  const [summary, setSummary] = useState<{
    totalExposureUsd: number;
    totalPendingTx: number;
    totalFailedTx: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWallets() {
      try {
        const res = await fetch("/api/wallet");
        const data = await res.json();
        setWallets(data.wallets);
        setSummary(data.summary);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchWallets();
    const interval = setInterval(fetchWallets, 3000);
    return () => clearInterval(interval);
  }, []);

  const statusBorder = (status: string) => {
    switch (status) {
      case "critical": return "border-red-500/30";
      case "warning": return "border-amber-500/30";
      default: return "border-emerald-500/30";
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case "critical": return "bg-red-500/10";
      case "warning": return "bg-amber-500/10";
      default: return "bg-emerald-500/10";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Wallets</h2>
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        Wallet Monitor
      </h2>

      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-center">
            <div className="text-xs text-zinc-500">Exposure</div>
            <div className="text-sm font-mono font-bold text-zinc-200">
              ${summary.totalExposureUsd.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-center">
            <div className="text-xs text-zinc-500">Pending</div>
            <div className={`text-sm font-mono font-bold ${summary.totalPendingTx > 0 ? "text-amber-400" : "text-zinc-200"}`}>
              {summary.totalPendingTx}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-center">
            <div className="text-xs text-zinc-500">Failed</div>
            <div className={`text-sm font-mono font-bold ${summary.totalFailedTx > 0 ? "text-red-400" : "text-zinc-200"}`}>
              {summary.totalFailedTx}
            </div>
          </div>
        </div>
      )}

      {wallets.length === 0 ? (
        <p className="text-zinc-600 text-xs text-center py-2">
          No wallet activity yet
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {wallets.map((w) => (
            <div
              key={w.address}
              className={`rounded-lg border p-2.5 ${statusBorder(w.status)} ${statusBg(w.status)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-zinc-400 truncate max-w-[140px]" title={w.address}>
                  {w.address.slice(0, 10)}...{w.address.slice(-6)}
                </span>
                <span
                  className={`text-xs uppercase font-mono font-bold ${
                    w.status === "critical" ? "text-red-400" : w.status === "warning" ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {w.status}
                </span>
              </div>
              <div className="text-xs text-zinc-500 mb-1">{w.agentName}</div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span title="Pending TXs" className="text-amber-400">{w.pendingTxCount} pending</span>
                <span title="Failed TXs" className="text-red-400">{w.failedTxCount} failed</span>
                <span title="Confirmed TXs" className="text-emerald-400">{w.confirmedTxCount} ok</span>
              </div>
              {w.duplicateNonceRisk && (
                <div className="mt-1 text-xs text-red-400 font-semibold">⚠ Nonce conflict risk</div>
              )}
              {w.retryAmplificationCount > 0 && (
                <div className="mt-1 text-xs text-amber-400">
                  ⚠ {w.retryAmplificationCount} retry amplifications
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
