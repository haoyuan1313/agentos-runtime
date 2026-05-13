// Autonomous Portfolio Agent — state management
//
// Tracks a multi-asset portfolio, detects allocation drift,
// makes rebalancing decisions, and records trade execution state.
// The agent is deterministic, not an LLM — it follows defined rules.

export interface PortfolioAsset {
  symbol: string;
  name: string;
  amount: number; // token amount
  priceUsd: number;
  valueUsd: number;
  targetPct: number; // target allocation %
  currentPct: number; // current allocation %
  drift: number; // percentage points off target
}

export interface RebalanceAction {
  id: string;
  fromAsset: string;
  toAsset: string;
  amount: number;
  valueUsd: number;
  reason: string;
  status: "pending" | "executing" | "completed" | "failed";
  txHash: string | null;
  createdAt: string;
}

export interface PortfolioState {
  totalValueUsd: number;
  assets: PortfolioAsset[];
  rebalanceThreshold: number; // drift % that triggers rebalance
  lastRebalanceAt: string | null;
  pendingActions: RebalanceAction[];
  completedActions: RebalanceAction[];
  agentStatus: "idle" | "monitoring" | "rebalancing" | "error";
}

// ── Initial portfolio ──────────────────────────────────────────────────
// BTC-heavy portfolio that needs rebalancing

const INITIAL_PRICES: Record<string, number> = {
  BTC: 98750,
  ETH: 3210,
  USDC: 1.0,
  MNT: 1.12,
};

const INITIAL_ASSETS: Omit<PortfolioAsset, "valueUsd" | "currentPct" | "drift">[] = [
  { symbol: "BTC", name: "Bitcoin", amount: 2.5, priceUsd: INITIAL_PRICES.BTC, targetPct: 60 },
  { symbol: "ETH", name: "Ethereum", amount: 15.0, priceUsd: INITIAL_PRICES.ETH, targetPct: 25 },
  { symbol: "USDC", name: "USD Coin", amount: 25000, priceUsd: 1.0, targetPct: 10 },
  { symbol: "MNT", name: "Mantle", amount: 5000, priceUsd: INITIAL_PRICES.MNT, targetPct: 5 },
];

// ── Simulated price movement ────────────────────────────────────────────

export function updatePrices(): void {
  // Simulate market movement — BTC pumps 8%, creating imbalance
  const moves: Record<string, number> = {
    BTC: 1 + (Math.random() * 0.02 + 0.01), // +1-3% per tick
    ETH: 1 + (Math.random() * 0.015 - 0.005), // -0.5% to +1%
    USDC: 1.0, // stable
    MNT: 1 + (Math.random() * 0.02 - 0.01), // -1% to +1%
  };

  for (const asset of INITIAL_ASSETS) {
    asset.priceUsd = Math.round(asset.priceUsd * (moves[asset.symbol] ?? 1) * 100) / 100;
  }
}

// ── Compute portfolio state ─────────────────────────────────────────────

export function computePortfolio(
  pendingActions: RebalanceAction[] = [],
  completedActions: RebalanceAction[] = [],
  agentStatus: PortfolioState["agentStatus"] = "idle",
  lastRebalanceAt: string | null = null
): PortfolioState {
  const assets: PortfolioAsset[] = INITIAL_ASSETS.map((a) => ({
    ...a,
    valueUsd: Math.round(a.amount * a.priceUsd * 100) / 100,
    currentPct: 0,
    drift: 0,
  }));

  const totalValueUsd = assets.reduce((sum, a) => sum + a.valueUsd, 0);

  for (const asset of assets) {
    asset.currentPct = Math.round((asset.valueUsd / totalValueUsd) * 10000) / 100;
    asset.drift = Math.round((asset.currentPct - asset.targetPct) * 100) / 100;
  }

  return {
    totalValueUsd: Math.round(totalValueUsd * 100) / 100,
    assets,
    rebalanceThreshold: 5, // 5% drift triggers rebalance
    lastRebalanceAt,
    pendingActions,
    completedActions,
    agentStatus,
  };
}

// ── Detect imbalance ────────────────────────────────────────────────────

export function detectImbalance(portfolio: PortfolioState): PortfolioAsset[] {
  return portfolio.assets.filter((a) => Math.abs(a.drift) > portfolio.rebalanceThreshold);
}

// ── Generate rebalance actions ──────────────────────────────────────────

export function generateRebalanceActions(
  portfolio: PortfolioState,
  imbalances: PortfolioAsset[]
): RebalanceAction[] {
  const actions: RebalanceAction[] = [];

  const overweight = imbalances
    .filter((a) => a.drift > 0)
    .sort((a, b) => b.drift - a.drift);
  const underweight = imbalances
    .filter((a) => a.drift < 0)
    .sort((a, b) => a.drift - b.drift);

  for (const sell of overweight) {
    const excessPct = sell.drift / 100;
    const excessValue = portfolio.totalValueUsd * excessPct;
    // Sell half the excess
    const sellValue = Math.round(excessValue * 0.5 * 100) / 100;

    if (underweight.length > 0 && sellValue > 100) {
      const buy = underweight[0];
      const shortagePct = Math.abs(buy.drift) / 100;
      const shortageValue = portfolio.totalValueUsd * shortagePct;
      const buyValue = Math.min(sellValue, Math.round(shortageValue * 100) / 100);

      actions.push({
        id: crypto.randomUUID?.(),
        fromAsset: sell.symbol,
        toAsset: buy.symbol,
        amount: Math.round((buyValue / buy.priceUsd) * 100) / 100,
        valueUsd: buyValue,
        reason: `${sell.symbol} overweight by ${sell.drift.toFixed(1)}% (target: ${sell.targetPct}%), ${buy.symbol} underweight by ${buy.drift.toFixed(1)}% (target: ${buy.targetPct}%)`,
        status: "pending",
        txHash: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return actions;
}
