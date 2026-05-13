import { getActiveIncidents } from "@/lib/detection/types";
import { queryEvents } from "@/lib/event-store";
import { TradingRiskScore, RiskCategory } from "@/types/telemetry";

// ── Trading Risk Scoring Engine ─────────────────────────────────────────
// Computes risk scores by trading-native category from detection signals.
// Categories: execution_risk, wallet_risk, agent_stability,
//             market_sync_risk, orchestration_health
//
// Every score is signal-driven. No invented confidence.

export interface AgentRiskScore {
  agentId: string;
  agentName: string;
  score: number; // 0-100
  level: "normal" | "elevated" | "critical";
  signals: {
    activeIncidents: number;
    hungExecution: boolean;
    retryLoop: boolean;
    toolFailureRate: number;
    recentFailures: number;
    duplicateOrders: boolean;
    walletExposureRisk: boolean;
    txStalled: boolean;
    staleExecution: boolean;
    desyncDetected: boolean;
  };
  categories: Record<RiskCategory, number>; // per-category scores
}

const WEIGHTS = {
  criticalIncident: 40,
  highIncident: 25,
  mediumIncident: 10,
  hungExecution: 30,
  retryLoop: 20,
  duplicateOrder: 25,
  walletExposure: 35,
  txStall: 20,
  staleExecution: 20,
  orchestrationDesync: 35,
  toolFailureRate: 15,
};

function computeCategoryScores(
  signals: AgentRiskScore["signals"],
  incidentScore: number
): Record<RiskCategory, number> {
  let execRisk = 0;
  let walletRisk = 0;
  let stability = 0;
  let marketRisk = 0;
  let orchHealth = 0;

  // Execution risk
  if (signals.retryLoop) execRisk += WEIGHTS.retryLoop;
  if (signals.duplicateOrders) execRisk += WEIGHTS.duplicateOrder;
  if (signals.txStalled) execRisk += WEIGHTS.txStall;
  if (signals.toolFailureRate > 0.3) execRisk += Math.round(WEIGHTS.toolFailureRate * signals.toolFailureRate);

  // Wallet risk
  if (signals.walletExposureRisk) walletRisk += WEIGHTS.walletExposure;

  // Agent stability
  if (signals.hungExecution) stability += WEIGHTS.hungExecution;

  // Market sync risk
  if (signals.staleExecution) marketRisk += WEIGHTS.staleExecution;

  // Orchestration health
  if (signals.desyncDetected) orchHealth += WEIGHTS.orchestrationDesync;

  // Distribute incident score across categories based on which signals fired
  const activeCategories = [execRisk > 0, walletRisk > 0, stability > 0, marketRisk > 0, orchHealth > 0].filter(Boolean).length || 1;
  const distributed = Math.round(incidentScore / activeCategories);

  return {
    execution_risk: Math.min(100, execRisk + (execRisk > 0 ? distributed : 0)),
    wallet_risk: Math.min(100, walletRisk + (walletRisk > 0 ? distributed : 0)),
    agent_stability: Math.min(100, stability + (stability > 0 ? distributed : 0)),
    market_sync_risk: Math.min(100, marketRisk + (marketRisk > 0 ? distributed : 0)),
    orchestration_health: Math.min(100, orchHealth + (orchHealth > 0 ? distributed : 0)),
  };
}

export function computeRiskScores(): AgentRiskScore[] {
  const incidents = getActiveIncidents();
  const recentEvents = queryEvents({ limit: 500 });

  const agentMap = new Map<
    string,
    {
      agentName: string;
      toolFailures: number;
      toolTotal: number;
      recentFailures: number;
    }
  >();

  for (const event of recentEvents) {
    const agent = agentMap.get(event.agentId) ?? {
      agentName: event.agentName,
      toolFailures: 0,
      toolTotal: 0,
      recentFailures: 0,
    };

    if (event.eventType === "tool:completed" || event.eventType === "tool:failed") {
      agent.toolTotal++;
    }
    if (event.eventType === "tool:failed") agent.toolFailures++;
    if (event.eventType === "agent:failed") agent.recentFailures++;

    agentMap.set(event.agentId, agent);
  }

  const scores: AgentRiskScore[] = [];

  for (const [agentId, agent] of agentMap) {
    let incidentScore = 0;
    const signals: AgentRiskScore["signals"] = {
      activeIncidents: 0,
      hungExecution: false,
      retryLoop: false,
      toolFailureRate: agent.toolTotal > 0 ? agent.toolFailures / agent.toolTotal : 0,
      recentFailures: agent.recentFailures,
      duplicateOrders: false,
      walletExposureRisk: false,
      txStalled: false,
      staleExecution: false,
      desyncDetected: false,
    };

    for (const incident of incidents) {
      if (!incident.affectedAgentIds.includes(agentId)) continue;
      signals.activeIncidents++;

      switch (incident.severity) {
        case "critical": incidentScore += WEIGHTS.criticalIncident; break;
        case "high": incidentScore += WEIGHTS.highIncident; break;
        case "medium": incidentScore += WEIGHTS.mediumIncident; break;
      }

      // Signal flags from detector types
      switch (incident.detectorName) {
        case "hung-execution": signals.hungExecution = true; break;
        case "retry-loop": signals.retryLoop = true; break;
        case "duplicate-order": signals.duplicateOrders = true; break;
        case "wallet-exposure": signals.walletExposureRisk = true; break;
        case "tx-stall": signals.txStalled = true; break;
        case "stale-execution": signals.staleExecution = true; break;
        case "orchestration-desync": signals.desyncDetected = true; break;
      }
    }

    const totalScore = Math.min(100, incidentScore);
    const categoryScores = computeCategoryScores(signals, incidentScore);

    if (agent.toolTotal === 0 && signals.activeIncidents === 0) {
      scores.push({
        agentId, agentName: agent.agentName,
        score: 50, level: "normal",
        signals,
        categories: categoryScores,
      });
    } else {
      scores.push({
        agentId, agentName: agent.agentName,
        score: totalScore,
        level: totalScore <= 30 ? "normal" : totalScore <= 60 ? "elevated" : "critical",
        signals,
        categories: categoryScores,
      });
    }
  }

  return scores;
}

