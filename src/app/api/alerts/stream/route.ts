import { ALERT_EVENT, fallAlertEvents, type FallAlertPayload } from "~/server/events";

export const runtime = "nodejs";
// El stream no termina nunca: sin esto, `next build` intenta prerenderizarlo
// y se queda colgado.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const onAlert = (payload: FallAlertPayload) => send("fall-alert", payload);
      fallAlertEvents.on(ALERT_EVENT, onAlert);

      // Comentario de "keep-alive" cada 20s: algunos proxies cierran conexiones
      // idle. No es un evento real, el cliente lo ignora.
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 20_000);

      send("ready", { ok: true });

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        fallAlertEvents.off(ALERT_EVENT, onAlert);
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
