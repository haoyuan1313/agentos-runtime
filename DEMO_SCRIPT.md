# AgentOS Runtime — Live Demo Script

**Duration:** 3-4 minutes
**Tone:** Confident, operational, infrastructure-grade. Not hype-y.

---

## Minute 1: The Setup (0:00-1:00)

**Narrator:**
"Every hackathon has teams building AI trading agents. But here's the question nobody asks: **who monitors the agents?** "

[Click "Run Trading Demo"]

"What you're looking at is AgentOS Runtime — the safety layer for autonomous trading agents."

[Watch as agents appear, trade, complete]

"Right now, four trading agents are executing on-chain. Momentum Trader is opening positions. The On-Chain Analyst is validating market data. TX Executor is submitting transactions to Mantle testnet."

[Gesture to telemetry feed scrolling]

"Every action these agents take produces structured telemetry. We ingest it, normalize it, and run it through our detection engine — in real time."

"This is what normal operation looks like."

---

## Minute 2: The First Failure (1:00-2:00)

"But autonomous agents fail. And when they fail, they fail silently."

[Scene 2: RPC timeout appears]

"Watch what happens when the RPC endpoint goes down. TX Executor's bridge transaction times out after 30 seconds. No confirmation. No error message to the user. The agent just... waits."

[Scene 3: Retry amplification]

"Now the dangerous part. The agent retries. And retries again. This is **retry amplification** — three duplicate orders on the same market within seconds. Each one carries gas costs. Each one increases slippage."

[Point to the incident cards appearing]

"Our platform detects this immediately. Duplicate Order Detector fires. The evidence chain is captured."

---

## Minute 3: The Cascade (2:00-3:00)

"One failure cascades."

[Scene 4: Exposure breach]

"The duplicate orders push wallet exposure past $125,000 — through our $100,000 safety threshold. That's real capital at risk from a single agent failure."

[Scene 5: Orchestration desync]

"Now the orchestration layer breaks down. Agent A thinks the trade closed. Agent B says it failed. They disagree on the fundamental state of execution. This is how autonomous agents silently destroy capital — not through bad strategy, but through **runtime failure**."

[Scene 6-7: Detection climax]

"Our platform detects all of this. Nine detection engines running simultaneously. Evidence-based incidents, not AI guesses. This isn't a chatbot telling you something might be wrong — this is **deterministic runtime intelligence**."

---

## Minute 4: Recovery & The Point (3:00-4:00)

[Scene 8: Recovery]

"Once the operator has visibility, recovery is straightforward. Isolate the affected wallets. Pause the desynchronized agent. Let the healthy agents continue trading."

"Two agents resume normal operation immediately. The system is stable."

[Pause for effect]

"Here's what we built:"

"Not another trading bot. Not an AI agent that predicts prices."

"We built the **infrastructure that keeps autonomous trading agents safe.** "

"Runtime observability. Failure detection. Operational intelligence. For the agentic economy."

"That's AgentOS Runtime."

---

## Key Visual Moments for Judges

| Timestamp | What judges see | Why it matters |
|---|---|---|
| 0:15 | Dashboard fills with live agents | "This is real, not a mockup" |
| 1:15 | First red incident card appears | "They detect failures automatically" |
| 1:45 | "Financial impact: $75,000" on incident | "This protects real money" |
| 2:15 | Wallet exposure breach — CRITICAL in red | "The danger is visible" |
| 2:45 | Three incident cards active simultaneously | "Cascade detection" |
| 3:15 | Recovery — green agents continue | "Not just detection — operational recovery" |
| 3:30 | Final dashboard state | "Production-grade, not a prototype" |
