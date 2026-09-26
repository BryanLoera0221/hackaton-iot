import type { Alert, Patient, PrismaClient, Room } from "@prisma/client";
import { ALERT_EVENT, alertEvents, type AlertPayload } from "~/server/events";

export type AlertKind = "fall" | "exit";

export type PatientWithRoom = Patient & { room: Room | null };

export type ReportAlertResult =
  | { ok: true; patient: PatientWithRoom; alert: Alert; escalated: boolean }
  | { ok: false; error: "not_found" };

function toPayload(patient: PatientWithRoom, alert: Alert): AlertPayload {
  return {
    id: alert.id,
    patientExternalId: patient.externalId,
    patientName: patient.name,
    roomLabel: patient.room?.label ?? null,
    type: alert.type as AlertKind,
    createdAt: alert.createdAt.toISOString(),
    exitAt: alert.exitAt ? alert.exitAt.toISOString() : null,
  };
}

/**
 * Único lugar donde vive la lógica de crear/escalar una alerta. La usan tanto
 * la ruta REST (contrato del Arduino/gateway) como la mutación tRPC
 * `alerts.simulate` (contrato del botón de demo), para no duplicarla.
 *
 * Espejo exacto de registerFall/registerExit en src/app/_lib/useFallGuard.ts:
 * si un paciente con una alerta de "exit" activa recibe un evento "fall", la
 * MISMA fila se sube a "fall" conservando exitAt, en vez de crear una nueva.
 */
export async function reportAlert(
  db: PrismaClient,
  input: { patientExternalId: string; type: AlertKind },
): Promise<ReportAlertResult> {
  const patient = await db.patient.findUnique({
    where: { externalId: input.patientExternalId },
    include: { room: true },
  });

  if (!patient) return { ok: false, error: "not_found" };

  const active = await db.alert.findFirst({
    where: { patientId: patient.id, acknowledged: false },
  });

  if (input.type === "exit") {
    // Ya hay una alerta activa (de cualquier tipo): no-op, no se duplica.
    if (active) return { ok: true, patient, alert: active, escalated: false };

    const alert = await db.alert.create({ data: { patientId: patient.id, type: "exit" } });
    alertEvents.emit(ALERT_EVENT, toPayload(patient, alert));
    return { ok: true, patient, alert, escalated: false };
  }

  // input.type === "fall"
  if (!active) {
    const alert = await db.alert.create({ data: { patientId: patient.id, type: "fall" } });
    alertEvents.emit(ALERT_EVENT, toPayload(patient, alert));
    return { ok: true, patient, alert, escalated: false };
  }

  if (active.type === "fall") {
    // Ya es una caída: no-op.
    return { ok: true, patient, alert: active, escalated: false };
  }

  // Escalada: la misma fila pasa de "exit" a "fall", conservando exitAt.
  const alert = await db.alert.update({
    where: { id: active.id },
    data: { type: "fall", exitAt: active.createdAt, createdAt: new Date() },
  });
  alertEvents.emit(ALERT_EVENT, toPayload(patient, alert));
  return { ok: true, patient, alert, escalated: true };
}
