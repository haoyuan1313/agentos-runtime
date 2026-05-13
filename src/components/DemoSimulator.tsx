"use client";

import { useState, useCallback } from "react";

// ── 8-Scene Trading Drama ──────────────────────────────────────────────
//
// Scene 1: Healthy trading agents executing normally
// Scene 2: RPC latency spike → execution timeout
// Scene 3: Retry amplification → duplicate orders detected
// Scene 4: Wallet exposure escalates past safety threshold
// Scene 5: Orchestration desync — agents disagree on state
// Scene 6: AgentOS Runtime detects ALL failure patterns
// Scene 7: Critical incident generated with full evidence chain
// Scene 8: Operator isolates failure, agents recover

const WALLETS = {
  "agent-1": "0x7aBc...3D2f",
  "agent-2": "0x9dEf...1A4c",
  "agent-3": "0x2FgH...8B6e",
  "agent-4": "0x5KlM...9C0d",
};

const AGENTS = [
  { id: "agent-1", name: "Momentum Trader", type: "trader" as const, wallet: WALLETS["agent-1"] },
  { id: "agent-2", name: "On-Chain Analyst", type: "analyst" as const, wallet: WALLETS["agent-2"] },
  { id: "agent-3", name: "TX Executor", type: "executor" as const, wallet: WALLETS["agent-3"] },
  { id: "agent-4", name: "Arbitrage Scout", type: "trader" as const, wallet: WALLETS["agent-4"] },
];

const MARKETS = ["ETH/USDC", "BTC/USDC", "MNT/USDC", "ARB/USDC"];

