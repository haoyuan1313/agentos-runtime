"use client";

import { useEffect, useState } from "react";

interface OnChainTx {
  hash: string;
  from: string;
  to: string;
  status: "pending" | "confirmed" | "failed";
  blockNumber?: number;
  timestamp: string;
}

interface MantleStatus {
  status: string;
  latestBlock?: {
    number: string;
    hash: string;
    txCount: number;
  };
  recentBlocks?: { number: string; txCount: number; age: number }[];
}

export function OnChainMonitor() {
  const [txs, setTxs] = useState<OnChainTx[]>([]);
  const [connected, setConnected] = useState(false);
  const [mantle, setMantle] = useState<MantleStatus | null>(null);

  useEffect(() => {
    async function fetchOnChain() {
      try {
        // Fetch agent telemetry TXs
        const res = await fetch("/api/telemetry/query?eventType=onchain:tx_submitted&limit=20");
        const data = await res.json();

        const txMap = new Map<string, OnChainTx>();
        for (const event of data.events) {
          if (event.onchainTxHash) {
            txMap.set(event.onchainTxHash, {
              hash: event.onchainTxHash,
              from: event.agentName,
              to: (event.metadata?.to as string) ?? "contract",
              status: "pending",
              timestamp: event.timestamp,
            });
          }
        }

        // Check confirmed/failed
        const [confirmedRes, failedRes] = await Promise.all([
          fetch("/api/telemetry/query?eventType=onchain:tx_confirmed&limit=20"),
          fetch("/api/telemetry/query?eventType=onchain:tx_failed&limit=20"),
        ]);

        const confirmedData = await confirmedRes.json();
        for (const event of confirmedData.events) {
          if (event.onchainTxHash && txMap.has(event.onchainTxHash)) {
            const tx = txMap.get(event.onchainTxHash)!;
            tx.status = "confirmed";
            if (event.metadata?.blockNumber) {
              tx.blockNumber = event.metadata.blockNumber as number;
            }
          }
        }

        const failedData = await failedRes.json();
        for (const event of failedData.events) {
          if (event.onchainTxHash && txMap.has(event.onchainTxHash)) {
            txMap.get(event.onchainTxHash)!.status = "failed";
          }
        }

        setTxs(Array.from(txMap.values()).slice(-10));
        setConnected(true);
      } catch {
        setConnected(false);
      }
    }

    async function fetchMantleStatus() {
      try {
        const res = await fetch("/api/onchain");
        const data = await res.json();
        setMantle(data);
      } catch {
        setMantle(null);
      }
    }

    fetchOnChain();
    fetchMantleStatus();
    const interval = setInterval(() => {
      fetchOnChain();
      fetchMantleStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-emerald-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-amber-400";
    }
  };

  const mantleConnected = mantle?.status === "connected";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          On-Chain Monitor
        </h2>
        <span className="text-xs flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${mantleConnected ? "bg-emerald-400" : connected ? "bg-amber-400" : "bg-red-400"}`}
          />
          <span className="text-zinc-500">Mantle Testnet</span>
        </span>
      </div>

      {/* Mantle Network Status */}
      {mantle?.latestBlock && (
        <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            Block <span className="text-zinc-300 font-mono">{mantle.latestBlock.number}</span>
          </span>
          <span className="text-zinc-600">
            {mantle.latestBlock.txCount} tx · hash{" "}
            <span className="font-mono text-zinc-500">
              {mantle.latestBlock.hash.slice(0, 8)}...
            </span>
          </span>
        </div>
      )}

      {/* Agent Transactions */}
      {txs.length === 0 ? (
        <p className="text-zinc-600 text-xs py-4 text-center">
          No agent transactions yet. Run the demo to see on-chain activity.
        </p>
      ) : (
        <div className="space-y-1 font-mono text-xs max-h-48 overflow-y-auto">
          {txs.map((tx) => (
            <div
              key={tx.hash}
              className="flex items-center justify-between py-1.5 px-2 rounded border border-zinc-800/50 hover:bg-zinc-900/50"
            >
              <div className="flex items-center gap-2">
                <span className={statusColor(tx.status)}>
                  {tx.status === "pending" ? "○" : tx.status === "confirmed" ? "●" : "✕"}
                </span>
                <span className="text-zinc-300 truncate w-28" title={tx.hash}>
                  {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <span>{tx.from}</span>
                {tx.blockNumber && (
                  <span className="text-zinc-600">#{tx.blockNumber}</span>
                )}
                <span className={`uppercase text-xs ${statusColor(tx.status)}`}>{tx.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
