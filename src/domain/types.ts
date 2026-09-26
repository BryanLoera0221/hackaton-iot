/**
 * Tipos del dominio FallGuard.
 *
 * Los mismos tipos los usa la UI tanto con datos mock (`src/mock/data.ts`) como
 * con datos reales (tRPC + SSE). Si cambias el origen de datos, mapea al que
 * corresponda aquí y no toques los componentes.
 */

export type Risk = "alto" | "medio" | "bajo";

export type Patient = {
  /** ID que manda el Arduino/gateway, ej. "304A". */
  id: string;
  /** Número de habitación, ej. "304". */
  room: string;
  /** Letra de camilla dentro de la habitación, ej. "A". */
  bed: string;
  name: string;
  age: number;
  risk: Risk;
  /**
   * Roadmap: cuando lleguen las celdas de carga / FSR, este es el peso leído.
   * Hoy es un valor simulado que solo se pinta si `SHOW_WEIGHT` está activo.
   */
  weightKg?: number;
  /**
   * No provista por el diseño todavía. Si existe, la tarjeta la muestra en
   * lugar del placeholder con iniciales.
   */
  photoUrl?: string;
};

export type AlertType = "exit" | "fall";

/** Alerta activa (sin atender). */
export type ActiveAlert = {
  id: string;
  pid: Patient["id"];
  type: AlertType;
  /** Momento del evento vigente: la caída si escaló, o la salida de cama. */
  t: number;
  /** Si escaló de salida → caída, la hora de la salida original. Si no, null. */
  exitAt: number | null;
};

/** Alerta ya atendida, con su tiempo de respuesta. */
export type HistoryEntry = {
  id: string;
  pid: Patient["id"];
  type: AlertType;
  /** Momento en que se atendió. */
  t: number;
  /** Segundos entre la PRIMERA alerta (exitAt ?? t) y la atención. */
  resp: number;
  nurse: string;
};

/** Estado derivado de una fila de paciente. */
export type PatientStatus = "normal" | "exit" | "fall";

export type Tab = "panel" | "historial" | "sistema";

export type HistoryFilter = "todas" | "fall" | "exit";
