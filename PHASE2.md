# AgentOS Runtime — Phase 2 Product Architecture

## 1. Final Product Concept

**AgentOS Runtime** is an operator-grade observability and safety layer for autonomous on-chain AI agents. While every other hackathon team shows what their AI agent *does*, we show what happens when it *fails* — and how operators detect, understand, and recover from those failures.

The product ingests structured telemetry from AI agents (any agent, any framework), runs detection engines that identify failure patterns in real-time, computes operational risk scores, and surfaces incidents on a control-room dashboard.

**One sentence:** The control room for the agentic economy.

## 2. Final MVP Scope

### Core (must ship)

| Capability | What it does | Status |
|---|---|---|
| **Telemetry Ingest** | POST endpoint, Zod-validated, normalized event ingestion | BUILT |
| **SSE Streaming** | Real-time event broadcast to dashboard | BUILT |
| **Agent State Tracking** | Per-agent runtime state derived from event stream | BUILT |
| **Hung Execution Detection** | Detects agents stuck in RUNNING w/o completion | BUILT |
| **Retry Loop Detection** | Detects identical failures being retried wastefully | BUILT |
| **Tool Failure Detection** | Detects failure rate exceeding threshold | BUILT |
| **Orchestration Collapse** | Detects multi-agent simultaneous failure | BUILT |
| **Operational Dashboard** | 12-col grid: agents, incidents, telemetry, on-chain | BUILT |
| **Demo Simulator** | Click-to-run failure injection across 5 phases | BUILT |
| **Mantle Testnet Monitor** | Real block data via viem, graceful fallback | BUILT |

### Must Add (Phase 2)

| Capability | What it does |
|---|---|
| **Risk Scoring Engine** | Per-agent risk scores from detection signal aggregation |
| **Server-Side Agent Simulator** | Independent process that pushes events → feels more "real" |
| **Byreal Identity Stub** | Agent identity verification integration point |
| **Incident Evidence Chain** | Per-incident linked event trace with timestamps |
| **Deployment** | Vercel deploy with public URL |

### Intentionally Excluded

