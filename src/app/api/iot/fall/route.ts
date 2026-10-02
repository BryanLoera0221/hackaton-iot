import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { reportAlert, resolvePatientExternalIdByDevice } from "~/server/alerts-service";
import { markDeviceOnline } from "~/server/device-status";
import { queueFallSms } from "~/server/fall-sms";

// Prisma necesita el runtime de Node, no el edge.
export const runtime = "nodejs";

/**
 * Contrato fijo por el firmware "Anticaídas" (Mega+WiFi R3 + ESP8266) —
 * no inventar campos de este lado. Sin autenticación ni TLS en esta etapa.
 * Las magnitudes se reciben y se descartan: no hay necesidad hoy de
 * persistirlas (ver docs/setup-backend.md si se quiere agregar más adelante).
 */
const bodySchema = z.object({
  deviceId: z.string().min(1),
  event: z.literal("POSSIBLE_FALL"),
  accelerationMagnitude: z.number(),
  gyroMagnitude: z.number(),
  orientationChange: z.number(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  const patientExternalId = await resolvePatientExternalIdByDevice(db, parsed.data.deviceId, "fall");

  if (!patientExternalId) {
    return NextResponse.json(
      { error: `dispositivo "${parsed.data.deviceId}" no está registrado` },
      { status: 404 },
    );
  }

  await markDeviceOnline(parsed.data.deviceId);
  const result = await reportAlert(db, { patientExternalId, type: "fall" });
  if (result.ok && (result.created || result.escalated)) queueFallSms();

  return NextResponse.json({ ok: true }, { status: 201 });
}
