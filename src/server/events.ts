import { EventEmitter } from "node:events";

// Singleton en memoria: funciona porque para el hackathon corres UNA sola
// instancia del server de Next.js (npm run dev / start). Si en algún momento
// escalas a varias instancias, esto habría que moverlo a Redis pub/sub.
const globalForEvents = globalThis as unknown as {
  fallAlertEvents?: EventEmitter;
};

export const fallAlertEvents = globalForEvents.fallAlertEvents ?? new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.fallAlertEvents = fallAlertEvents;
}

// Sube el límite de listeners: cada pestaña de dashboard abierta agrega uno.
fallAlertEvents.setMaxListeners(50);

export const ALERT_EVENT = "fall-alert" as const;

export type FallAlertPayload = {
  id: string;
  patientId: string;
  patientName: string;
  roomLabel: string | null;
  createdAt: string;
};
