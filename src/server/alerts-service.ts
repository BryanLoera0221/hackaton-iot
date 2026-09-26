import type { Alert, Patient, PrismaClient, Room } from "@prisma/client";
import { ALERT_ACK_EVENT, ALERT_EVENT, alertEvents, type AlertAckPayload, type AlertPayload } from "~/server/events";

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

/**
 * Traduce el ID de un sensor físico (ej. "FALL-001") al externalId del
 * paciente al que está asignado. El hardware identifica el evento por
 * dispositivo, no por Patient.externalId directamente.
 */
export async function resolvePatientExternalIdByDevice(
  db: PrismaClient,
  deviceId: string,
  kind: "fall" | "bed",
): Promise<string | null> {
  const device = await db.device.findUnique({
    where: { id: deviceId },
    include: { patient: true },
  });
  if (!device || device.kind !== kind) return null;
  return device.patient.externalId;
}

export type ReportBedStatusResult =
  | { ok: true; patient: PatientWithRoom; alert: Alert | null; resolved: boolean }
  | { ok: false; error: "not_found" };

/**
 * Estado continuo de la cama (Raspberry Pi). `occupied: false` es
 * exactamente una salida de cama (delega en reportAlert). `occupied: true`
 * solo tiene efecto si hay una alerta "exit" sin escalar activa: se
 * auto-resuelve, acreditada a "Sistema" — una caída nunca se auto-resuelve.
 */
export async function reportBedStatus(
  db: PrismaClient,
  input: { patientExternalId: string; occupied: boolean },
): Promise<ReportBedStatusResult> {
  if (!input.occupied) {
    const result = await reportAlert(db, { patientExternalId: input.patientExternalId, type: "exit" });
    if (!result.ok) return result;
    return { ok: true, patient: result.patient, alert: result.alert, resolved: false };
  }

  const patient = await db.patient.findUnique({
    where: { externalId: input.patientExternalId },
    include: { room: true },
  });
  if (!patient) return { ok: false, error: "not_found" };

  const active = await db.alert.findFirst({
    where: { patientId: patient.id, acknowledged: false },
  });

  if (!active || active.type === "fall") {
    return { ok: true, patient, alert: active, resolved: false };
  }

  const acknowledgedAt = new Date();
  const alert = await db.alert.update({
    where: { id: active.id },
    data: { acknowledged: true, acknowledgedAt, acknowledgedBy: "Sistema (regresó a la cama)" },
  });

  const payload: AlertAckPayload = {
    id: alert.id,
    acknowledgedAt: acknowledgedAt.toISOString(),
    acknowledgedBy: alert.acknowledgedBy,
  };
  alertEvents.emit(ALERT_ACK_EVENT, payload);

  return { ok: true, patient, alert, resolved: true };
}
