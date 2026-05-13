import { NextResponse } from "next/server";
import { computePortfolio, detectImbalance, generateRebalanceActions, updatePrices } from "@/lib/portfolio/agent";
import { initDetectors } from "@/lib/detection/init";

initDetectors();

// In-memory portfolio state (persists across requests within the same instance)
let storedPortfolio = computePortfolio();

export async function GET() {
  const portfolio = storedPortfolio;
  const imbalances = detectImbalance(portfolio);

  return NextResponse.json({
    portfolio,
    imbalances,
    needsRebalance: imbalances.length > 0,
    meta: { timestamp: new Date().toISOString() },
  });
}

export async function POST() {
  // Simulate a market tick + rebalance cycle
  updatePrices();
  let portfolio = computePortfolio();

  const imbalances = detectImbalance(portfolio);

  if (imbalances.length > 0) {
    const actions = generateRebalanceActions(portfolio, imbalances);
    if (actions.length > 0) {
      portfolio = computePortfolio(
        actions,
        portfolio.completedActions,
        "rebalancing",
        portfolio.lastRebalanceAt
      );
    }
  } else {
    portfolio = computePortfolio(
      [],
      portfolio.completedActions,
      "monitoring",
      portfolio.lastRebalanceAt
    );
  }

  storedPortfolio = portfolio;

  return NextResponse.json({
    portfolio: storedPortfolio,
    imbalances,
    needsRebalance: imbalances.length > 0,
    meta: { timestamp: new Date().toISOString() },
  });
}
