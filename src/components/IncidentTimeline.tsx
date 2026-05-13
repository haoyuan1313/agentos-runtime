"use client";

import { useEffect, useState } from "react";
import { Incident } from "@/types/telemetry";

export function IncidentTimeline() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const res = await fetch("/api/incidents?active=true");
        const data = await res.json();
        setIncidents(data.incidents);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  const severityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Incidents</h2>
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        Incidents ({incidents.length} active)
      </h2>
      {incidents.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-emerald-400 text-sm font-medium">No active incidents</p>
          <p className="text-zinc-600 text-xs mt-1">System operating normally</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-zinc-200">{incident.title}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap font-mono uppercase ${severityBadge(incident.severity)}`}
                >
                  {incident.severity}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-2">{incident.description}</p>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <span>{incident.detectorName}</span>
                  {(incident as { riskCategory?: string }).riskCategory && (
                    <span className="text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] uppercase">
                      {(incident as { riskCategory: string }).riskCategory.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <span>{new Date(incident.detectedAt).toLocaleTimeString()}</span>
              </div>
              {(incident as { financialImpactUsd?: number }).financialImpactUsd ? (
                <div className="mt-1 text-xs text-red-400/70 font-mono">
                  Impact: ${((incident as { financialImpactUsd: number }).financialImpactUsd).toLocaleString()}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
