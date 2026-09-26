import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { ALERT_EVENT, fallAlertEvents, type FallAlertPayload } from "~/server/events";

// Prisma necesita el runtime de Node, no el edge.
export const runtime = "nodejs";

const bodySchema = z.object({
  // El "externalId" es el ID que manda el Arduino/gateway, ej. "101".
  patientExternalId: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "body inválido, se espera { patientExternalId: string }" },
      { status: 400 },
    );
  }

  const patient = await db.patient.findUnique({
    where: { externalId: parsed.data.patientExternalId },
    include: { room: true },
  });

  if (!patient) {
    return NextResponse.json(
      { error: `no existe un paciente con externalId "${parsed.data.patientExternalId}"` },
      { status: 404 },
    );
  }

  const alert = await db.fallAlert.create({
    data: { patientId: patient.id },
  });

  const payload: FallAlertPayload = {
    id: alert.id,
    patientId: patient.id,
    patientName: patient.name,
    roomLabel: patient.room?.label ?? null,
    createdAt: alert.createdAt.toISOString(),
  };

  fallAlertEvents.emit(ALERT_EVENT, payload);

  return NextResponse.json({ ok: true, alert: payload }, { status: 201 });
}
