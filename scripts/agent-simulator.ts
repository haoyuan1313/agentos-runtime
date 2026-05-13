// AgentOS Runtime — Server-Side Agent Simulator
//
// Runs independently from the dashboard. Pushes structured telemetry
// events to the ingest API, simulating autonomous AI agents operating
// on-chain. Used for demos where the browser simulator isn't ideal.
//
// Usage:
//   npx tsx scripts/agent-simulator.ts [--url http://localhost:3000] [--agents 5]
//
// This proves the platform works with ANY agent — just POST to /api/telemetry/ingest.

const BASE_URL = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:3000";

const AGENT_COUNT = process.argv.includes("--agents")
  ? parseInt(process.argv[process.argv.indexOf("--agents") + 1], 10)
  : 5;

const AGENTS = [
  { id: "agent-1", name: "Momentum Trader", type: "trader" as const },
  { id: "agent-2", name: "On-Chain Analyst", type: "analyst" as const },
  { id: "agent-3", name: "TX Executor", type: "executor" as const },
  { id: "agent-4", name: "Arbitrage Scout", type: "trader" as const },
  { id: "agent-5", name: "Yield Optimizer", type: "analyst" as const },
];

const TOOLS = [
  "swap", "bridge", "stake", "unstake",
  "claim_rewards", "add_liquidity", "remove_liquidity", "price_oracle_query",
];

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function log(agent: string, msg: string, color = COLORS.reset) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`${COLORS.dim}[${ts}]${COLORS.reset} ${color}[${agent}]${COLORS.reset} ${msg}`);
}

