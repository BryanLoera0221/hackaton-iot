"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveAlert, AlertType, HistoryEntry, Patient, PatientStatus, Risk } from "~/domain/types";
import { FALLGUARD_CONFIG, PATIENTS, buildInitialState } from "~/mock/data";
import { api } from "~/trpc/react";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${seq++}`;

type RemoteAlertPayload = {
  id: string;
  patientExternalId: string;
  type: AlertType;
  createdAt: string;
  exitAt: string | null;
};

type RemoteAckPayload = {
  id: string;
  acknowledgedAt: string;
  acknowledgedBy: string | null;
};

/**
 * Estado del dashboard: alertas activas, historial y el reloj que hace latir
 * todos los contadores.
 *
 * Con `FALLGUARD_CONFIG.useLiveFeed: false` (default) todo sale de
 * `src/mock/data.ts`. Con `true`, pacientes e historial inicial salen de
 * tRPC (`api.patients.list` / `api.alerts.list`) y los eventos en vivo llegan
 * por SSE (`/api/alerts/stream`) — ver los comentarios "CAMBIO A DATOS
 * REALES" más abajo, que marcan exactamente dónde ocurre el cambio.
 */
export function useFallGuard() {
  // CAMBIO A DATOS REALES (1/3): pacientes desde tRPC en vez de PATIENTS.
  const patientsQuery = api.patients.list.useQuery(undefined, {
    enabled: FALLGUARD_CONFIG.useLiveFeed,
  });
  const alertsQuery = api.alerts.list.useQuery(undefined, {
    enabled: FALLGUARD_CONFIG.useLiveFeed,
  });
  const ackMutation = api.alerts.acknowledge.useMutation();

  const mockPatients = useMemo(
    () => [...PATIENTS].sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true })),
    [],
  );

  const patients = useMemo(() => {
    if (!FALLGUARD_CONFIG.useLiveFeed) return mockPatients;
    if (!patientsQuery.data) return [];

    return patientsQuery.data
      .map(
        (row): Patient => ({
          id: row.externalId,
          room: row.room?.label ?? "",
          bed: row.bed,
          name: row.name,
          age: row.age,
          risk: row.risk as Risk,
          weightKg: row.weightKg ?? undefined,
          photoUrl: row.photoUrl ?? undefined,
        }),
      )
      .sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true }));
  }, [mockPatients, patientsQuery.data]);

  const patientById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  /**
   * `null` hasta que hay un primer estado (mock armado en el cliente, o la
   * primera respuesta de `alerts.list`): evita mismatches de hidratación.
   */
  const [alerts, setAlerts] = useState<ActiveAlert[] | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [now, setNow] = useState(0);

  // Estado inicial en modo mock.
  useEffect(() => {
    if (FALLGUARD_CONFIG.useLiveFeed) return;
    const t0 = Date.now();
    const seed = buildInitialState(t0);
    setAlerts(seed.alerts);
    setHistory(seed.history);
    setNow(t0);
  }, []);

  // CAMBIO A DATOS REALES: estado inicial real, separando por `acknowledged`.
  useEffect(() => {
    if (!FALLGUARD_CONFIG.useLiveFeed) return;
    if (!alertsQuery.data || !patientsQuery.data) return;

    const byPrismaId = new Map(patientsQuery.data.map((p) => [p.id, p]));
    const active: ActiveAlert[] = [];
    const done: HistoryEntry[] = [];

    for (const row of alertsQuery.data) {
      const patient = byPrismaId.get(row.patientId);
      if (!patient) continue;

      const pid = patient.externalId;
      const type = row.type as AlertType;
      const exitAtMs = row.exitAt ? row.exitAt.getTime() : null;

      if (!row.acknowledged) {
        active.push({ id: row.id, pid, type, t: row.createdAt.getTime(), exitAt: exitAtMs });
      } else if (row.acknowledgedAt) {
        const t = row.acknowledgedAt.getTime();
        done.push({
          id: row.id,
          pid,
          type,
          t,
          resp: (t - (exitAtMs ?? row.createdAt.getTime())) / 1000,
          nurse: row.acknowledgedBy ?? "—",
        });
      }
    }

    setAlerts(active);
    setHistory(done.sort((a, b) => b.t - a.t));
    setNow(Date.now());
  }, [alertsQuery.data, patientsQuery.data]);

  // Un solo intervalo mueve el reloj del header y todos los contadores M:SS.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /** BEDEXIT,<id> — no hace nada si el paciente ya tiene una alerta activa. */
  const registerExit = useCallback((pid: string) => {
    setAlerts((prev) => {
      if (!prev || prev.some((a) => a.pid === pid)) return prev;
      return [...prev, { id: nextId("exit"), pid, type: "exit", t: Date.now(), exitAt: null }];
    });
  }, []);

  /**
   * FALL,<id> — si el paciente ya estaba fuera de cama, se ESCALA la misma
   * alerta (ámbar → rojo) conservando la hora de salida, para que el tiempo
   * de respuesta se mida desde el primer aviso.
   */
  const registerFall = useCallback((pid: string) => {
    setAlerts((prev) => {
      if (!prev) return prev;
      const existing = prev.find((a) => a.pid === pid);
      const t = Date.now();

      if (!existing) {
        return [...prev, { id: nextId("fall"), pid, type: "fall", t, exitAt: null }];
      }
      if (existing.type === "fall") return prev;

      return prev.map((a) =>
        a.id === existing.id ? { ...a, type: "fall" as const, exitAt: a.t, t } : a,
      );
    });
  }, []);

  /**
   * Aplica un evento ya resuelto por el servidor (viene de SSE): a diferencia
   * de registerExit/registerFall, no decide la escalada — la refleja tal cual
   * llegó, conservando el `id` real de la alerta en la base de datos (lo
   * necesita `attend()` para poder reconciliarla luego).
   */
  const applyRemoteAlert = useCallback((payload: RemoteAlertPayload) => {
    setAlerts((prev) => {
      if (!prev) return prev;
      const withoutPatient = prev.filter((a) => a.pid !== payload.patientExternalId);
      const next: ActiveAlert = {
        id: payload.id,
        pid: payload.patientExternalId,
        type: payload.type,
        t: new Date(payload.createdAt).getTime(),
        exitAt: payload.exitAt ? new Date(payload.exitAt).getTime() : null,
      };
      return [...withoutPatient, next];
    });
  }, []);

  /**
   * Refleja un "atender" que pasó en otra pestaña. Si esta pestaña fue la que
   * atendió, `attend()` ya sacó la alerta de `alerts` de forma optimista, así
   * que aquí no se encuentra y no se duplica en el historial.
   */
  const applyRemoteAck = useCallback((payload: RemoteAckPayload) => {
    setAlerts((prev) => {
      if (!prev) return prev;
      const alert = prev.find((a) => a.id === payload.id);
      if (alert) {
        const t = new Date(payload.acknowledgedAt).getTime();
        setHistory((h) => [
          {
            id: alert.id,
            pid: alert.pid,
            type: alert.type,
            t,
            resp: (t - (alert.exitAt ?? alert.t)) / 1000,
            nurse: payload.acknowledgedBy ?? "—",
          },
          ...h,
        ]);
      }
      return prev.filter((a) => a.id !== payload.id);
    });
  }, []);

  /** Saca la alerta de la banda activa y la registra en el historial. */
  const attend = useCallback(
    (alertId: string, nurse: string) => {
      setAlerts((prev) => {
        if (!prev) return prev;
        const alert = prev.find((a) => a.id === alertId);
        if (!alert) return prev;

        const t = Date.now();
        setHistory((h) => [
          {
            id: nextId("hist"),
            pid: alert.pid,
            type: alert.type,
            t,
            resp: (t - (alert.exitAt ?? alert.t)) / 1000,
            nurse,
          },
          ...h,
        ]);

        // CAMBIO A DATOS REALES (2/3): la mutación tRPC reemite por SSE
        // (alert-acknowledged) para que las demás pestañas se limpien solas.
        if (FALLGUARD_CONFIG.useLiveFeed) {
          ackMutation.mutate({ id: alertId, by: nurse });
        }

        return prev.filter((a) => a.id !== alertId);
      });
    },
    [ackMutation],
  );

  const reset = useCallback(() => {
    const t0 = Date.now();
    const seed = buildInitialState(t0);
    setAlerts(seed.alerts);
    setHistory(seed.history);
  }, []);

  /** Un paciente al azar sin alerta activa — para los botones de demo. */
  const pickIdlePatient = useCallback(() => {
    const busy = new Set((alerts ?? []).map((a) => a.pid));
    const idle = patients.filter((p) => !busy.has(p.id));
    if (!idle.length) return null;
    return idle[Math.floor(Math.random() * idle.length)] as Patient;
  }, [alerts, patients]);

  // CAMBIO A DATOS REALES (3/3): con useLiveFeed en true, los eventos del
  // Arduino (o del botón de demo "en vivo") entran por SSE.
  const applyRemoteAlertRef = useRef(applyRemoteAlert);
  applyRemoteAlertRef.current = applyRemoteAlert;
  const applyRemoteAckRef = useRef(applyRemoteAck);
  applyRemoteAckRef.current = applyRemoteAck;

  useEffect(() => {
    if (!FALLGUARD_CONFIG.useLiveFeed) return;

    const source = new EventSource("/api/alerts/stream");

    source.addEventListener("alert", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as RemoteAlertPayload;
      applyRemoteAlertRef.current(payload);
    });

    source.addEventListener("alert-acknowledged", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as RemoteAckPayload;
      applyRemoteAckRef.current(payload);
    });

    return () => source.close();
  }, []);

  const statusOf = useCallback(
    (pid: string): PatientStatus => {
      const alert = (alerts ?? []).find((a) => a.pid === pid);
      return alert ? alert.type : "normal";
    },
    [alerts],
  );

  const alertOf = useCallback(
    (pid: string) => (alerts ?? []).find((a) => a.pid === pid) ?? null,
    [alerts],
  );

  /** Caídas primero; dentro de cada grupo, la más vieja arriba. */
  const sortedAlerts = useMemo(() => {
    return [...(alerts ?? [])].sort((a, b) => {
      if (a.type !== b.type) return a.type === "fall" ? -1 : 1;
      return a.t - b.t;
    });
  }, [alerts]);

  const avgResponse = useCallback(
    (type?: "fall" | "exit") => {
      const rows = type ? history.filter((h) => h.type === type) : history;
      if (!rows.length) return null;
      return rows.reduce((sum, h) => sum + h.resp, 0) / rows.length;
    },
    [history],
  );

  return {
    ready: alerts !== null,
    now,
    patients,
    patientById,
    alerts: sortedAlerts,
    history,
    statusOf,
    alertOf,
    avgResponse,
    occupiedBeds: patients.length - (alerts ?? []).length,
    registerExit,
    registerFall,
    attend,
    reset,
    pickIdlePatient,
  };
}

export type FallGuardState = ReturnType<typeof useFallGuard>;
