"use client";

import { useEffect, useState, useRef } from "react";
import { TelemetryEvent } from "@/types/telemetry";

export function TelemetryFeed() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/telemetry/stream");

    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        // Skip connection messages
        if (event.type === "connected") return;

        setEvents((prev) => {
          const next = [event, ...prev];
          return next.slice(0, 50); // Keep last 50
        });
      } catch {
        // Skip unparseable messages
      }
    };

    es.onerror = () => {
      // SSE will auto-reconnect
    };

    return () => es.close();
  }, []);

  const eventColor = (eventType: string) => {
    if (eventType.includes(":started") || eventType.includes(":called") || eventType.includes(":submitted"))
      return "text-blue-400";
    if (eventType.includes(":completed") || eventType.includes(":confirmed"))
      return "text-emerald-400";
    if (eventType.includes(":failed") || eventType.includes(":exhausted"))
      return "text-red-400";
    return "text-zinc-400";
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Telemetry Feed
        </h2>
        <span className="text-xs text-zinc-600">
          {events.length > 0 ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />
              live
            </>
          ) : (
            "waiting"
          )}
        </span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-1 font-mono text-xs"
        style={{ maxHeight: "400px" }}
      >
        {events.length === 0 ? (
          <p className="text-zinc-600 text-center py-4">
            Waiting for telemetry events...
            <br />
            <span className="text-zinc-700">Start the agent simulator to see data</span>
          </p>
        ) : (
          events.map((event, i) => (
            <div
              key={`${event.id}-${i}`}
              className="flex items-start gap-2 py-1 border-b border-zinc-800/50 hover:bg-zinc-900/50 rounded px-1"
            >
              <span className="text-zinc-600 shrink-0 w-20 truncate">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 font-semibold ${eventColor(event.eventType)}`}>
                {event.eventType}
              </span>
              <span className="text-zinc-500 truncate">{event.agentName}</span>
              {event.toolName && (
                <span className="text-zinc-600 truncate">tool:{event.toolName}</span>
              )}
              {event.errorMessage && (
                <span className="text-red-400/70 truncate max-w-xs">{event.errorMessage}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
