"use client";

import { useState, useCallback } from "react";

// ── 10-Scene Autonomous Portfolio Agent Drama ──────────────────────────
//
// An AI portfolio agent autonomously detects imbalance, executes rebalance,
// and encounters real runtime failures. AgentOS Runtime detects everything.
//
// Scene  1: Agent monitors portfolio — healthy state
// Scene  2: BTC pump creates allocation imbalance
// Scene  3: Agent decides rebalance: sell BTC → buy ETH/USDC
// Scene  4: RPC latency spike delays TX confirmation
// Scene  5: Retry amplification — duplicate orders
// Scene  6: Duplicate order risk detected
// Scene  7: Wallet exposure escalates past threshold
// Scene  8: Orchestration disagreement on execution state
// Scene  9: CRITICAL INCIDENT — all detectors fire
// Scene 10: Operator isolates failure, agents recover

const WALLETS: Record<string, string> = {
  "portfolio-agent": "0x9dEf...1A4c",
  "executor-1": "0x7aBc...3D2f",
};

const AGENTS = [
  { id: "portfolio-agent", name: "Portfolio Agent", type: "trader" as const, wallet: WALLETS["portfolio-agent"] },
  { id: "executor-1", name: "TX Executor", type: "executor" as const, wallet: WALLETS["executor-1"] },
];

const PORTFOLIO = {
  assets: [
    { symbol: "BTC", name: "Bitcoin", amount: 2.5, price: 98750, targetPct: 60 },
    { symbol: "ETH", name: "Ethereum", amount: 15, price: 3210, targetPct: 25 },
    { symbol: "USDC", name: "USD Coin", amount: 25000, price: 1, targetPct: 10 },
    { symbol: "MNT", name: "Mantle", amount: 5000, price: 1.12, targetPct: 5 },
  ],
};

