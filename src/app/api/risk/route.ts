import { NextResponse } from "next/server";
import { computeRiskScores, computeSystemRisk, computeTradingRiskScores } from "@/lib/risk/scorer";
import { initDetectors } from "@/lib/detection/init";

initDetectors();

export async function GET() {
  const agents = computeRiskScores();
  const system = computeSystemRisk();
  const tradingCategories = computeTradingRiskScores();

  return NextResponse.json({
    system,
    agents,
    tradingCategories,
    meta: { timestamp: new Date().toISOString() },
  });
}
