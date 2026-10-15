import { NextResponse } from "next/server";
import { z } from "zod";
import { fallSmsConfigFromEnv, sendFallSms } from "~/server/fall-sms";

export const runtime = "nodejs";

/**
 * SMS al cuidador desde la pestaña Cámara IA (mismo Twilio y destinatario
 * que el aviso del sensor, ver src/server/fall-sms.ts).
 *
 * - kind "prueba": botón "Probar SMS", sin pausa.
 * - kind "camara": caída vista por la cámara y confirmada por Claude. Con
 *   pausa mínima entre envíos para no llenarle el teléfono al cuidador
 *   mientras la caída siga en cuadro.
 */
const bodySchema = z.object({ kind: z.enum(["prueba", "camara"]) });

const CAMERA_COOLDOWN_MS = 60_000;

// Sobrevive al hot-reload de `next dev`; se reinicia al reiniciar el servidor.
const state = globalThis as typeof globalThis & { __fgLastCameraSms?: number };

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }
  const { kind } = parsed.data;

  if (process.env.FALL_SMS_ENABLED !== "true") {
    return NextResponse.json({ status: "disabled", error: "SMS desactivado (FALL_SMS_ENABLED)" });
  }

  if (kind === "camara") {
    const last = state.__fgLastCameraSms ?? 0;
    const wait = CAMERA_COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) {
      return NextResponse.json({ status: "cooldown", retryInSeconds: Math.ceil(wait / 1000) });
    }
    state.__fgLastCameraSms = Date.now();
  }

  try {
    const result = await sendFallSms(fallSmsConfigFromEnv(), fetch, kind);
    if (result === "disabled") {
      return NextResponse.json({ status: "disabled", error: "faltan credenciales de Twilio en .env" });
    }
    console.info(`[sms] ${kind}: solicitud aceptada por Twilio (entrega no confirmada)`);
    return NextResponse.json({ status: "sent" });
  } catch (e) {
    // Si no se envió, que la siguiente caída pueda reintentar sin esperar.
    if (kind === "camara") state.__fgLastCameraSms = 0;
    // Los mensajes de sendFallSms son propios (sin tokens ni números), seguros de mostrar.
    const message = e instanceof Error ? e.message : "error desconocido";
    console.error(`[sms] ${kind}: aviso no aceptado`);
    return NextResponse.json({ status: "error", error: message }, { status: 502 });
  }
}
