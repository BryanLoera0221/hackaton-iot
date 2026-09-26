import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { reportBedStatus, resolvePatientExternalIdByDevice } from "~/server/alerts-service";
import { markDeviceOnline } from "~/server/device-status";

// Prisma necesita el runtime de Node, no el edge.
export const runtime = "nodejs";

/**
 * Contrato fijo por el script real de la Raspberry Pi (sensor de cama,
 * HX711): POST { deviceId, occupied: 0 | 1 } sin autenticación. Manda al
 * arrancar, en cada cambio de valor y cada 30s como latido — por eso
 * `reportBedStatus` tiene que ser idempotente ante el mismo valor repetido
 * (ya lo es: no-op si no cambia nada respecto a la alerta activa).
 */
const bodySchema = z.object({
  deviceId: z.string().min(1),
  occupied: z.union([z.literal(0), z.literal(1)]),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "body inválido, se espera { deviceId: string, occupied: 0 | 1 }" },
      { status: 400 },
    );
  }

  const patientExternalId = await resolvePatientExternalIdByDevice(db, parsed.data.deviceId, "bed");

  if (!patientExternalId) {
    return NextResponse.json(
      { error: `dispositivo "${parsed.data.deviceId}" no está registrado` },
      { status: 404 },
    );
  }

  await markDeviceOnline(parsed.data.deviceId);
  const result = await reportBedStatus(db, { patientExternalId, occupied: parsed.data.occupied === 1 });

  if (!result.ok) {
    return NextResponse.json(
      { error: `no existe un paciente con externalId "${patientExternalId}"` },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, resolved: result.resolved }, { status: 200 });
}
