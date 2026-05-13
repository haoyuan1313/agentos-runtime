"use client";

import { useEffect, useState } from "react";
import { SystemHealth } from "@/types/telemetry";

interface RiskData {
  system: { score: number; level: string };
}

export function HealthBar() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [risk, setRisk] = useState<RiskData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [hRes, rRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/risk"),
        ]);
        setHealth(await hRes.json());
        setRisk(await rRes.json());
      } catch { /* silent */ }
    }
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    healthy: "border-emerald-500/30 text-emerald-400",
    degraded: "border-amber-500/30 text-amber-400",
    critical: "border-red-500/30 text-red-400 animate-pulse-critical",
  };

  const config = health ? statusConfig[health.status] : statusConfig.healthy;
  const riskScore = risk?.system?.score ?? 0;
  const riskLevel = risk?.system?.level ?? "normal";

  const riskColor =
    riskLevel === "critical" ? "text-red-400" :
    riskLevel === "elevated" ? "text-amber-400" :
    "text-emerald-400";

  return (
    <div className={`rounded-lg border px-4 py-2 flex items-center gap-4 text-sm ${config}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${
          health?.status === "critical" ? "bg-red-400 animate-pulse-dot" :
          health?.status === "degraded" ? "bg-amber-400 animate-pulse-dot" :
          "bg-emerald-400"
        }`} />
        <span className="font-semibold uppercase tracking-wider text-xs">
          {health?.status ?? "--"}
        </span>
      </div>

      {health && (
        <>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-[10px] uppercase">Risk</span>
            <span className={`font-bold ${riskColor}`}>{riskScore}</span>
          </span>
          <span className="text-zinc-700">|</span>
          <span title="Events ingested" className="tabular-nums">
            {health.eventsIngested.toLocaleString()}
          </span>
          <span className="text-zinc-700">|</span>
          <span title="Active agents">{health.activeAgents} agents</span>
          <span className="text-zinc-700">|</span>
          <span title="Active incidents" className={
            health.activeIncidents > 0 ? "text-red-400 font-bold" : ""
          }>
            {health.activeIncidents} incidents
          </span>
        </>
      )}

      {!health && (
        <span className="text-zinc-600">connecting...</span>
      )}
    </div>
  );
}