export function DemoSimulator() {
  const [running, setRunning] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [msg, ...prev.slice(0, 29)]);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 1: Healthy trading — 3 agents execute normally
  // ══════════════════════════════════════════════════════════════════════
  const scene1Healthy = useCallback(async () => {
    setCurrentScene(1);
    addLog("═══ SCENE 1: Healthy Trading ═══");

    for (const agent of [AGENTS[0], AGENTS[1], AGENTS[3]]) {
      const execId = crypto.randomUUID();
      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      const market = MARKETS[Math.floor(Math.random() * MARKETS.length)];

      // Agent start
      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "agent:started",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: execId, wallet: agent.wallet,
        toolName: null, toolCallId: null,
        onchainTxHash: null, chain: null,
        retryAttempt: null, maxRetries: null,
        errorMessage: null, errorCode: null, durationMs: null,
        market: null, symbol: null, severity: null, evidence: null,
        slippageBps: null, exposureUsd: null, nonce: null, duplicateOf: null, metadata: null,
      });

      // Trade open
      const exposure = 5000 + Math.random() * 25000;
      await sleep(400);
      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "trade:opened",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: execId, wallet: agent.wallet,
        toolName: "swap", toolCallId: crypto.randomUUID(),
        onchainTxHash: txHash, chain: "mantle",
        retryAttempt: null, maxRetries: null,
        errorMessage: null, errorCode: null, durationMs: null,
        market, symbol: market.split("/")[0], severity: "info",
        evidence: `Opening ${market} position at market price`,
        slippageBps: Math.floor(Math.random() * 10),
        exposureUsd: Math.round(exposure),
        nonce: Math.floor(Math.random() * 100),
        duplicateOf: null, metadata: { price: 1850 + Math.random() * 100 },
      });

      // Tx confirmed
      await sleep(600);
      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "onchain:tx_confirmed",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: execId, wallet: agent.wallet,
        toolName: null, toolCallId: null,
        onchainTxHash: txHash, chain: "mantle",
        retryAttempt: null, maxRetries: null,
        errorMessage: null, errorCode: null, durationMs: 2100,
        market: null, symbol: null, severity: null, evidence: null,
        slippageBps: null, exposureUsd: null, nonce: null, duplicateOf: null,
        metadata: { blockNumber: 1200000 + Math.floor(Math.random() * 100000) },
      });

      // Agent complete
      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "agent:completed",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: execId, wallet: agent.wallet,
        toolName: null, toolCallId: null,
        onchainTxHash: null, chain: null,
        retryAttempt: null, maxRetries: null,
        errorMessage: null, errorCode: null, durationMs: 1500 + Math.random() * 2000,
        market: null, symbol: null, severity: null, evidence: null,
        slippageBps: null, exposureUsd: null, nonce: null, duplicateOf: null, metadata: null,
      });

      addLog(`  ${agent.name}: ${market} trade executed ✓ $${Math.round(exposure).toLocaleString()}`);
      await sleep(500);
    }
    addLog("✓ All agents healthy — system normal");
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 2: RPC latency spike → execution timeout
  // ══════════════════════════════════════════════════════════════════════
  const scene2RPCTimeout = useCallback(async () => {
    setCurrentScene(2);
    addLog("═══ SCENE 2: RPC Latency Spike ═══");

    const agent = AGENTS[2]; // TX Executor
    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "agent:started",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: crypto.randomUUID(), wallet: agent.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: null, symbol: null, severity: null, evidence: null,
      slippageBps: null, exposureUsd: null, nonce: null, duplicateOf: null, metadata: null,
    });

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:execution_timeout",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: "bridge", toolCallId: null,
      onchainTxHash: txHash, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: "RPC timeout after 30s", errorCode: "RPC_TIMEOUT", durationMs: 30000,
      market: "ETH/USDC", symbol: "ETH", severity: "warning",
      evidence: "Mantle RPC endpoint unresponsive for 30s. Transaction may be stuck in mempool.",
      slippageBps: null, exposureUsd: 45000, nonce: 42, duplicateOf: null, metadata: null,
    });
    addLog(`  ⚠ ${agent.name}: RPC timeout on ETH/USDC bridge — tx may be stuck`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 3: Retry amplification → duplicate orders
  // ══════════════════════════════════════════════════════════════════════
  const scene3RetryAmplification = useCallback(async () => {
    setCurrentScene(3);
    addLog("═══ SCENE 3: Retry Amplification ═══");

    const agent = AGENTS[0]; // Momentum Trader
    const market = "ETH/USDC";
    const exposure = 25000;

    // 3 duplicate trade attempts on same market
    for (let i = 1; i <= 3; i++) {
      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "trade:opened",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: crypto.randomUUID(), wallet: agent.wallet,
        toolName: "swap", toolCallId: crypto.randomUUID(),
        onchainTxHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        chain: "mantle",
        retryAttempt: i, maxRetries: 3,
        errorMessage: null, errorCode: null, durationMs: null,
        market, symbol: "ETH", severity: i >= 2 ? "warning" : "info",
        evidence: i >= 2 ? `Duplicate trade attempt #${i} on ${market}` : null,
        slippageBps: 5 + i * 3,
        exposureUsd: Math.round(exposure),
        nonce: 42 + i,
        duplicateOf: i > 1 ? "previous" : null, metadata: null,
      });
      await sleep(300);
    }

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:duplicate_attempt",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: "swap", toolCallId: null,
      onchainTxHash: null, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market, symbol: "ETH", severity: "critical",
      evidence: `3 duplicate orders on ${market} within 2s. Retry amplification detected. Total exposure: $${(exposure * 3).toLocaleString()}. Slippage increasing with each attempt.`,
      slippageBps: 15, exposureUsd: Math.round(exposure * 3), nonce: null, duplicateOf: null, metadata: null,
    });
    addLog(`  ⚠ ${agent.name}: 3 duplicate orders on ${market} — retry amplification!`);
    addLog(`  ⚠ Total exposure: $${(exposure * 3).toLocaleString()} — slippage increasing`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 4: Wallet exposure escalates past safety threshold
  // ══════════════════════════════════════════════════════════════════════
  const scene4ExposureBreach = useCallback(async () => {
    setCurrentScene(4);
    addLog("═══ SCENE 4: Wallet Exposure Breach ═══");

    const agent = AGENTS[0]; // Same agent — exposure accumulating

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:exposure_breach",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: "Exposure exceeds safety limit", errorCode: "EXPOSURE_BREACH", durationMs: null,
      market: null, symbol: null, severity: "critical",
      evidence: `Wallet ${agent.wallet} exposure: $125,000 exceeds $100,000 safety threshold. ${3 + Math.floor(Math.random() * 5)} open positions. Retry amplification contributed $75,000 in duplicate exposure.`,
      slippageBps: null, exposureUsd: 125000, nonce: null, duplicateOf: null, metadata: { openPositions: 7 },
    });
    addLog(`  🚨 CRITICAL: ${agent.name} wallet exposure $125,000 > $100,000 limit!`);
    addLog(`  🚨 Retry amplification caused $75,000 in duplicate exposure`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 5: Orchestration desync — agents disagree
  // ══════════════════════════════════════════════════════════════════════
  const scene5OrchestrationDesync = useCallback(async () => {
    setCurrentScene(5);
    addLog("═══ SCENE 5: Orchestration Desync ═══");

    const execId = crypto.randomUUID();
    const agentA = AGENTS[0];
    const agentB = AGENTS[1];

    // Agent A reports success
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:closed",
      agentId: agentA.id, agentName: agentA.name, agentType: agentA.type,
      executionId: execId, wallet: agentA.wallet,
      toolName: "swap", toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: "ETH/USDC", symbol: "ETH", severity: "info",
      evidence: "Position closed successfully",
      slippageBps: null, exposureUsd: 30000, nonce: null, duplicateOf: null, metadata: null,
    });

    await sleep(200);

    // Agent B reports failure on same execution
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:failed",
      agentId: agentB.id, agentName: agentB.name, agentType: agentB.type,
      executionId: execId, wallet: agentB.wallet,
      toolName: "swap", toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: "Execution not found on-chain", errorCode: "NOT_FOUND", durationMs: null,
      market: "ETH/USDC", symbol: "ETH", severity: "critical",
      evidence: "No on-chain record of this execution. Possible ghost trade.",
      slippageBps: null, exposureUsd: 30000, nonce: null, duplicateOf: null, metadata: null,
    });

    await sleep(100);

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:orchestration_desync",
      agentId: agentA.id, agentName: agentA.name, agentType: agentA.type,
      executionId: execId, wallet: agentA.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: "Agent state disagreement", errorCode: "DESYNC", durationMs: null,
      market: "ETH/USDC", symbol: null, severity: "critical",
      evidence: `${agentA.name} reports trade CLOSED. ${agentB.name} reports trade FAILED. Execution ${execId.slice(0, 8)}... state is inconsistent. Agents may be operating on divergent worldviews.`,
      slippageBps: null, exposureUsd: 30000, nonce: null, duplicateOf: null, metadata: null,
    });
    addLog(`  🚨 CRITICAL: Orchestration desync — agents disagree on execution state`);
    addLog(`  🚨 ${agentA.name}: "trade closed" | ${agentB.name}: "trade failed"`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 6: AgentOS Runtime detects everything
  // ══════════════════════════════════════════════════════════════════════
  const scene6Detection = useCallback(async () => {
    setCurrentScene(6);
    addLog("═══ SCENE 6: AgentOS Runtime Detection ═══");
    addLog("  Detectors active:");
    addLog("  • Duplicate Order Detector → TRIGGERED");
    addLog("  • Wallet Exposure Detector → TRIGGERED");
    addLog("  • Orchestration Desync Detector → TRIGGERED");
    addLog("  • Transaction Stall Detector → MONITORING");
    addLog("  Detected in <3 seconds — evidence chain captured");
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 7: Critical incident generated
  // ══════════════════════════════════════════════════════════════════════
  const scene7Incident = useCallback(async () => {
    setCurrentScene(7);
    addLog("═══ SCENE 7: Critical Incident ═══");
    addLog("  🚨 CRITICAL: Multiple trading safety violations");
    addLog("  • Duplicate Order Risk: 3 identical trades");
    addLog("  • Wallet Exposure: $125,000 > $100,000 limit");
    addLog("  • Orchestration Desync: Execution state disagreement");
    addLog("  Evidence chain attached to incident");
    addLog("  Risk score: 85/100 — CRITICAL");
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 8: Operator isolates failure, agents recover
  // ══════════════════════════════════════════════════════════════════════
  const scene8Recovery = useCallback(async () => {
    setCurrentScene(8);
    addLog("═══ SCENE 8: Recovery ═══");
    addLog("  Operator actions:");
    addLog("  1. Identified retry amplification source");
    addLog("  2. Paused affected agent wallets");
    addLog("  3. Verified on-chain state vs agent state");
    addLog("  4. Isolated desynchronized agent");
    addLog("  5. Resumed healthy agents");

    // Healthy agents continue
    for (const agent of [AGENTS[1], AGENTS[3]]) {
      const execId = crypto.randomUUID();
      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "agent:started",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: execId, wallet: agent.wallet,
        toolName: null, toolCallId: null,
        onchainTxHash: null, chain: null,
        retryAttempt: null, maxRetries: null,
        errorMessage: null, errorCode: null, durationMs: null,
        market: null, symbol: null, severity: null, evidence: null,
        slippageBps: null, exposureUsd: null, nonce: null, duplicateOf: null, metadata: null,
      });

      await sleep(300);
      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "trade:opened",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: execId, wallet: agent.wallet,
        toolName: "swap", toolCallId: crypto.randomUUID(),
        onchainTxHash: txHash, chain: "mantle",
        retryAttempt: null, maxRetries: null,
        errorMessage: null, errorCode: null, durationMs: null,
        market: MARKETS[Math.floor(Math.random() * MARKETS.length)], symbol: null,
        severity: "info", evidence: "Normal execution after incident isolation",
        slippageBps: 3, exposureUsd: Math.round(5000 + Math.random() * 15000),
        nonce: null, duplicateOf: null, metadata: { postRecovery: true },
      });

      await sleep(400);
      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "agent:completed",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: execId, wallet: agent.wallet,
        toolName: null, toolCallId: null,
        onchainTxHash: null, chain: null,
        retryAttempt: null, maxRetries: null,
        errorMessage: null, errorCode: null, durationMs: 1200,
        market: null, symbol: null, severity: null, evidence: null,
        slippageBps: null, exposureUsd: null, nonce: null, duplicateOf: null, metadata: null,
      });
    }

    addLog("✓ System operational — affected wallets isolated");
    addLog("✓ 2 of 4 agents operating normally");
    addLog("═══ DEMO COMPLETE ═══");
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Master sequence
  // ══════════════════════════════════════════════════════════════════════
  const startDemo = useCallback(async () => {
    setRunning(true);
    setLog([]);

    await scene1Healthy();
    await sleep(1500);
    await scene2RPCTimeout();
    await sleep(1000);
    await scene3RetryAmplification();
    await sleep(1500);
    await scene4ExposureBreach();
    await sleep(1000);
    await scene5OrchestrationDesync();
    await sleep(1000);
    await scene6Detection();
    await sleep(1500);
    await scene7Incident();
    await sleep(1500);
    await scene8Recovery();

    setRunning(false);
  }, [scene1Healthy, scene2RPCTimeout, scene3RetryAmplification, scene4ExposureBreach, scene5OrchestrationDesync, scene6Detection, scene7Incident, scene8Recovery]);

  const sceneLabels = [
    "", "Healthy Trading", "RPC Timeout", "Retry Amplification",
    "Exposure Breach", "Orch. Desync", "Detection", "Critical Incident", "Recovery",
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Trading Demo
        </h2>
        <div className="flex items-center gap-2">
          {currentScene > 0 && (
            <span className="text-xs text-zinc-500 font-mono">
              Scene {currentScene}/8: {sceneLabels[currentScene]}
            </span>
          )}
          <button
            onClick={startDemo}
            disabled={running}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              running
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {running ? "Running..." : "Run Trading Demo"}
          </button>
        </div>
      </div>

      {/* Scene progress bar */}
      {currentScene > 0 && (
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((scene) => (
            <div
              key={scene}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                scene <= currentScene
                  ? scene === 7 ? "bg-red-500" : "bg-emerald-500"
                  : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      )}

      <div className="font-mono text-xs max-h-40 overflow-y-auto space-y-0.5">
        {log.length === 0 ? (
          <p className="text-zinc-600 py-2 text-center">
            Click &quot;Run Trading Demo&quot; to start the 8-scene trading safety drama
          </p>
        ) : (
          log.map((entry, i) => (
            <div
              key={i}
              className={`py-0.5 px-1 rounded ${
                entry.includes("CRITICAL") || entry.includes("🚨")
                  ? "text-red-400 font-semibold"
                  : entry.includes("⚠")
                    ? "text-amber-400"
                    : entry.includes("✓") || entry.includes("Recovery") || entry.includes("SCENE 8")
                      ? "text-emerald-400"
                      : entry.includes("═══")
                        ? "text-zinc-300 font-semibold mt-1"
                        : "text-zinc-400"
              }`}
            >
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function send(event: Record<string, unknown>) {
  try {
    await fetch("/api/telemetry/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Keep going
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
