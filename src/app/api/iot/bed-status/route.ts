import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { reportBedStatus, resolvePatientExternalIdByDevice } from "~/server/alerts-service";
import { markDeviceOnline } from "~/server/device-status";

// Prisma necesita el runtime de Node, no el edge.
export const runtime = "nodejs";

/**
 * Provisional: todavía no existe un script/firmware real para la Raspberry
 * Pi, así que este contrato (nombre de ruta y forma del body) puede ajustarse
 * sin drama el día que exista — nada más del sistema depende de él todavía.
 */
const bodySchema = z.object({
  deviceId: z.string().min(1),
  occupied: z.boolean(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "body inválido, se espera { deviceId: string, occupied: boolean }" },
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
  const result = await reportBedStatus(db, { patientExternalId, occupied: parsed.data.occupied });

  if (!result.ok) {
    return NextResponse.json(
      { error: `no existe un paciente con externalId "${patientExternalId}"` },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, resolved: result.resolved }, { status: 200 });
}
