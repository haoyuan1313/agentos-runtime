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

  const statusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-blue-400 bg-blue-400/10 border-blue-400/30";
      case "failed":
        return "text-red-400 bg-red-400/10 border-red-400/30";
      case "hung":
        return "text-amber-400 bg-amber-400/10 border-amber-400/30";
      default:
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-400 animate-pulse";
      case "failed":
        return "bg-red-400";
      case "hung":
        return "bg-amber-400 animate-pulse";
      default:
        return "bg-emerald-400";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Agents</h2>
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        Agents ({agents.length})
      </h2>
      {agents.length === 0 ? (
        <p className="text-zinc-600 text-xs">Waiting for agent events...</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.agentId}
              className={`rounded-lg border px-3 py-2 flex items-center justify-between ${statusColor(agent.status)}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusDot(agent.status)}`} />
                <span className="text-sm font-medium">{agent.agentName}</span>
                <span className="text-xs opacity-60">{agent.agentType}</span>
              </div>
              <div className="flex items-center gap-3 text-xs opacity-70">
                <span title="Success/Failure">
                  {agent.successCount}/{agent.failureCount}
                </span>
                <span title="On-chain TXs">{agent.onchainTxCount} tx</span>
                <span title="Retries">{agent.retryCount} retry</span>
                <span className="uppercase font-mono">{agent.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
