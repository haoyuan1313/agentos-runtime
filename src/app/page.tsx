import { HealthBar } from "@/components/HealthBar";
import { AgentPanel } from "@/components/AgentPanel";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { TelemetryFeed } from "@/components/TelemetryFeed";
import { OnChainMonitor } from "@/components/OnChainMonitor";
import { DemoSimulator } from "@/components/DemoSimulator";
import { RiskBar } from "@/components/RiskBar";
import { WalletPanel } from "@/components/WalletPanel";
import { PortfolioPanel } from "@/components/PortfolioPanel";
import { TradePanel } from "@/components/TradePanel";

export default function Dashboard() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-emerald-400">AgentOS</span>{" "}
            <span className="text-zinc-200">Runtime</span>
          </h1>
          <p className="text-xs text-zinc-500">
            The safety layer for autonomous trading agents
          </p>
        </div>
        <HealthBar />
      </header>

      <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
        {/* Left: Portfolio + Agents + Incidents */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto min-h-0">
          <PortfolioPanel />
          <AgentPanel />
          <IncidentTimeline />
        </div>

        {/* Center: Telemetry + Trade Lifecycle */}
        <div className="col-span-6 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0">
            <TelemetryFeed />
          </div>
          <TradePanel />
        </div>

        {/* Right: Risk + Wallet + On-Chain + Demo */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto min-h-0">
          <RiskBar />
          <WalletPanel />
          <OnChainMonitor />
          <DemoSimulator />
        </div>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-900 px-6 py-2 flex items-center justify-between text-xs text-zinc-600 shrink-0">
        <span>AgentOS Runtime v1.0.0</span>
        <span>Autonomous Portfolio Agent · Runtime Safety · Mantle Testnet</span>
        <span>Deterministic core &gt; AI magic</span>
      </footer>
    </div>
  );
}
