import { HealthBar } from "@/components/HealthBar";
import { AgentPanel } from "@/components/AgentPanel";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { TelemetryFeed } from "@/components/TelemetryFeed";
import { OnChainMonitor } from "@/components/OnChainMonitor";
import { DemoSimulator } from "@/components/DemoSimulator";
import { RiskBar } from "@/components/RiskBar";
import { WalletPanel } from "@/components/WalletPanel";

export default function Dashboard() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-emerald-400">AgentOS</span> Runtime
          </h1>
          <p className="text-xs text-zinc-500">
            Runtime safety layer for autonomous trading agents · Mantle Testnet
          </p>
        </div>
        <HealthBar />
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
        {/* Left column: Agents + Wallets + Incidents */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto min-h-0">
          <AgentPanel />
          <WalletPanel />
          <IncidentTimeline />
        </div>

        {/* Center: Telemetry Feed */}
        <div className="col-span-6 flex flex-col min-h-0">
          <TelemetryFeed />
        </div>

        {/* Right column: Risk + On-Chain + Demo */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto min-h-0">
          <RiskBar />
          <OnChainMonitor />
          <DemoSimulator />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900 px-6 py-2 flex items-center justify-between text-xs text-zinc-600 shrink-0">
        <span>AgentOS Runtime v0.3.0</span>
        <span>Execution Risk · Wallet Risk · Agent Stability · Market Sync · Orchestration Health</span>
        <span>Deterministic core &gt; AI magic</span>
      </footer>
    </div>
  );
}
