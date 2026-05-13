import { registerDetector } from "./run";
import { HungExecutionDetector } from "./hung-execution";
import { RetryLoopDetector } from "./retry-loop";
import { ToolFailureDetector } from "./tool-failure";
import { OrchestrationCollapseDetector } from "./orchestration-collapse";
import { DuplicateOrderDetector } from "./duplicate-order";
import { WalletExposureDetector } from "./wallet-exposure";
import { TransactionStallDetector } from "./tx-stall";
import { StaleExecutionDetector } from "./stale-execution";
import { OrchestrationDesyncDetector } from "./orchestration-desync";

let initialized = false;

export function initDetectors(): void {
  if (initialized) return;
  initialized = true;

  // Core runtime detectors
  registerDetector(new HungExecutionDetector());
  registerDetector(new RetryLoopDetector());
  registerDetector(new ToolFailureDetector());
  registerDetector(new OrchestrationCollapseDetector());

  // Trading safety detectors
  registerDetector(new DuplicateOrderDetector());
  registerDetector(new WalletExposureDetector());
  registerDetector(new TransactionStallDetector());
  registerDetector(new StaleExecutionDetector());
  registerDetector(new OrchestrationDesyncDetector());

  console.log(`[detection] Registered 9 detectors (4 core + 5 trading)`);
}
