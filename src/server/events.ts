import { EventEmitter } from "node:events";

// Singleton en memoria: funciona porque para el hackathon corres UNA sola
// instancia del server de Next.js (npm run dev / start). Si en algún momento
// escalas a varias instancias, esto habría que moverlo a Redis pub/sub.
const globalForEvents = globalThis as unknown as {
  alertEvents?: EventEmitter;
};

export const alertEvents = globalForEvents.alertEvents ?? new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.alertEvents = alertEvents;
}

// Sube el límite de listeners: cada pestaña de dashboard abierta agrega uno
// por cada uno de los dos eventos de abajo.
alertEvents.setMaxListeners(50);

export const ALERT_EVENT = "alert" as const;
export const ALERT_ACK_EVENT = "alert-acknowledged" as const;

export type AlertPayload = {
  id: string;
  patientExternalId: string;
  patientName: string;
  roomLabel: string | null;
  type: "fall" | "exit";
  createdAt: string;
  exitAt: string | null;
};

export type AlertAckPayload = {
  id: string;
  acknowledgedAt: string;
  acknowledgedBy: string | null;
};
