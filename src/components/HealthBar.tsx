"use client";

import { useEffect, useState } from "react";
import { SystemHealth } from "@/types/telemetry";

export function HealthBar() {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setHealth(data);
      } catch {
        // silent
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    healthy: { dot: "bg-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30 text-emerald-400" },
    degraded: { dot: "bg-amber-400", bg: "bg-amber-400/10 border-amber-400/30 text-amber-400" },
    critical: { dot: "bg-red-400 animate-pulse", bg: "bg-red-400/10 border-red-400/30 text-red-400" },
  };

  const config = health ? statusConfig[health.status] : statusConfig.healthy;

  return (
    <div className={`rounded-lg border px-4 py-2 flex items-center gap-4 text-sm ${config.bg}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span className="font-semibold uppercase tracking-wider text-xs">
          {health?.status ?? "loading"}
        </span>
      </div>

      {health && (
        <>
          <span className="text-zinc-500">|</span>
          <span title="Events ingested">{health.eventsIngested.toLocaleString()} events</span>
          <span className="text-zinc-500">|</span>
          <span title="Active agents">{health.activeAgents} agents</span>
          <span className="text-zinc-500">|</span>
          <span title="Active incidents">{health.activeIncidents} incidents</span>
          <span className="text-zinc-500">|</span>
          <span title="Uptime">{Math.floor(health.uptime / 60)}m {health.uptime % 60}s up</span>
        </>
      )}
    </div>
  );
}
