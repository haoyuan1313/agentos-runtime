"use client";

import { useEffect, useState } from "react";
import { Incident } from "@/types/telemetry";

export function IncidentTimeline() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const cardClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "card-critical rounded-lg p-3 cursor-pointer hover:brightness-110 transition-all animate-slide-in";
      case "high":
        return "rounded-lg border border-amber-500/20 bg-red-950/20 p-3 cursor-pointer hover:border-amber-500/40 transition-all animate-slide-in";
      default:
        return "rounded-lg border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:border-zinc-700 transition-all animate-slide-in";
    }
  };

  const severityBg = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500 text-white border-red-400 animate-pulse-dot";
      case "high":
        return "bg-amber-500/30 text-amber-300 border-amber-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Incidents</h2>
        <div className="text-zinc-500 text-sm animate-pulse">Monitoring...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Incidents
        </h2>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
          incidents.length === 0
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse-dot"
        }`}>
          {incidents.length} active
        </span>
      </div>

      {incidents.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-2" />
          <p className="text-emerald-400 text-sm font-medium">All clear</p>
          <p className="text-zinc-600 text-xs mt-1">No incidents detected</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {incidents.map((incident) => {
            const isExpanded = expanded.has(incident.id);
            const cat = (incident as { riskCategory?: string }).riskCategory?.replace(/_/g, " ") ?? "";
            const impact = (incident as { financialImpactUsd?: number }).financialImpactUsd;

            return (
              <div
                key={incident.id}
                className={cardClass(incident.severity)}
                onClick={() => toggleExpand(incident.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-100">
                    {incident.title}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase font-bold ${severityBg(incident.severity)}`}
                  >
                    {incident.severity}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                  {incident.description}
                </p>

                {impact && (
                  <div className="mb-2 text-xs font-mono font-bold text-red-400 bg-red-500/5 rounded px-2 py-1 border border-red-500/10">
                    Financial impact: ${impact.toLocaleString()}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">{incident.detectorName}</span>
                    {cat && (
                      <span className="text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded text-[10px] uppercase">
                        {cat}
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-600">
                    {new Date(incident.detectedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Expandable evidence drawer */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-zinc-800 animate-fade-in">
                    <p className="text-xs text-zinc-500 leading-relaxed font-mono">
                      <span className="text-zinc-600 uppercase text-[10px] tracking-wider">Evidence: </span>
                      {incident.evidence}
                    </p>
                  </div>
                )}

                {!isExpanded && incident.evidence && (
                  <div className="mt-1 text-[10px] text-zinc-600">
                    Click for evidence →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
