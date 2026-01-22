import { voteEvents } from "@/lib/events";
import { getRoomSummary } from "@/lib/roomSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      const initialSummary = getRoomSummary(normalized);
      send({ type: "connected" });
      if (initialSummary) {
        send({ type: "summary", summary: initialSummary });
      }

      const listener = (event: { code?: string }) => {
        if (event.code !== normalized) return;
        const summary = getRoomSummary(normalized);
        if (summary) {
          send({ type: "summary", summary });
        }
      };

      voteEvents.on("update", listener);

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: keepalive\n\n`));
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        voteEvents.off("update", listener);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
