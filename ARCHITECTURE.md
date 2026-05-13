
# AgentOS Runtime — Architecture & MVP Definition

## 1. Product Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 DASHBOARD (Next.js App Router)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Agent    │ │ Queue    │ │ Tool     │ │ Incident   │ │
│  │ Monitor  │ │ Monitor  │ │ Monitor  │ │ Timeline   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Real-Time Telemetry Feed (SSE)           │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              API LAYER (Next.js API Routes)              │
│  POST /api/telemetry/ingest   ← Agents emit events      │
│  GET  /api/telemetry/stream   ← SSE stream              │
│  GET  /api/health             ← System health           │
│  GET  /api/incidents          ← Active incidents        │
│  GET  /api/agents/status      ← Agent runtime state     │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│               DETECTION ENGINE                           │
│  HungExecution | RetryLoop | ToolFailure | QueuePressure │
│  OrchestrationCollapse | HallucinationRisk              │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│               ON-CHAIN MONITOR                          │
│  Mantle Testnet: tx monitoring, event watching          │
│  Byreal: agent identity + execution verification        │
└─────────────────────────────────────────────────────────┘
```

## 2. MVP Scope

### In scope:
- Agent execution monitoring (real-time state, duration, tool calls)
- Telemetry ingestion pipeline (structured events from agents)
- Failure detection engine (hung execution, retry loop, tool failure)
- Operational dashboard (health overview, active agents, queue pressure)
- On-chain transaction monitor (Mantle testnet)
- Incident timeline (detected issues with full trace)
- Real-time event feed via SSE
- Structured logging (Pino)

### Out of scope (intentionally):
- AI agent strategy execution (agents are simulated)
- Multi-tenant architecture (single operator view)
- Authentication system
- Persistent long-term storage (demo window only)
- Automated remediation (detect, don't fix)
- Slack/PagerDuty/webhook integrations
- Complex workflow orchestration

## 3. Fastest Demoable Flow (5 minutes)

1. Dashboard loads → 5 simulated AI agents visible, actively executing
2. Each agent shows: status, current tool, on-chain tx, execution time
3. Telemetry feed scrolls in real-time on the right panel
4. **Inject failure**: Agent #3 tool call hangs (simulated)
5. Within 15s: Hung Execution incident appears on dashboard
6. Full trace opens → shows exact moment of hang, what tool, what state
7. **Inject retry loop**: Agent #2 retries a deterministic failure 3x
8. Retry Loop incident detected → shows wasted attempts
9. On-chain view shows Mantle testnet transactions from agents
10. End with system healthy, showing detection + recovery

## 4. Mantle/Byreal Integrations

### Mantle Testnet:
- Monitor agent-initiated transactions via JSON-RPC
- Track tx status (pending → confirmed → failed)
- Watch contract events emitted by agent actions
- Gas usage tracking per agent

### Byreal:
- Agent identity verification
- Execution proof verification
- Credential-based agent authentication

## 5. Real vs Mocked

| Component | Status | Reason |
|-----------|--------|--------|
| Dashboard UI | REAL | Core demo surface |
| Telemetry pipeline | REAL | Ingests + normalizes events |
| Failure detection engine | REAL | Detection algorithms on real data |
| SSE streaming | REAL | Real-time event delivery |
| Structured logging | REAL | Pino JSON logs throughout |
| Mantle testnet connection | REAL | Live testnet monitoring |
| AI agents | SIMULATED | Generate realistic telemetry patterns |
| Agent strategies | SIMULATED | Not the product focus |
| Some failure patterns | SIMULATED | Injected for demo clarity |

## 6. Judging-Aligned Differentiators

1. **Category-defining**: Nobody else builds the operational layer — everyone builds agents
2. **Technical depth**: Real detection algorithms, not just UI wrappers
3. **Production mindset**: Telemetry, observability, structured logging — real SRE patterns
4. **On-chain + AI intersection**: Monitors AI agents operating on blockchain
5. **Visible value**: Dashboard shows problems being detected in real-time
6. **Operator-grade**: Built for the people who run these systems, not just the people who build them

## 7. Minimal Deployable Architecture

```
Vercel (Next.js + API Routes)
├── Dashboard (React Server Components + Client Components)
├── API Routes (telemetry ingest, query, SSE)
├── Detection Engine (in-process, triggered on ingest)
└── On-Chain Monitor (Mantle JSON-RPC polling)

Redis (Upstash) — real-time state, event buffer, rate limiting
PostgreSQL (Neon) — telemetry records, incidents, agent state
```

## 8. Fastest Path to Runnable Demo

Phase 1: Scaffold + Core Pipeline (target: runnable in ~1 hour)
- Next.js project with Tailwind + shadcn/ui
- Telemetry ingest API
- In-memory event store
- Basic dashboard shell

Phase 2: Detection + Real-Time (target: demo-ready)
- Failure detection engines
- SSE streaming
- Dashboard panels
- Simulated agent event generator

Phase 3: On-Chain + Polish
- Mantle testnet integration
- Incident timeline
- Visual polish for demo

## 9. What We Intentionally Do NOT Build

- Actual AI agent execution engine (simulated, not the product)
- Multi-agent orchestration system (monitor existing, don't build new)
- Authentication/user management (single operator)
- Persistent historical storage (demo window)
- Auto-remediation (detect only — AIOS principle: no autonomous remediation without verification)
- Complex workflow DAG engine (not needed for demo)
- Admin/configuration UI (hardcoded for demo)

## 10. Technical Story for Judges

"Every hackathon has teams building AI agents. We asked a different question:
**Who monitors the agents?**

When an AI agent hangs mid-execution, when it retries a failure that can never succeed,
when its on-chain transaction sits unconfirmed — who sees that?

AgentOS Runtime is the operational intelligence layer for autonomous AI agents.
We monitor agent execution, detect failures in real-time, and give operators
visibility into what their agents are actually doing — not just what the AI says it did.

Built with production SRE patterns: structured telemetry, failure isolation,
deterministic detection, and real-time observability. Connected to Mantle testnet
for on-chain execution monitoring.

This isn't another trading bot. It's the control room for the agentic economy."
