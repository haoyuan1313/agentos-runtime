"use client";

import { useEffect, useState } from "react";

interface AgentRisk {
  agentId: string;
  agentName: string;
  score: number;
  level: "normal" | "elevated" | "critical";
  signals: {
    activeIncidents: number;
    hungExecution: boolean;
    retryLoop: boolean;
    duplicateOrders: boolean;
    walletExposureRisk: boolean;
    txStalled: boolean;
    staleExecution: boolean;
    desyncDetected: boolean;
  };
  categories: Record<string, number>;
}

interface TradingCategory {
  category: string;
  label: string;
  score: number;
  level: string;
  description: string;
  activeIncidents: number;
}

interface SystemRisk {
  score: number;
  level: string;
  agentCount: number;
  criticalAgents: number;
  elevatedAgents: number;
  categories: Record<string, { score: number; level: string }>;
}

export function RiskBar() {
  const [system, setSystem] = useState<SystemRisk | null>(null);
  const [agents, setAgents] = useState<AgentRisk[]>([]);
  const [categories, setCategories] = useState<TradingCategory[]>([]);

  useEffect(() => {
    async function fetchRisk() {
      try {
        const res = await fetch("/api/risk");
        const data = await res.json();
        setSystem(data.system);
        setAgents(data.agents);
        setCategories(data.tradingCategories ?? []);
      } catch { /* silent */ }
    }
    fetchRisk();
    const interval = setInterval(fetchRisk, 3000);
    return () => clearInterval(interval);
  }, []);

  const levelColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-400";
      case "elevated": return "text-amber-400";
      default: return "text-emerald-400";
    }
  };

  const scoreBar = (score: number) => {
    if (score <= 30) return "bg-emerald-500";
    if (score <= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  if (!system) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Trading Risk
        </h2>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-mono uppercase ${
          system.level === "critical" ? "bg-red-500/20 border-red-500/30 text-red-400" :
          system.level === "elevated" ? "bg-amber-500/20 border-amber-500/30 text-amber-400" :
          "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
        }`}>
          {system.level} · {system.score}/100
        </span>
      </div>

      {/* Category scores */}
      {categories.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {categories.map((cat) => (
            <div key={cat.category} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{cat.label}</span>
                <span className={`font-mono ${levelColor(cat.level)}`}>
                  {cat.score}
                  {cat.activeIncidents > 0 && (
                    <span className="text-red-400 ml-1">({cat.activeIncidents})</span>
                  )}
                </span>
              </div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreBar(cat.score)}`}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent risk bars */}
      {agents.length > 0 && (
        <div className="border-t border-zinc-800 pt-2 space-y-1.5">
          {agents.map((agent) => (
            <div key={agent.agentId} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 truncate max-w-[120px]">{agent.agentName}</span>
                <span className={`font-mono ${levelColor(agent.level)}`}>{agent.score}</span>
              </div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreBar(agent.score)}`}
                  style={{ width: `${agent.score}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                {agent.signals.duplicateOrders && <span className="text-red-400/70">dup</span>}
                {agent.signals.walletExposureRisk && <span className="text-red-400/70">exposure</span>}
                {agent.signals.hungExecution && <span className="text-red-400/70">hung</span>}
                {agent.signals.retryLoop && <span className="text-amber-400/70">retry-loop</span>}
                {agent.signals.desyncDetected && <span className="text-red-400/70">desync</span>}
                {agent.signals.txStalled && <span className="text-amber-400/70">stalled</span>}
                {agent.signals.staleExecution && <span className="text-amber-400/70">stale</span>}
                {!agent.signals.duplicateOrders && !agent.signals.walletExposureRisk &&
                 !agent.signals.hungExecution && !agent.signals.retryLoop &&
                 !agent.signals.desyncDetected && !agent.signals.txStalled &&
                 !agent.signals.staleExecution &&
                  <span className="text-emerald-500/50">clean</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
