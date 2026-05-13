import { NextRequest, NextResponse } from "next/server";
import { queryEvents } from "@/lib/event-store";
import { AgentRuntimeState } from "@/types/telemetry";

export async function GET(_req: NextRequest) {
  const agents = new Map<string, AgentRuntimeState>();
  const recentEvents = queryEvents({ limit: 500 });

  for (const event of recentEvents) {
    let agent = agents.get(event.agentId);

    if (!agent) {
      agent = {
        agentId: event.agentId,
        agentName: event.agentName,
        agentType: event.agentType,
        status: "idle",
        currentExecutionId: null,
        currentTool: null,
        lastEventAt: null,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        onchainTxCount: 0,
        retryCount: 0,
        wallet: event.wallet,
        tradesOpened: 0,
        tradesClosed: 0,
        duplicateAttempts: 0,
        totalExposureUsd: 0,
      };
      agents.set(event.agentId, agent);
    }

    agent.lastEventAt = event.timestamp;

    // Capture wallet if seen
    if (event.wallet && !agent.wallet) {
      agent.wallet = event.wallet;
    }

    switch (event.eventType) {
      case "agent:started":
        agent.status = "running";
        agent.totalExecutions++;
        agent.currentExecutionId = event.executionId;
        break;
      case "agent:completed":
        agent.status = "idle";
        agent.successCount++;
        break;
      case "agent:failed":
        agent.status = "failed";
        agent.failureCount++;
        break;
      case "tool:called":
        agent.currentTool = event.toolName;
        break;
      case "tool:completed":
        agent.currentTool = null;
        break;
      case "tool:failed":
        agent.currentTool = null;
        break;
      case "onchain:tx_submitted":
      case "onchain:tx_confirmed":
        agent.onchainTxCount++;
        break;
      case "retry:attempt":
        agent.retryCount++;
        break;
      case "trade:opened":
        agent.tradesOpened++;
        if (event.exposureUsd) agent.totalExposureUsd += event.exposureUsd;
        break;
      case "trade:closed":
        agent.tradesClosed++;
        if (event.exposureUsd) agent.totalExposureUsd = Math.max(0, agent.totalExposureUsd - event.exposureUsd);
        break;
      case "trade:duplicate_attempt":
        agent.duplicateAttempts++;
        break;
      case "trade:exposure_breach":
        if (event.exposureUsd) agent.totalExposureUsd = event.exposureUsd;
        break;
    }
  }

  // Detect hung agents: running for > 30s without update
  const now = Date.now();
  for (const agent of agents.values()) {
    if (
      agent.status === "running" &&
      agent.lastEventAt &&
      now - new Date(agent.lastEventAt).getTime() > 30000
    ) {
      agent.status = "hung";
    }
  }

  return NextResponse.json({
    agents: Array.from(agents.values()),
    meta: { timestamp: new Date().toISOString() },
  });
}
