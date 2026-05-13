# AgentOS Runtime — Final Demo Script

**Duration:** 3-4 minutes
**Tone:** Confident, operational. Infrastructure founder, not AI hype.

---

## Minute 1: The Setup (0:00-1:00)

"Meet the Portfolio Agent. It's an autonomous AI agent managing a $325,000 portfolio across four assets — Bitcoin, Ethereum, USDC, and Mantle. It monitors allocation targets, detects imbalances, and executes rebalance trades on Mantle testnet."

[Click "Run Portfolio Demo"]

"Right now it's running a monitoring cycle. BTC is at 60%, ETH at 25%, USDC at 10%, MNT at 5%. Everything looks normal."

"But autonomous agents operate in a live market. Prices move. Allocations drift. And when the agent acts, nobody is watching the execution."

---

## Minute 2: The Imbalance & Execution (1:00-2:00)

"Watch what happens. Bitcoin pumps 12% — from $98,750 to $110,600. BTC allocation jumps to 75.8%, 15 points above target."

"The Portfolio Agent detects the imbalance and autonomously decides: sell BTC, buy ETH and USDC to restore allocation targets. Two trades. $55,300 in BTC to USDC. $27,000 in USDC to ETH. Both submitted to Mantle testnet."

[TXs appear in Transaction Lifecycle panel]

"This is what autonomous agents should do. But execution is where it gets dangerous."

---

## Minute 3: The Cascade (2:00-3:00)

"The Mantle RPC goes down. Both transactions sit unconfirmed for 30 seconds. The Portfolio Agent doesn't know this — it only knows it hasn't received confirmation."

"So it retries. And retries again. Three duplicate BTC sell orders. Nonces 42 through 45 consumed on the same trade. Slippage climbing from 5 to 17 basis points."

[Incident cards appear. Dashboard turns red.]

"AgentOS Runtime detects all of this. Duplicate Order Detector fires. Wallet Exposure Detector triggers at $248,000 — more than double our safety threshold. Transaction Stall Detector identifies the stuck nonces."

"Then the worst part: the Portfolio Agent thinks the rebalance completed. The TX Executor says the transactions were never confirmed. They disagree on the fundamental state of execution."

[CRITICAL incident appears — red glow, pulse animation]

"This is a critical incident. Risk score 92 out of 100. $248,000 at risk. And without AgentOS Runtime, nobody would know."

---

## Minute 4: Recovery & The Point (3:00-4:00)

"Once you have visibility, recovery is straightforward. The operator identifies the RPC latency as root cause. Pauses the affected wallet. Replaces the stuck transactions with fresh nonces. Resolves the orchestration disagreement."

"The Portfolio Agent resumes trading. Rebalance completes successfully. System stable."

[Pause]

"Here's the point. Everyone is building AI agents that execute trades, make predictions, generate alpha. But nobody is asking: **what happens when they fail?** "

"When an autonomous agent silently retries a trade five times, who sees that? When wallet exposure doubles past the safety limit, who catches it? When two agents disagree on whether a trade happened, who resolves it?"

"We built that layer. Runtime observability. Deterministic failure detection. Evidence-based incident intelligence. For autonomous trading agents."

"AgentOS Runtime. The safety layer for the agentic economy."
