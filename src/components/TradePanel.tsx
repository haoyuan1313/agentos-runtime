"use client";

import { useEffect, useState } from "react";

interface TradeInfo {
  hash: string;
  agentId: string;
  agentName: string;
  type: string;
  market: string;
  valueUsd: number;
  status: "pending" | "confirmed" | "failed";
  blockNumber: number | null;
  timestamp: string;
  nonce: number | null;
}

export function TradePanel() {
  const [trades, setTrades] = useState<TradeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      try {
        // Pull trade events from telemetry
        const [subRes, confRes, failRes] = await Promise.all([
          fetch("/api/telemetry/query?eventType=onchain:tx_submitted&limit=30"),
          fetch("/api/telemetry/query?eventType=onchain:tx_confirmed&limit=30"),
          fetch("/api/telemetry/query?eventType=onchain:tx_failed&limit=10"),
        ]);

        const submitted = await subRes.json();
        const confirmed = await confRes.json();
        const failed = await failRes.json();

        const tradeMap = new Map<string, TradeInfo>();

        for (const event of submitted.events ?? []) {
          if (event.onchainTxHash) {
            tradeMap.set(event.onchainTxHash, {
              hash: event.onchainTxHash,
              agentId: event.agentId,
              agentName: event.agentName,
              type: "trade",
              market: event.market ?? "unknown",
              valueUsd: (event.exposureUsd as number) ?? 0,
              status: "pending",
              blockNumber: null,
              timestamp: event.timestamp,
              nonce: (event.nonce as number) ?? null,
            });
          }
        }

        for (const event of confirmed.events ?? []) {
          const tx = tradeMap.get(event.onchainTxHash as string);
          if (tx) {
            tx.status = "confirmed";
            tx.blockNumber = (event.metadata as { blockNumber?: number })?.blockNumber ?? null;
          }
        }

        for (const event of failed.events ?? []) {
          const tx = tradeMap.get(event.onchainTxHash as string);
          if (tx) tx.status = "failed";
        }

        setTrades(Array.from(tradeMap.values()).slice(-15).reverse());
      } catch { /* silent */ } finally { setLoading(false); }
    }

    fetchTrades();
    const interval = setInterval(fetchTrades, 4000);
    return () => clearInterval(interval);
  }, []);

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "failed": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse-dot";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "confirmed": return "●";
      case "failed": return "✕";
      default: return "○";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Trades</h2>
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  const pendingCount = trades.filter((t) => t.status === "pending").length;
  const failedCount = trades.filter((t) => t.status === "failed").length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Transaction Lifecycle
        </h2>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-zinc-500">{trades.length} tx</span>
          {pendingCount > 0 && <span className="text-amber-400">{pendingCount} pending</span>}
          {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
        </div>
      </div>

      {trades.length === 0 ? (
        <p className="text-zinc-600 text-xs py-4 text-center">
          No transactions yet. Portfolio agent activity will appear here.
        </p>
      ) : (
        <div className="space-y-1 font-mono text-[11px] max-h-64 overflow-y-auto">
          {trades.map((tx) => (
            <div
              key={tx.hash}
              className="flex items-center justify-between py-1.5 px-2 rounded border border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`${tx.status === "confirmed" ? "text-emerald-400" : tx.status === "failed" ? "text-red-400" : "text-amber-400"}`}>
                  {statusIcon(tx.status)}
                </span>
                <span className="text-zinc-400 truncate w-24" title={tx.hash}>
                  {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <span className="truncate max-w-[80px]">{tx.agentName}</span>
                {tx.market !== "unknown" && (
                  <span className="text-zinc-600">{tx.market}</span>
                )}
                {tx.valueUsd > 0 && (
                  <span className="text-zinc-400">${(tx.valueUsd / 1000).toFixed(0)}k</span>
                )}
                {tx.blockNumber && (
                  <span className="text-zinc-600">#{tx.blockNumber}</span>
                )}
                <span className={`uppercase text-[10px] ml-1 px-1 py-0.5 rounded border ${statusBadge(tx.status)}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
