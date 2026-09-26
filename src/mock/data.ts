/**
 * ────────────────────────────────────────────────────────────────────────────
 * DATOS MOCK — este es el único archivo que hay que tocar para cambiar lo que
 * se ve en el dashboard. Nada de esto vive dentro de los componentes.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Para pasar a datos reales:
 *   1. Pon `USE_LIVE_FEED: true` en FALLGUARD_CONFIG (abajo). Con eso el
 *      dashboard se suscribe a /api/alerts/stream y las caídas que manda el
 *      gateway entran como alertas reales.
 *   2. Reemplaza PATIENTS por la query tRPC `api.patients.list` en
 *      `src/app/_lib/useFallGuard.ts` (hay un comentario marcando el punto).
 *   3. Los arreglos INITIAL_* se quedan vacíos y el historial sale de
 *      `api.alerts.list`.
 */

import type { HistoryEntry, Patient } from "~/domain/types";

export const FALLGUARD_CONFIG = {
  /** Se pinta junto al logo, arriba a la izquierda. */
  station: "Estación de enfermería · Piso 3, ala B",

  /** Enfermeros del turno. El primero es el que queda seleccionado al abrir. */
  nurses: ["L. Ramírez", "M. Soto", "J. Herrera"],

  /**
   * Roadmap del sensor de camilla: con `true`, la celda "Camilla" agrega una
   * segunda línea con el peso y una mini-gráfica. Hoy el sensor es un botón
   * binario, así que va en `false`.
   */
  showWeight: false,

  /** Barra inferior con botones para simular eventos del Arduino (demo). */
  showDemoFooter: true,

  /**
   * `false` = todo sale de este archivo (modo demo/diseño).
   * `true`  = el dashboard escucha /api/alerts/stream (SSE) para eventos reales.
   */
  useLiveFeed: false,
} as const;

/**
 * 12 camas. El orden de esta lista NO importa: la lista de pacientes se ordena
 * siempre por número de habitación para que ninguna fila se mueva de lugar en
 * la pantalla de pared cuando entra una alerta.
 */
export const PATIENTS: Patient[] = [
  { id: "301A", room: "301", bed: "A", name: "Amelia Cortés", age: 78, risk: "alto", weightKg: 61.4 },
  { id: "301B", room: "301", bed: "B", name: "Rubén Salas", age: 69, risk: "medio", weightKg: 79.8 },
  { id: "302A", room: "302", bed: "A", name: "María Torres", age: 84, risk: "alto", weightKg: 54.2 },
  { id: "302B", room: "302", bed: "B", name: "Jorge Reyes", age: 72, risk: "medio", weightKg: 88.1 },
  { id: "303A", room: "303", bed: "A", name: "Lucía Palma", age: 66, risk: "bajo", weightKg: 63.7 },
  { id: "304A", room: "304", bed: "A", name: "Ernesto Vidal", age: 81, risk: "alto", weightKg: 68.2 },
  { id: "304B", room: "304", bed: "B", name: "Carmen Aguirre", age: 75, risk: "medio", weightKg: 57.9 },
  { id: "305A", room: "305", bed: "A", name: "Tomás Iriarte", age: 59, risk: "bajo", weightKg: 91.3 },
  { id: "306A", room: "306", bed: "A", name: "Rosa Mendieta", age: 88, risk: "alto", weightKg: 49.6 },
  { id: "307A", room: "307", bed: "A", name: "Hugo Balmaceda", age: 71, risk: "medio", weightKg: 82.5 },
  { id: "308A", room: "308", bed: "A", name: "Inés Cabrera", age: 79, risk: "alto", weightKg: 58.3 },
  { id: "309A", room: "309", bed: "A", name: "Pedro Nicolás", age: 64, risk: "bajo", weightKg: 74.0 },
];

/**
 * Alertas activas al abrir la pantalla. Los tiempos son relativos a "ahora"
 * para que la demo siempre se vea recién ocurrida.
 *
 * - `secondsAgo`: hace cuánto ocurrió el evento vigente.
 * - `exitSecondsAgo`: solo para caídas que escalaron desde salida de cama;
 *   es hace cuánto el paciente se levantó (debe ser mayor que `secondsAgo`).
 */
export const INITIAL_ALERTS: Array<{
  pid: Patient["id"];
  type: "exit" | "fall";
  secondsAgo: number;
  exitSecondsAgo?: number;
}> = [
  { pid: "306A", type: "fall", secondsAgo: 74, exitSecondsAgo: 86 },
  { pid: "302A", type: "exit", secondsAgo: 212 },
];

/**
 * Historial del turno. `minutesAgo` es hace cuánto se atendió y `resp` el
 * tiempo de respuesta en segundos (lo que alimenta la métrica del pitch).
 */
export const INITIAL_HISTORY: Array<{
  pid: Patient["id"];
  type: "exit" | "fall";
  minutesAgo: number;
  resp: number;
  nurse: string;
}> = [
  { pid: "308A", type: "exit", minutesAgo: 7, resp: 38, nurse: "L. Ramírez" },
  { pid: "301A", type: "fall", minutesAgo: 23, resp: 26, nurse: "M. Soto" },
  { pid: "304A", type: "exit", minutesAgo: 41, resp: 52, nurse: "L. Ramírez" },
  { pid: "306A", type: "exit", minutesAgo: 58, resp: 44, nurse: "J. Herrera" },
  { pid: "302B", type: "fall", minutesAgo: 76, resp: 31, nurse: "M. Soto" },
  { pid: "307A", type: "exit", minutesAgo: 94, resp: 84, nurse: "J. Herrera" },
  { pid: "303A", type: "exit", minutesAgo: 118, resp: 67, nurse: "L. Ramírez" },
  { pid: "309A", type: "fall", minutesAgo: 141, resp: 29, nurse: "M. Soto" },
];

/** Convierte los mocks relativos en registros con timestamps absolutos. */
export function buildInitialState(now: number) {
  const alerts = INITIAL_ALERTS.map((a, i) => ({
    id: `seed-alert-${i}`,
    pid: a.pid,
    type: a.type,
    t: now - a.secondsAgo * 1000,
    exitAt: a.exitSecondsAgo != null ? now - a.exitSecondsAgo * 1000 : null,
  }));

  const history: HistoryEntry[] = INITIAL_HISTORY.map((h, i) => ({
    id: `seed-history-${i}`,
    pid: h.pid,
    type: h.type,
    t: now - h.minutesAgo * 60_000,
    resp: h.resp,
    nurse: h.nurse,
  }));

  return { alerts, history };
}
