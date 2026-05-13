import { NextResponse } from "next/server";
import { getLatestBlock, getRecentBlocks, getClientStatus } from "@/lib/onchain/mantle";

export async function GET() {
  const status = getClientStatus();
  const latestBlock = await getLatestBlock();

  if (!latestBlock) {
    return NextResponse.json({
      status: "disconnected",
      mantle: status,
      blocks: [],
      error: "Unable to connect to Mantle Testnet RPC. Check network.",
      meta: { timestamp: new Date().toISOString() },
    });
  }

  const recentBlocks = await getRecentBlocks(3);

  return NextResponse.json({
    status: "connected",
    mantle: status,
    latestBlock: {
      number: latestBlock.blockNumber.toString(),
      hash: latestBlock.hash,
      timestamp: Number(latestBlock.timestamp),
      txCount: latestBlock.txCount,
      gasUsed: latestBlock.gasUsed.toString(),
    },
    recentBlocks: recentBlocks.map((b) => ({
      number: b.blockNumber.toString(),
      hash: b.hash,
      txCount: b.txCount,
      age: Math.floor(Date.now() / 1000) - Number(b.timestamp),
    })),
    meta: { timestamp: new Date().toISOString() },
  });
}