async function sendEvent(event: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      console.error(`  ← ingest failed: ${res.status}`);
    }
  } catch (err) {
    console.error(`  ← connection error: ${(err as Error).message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runHealthyAgent(
  agent: (typeof AGENTS)[number],
  delay = 800
): Promise<void> {
  const execId = crypto.randomUUID();
  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  log(agent.name, "starting execution", COLORS.cyan);
  await sendEvent({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: "agent:started",
    agentId: agent.id, agentName: agent.name, agentType: agent.type,
    executionId: execId,
    toolName: null, toolCallId: null,
    onchainTxHash: null, chain: null,
    retryAttempt: null, maxRetries: null,
    errorMessage: null, errorCode: null,
    durationMs: null, metadata: null,
  });

  // Tool calls
  const toolCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < toolCount; i++) {
    const tool = TOOLS[Math.floor(Math.random() * TOOLS.length)];
    const tcId = crypto.randomUUID();

    await sleep(delay / 2);
    await sendEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: "tool:called",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: execId,
      toolName: tool, toolCallId: tcId,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null,
      durationMs: null, metadata: null,
    });

    await sleep(delay / 2);
    await sendEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: "tool:completed",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: execId,
      toolName: tool, toolCallId: tcId,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: null, errorCode: null,
      durationMs: Math.floor(100 + Math.random() * 500),
      metadata: { result: "success" },
    });
  }

  // On-chain transaction
  await sleep(delay / 2);
  log(agent.name, `tx submitted: ${txHash.slice(0, 10)}...`, COLORS.green);
  await sendEvent({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: "onchain:tx_submitted",
    agentId: agent.id, agentName: agent.name, agentType: agent.type,
    executionId: execId,
    toolName: null, toolCallId: null,
    onchainTxHash: txHash, chain: "mantle",
    retryAttempt: null, maxRetries: null,
    errorMessage: null, errorCode: null,
    durationMs: null,
    metadata: { to: "0xDefiProtocol", value: "0.05 ETH" },
  });

  await sleep(delay);
  await sendEvent({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: "onchain:tx_confirmed",
    agentId: agent.id, agentName: agent.name, agentType: agent.type,
    executionId: execId,
    toolName: null, toolCallId: null,
    onchainTxHash: txHash, chain: "mantle",
    retryAttempt: null, maxRetries: null,
    errorMessage: null, errorCode: null,
    durationMs: null,
    metadata: { blockNumber: 1200000 + Math.floor(Math.random() * 100000) },
  });

  // Complete
  await sendEvent({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: "agent:completed",
    agentId: agent.id, agentName: agent.name, agentType: agent.type,
    executionId: execId,
    toolName: null, toolCallId: null,
    onchainTxHash: null, chain: null,
    retryAttempt: null, maxRetries: null,
    errorMessage: null, errorCode: null,
    durationMs: 800 + Math.random() * 2000,
    metadata: null,
  });
  log(agent.name, "completed ✓", COLORS.green);
}

async function injectHungExecution(): Promise<void> {
  const agent = AGENTS[2]; // TX Executor
  const execId = crypto.randomUUID();
  const pastTime = new Date(Date.now() - 12000).toISOString();

  log(agent.name, "⚠ INJECTING HUNG EXECUTION", COLORS.yellow);
  await sendEvent({
    id: crypto.randomUUID(), timestamp: pastTime,
    eventType: "agent:started",
    agentId: agent.id, agentName: agent.name, agentType: agent.type,
    executionId: execId,
    toolName: "bridge", toolCallId: crypto.randomUUID(),
    onchainTxHash: null, chain: null,
    retryAttempt: null, maxRetries: null,
    errorMessage: null, errorCode: null,
    durationMs: null, metadata: null,
  });
}

async function injectRetryLoop(): Promise<void> {
  const agent = AGENTS[3]; // Arbitrage Scout
  const errorMsg = "ECONNREFUSED: price oracle unavailable at 10.0.1.5:8545";

  log(agent.name, "⚠ INJECTING RETRY LOOP", COLORS.yellow);
  for (let attempt = 1; attempt <= 3; attempt++) {
    await sendEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: "retry:attempt",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: crypto.randomUUID(),
      toolName: "price_oracle_query", toolCallId: crypto.randomUUID(),
      onchainTxHash: null, chain: null,
      retryAttempt: attempt, maxRetries: 3,
      errorMessage: errorMsg, errorCode: "ECONNREFUSED",
      durationMs: null, metadata: null,
    });
    await sleep(400);
  }

  await sendEvent({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: "retry:exhausted",
    agentId: agent.id, agentName: agent.name, agentType: agent.type,
    executionId: null,
    toolName: "price_oracle_query", toolCallId: null,
    onchainTxHash: null, chain: null,
    retryAttempt: 3, maxRetries: 3,
    errorMessage: errorMsg, errorCode: "ECONNREFUSED",
    durationMs: null, metadata: null,
  });
}

async function injectOrchestrationCollapse(): Promise<void> {
  const errorMsg = "GAS_ESTIMATION_FAILED: unable to estimate gas for transaction";

  log("ORCHESTRATOR", "⚠ INJECTING ORCHESTRATION COLLAPSE", COLORS.red);
  for (const agent of [AGENTS[0], AGENTS[1], AGENTS[2]]) {
    await sendEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: "agent:failed",
      agentId: agent.id, agentName: agent.name, agentType: agent.type,
      executionId: crypto.randomUUID(),
      toolName: null, toolCallId: null,
      onchainTxHash: null, chain: null,
      retryAttempt: null, maxRetries: null,
      errorMessage: errorMsg, errorCode: "GAS_ESTIMATION_FAILED",
      durationMs: null, metadata: null,
    });
  }
}

async function main() {
  console.log(`\n${COLORS.cyan}═══ AgentOS Runtime — Agent Simulator ═══${COLORS.reset}`);
  console.log(`${COLORS.dim}Target: ${BASE_URL}${COLORS.reset}`);
  console.log(`${COLORS.dim}Agents: ${AGENTS.slice(0, AGENT_COUNT).map((a) => a.name).join(", ")}${COLORS.reset}\n`);

  // Phase 1: Healthy agents
  log("SIMULATOR", "Phase 1: Healthy execution", COLORS.cyan);
  for (const agent of AGENTS.slice(0, AGENT_COUNT)) {
    await runHealthyAgent(agent, 1000);
    await sleep(500);
  }

  await sleep(1000);

  // Phase 2: Hung execution
  log("SIMULATOR", "Phase 2: Hung execution injection", COLORS.yellow);
  await injectHungExecution();

  // Send trigger events to activate detection
  for (const agent of [AGENTS[0], AGENTS[4]]) {
    await runHealthyAgent(agent, 500);
  }

  await sleep(1000);

  // Phase 3: Retry loop
  log("SIMULATOR", "Phase 3: Retry loop injection", COLORS.yellow);
  await injectRetryLoop();

  await sleep(1000);

  // Phase 4: Orchestration collapse
  log("SIMULATOR", "Phase 4: Orchestration collapse", COLORS.red);
  await injectOrchestrationCollapse();

  await sleep(2000);

  // Phase 5: Recovery
  log("SIMULATOR", "Phase 5: Recovery", COLORS.green);
  for (const agent of [AGENTS[0], AGENTS[4]]) {
    await runHealthyAgent(agent, 600);
  }

  console.log(`\n${COLORS.green}═══ Simulation complete ═══${COLORS.reset}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Simulator error:", err);
  process.exit(1);
});
