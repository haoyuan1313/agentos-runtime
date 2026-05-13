"use client";

import { useEffect, useState } from "react";
import { AgentRuntimeState } from "@/types/telemetry";

export function AgentPanel() {
  const [agents, setAgents] = useState<AgentRuntimeState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents/status");
        const data = await res.json();
        setAgents(data.agents);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
    const interval = setInterval(fetchAgents, 3000);
    return () => clearInterval(interval);
  }, []);

  const statusClass = (status: string) => {
    switch (status) {
      case "running":
        return "border-blue-500/20 bg-blue-500/5";
      case "failed":
        return "border-red-500/30 bg-red-500/5 animate-pulse-critical";
      case "hung":
        return "border-amber-500/30 bg-amber-500/5 animate-pulse-warning";
      default:
        return "border-emerald-500/10 bg-emerald-500/5";
    }
  };

  const dotClass = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-400 animate-pulse-dot";
      case "failed":
        return "bg-red-400 animate-pulse-dot";
      case "hung":
        return "bg-amber-400 animate-pulse-dot";
      default:
        return "bg-emerald-400";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "running": return "RUNNING";
      case "failed": return "FAILED";
      case "hung": return "HUNG";
      default: return "IDLE";
    }
  };

  const statusLabelColor = (status: string) => {
    switch (status) {
      case "running": return "text-blue-400";
      case "failed": return "text-red-400";
      case "hung": return "text-amber-400";
      default: return "text-emerald-400";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Agents</h2>
        <div className="text-zinc-500 text-sm animate-pulse">Connecting...</div>
      </div>
    );
  }

  const criticalCount = agents.filter((a) => a.status === "failed" || a.status === "hung").length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Agents
        </h2>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
          criticalCount > 0
            ? "bg-red-500/10 text-red-400 border border-red-500/20"
            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        }`}>
          {agents.length} tracked
        </span>
      </div>

      {agents.length === 0 ? (
        <p className="text-zinc-600 text-xs text-center py-4">Waiting for agents...</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.agentId}
              className={`rounded-lg border px-3 py-2.5 transition-all ${statusClass(agent.status)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dotClass(agent.status)}`} />
                  <span className="text-sm font-medium text-zinc-200">{agent.agentName}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase font-mono ${statusLabelColor(agent.status)}`}>
                  {statusLabel(agent.status)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                <span title="Success/Failure">
                  <span className="text-emerald-400">{agent.successCount}</span>
                  <span className="text-zinc-600">/</span>
                  <span className={agent.failureCount > 0 ? "text-red-400" : "text-zinc-600"}>
                    {agent.failureCount}
                  </span>
                </span>
                <span title="On-chain TXs">{agent.onchainTxCount} tx</span>
                <span title="Retries" className={agent.retryCount > 0 ? "text-amber-400" : ""}>
                  {agent.retryCount} retry
                </span>
                {agent.totalExposureUsd > 0 && (
                  <span title="Exposure" className="text-zinc-500">
                    ${(agent.totalExposureUsd / 1000).toFixed(0)}k exp
                  </span>
                )}
                {agent.duplicateAttempts > 0 && (
                  <span className="text-red-400 font-bold">{agent.duplicateAttempts} dup</span>
                )}
              </div>

              {/* Wallet address */}
              {agent.wallet && (
                <div className="mt-1 text-[10px] text-zinc-600 font-mono truncate">
                  {agent.wallet}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
