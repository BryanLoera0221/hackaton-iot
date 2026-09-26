import type { AlertType, Risk } from "~/domain/types";

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:32:07" */
export function hms(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** "14:32" */
export function hm(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "14:32:07.4" — la secuencia del sensor se lee con décimas. */
export function hmsTenths(ms: number) {
  const d = new Date(ms);
  return `${hms(ms)}.${Math.floor(d.getMilliseconds() / 100)}`;
}

/** Contador de alerta sin atender: "0:42", "12:07". */
export function elapsed(fromMs: number, now: number) {
  const total = Math.max(0, Math.floor((now - fromMs) / 1000));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/** Tiempo de respuesta: "42 s" o "1 min 24 s". */
export function responseTime(seconds: number) {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${m} min` : `${m} min ${rest} s`;
}

/** "hace 12 min" — para la subline del estado en calma. */
export function minutesAgo(ms: number, now: number) {
  return Math.max(0, Math.round((now - ms) / 60_000));
}

export const riskLabel: Record<Risk, string> = {
  alto: "Riesgo alto de caída",
  medio: "Riesgo medio",
  bajo: "Riesgo bajo",
};

export const typeLabel: Record<AlertType, string> = {
  fall: "Caída confirmada",
  exit: "Fuera de cama",
};

export const typeLabelShort: Record<AlertType, string> = {
  fall: "Caída",
  exit: "Salida de cama",
};

/** "1 caída · 1 salida de cama" — resumen de la banda de alertas. */
export function alertSummary(falls: number, exits: number) {
  const parts: string[] = [];
  if (falls) parts.push(`${falls} ${falls === 1 ? "caída" : "caídas"}`);
  if (exits) parts.push(`${exits} ${exits === 1 ? "salida de cama" : "salidas de cama"}`);
  return parts.join(" · ");
}
