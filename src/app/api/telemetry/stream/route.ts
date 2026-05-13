import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { addSubscriber, removeSubscriber } from "@/lib/event-store";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api:telemetry:stream");

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = uuid();
  log.info({ clientId }, "SSE client connected");

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      addSubscriber(clientId, controller as ReadableStreamDefaultController);

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`)
      );
    },
    cancel() {
      closed = true;
      removeSubscriber(clientId);
      log.info({ clientId }, "SSE client disconnected");
    },
  });

  // Clean up after client disconnects (detected via write failures in event-store)
  req.signal.addEventListener("abort", () => {
    if (!closed) {
      removeSubscriber(clientId);
      closed = true;
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
