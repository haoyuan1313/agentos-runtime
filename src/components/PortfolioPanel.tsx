"use client";

import { useEffect, useState } from "react";

interface PortfolioAsset {
  symbol: string;
  name: string;
  amount: number;
  priceUsd: number;
  valueUsd: number;
  targetPct: number;
  currentPct: number;
  drift: number;
}

interface RebalanceAction {
  id: string;
  fromAsset: string;
  toAsset: string;
  amount: number;
  valueUsd: number;
  reason: string;
  status: string;
  txHash: string | null;
  createdAt: string;
}

interface PortfolioData {
  portfolio: {
    totalValueUsd: number;
    assets: PortfolioAsset[];
    agentStatus: string;
    pendingActions: RebalanceAction[];
    completedActions: RebalanceAction[];
  };
  imbalances: PortfolioAsset[];
  needsRebalance: boolean;
}

export function PortfolioPanel() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/portfolio");
        setData(await res.json());
      } catch { /* silent */ } finally { setLoading(false); }
    }
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Portfolio</h2>
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const { portfolio } = data;
  const statusBadge = (status: string) => {
    switch (status) {
      case "rebalancing": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "error": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Portfolio
        </h2>
        <div className="flex items-center gap-2">
          {data.needsRebalance && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse-dot">
              REBALANCE NEEDED
            </span>
          )}
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${statusBadge(portfolio.agentStatus)}`}>
            {portfolio.agentStatus}
          </span>
        </div>
      </div>

      {/* Total value */}
      <div className="mb-3 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-between">
        <span className="text-xs text-zinc-500">Total Value</span>
        <span className="text-sm font-bold text-zinc-100 font-mono">
          ${portfolio.totalValueUsd.toLocaleString()}
        </span>
      </div>

      {/* Asset allocation bars */}
      <div className="space-y-2 mb-3">
        {portfolio.assets.map((asset) => (
          <div key={asset.symbol} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-300 font-medium">{asset.symbol}</span>
                <span className="text-zinc-500">{asset.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-zinc-400">{asset.amount.toFixed(2)}</span>
                <span className="text-zinc-500">${asset.valueUsd.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Current allocation bar */}
              <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    Math.abs(asset.drift) > 5 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, asset.currentPct)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 w-12 text-right">
                {asset.currentPct.toFixed(1)}%
              </span>
              {/* Target marker */}
              <span className={`text-[10px] font-mono w-12 text-right ${
                Math.abs(asset.drift) > 5 ? "text-amber-400 font-bold" : "text-zinc-600"
              }`}>
                {asset.drift > 0 ? "+" : ""}{asset.drift.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pending rebalance actions */}
      {portfolio.pendingActions.length > 0 && (
        <div className="border-t border-zinc-800 pt-2">
          <h3 className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2">
            Pending Rebalance ({portfolio.pendingActions.length})
          </h3>
          <div className="space-y-1.5">
            {portfolio.pendingActions.map((action) => (
              <div key={action.id} className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-zinc-300 font-medium">
                    {action.fromAsset} → {action.toAsset}
                  </span>
                  <span className="font-mono text-amber-400">${action.valueUsd.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">{action.reason}</p>
                {action.txHash && (
                  <div className="mt-1 text-[10px] font-mono text-zinc-600">
                    TX: {action.txHash.slice(0, 12)}...{action.txHash.slice(-6)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed actions summary */}
      {portfolio.completedActions.length > 0 && (
        <div className="border-t border-zinc-800 mt-2 pt-2 flex items-center justify-between text-xs">
          <span className="text-zinc-500">Completed rebalances</span>
          <span className="font-mono text-emerald-400">{portfolio.completedActions.length}</span>
        </div>
      )}
    </div>
  );
}