export function computeSystemRisk(): {
  score: number;
  level: "normal" | "elevated" | "critical";
  agentCount: number;
  criticalAgents: number;
  elevatedAgents: number;
  categories: Record<RiskCategory, { score: number; level: string }>;
} {
  const agentScores = computeRiskScores();

  if (agentScores.length === 0) {
    return {
      score: 0, level: "normal", agentCount: 0, criticalAgents: 0, elevatedAgents: 0,
      categories: {
        execution_risk: { score: 0, level: "normal" },
        wallet_risk: { score: 0, level: "normal" },
        agent_stability: { score: 0, level: "normal" },
        market_sync_risk: { score: 0, level: "normal" },
        orchestration_health: { score: 0, level: "normal" },
      },
    };
  }

  const criticalAgents = agentScores.filter((a) => a.level === "critical").length;
  const elevatedAgents = agentScores.filter((a) => a.level === "elevated").length;
  const avgScore = agentScores.reduce((sum, a) => sum + a.score, 0) / agentScores.length;
  const maxScore = Math.max(...agentScores.map((a) => a.score));
  const systemScore = Math.round(avgScore * 0.4 + maxScore * 0.6);

  // Aggregate category scores
  const catKeys: RiskCategory[] = ["execution_risk", "wallet_risk", "agent_stability", "market_sync_risk", "orchestration_health"];
  const categories = {} as Record<RiskCategory, { score: number; level: string }>;
  for (const cat of catKeys) {
    const catAvg = agentScores.reduce((sum, a) => sum + (a.categories[cat] ?? 0), 0) / agentScores.length;
    const catMax = Math.max(...agentScores.map((a) => a.categories[cat] ?? 0));
    const catScore = Math.round(catAvg * 0.3 + catMax * 0.7);
    categories[cat] = {
      score: catScore,
      level: catScore <= 30 ? "normal" : catScore <= 60 ? "elevated" : "critical",
    };
  }

  return { score: systemScore, level: systemScore <= 30 ? "normal" : systemScore <= 60 ? "elevated" : "critical", agentCount: agentScores.length, criticalAgents, elevatedAgents, categories };
}

export function computeTradingRiskScores(): TradingRiskScore[] {
  const system = computeSystemRisk();
  const catKeys: RiskCategory[] = ["execution_risk", "wallet_risk", "agent_stability", "market_sync_risk", "orchestration_health"];
  const catLabels: Record<RiskCategory, string> = {
    execution_risk: "Execution Risk",
    wallet_risk: "Wallet Risk",
    agent_stability: "Agent Stability",
    market_sync_risk: "Market Sync Risk",
    orchestration_health: "Orchestration Health",
  };
  const catDescs: Record<RiskCategory, string> = {
    execution_risk: "Trade execution failures, retry amplification, duplicate orders, stuck transactions",
    wallet_risk: "Wallet exposure breaches, nonce conflicts, abnormal exposure growth",
    agent_stability: "Hung agents, agent crashes, unrecoverable agent failures",
    market_sync_risk: "Trades executed against stale market data, slippage spikes",
    orchestration_health: "Agents disagreeing on execution state, orchestration integrity",
  };

  return catKeys.map((cat) => {
    const c = system.categories[cat];
    return {
      category: cat,
      label: catLabels[cat],
      score: c.score,
      level: c.level as "normal" | "elevated" | "critical",
      description: catDescs[cat],
      affectedAgents: [],
      activeIncidents: getActiveIncidents().filter((i) => i.riskCategory === cat).length,
    };
  });
}