- Real AI agent execution (we monitor, we don't execute)
- Multi-tenant auth (single operator view for demo)
- Historical analytics (demo window only)
- Auto-remediation (AIOS principle: no autonomous remediation)
- Slack/PagerDuty/webhook integrations
- Persistent database (in-memory for hackathon)

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     OPERATOR DASHBOARD                        │
│                   Next.js 16 · Vercel                         │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ Agent   │ │ Incident │ │Telemetry │ │ On-Chain        │  │
│  │ Panel   │ │ Timeline │ │Feed (SSE)│ │ Monitor         │  │
│  │         │ │          │ │          │ │ (Mantle+Byreal) │  │
│  └─────────┘ └──────────┘ └──────────┘ └─────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              Risk Overview Bar                            ││
│  │  System: ● Healthy  │  Risk Score: 12/100  │  4 Agents   ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                      API LAYER                                │
│  POST /api/telemetry/ingest  ← Any agent framework           │
│  GET  /api/telemetry/stream  ← SSE real-time                 │
│  GET  /api/telemetry/query   ← Filtered event history        │
│  GET  /api/health            ← System health report          │
│  GET  /api/incidents         ← Active incidents              │
│  GET  /api/agents/status     ← Agent runtime state           │
│  GET  /api/risk              ← Risk scores per agent         │
│  GET  /api/onchain           ← Mantle testnet status         │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                   DETECTION & RISK ENGINE                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Hung Exec  │ Retry Loop │ Tool Fail │ Orch Collapse │    │
│  └────────────────────┬─────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐    │
│  │  Risk Scorer: aggregates detector signals per agent  │    │
│  │  Score = Σ(signal_severity × weight) per boundary    │    │
│  └──────────────────────────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐    │
│  │  Incident Engine: dedup, evidence chain, lifecycle   │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                EVENT STORE (In-Memory)                        │
│  Ring Buffer (1000 events) + Per-Type Stats + SSE Pub/Sub    │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ Mantle       │  │ Byreal       │  │ Any Agent        │    │
│  │ Testnet RPC  │  │ Identity     │  │ Framework        │    │
│  │ (viem)       │  │ Verification │  │ (HTTP POST)      │    │
│  └──────────────┘  └──────────────┘  └──────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## 4. Frontend Pages & Components

### Single Page: Dashboard (`/`)

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER: AgentOS Runtime  │  ● Healthy  │ 12 events │ 4 agts │
├────────────┬──────────────────────────┬──────────────────────┤
│ AGENTS (3) │  TELEMETRY FEED (6)     │ ON-CHAIN (3)         │
│            │                         │                      │
│ ● trader-1 │ 14:32:01 agent:started  │ ● 0xa1b2... Mantle  │
│   RUNNING  │ 14:32:01 tool:called    │   Block #1234567     │
│            │ 14:32:02 onchain:tx_sub │                      │
│ ● analyst  │ 14:32:03 tool:completed │ ───────────────────  │
│   IDLE ✓   │ 14:32:04 agent:complete │ DEMO SIMULATOR       │
│            │ 14:32:10 agent:started  │ [Run Demo] [Hung]    │
│ ● executor │ 14:32:11 tool:called    │ [Retry] [Collapse]   │
│   HUNG ⚠   │ 14:32:25 ⚠ INCIDENT    │                      │
│            │                         │ Phase: 2/5           │
├────────────┴──────────────────────────┴──────────────────────┤
│ INCIDENTS (active)                                           │
│ [HIGH] Hung execution: executor · 14:32:25 · hung-execution  │
└──────────────────────────────────────────────────────────────┘
```

### Components (6 total)

| Component | Data Source | Refresh |
|---|---|---|
| `HealthBar` | `GET /api/health` | 5s poll |
| `AgentPanel` | `GET /api/agents/status` | 3s poll |
| `IncidentTimeline` | `GET /api/incidents?active=true` | 3s poll |
| `TelemetryFeed` | `GET /api/telemetry/stream` (SSE) | Real-time push |
| `OnChainMonitor` | `GET /api/telemetry/query` + `GET /api/onchain` | 5s poll |
| `DemoSimulator` | `POST /api/telemetry/ingest` | User-triggered |

### Risk Score Component (to add)

A new `RiskBar` component showing per-agent risk scores as colored bars:
- Green (0-30): normal operation
- Yellow (31-60): elevated risk — investigate
- Red (61-100): critical — immediate action

## 5. Backend Runtime Requirements

### API Routes (7 built, 1 to add)

| Route | Method | Purpose |
|---|---|---|
| `/api/telemetry/ingest` | POST | Agent → Platform event ingestion |
| `/api/telemetry/stream` | GET | SSE real-time event push |
| `/api/telemetry/query` | GET | Filtered event history |
| `/api/health` | GET | System health + boundary status |
| `/api/incidents` | GET/PATCH | Active incidents, resolve |
| `/api/agents/status` | GET | Per-agent runtime state |
| `/api/risk` | GET | Risk scores (TO ADD) |
| `/api/onchain` | GET | Mantle testnet block data |

### Detection Engines (4 built)

| Detector | Signal | Threshold |
|---|---|---|
| `HungExecutionDetector` | Agent started but no completion | > 8s |
| `RetryLoopDetector` | Same error on consecutive retries | ≥ 2 identical |
| `ToolFailureDetector` | Tool failures per agent | ≥ 3 in 60s |
| `OrchestrationCollapseDetector` | Multiple agent failures | ≥ 2 in 5s |

### Risk Engine (to add)

Computes per-agent risk scores by aggregating detection signals:

```
RiskScore(agent) = Σ severity_weight × recency_decay × count
- critical incident: 40 points
- high incident: 25 points
- medium incident: 10 points
- tool failure rate > 0.5: 15 points
- retry loop active: 20 points
- hung execution active: 30 points
```

## 6. Runtime Integrations

### Mantle Testnet (BUILT)
- **What**: Real block data via `viem` public client
- **RPC**: `https://rpc.testnet.mantle.xyz`
- **Graceful fallback**: Reports "disconnected" if unreachable
- **Demo use**: Shows live block number + agent transaction feed

### Byreal / RealClaw (TO ADD)
- **What**: Agent identity verification + execution proof
- **Integration point**: Agent includes `byreal:identity` in telemetry metadata
- **Verification**: API route validates agent credential before ingest
- **Stub for demo**: `/api/byreal/verify` — always returns verified for known agent IDs

### AIOS Runtime Patterns (APPLIED, not rebuilt)
- **Operational taxonomy**: Failure classification (deterministic vs nondeterministic)
- **Retryability classification**: retryable / conditionally_retryable / non_retryable
- **Evidence hierarchy**: Runtime signal > log evidence > DB query > static analysis
- **Failure isolation**: Detector failure never crashes the system
- **Observability standard**: Ring buffer, per-type stats, SSE rooms, audit trail format

## 7. Demo Script (4 minutes)

### Minute 1: The Setup (0:00-1:00)
> "Every hackathon has AI agents. But who monitors the agents?"
- Show dashboard — empty, waiting
- Explain: 4 agents about to execute on-chain strategies
- Click "Run Demo"

### Minute 2: Healthy Execution (1:00-2:00)
- 4 agents appear, executing tools
- Telemetry feed scrolls in real-time
- On-chain transactions appear (Mantle testnet blocks)
- "This is what normal operation looks like"

### Minute 3: Failure Detection (2:00-3:00)
- **Hung Execution**: Agent #3 shows "HUNG" — red incident card appears
- Click incident → evidence: "Agent started 12s ago, no completion"
- **Retry Loop**: Agent #4 retries identical error 3x — incident detected
- Explain: "This is a deterministic failure. Retries won't fix it."
- **Orchestration Collapse**: 3 agents fail simultaneously — CRITICAL incident
- "System detected this in under 5 seconds"

### Minute 4: The Punchline (3:00-4:00)
- Show recovery: agents continue executing
- "We detect failures before they become outages"
- "AgentOS Runtime — the control room for the agentic economy"
- Show the technical depth: structured telemetry, deterministic detection, evidence-based incidents
- "Built for operators, not just developers"

## 8. Judge-Facing Technical Story

### What judges will immediately understand:
1. **Category-defining**: No one else is building this layer — everyone builds agents
2. **Visual clarity**: Dark control-room dashboard, real-time data, obvious failure detection
3. **Production mindset**: Structured logging, Zod validation, failure isolation — real SRE patterns

### What makes the demo memorable:
1. **The "hung execution" moment**: Agent stuck → red incident appears → operator clicks for evidence
2. **The retry loop insight**: "This agent just wasted 3 retries on a failure that can never succeed"
3. **The orchestration collapse**: Multiple agents fail at once → CRITICAL in red — visceral reaction
4. **The recovery**: Agents continue running — system is operational despite failures

### Technical depth to highlight:
1. **Deterministic detection**: Not AI guessing — mathematical signal matching with thresholds
2. **Evidence chain**: Every incident cites specific events, timestamps, and agent state
3. **Failure classification**: deterministic vs nondeterministic, retryable vs non_retryable
4. **Isolation**: Detector failure never crashes the monitoring system
5. **Real on-chain data**: Mantle testnet blocks flowing through the dashboard

### What to intentionally hide:
1. The DemoSimulator is browser-side (but works identically with real agents)
2. In-memory storage (trivial to swap for PostgreSQL)
3. The simplicity of the detection algorithms (that's the point — deterministic is safer)

### One-line answer to "what is this?"
> "It's the Datadog for autonomous AI agents — runtime observability, failure detection, and operational intelligence for the agentic economy."

## 9. Deployment Plan

### Primary: Vercel
```
vercel deploy --prod
```
- Next.js natively supported
- SSE works on Fluid Compute
- Environment variables for RPC URLs
- Public URL for judges

### Pre-deployment checklist:
- [ ] Remove dev-only console.log statements
- [ ] Verify all API routes return valid JSON
- [ ] Test SSE streaming in production mode
- [ ] Verify Mantle RPC fallback works
- [ ] Set LOG_LEVEL=warn in production

## 10. 7-Day Execution Roadmap

### Day 1-2 (TODAY): Product Architecture + Core Polish
- [x] Architecture document (this file)
- [ ] Risk scoring engine (`/api/risk` + `RiskBar` component)
- [ ] Byreal identity verification stub
- [ ] Server-side agent simulator script
- [ ] Incident evidence chain in UI

### Day 3-4: Demo Refinement
- [ ] Demo script rehearsal
- [ ] Visual polish (animations, transitions)
- [ ] Edge case handling (empty states, error states)
- [ ] Mobile-responsive fallback

### Day 5: Integration + Testing
- [ ] Real Mantle testnet transaction submission (if RPC available)
- [ ] Byreal credential stub testing
- [ ] Full demo flow end-to-end testing
- [ ] Performance check (SSE latency, render performance)

### Day 6: Deployment + Dry Run
- [ ] Deploy to Vercel production
- [ ] Full dry run of demo script
- [ ] Timing refinement
- [ ] Backup plan if network/chain unavailable

### Day 7: Presentation Prep
- [ ] Final demo recording (backup)
- [ ] Judge Q&A preparation
- [ ] README with run instructions
- [ ] Submit

## 11. What NOT to Build

| Anti-feature | Why not |
|---|---|
| Real AI agent execution engine | We monitor agents, we don't build them |
| Multi-tenant auth system | Single operator view for demo |
| Persistent database (PostgreSQL) | In-memory is sufficient for demo window |
| Auto-remediation (auto-fix failures) | AIOS principle: no autonomous remediation without verification |
| Slack/Discord/PagerDuty integrations | Demo shows in-app detection — integrations are trivial |
| Historical analytics / time-series DB | Demo window is real-time |
| Configuration UI / admin panel | Hardcoded config for demo |
| Agent builder / prompt designer | Not our product category |
| Multi-chain support beyond Mantle | One chain, well-done |
| Mobile app | Desktop dashboard for judges |
