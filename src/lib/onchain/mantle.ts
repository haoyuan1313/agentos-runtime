import { createPublicClient, http, formatEther } from "viem";
import { mantleTestnet } from "viem/chains";

// Mantle Testnet client — real connection, not simulated.
// Falls back gracefully if RPC is unreachable.

let client: ReturnType<typeof createPublicClient> | null = null;

function getClient() {
  if (!client) {
    client = createPublicClient({
      chain: mantleTestnet,
      transport: http("https://rpc.testnet.mantle.xyz", { timeout: 10000 }),
    });
  }
  return client;
}

export interface MantleBlockInfo {
  blockNumber: bigint;
  hash: string;
  timestamp: bigint;
  txCount: number;
  gasUsed: bigint;
}

export interface MantleTxInfo {
  hash: string;
  from: string;
  to: string | null;
  value: string; // ETH
  blockNumber: bigint;
  status: "confirmed" | "pending" | "failed";
}

export async function getLatestBlock(): Promise<MantleBlockInfo | null> {
  try {
    const c = getClient();
    const block = await c.getBlock({ blockTag: "latest" });
    return {
      blockNumber: block.number,
      hash: block.hash,
      timestamp: block.timestamp,
      txCount: block.transactions.length,
      gasUsed: block.gasUsed,
    };
  } catch (err) {
    console.error("[mantle] Failed to fetch latest block:", (err as Error).message);
    return null;
  }
}

export async function getRecentBlocks(count = 5): Promise<MantleBlockInfo[]> {
  try {
    const c = getClient();
    const latest = await c.getBlockNumber();
    const blocks: MantleBlockInfo[] = [];

    for (let i = BigInt(0); i < BigInt(Math.min(count, 10)); i++) {
      if (latest - i < BigInt(0)) break;
      try {
        const block = await c.getBlock({ blockNumber: latest - i });
        blocks.push({
          blockNumber: block.number,
          hash: block.hash,
          timestamp: block.timestamp,
          txCount: block.transactions.length,
          gasUsed: block.gasUsed,
        });
      } catch {
        // Skip blocks we can't fetch
      }
    }

    return blocks;
  } catch (err) {
    console.error("[mantle] Failed to fetch blocks:", (err as Error).message);
    return [];
  }
}

export async function getBlockTransactions(
  blockNumber: bigint
): Promise<MantleTxInfo[]> {
  try {
    const c = getClient();
    const block = await c.getBlock({ blockNumber, includeTransactions: true });

    if (!block || !("transactions" in block)) return [];

    const txs = block.transactions as unknown as Array<{
      hash: string;
      from: string;
      to: string | null;
      value: bigint;
    }>;

    return txs.slice(0, 10).map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: formatEther(tx.value),
      blockNumber: block.number,
      status: "confirmed",
    }));
  } catch (err) {
    console.error("[mantle] Failed to fetch block txs:", (err as Error).message);
    return [];
  }
}

export function getClientStatus(): { connected: boolean; chain: string } {
  return {
    connected: client !== null,
    chain: `${mantleTestnet.name} (${mantleTestnet.id})`,
  };
}
