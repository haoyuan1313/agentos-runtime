import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createModuleLogger } from "@/lib/logger";

// Byreal Agent Identity Verification
// Integration point for RealClaw agent authentication.
// In production: validates cryptographic proofs from Byreal.
// In demo: verifies known agent IDs against a trusted registry.

const log = createModuleLogger("api:byreal:verify");

// Trusted agent registry (demo mode)
const TRUSTED_AGENTS = new Set([
  "agent-1", "agent-2", "agent-3", "agent-4", "agent-5",
]);

interface VerifyRequest {
  agentId: string;
  credential?: string; // Byreal attestation proof
  challenge?: string;
}

export async function POST(req: NextRequest) {
  const requestId = (req.headers.get("x-request-id") ?? uuid()).slice(0, 128);

  try {
    const body: VerifyRequest = await req.json();

    if (!body.agentId) {
      return NextResponse.json(
        {
          verified: false,
          reason: "Missing agentId",
          meta: { timestamp: new Date().toISOString(), requestId },
        },
        { status: 400 }
      );
    }

    // In production: validate the Byreal attestation proof cryptographically.
    // For demo: check against trusted registry.
    const isTrusted = TRUSTED_AGENTS.has(body.agentId);

    if (!isTrusted) {
      log.warn({ requestId, agentId: body.agentId }, "Untrusted agent identity");
      return NextResponse.json({
        verified: false,
        reason: "Agent not in trusted registry",
        agentId: body.agentId,
        meta: { timestamp: new Date().toISOString(), requestId },
      });
    }

    log.info({ requestId, agentId: body.agentId }, "Agent identity verified");

    return NextResponse.json({
      verified: true,
      agentId: body.agentId,
      identity: {
        provider: "byreal",
        verifiedAt: new Date().toISOString(),
        // In production: include the verified on-chain identity details
        address: null, // Would be the agent's on-chain address
        credentialHash: body.credential
          ? `sha256:${body.credential.slice(0, 16)}...`
          : null,
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
  } catch (err) {
    log.error({ requestId, err }, "Identity verification failed");
    return NextResponse.json(
      {
        verified: false,
        reason: "Verification error",
        meta: { timestamp: new Date().toISOString(), requestId },
      },
      { status: 500 }
    );
  }
}
