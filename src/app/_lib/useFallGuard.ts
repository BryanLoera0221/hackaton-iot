"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveAlert, HistoryEntry, Patient, PatientStatus } from "~/domain/types";
import { FALLGUARD_CONFIG, PATIENTS, buildInitialState } from "~/mock/data";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${seq++}`;

/**
 * Estado del dashboard: alertas activas, historial y el reloj que hace latir
 * todos los contadores.
 *
 * Hoy los pacientes y el estado inicial salen de `src/mock/data.ts`. El punto
 * exacto donde conectar datos reales está marcado con "CAMBIO A DATOS REALES".
 */
export function useFallGuard() {
  // CAMBIO A DATOS REALES (1/3): reemplaza PATIENTS por
  //   const { data } = api.patients.list.useQuery()
  // y mapea al tipo Patient. El resto del hook no cambia.
  const patients = useMemo(
    () => [...PATIENTS].sort((a, b) => a.id.localeCompare(b.id, "es", { numeric: true })),
    [],
  );

  const patientById = useMemo(
    () => new Map(patients.map((p) => [p.id, p])),
    [patients],
  );

  /**
   * `null` hasta que monta en el cliente: los timestamps del mock son
   * relativos a `Date.now()` y calcularlos en el servidor daría un HTML
   * distinto al del cliente (mismatch de hidratación).
   */
  const [alerts, setAlerts] = useState<ActiveAlert[] | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const seed = buildInitialState(t0);
    setAlerts(seed.alerts);
    setHistory(seed.history);
    setNow(t0);
  }, []);

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

  /** Saca la alerta de la banda activa y la registra en el historial. */
  const attend = useCallback((alertId: string, nurse: string) => {
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

      // CAMBIO A DATOS REALES (2/3): aquí va la mutación tRPC
      //   api.alerts.acknowledge.mutate({ id: alertId, by: nurse })
      // que el server reemite por SSE para que todas las pantallas se limpien.
      return prev.filter((a) => a.id !== alertId);
    });
  }, []);

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
  // Arduino entran por SSE. Requiere que los IDs de PATIENTS coincidan con los
  // que manda el gateway (o cambiar PATIENTS por la query tRPC, ver 1/3).
  const registerFallRef = useRef(registerFall);
  registerFallRef.current = registerFall;

  useEffect(() => {
    if (!FALLGUARD_CONFIG.useLiveFeed) return;

    const source = new EventSource("/api/alerts/stream");
    source.addEventListener("fall-alert", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { patientId: string };
      registerFallRef.current(payload.patientId);
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
