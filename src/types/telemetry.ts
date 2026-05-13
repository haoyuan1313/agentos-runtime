import { z } from "zod";

// ── Telemetry Event Schema ──────────────────────────────────────────────
// Canonical telemetry contract. All agents emit this shape.
// Trading-specific events added per Phase 3.

export const TelemetryEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(), // ISO 8601

  // Event classification
  eventType: z.enum([
    // Agent lifecycle
    "agent:started",
    "agent:completed",
    "agent:failed",
    // Tool execution
    "tool:called",
    "tool:completed",
    "tool:failed",
    // Workflow
    "workflow:node_started",
    "workflow:node_completed",
    "workflow:node_failed",
    // On-chain
    "onchain:tx_submitted",
    "onchain:tx_confirmed",
    "onchain:tx_failed",
    // Retry
    "retry:attempt",
    "retry:exhausted",
    // Queue
    "queue:enqueued",
    "queue:dequeued",
    // Orchestration
    "orchestration:agent_assigned",
    "orchestration:consolidation_started",
    "orchestration:completed",
    // ── Trading-specific ──────────────────────────────────────
    "trade:opened",
    "trade:closed",
    "trade:failed",
    "trade:execution_timeout",
    "trade:duplicate_attempt",
    "trade:retry_amplification",
    "trade:stale_execution",
    "trade:wallet_mismatch",
    "trade:nonce_conflict",
    "trade:slippage_spike",
    "trade:tx_stuck",
    "trade:tx_replaced",
    "trade:exposure_breach",
    "trade:orchestration_desync",
  ]),

  // Agent identity
  agentId: z.string(),
  agentName: z.string(),
  agentType: z.enum(["trader", "analyst", "executor", "orchestrator"]),

  // Execution context
  executionId: z.string().nullable(),
  toolName: z.string().nullable(),
  toolCallId: z.string().nullable(),

  // On-chain context
  onchainTxHash: z.string().nullable(),
  chain: z.enum(["mantle", "byreal"]).nullable(),

  // Retry context
  retryAttempt: z.number().nullable(),
  maxRetries: z.number().nullable(),

  // Error context
  errorMessage: z.string().nullable(),
  errorCode: z.string().nullable(),
  durationMs: z.number().nullable(),

  // ── Trading-specific fields ───────────────────────────────────
  /** Agent wallet address */
  wallet: z.string().nullable(),
  /** Trading pair e.g. "ETH/USDC" */
  market: z.string().nullable(),
  /** Asset symbol */
  symbol: z.string().nullable(),
  /** Event severity for trading events */
  severity: z.enum(["info", "warning", "critical"]).nullable(),
  /** Human-readable evidence string */
  evidence: z.string().nullable(),
  /** Slippage in basis points */
  slippageBps: z.number().nullable(),
  /** Notional exposure in USD */
  exposureUsd: z.number().nullable(),
  /** Transaction nonce */
  nonce: z.number().nullable(),
  /** Reference to a duplicate transaction hash */
  duplicateOf: z.string().nullable(),

  // Arbitrary metadata
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

// ── Incident ─────────────────────────────────────────────────────────────

export const IncidentSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

export const IncidentSchema = z.object({
  id: z.string(),
  detectedAt: z.string(),
  severity: IncidentSeveritySchema,
  title: z.string(),
  description: z.string(),
  detectorName: z.string(),
  affectedAgentIds: z.array(z.string()),
  relatedEventIds: z.array(z.string()),
  status: z.enum(["active", "acknowledged", "resolved"]),
  evidence: z.string(),
  /** Trading risk category for the incident */
  riskCategory: z
    .enum([
      "execution_risk",
      "wallet_risk",
      "agent_stability",
      "market_sync_risk",
      "orchestration_health",
    ])
    .nullable(),
  /** Financial impact estimate (USD) if applicable */
  financialImpactUsd: z.number().nullable(),
});

export type Incident = z.infer<typeof IncidentSchema>;

// ── Agent Runtime State ──────────────────────────────────────────────────

export interface AgentRuntimeState {
  agentId: string;
  agentName: string;
  agentType: string;
  status: "idle" | "running" | "failed" | "hung";
  currentExecutionId: string | null;
  currentTool: string | null;
  lastEventAt: string | null;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  onchainTxCount: number;
  retryCount: number;
  // Trading-specific
  wallet: string | null;
  tradesOpened: number;
  tradesClosed: number;
  duplicateAttempts: number;
  totalExposureUsd: number;
}

// ── Wallet Health ────────────────────────────────────────────────────────

export interface WalletState {
  address: string;
  agentId: string;
  agentName: string;
  pendingTxCount: number;
  failedTxCount: number;
  confirmedTxCount: number;
  duplicateNonceRisk: boolean;
  currentExposureUsd: number;
  retryAmplificationCount: number;
  avgConfirmationLatencyMs: number | null;
  status: "healthy" | "warning" | "critical";
  recentTxs: {
    hash: string;
    status: "pending" | "confirmed" | "failed";
    nonce: number | null;
    age: number; // seconds since submission
  }[];
}

// ── System Health ────────────────────────────────────────────────────────

export interface SystemHealth {
  status: "healthy" | "degraded" | "critical";
  uptime: number;
  eventsIngested: number;
  activeAgents: number;
  activeIncidents: number;
  detectors: { name: string; status: string; lastRun: string | null }[];
  boundaries: {
    ingest: "ok" | "degraded" | "down";
    detection: "ok" | "degraded" | "down";
    stream: "ok" | "degraded" | "down";
    wallet: "ok" | "degraded" | "down";
    onchain: "ok" | "degraded" | "down";
  };
}

// ── Trading Risk Categories ──────────────────────────────────────────────

export type RiskCategory =
  | "execution_risk"
  | "wallet_risk"
  | "agent_stability"
  | "market_sync_risk"
  | "orchestration_health";

export interface TradingRiskScore {
  category: RiskCategory;
  label: string;
  score: number; // 0-100
  level: "normal" | "elevated" | "critical";
  description: string;
  affectedAgents: string[];
  activeIncidents: number;
}