export function DemoSimulator() {
  const [running, setRunning] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const addLog = (msg: string) => setLog((prev) => [msg, ...prev.slice(0, 39)]);

  // ══════════════════════════════════════════════════════════════════════
  // Helper: send telemetry + optionally trigger portfolio API
  // ══════════════════════════════════════════════════════════════════════
  async function send(event: Record<string, unknown>) {
    try {
      await fetch("/api/telemetry/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch { /* keep going */ }
  }

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ══════════════════════════════════════════════════════════════════════
  // Scene 1: Agent monitors portfolio — everything healthy
  // ══════════════════════════════════════════════════════════════════════
  const scene1Monitoring = useCallback(async () => {
    setCurrentScene(1);
    addLog("═══ SCENE 1: Portfolio Agent Monitoring ═══");

    const agent = AGENTS[0];
    const totalValue = PORTFOLIO.assets.reduce((s, a) => s + a.amount * a.price, 0);

    addLog(`  Portfolio: $${totalValue.toLocaleString()} across ${PORTFOLIO.assets.length} assets`);
    for (const a of PORTFOLIO.assets) {
      addLog(`    ${a.symbol}: ${a.amount} tokens × $${a.price} = $${(a.amount * a.price).toLocaleString()} (target: ${a.targetPct}%)`);
    }

    // Agent starts monitoring cycle
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "agent:started",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: crypto.randomUUID(), wallet: agent.wallet,
      toolName: "portfolio_monitor", toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: null, symbol: null, severity: "info",
      evidence: "Portfolio monitoring cycle started. 4 assets tracked.",
      slippageBps: null, exposureUsd: totalValue, nonce: null, duplicateOf: null, metadata: null,
    });

    await sleep(800);
    addLog("  ✓ Portfolio Agent operating normally — monitoring allocation");
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 2: BTC pumps 12% — allocation imbalance detected
  // ══════════════════════════════════════════════════════════════════════
  const scene2Imbalance = useCallback(async () => {
    setCurrentScene(2);
    addLog("═══ SCENE 2: Allocation Imbalance Detected ═══");

    const agent = AGENTS[0];
    // BTC pumps from $98,750 → $110,600 (+12%)
    const newBtcPrice = 110600;
    const btcValue = 2.5 * newBtcPrice;
    const totalValue = btcValue + (15 * 3210) + 25000 + (5000 * 1.12);
    const btcPct = (btcValue / totalValue * 100).toFixed(1);
    const drift = (parseFloat(btcPct) - 60).toFixed(1);

    addLog(`  ⚠ BTC pumped +12%: $98,750 → $${newBtcPrice.toLocaleString()}`);
    addLog(`  ⚠ BTC allocation: ${btcPct}% (target: 60%) — drift: +${drift}%`);
    addLog(`  ⚠ Portfolio total: $${totalValue.toLocaleString()}`);

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:opened",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: crypto.randomUUID(), wallet: agent.wallet,
      toolName: "rebalance_detector", toolCallId: crypto.randomUUID(),
      onchainTxHash: null, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: "BTC/USDC", symbol: "BTC", severity: "warning",
      evidence: `BTC allocation at ${btcPct}% exceeds 60% target by ${drift}%. Portfolio imbalance exceeds 5% rebalance threshold.`,
      slippageBps: null, exposureUsd: Math.round(btcValue), nonce: null, duplicateOf: null,
      metadata: { btcPrice: newBtcPrice, btcValue, totalValue },
    });

    await sleep(1000);
    addLog(`  → Agent decides: rebalance required — sell BTC, buy ETH + USDC`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 3: Agent executes rebalance — sell BTC → buy ETH/USDC
  // ══════════════════════════════════════════════════════════════════════
  const scene3Rebalance = useCallback(async () => {
    setCurrentScene(3);
    addLog("═══ SCENE 3: Agent Executes Rebalance ═══");

    const agent = AGENTS[0];
    const tx1 = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    const tx2 = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    // Trade 1: Sell BTC → USDC
    addLog(`  Trade 1: Sell 0.5 BTC → USDC (~$55,300)`);
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:opened",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: crypto.randomUUID(), wallet: agent.wallet,
      toolName: "swap", toolCallId: crypto.randomUUID(),
      onchainTxHash: tx1, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: "BTC/USDC", symbol: "BTC", severity: "info",
      evidence: "Rebalance sell: 0.5 BTC → USDC at market price",
      slippageBps: 5, exposureUsd: 55300, nonce: 42, duplicateOf: null,
      metadata: { fromAsset: "BTC", toAsset: "USDC", amount: 0.5 },
    });

    await sleep(600);
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "onchain:tx_submitted",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: tx1, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: "BTC/USDC", symbol: null, severity: null,
      evidence: null,
      slippageBps: null, exposureUsd: 55300, nonce: 42, duplicateOf: null, metadata: null,
    });

    // Trade 2: Buy ETH with USDC
    await sleep(400);
    addLog(`  Trade 2: Buy 8.5 ETH with USDC (~$27,285)`);
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:opened",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: crypto.randomUUID(), wallet: agent.wallet,
      toolName: "swap", toolCallId: crypto.randomUUID(),
      onchainTxHash: tx2, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: "ETH/USDC", symbol: "ETH", severity: "info",
      evidence: "Rebalance buy: 8.5 ETH with USDC at market price",
      slippageBps: 8, exposureUsd: 27285, nonce: 43, duplicateOf: null,
      metadata: { fromAsset: "USDC", toAsset: "ETH", amount: 8.5 },
    });

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "onchain:tx_submitted",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: tx2, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: "ETH/USDC", symbol: null, severity: null,
      evidence: null,
      slippageBps: null, exposureUsd: 27285, nonce: 43, duplicateOf: null, metadata: null,
    });

    await sleep(600);
    addLog(`  ✓ 2 rebalance trades submitted to Mantle testnet`);
    addLog(`    TX1: ${tx1.slice(0, 10)}... (BTC→USDC, nonce 42)`);
    addLog(`    TX2: ${tx2.slice(0, 10)}... (USDC→ETH, nonce 43)`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 4: RPC latency spike — TXs stuck unconfirmed
  // ══════════════════════════════════════════════════════════════════════
  const scene4RPCLatency = useCallback(async () => {
    setCurrentScene(4);
    addLog("═══ SCENE 4: RPC Latency Spike ═══");

    const agent = AGENTS[1]; // TX Executor monitors confirmations

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:execution_timeout",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: "confirm_monitor", toolCallId: null,
      onchainTxHash: null, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: "TX confirmation timeout after 30s", errorCode: "RPC_TIMEOUT", durationMs: 30000,
      market: null, symbol: null, severity: "warning",
      evidence: "Mantle RPC endpoint unresponsive for 30s. 2 transactions unconfirmed. Nonces 42 and 43 may be stuck.",
      slippageBps: null, exposureUsd: 82585, nonce: null, duplicateOf: null, metadata: null,
    });

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:tx_stuck",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: null, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: "Transactions stalled in mempool", errorCode: "TX_STUCK", durationMs: 30000,
      market: null, symbol: null, severity: "high",
      evidence: "2 transactions unconfirmed after 30s. RPC endpoint degraded. Nonces 42, 43 at risk.",
      slippageBps: null, exposureUsd: 82585, nonce: 42, duplicateOf: null, metadata: null,
    });

    addLog(`  ⚠ Mantle RPC unresponsive for 30s`);
    addLog(`  ⚠ 2 rebalance TXs stuck in mempool`);
    addLog(`  ⚠ $82,585 in limbo — nonces 42, 43 blocked`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 5: Retry amplification — agent resubmits trades
  // ══════════════════════════════════════════════════════════════════════
  const scene5RetryAmplification = useCallback(async () => {
    setCurrentScene(5);
    addLog("═══ SCENE 5: Retry Amplification ═══");

    const agent = AGENTS[0];

    // Agent, not knowing TX is stuck, retries the BTC sell 3 times
    for (let i = 1; i <= 3; i++) {
      const dupTx = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      await send({
        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
        eventType: "trade:opened",
        agentId: agent.id, agentName: agent.name, agentType: agent.type,
        executionId: crypto.randomUUID(), wallet: agent.wallet,
        toolName: "swap", toolCallId: crypto.randomUUID(),
        onchainTxHash: dupTx, chain: "mantle",
        retryAttempt: i, maxRetries: 3,
        errorMessage: i >= 2 ? "Previous TX unconfirmed, retrying with higher gas" : null,
        errorCode: null, durationMs: null,
        market: "BTC/USDC", symbol: "BTC", severity: i >= 2 ? "warning" : "info",
        evidence: i >= 2 ? `Retry attempt #${i} for BTC→USDC rebalance. Original TX may still be pending.` : null,
        slippageBps: 5 + i * 4, exposureUsd: 55300, nonce: 42 + i, duplicateOf: i > 1 ? "previous" : null,
        metadata: { retry: i, gasIncreased: i >= 2 },
      });
      await sleep(350);
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
      market: "BTC/USDC", symbol: "BTC", severity: "critical",
      evidence: `3 duplicate BTC→USDC orders within 2s. Retry amplification. Each carries gas cost + slippage. Total duplicate exposure: $165,900.`,
      slippageBps: 17, exposureUsd: 165900, nonce: null, duplicateOf: null, metadata: null,
    });

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:retry_amplification",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: "swap", toolCallId: null,
      onchainTxHash: null, chain: "mantle",
      retryAttempt: 3, maxRetries: 3,
      errorMessage: "Retry amplification detected", errorCode: "RETRY_AMPLIFICATION", durationMs: null,
      market: "BTC/USDC", symbol: "BTC", severity: "critical",
      evidence: "Retry amplification: 3 identical sell orders on BTC/USDC. Slippage increasing with each attempt. Gas cost accumulating. Wallet nonces 42-45 consumed.",
      slippageBps: 17, exposureUsd: 165900, nonce: null, duplicateOf: null, metadata: { wastedNonces: 3 },
    });

    addLog(`  🚨 Agent retried BTC sell 3 times — nonces 42-45 consumed`);
    addLog(`  🚨 Duplicate exposure: $165,900`);
    addLog(`  🚨 Slippage escalating: 5bps → 17bps`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 6: Duplicate order risk detected by platform
  // ══════════════════════════════════════════════════════════════════════
  const scene6DuplicateDetection = useCallback(async () => {
    setCurrentScene(6);
    addLog("═══ SCENE 6: Platform Detects Duplicate Orders ═══");
    addLog("  🔍 Duplicate Order Detector: TRIGGERED");
    addLog("  🔍 Evidence: 3 identical BTC→USDC orders in 2s");
    addLog("  🔍 Nonces 42, 43, 44, 45 consumed on same trade");
    addLog("  ⚠ Retry amplification risk: HIGH");
    await sleep(800);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 7: Wallet exposure escalates
  // ══════════════════════════════════════════════════════════════════════
  const scene7ExposureEscalation = useCallback(async () => {
    setCurrentScene(7);
    addLog("═══ SCENE 7: Wallet Exposure Escalation ═══");

    const agent = AGENTS[0];
    // Total exposure = original $82k + $166k duplicate = $248k
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:exposure_breach",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: "Wallet exposure exceeds safety limit", errorCode: "EXPOSURE_BREACH", durationMs: null,
      market: null, symbol: null, severity: "critical",
      evidence: `Wallet ${agent.wallet} total exposure: $248,485 — exceeds $100,000 safety threshold. Retry amplification contributed $165,900 in duplicate exposure. 5 active nonces (42-46). Wallet at risk of nonce exhaustion.`,
      slippageBps: null, exposureUsd: 248485, nonce: null, duplicateOf: null,
      metadata: { originalExposure: 82585, duplicateExposure: 165900, activeNonces: 5 },
    });

    addLog(`  🚨 CRITICAL: Wallet exposure $248,485 > $100,000 threshold`);
    addLog(`  🚨 $165,900 from retry amplification alone`);
    addLog(`  🚨 5 nonces consumed — wallet approaching nonce exhaustion`);
    await sleep(800);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 8: Orchestration disagreement
  // ══════════════════════════════════════════════════════════════════════
  const scene8OrchestrationDesync = useCallback(async () => {
    setCurrentScene(8);
    addLog("═══ SCENE 8: Orchestration Disagreement ═══");

    const execId = crypto.randomUUID();
    const agentA = AGENTS[0]; // Portfolio Agent
    const agentB = AGENTS[1]; // TX Executor

    // Portfolio agent thinks rebalance completed
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:closed",
      agentId: agentA.id, agentName: agentA.name, agentType: agentA.type,
      executionId: execId, wallet: agentA.wallet,
      toolName: "swap", toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: "BTC/USDC", symbol: "BTC", severity: "info",
      evidence: "Portfolio Agent reports rebalance complete. BTC allocation adjusted to 60%.",
      slippageBps: null, exposureUsd: 55300, nonce: null, duplicateOf: null, metadata: null,
    });

    await sleep(200);

    // TX Executor reports TXs still not confirmed
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:failed",
      agentId: agentB.id, agentName: agentB.name, agentType: agentB.type,
      executionId: execId, wallet: agentB.wallet,
      toolName: "swap", toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: "On-chain state mismatch: TXs not confirmed", errorCode: "STATE_MISMATCH", durationMs: null,
      market: "BTC/USDC", symbol: "BTC", severity: "critical",
      evidence: "TX Executor reports rebalance TXs are NOT confirmed on-chain. Nonces 42-45 consumed but no confirmations received.",
      slippageBps: null, exposureUsd: 55300, nonce: null, duplicateOf: null, metadata: null,
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
      errorMessage: "Agents disagree on execution state", errorCode: "ORCH_DESYNC", durationMs: null,
      market: "BTC/USDC", symbol: null, severity: "critical",
      evidence: `${agentA.name} reports rebalance COMPLETE. ${agentB.name} reports TXs NOT CONFIRMED. Execution ${execId.slice(0, 8)}... state is inconsistent. Portfolio allocation may be incorrect.`,
      slippageBps: null, exposureUsd: 248485, nonce: null, duplicateOf: null, metadata: null,
    });

    addLog(`  🚨 CRITICAL: Orchestration desync`);
    addLog(`  🚨 Portfolio Agent: "rebalance complete"`);
    addLog(`  🚨 TX Executor: "TXs not confirmed on-chain"`);
    addLog(`  🚨 Agents disagree on fundamental execution state`);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 9: Critical incident — all detection engines fire
  // ══════════════════════════════════════════════════════════════════════
  const scene9CriticalIncident = useCallback(async () => {
    setCurrentScene(9);
    addLog("═══ SCENE 9: CRITICAL INCIDENT ═══");
    addLog("  🚨🚨🚨 ALL DETECTORS FIRING 🚨🚨🚨");
    addLog("  ▸ Duplicate Order Detector: 3 identical trades");
    addLog("  ▸ Wallet Exposure Detector: $248k > $100k limit");
    addLog("  ▸ Transaction Stall Detector: 4 TXs unconfirmed");
    addLog("  ▸ Orchestration Desync Detector: state disagreement");
    addLog("  ▸ Retry Loop Detector: deterministic failure retried 3x");
    addLog("");
    addLog("  CRITICAL INCIDENT: Multiple trading safety violations");
    addLog("  Risk Score: 92/100 — CRITICAL");
    addLog("  Financial Impact: $248,485 at risk");
    addLog("  Evidence chain: 27 telemetry events captured");
    await sleep(1500);
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Scene 10: Operator isolates failure, portfolio restabilizes
  // ══════════════════════════════════════════════════════════════════════
  const scene10Recovery = useCallback(async () => {
    setCurrentScene(10);
    addLog("═══ SCENE 10: Recovery ═══");
    addLog("  Operator actions:");
    addLog("  1. Identified RPC latency as root cause");
    addLog("  2. Paused Portfolio Agent wallet (0x9dEf...1A4c)");
    addLog("  3. Replaced stuck TXs with higher gas (nonces cleared)");
    addLog("  4. Verified on-chain state vs agent state");
    addLog("  5. Resolved orchestration disagreement");
    addLog("  6. Resumed Portfolio Agent with fresh nonces");
    addLog("");

    const agent = AGENTS[0];
    const recoveryTx = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    // Recovery trade
    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "trade:opened",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: crypto.randomUUID(), wallet: agent.wallet,
      toolName: "swap", toolCallId: crypto.randomUUID(),
      onchainTxHash: recoveryTx, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: null,
      market: "BTC/USDC", symbol: "BTC", severity: "info",
      evidence: "Post-recovery rebalance execution with fresh nonce. Wallet isolated and verified.",
      slippageBps: 3, exposureUsd: 55300, nonce: 50, duplicateOf: null,
      metadata: { postRecovery: true, freshNonce: 50 },
    });

    await sleep(500);

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "onchain:tx_confirmed",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: recoveryTx, chain: "mantle",
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: 2800,
      market: null, symbol: null, severity: null,
      evidence: null,
      slippageBps: null, exposureUsd: 55300, nonce: 50, duplicateOf: null,
      metadata: { blockNumber: 1234567, confirmed: true },
    });

    await send({
      id: crypto.randomUUID(), timestamp: new Date().toISOString(),
      eventType: "agent:completed",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: null, wallet: agent.wallet,
      toolName: null, toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null, durationMs: 3200,
      market: null, symbol: null, severity: null, evidence: null,
      slippageBps: null, exposureUsd: null, nonce: null, duplicateOf: null, metadata: null,
    });

    addLog("");
    addLog("  ✓ Recovery complete");
    addLog("  ✓ Portfolio Agent operational with fresh nonces");
    addLog("  ✓ Rebalance executed successfully");
    addLog("  ✓ System stable — runtime safety restored");
    addLog("");
    addLog("═══ DEMO COMPLETE ═══");
  }, []);

  // ══════════════════════════════════════════════════════════════════════
  // Master sequence
  // ══════════════════════════════════════════════════════════════════════
  const startDemo = useCallback(async () => {
    setRunning(true);
    setLog([]);
    setCurrentScene(0);

    await scene1Monitoring();
    await sleep(1200);
    await scene2Imbalance();
    await sleep(1500);
    await scene3Rebalance();
    await sleep(1500);
    await scene4RPCLatency();
    await sleep(1000);
    await scene5RetryAmplification();
    await sleep(1500);
    await scene6DuplicateDetection();
    await sleep(1000);
    await scene7ExposureEscalation();
    await sleep(1000);
    await scene8OrchestrationDesync();
    await sleep(1500);
    await scene9CriticalIncident();
    await sleep(1500);
    await scene10Recovery();

    setRunning(false);
  }, [
    scene1Monitoring, scene2Imbalance, scene3Rebalance,
    scene4RPCLatency, scene5RetryAmplification, scene6DuplicateDetection,
    scene7ExposureEscalation, scene8OrchestrationDesync,
    scene9CriticalIncident, scene10Recovery,
  ]);

  const sceneLabels = [
    "", "Monitoring", "Imbalance", "Rebalance", "RPC Latency",
    "Retry Amp", "Duplicates", "Exposure", "Desync", "CRITICAL", "Recovery",
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Portfolio Agent Demo
        </h2>
        <div className="flex items-center gap-2">
          {currentScene > 0 && (
            <span className="text-xs text-zinc-500 font-mono">
              {currentScene}/10: {sceneLabels[currentScene]}
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
            {running ? "Running..." : "Run Portfolio Demo"}
          </button>
        </div>
      </div>

      {/* Scene progress bar */}
      {currentScene > 0 && (
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((scene) => (
            <div
              key={scene}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                scene <= currentScene
                  ? scene === 9 ? "bg-red-500 scene-dot-critical" : "bg-emerald-500"
                  : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      )}

      <div className="font-mono text-xs max-h-44 overflow-y-auto space-y-0.5">
        {log.length === 0 ? (
          <p className="text-zinc-600 py-2 text-center">
            Click &quot;Run Portfolio Demo&quot; — 10-scene autonomous agent drama
          </p>
        ) : (
          log.map((entry, i) => (
            <div
              key={i}
              className={`py-0.5 px-1 rounded ${
                entry.includes("CRITICAL") || entry.includes("🚨🚨🚨")
                  ? "text-red-400 font-bold text-[13px]"
                  : entry.includes("🚨")
                    ? "text-red-400 font-semibold"
                    : entry.includes("⚠")
                      ? "text-amber-400"
                      : entry.includes("✓") || entry.includes("Recovery")
                        ? "text-emerald-400"
                        : entry.includes("═══")
                          ? "text-zinc-300 font-semibold mt-1"
                          : entry.includes("🔍")
                            ? "text-blue-400"
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
