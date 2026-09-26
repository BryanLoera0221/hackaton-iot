import { db } from "~/server/db";

/**
 * Rastrea si el MEGA (sensor de caída) y la Raspberry Pi (sensor de cama)
 * siguen "en línea", con avisos por consola cuando cambian de estado.
 *
 * No depende de que el firmware llame a /api/iot/status explícitamente: se
 * marca "en línea" cualquier dispositivo que golpee /api/iot/fall o
 * /api/iot/bed-status también, así que un MEGA que solo manda caídas reales
 * ya cuenta como visto, sin tocar el firmware.
 */

const OFFLINE_TIMEOUT_MS = 30_000;
const CHECK_INTERVAL_MS = 10_000;

type DeviceKind = "fall" | "bed";

type Tracked = {
  kind: DeviceKind;
  lastSeenAt: number | null;
  online: boolean;
};

const KIND_LABEL: Record<DeviceKind, string> = {
  fall: "MEGA",
  bed: "Raspberry",
};

const globalForStatus = globalThis as unknown as {
  deviceStatus?: Map<string, Tracked>;
  deviceStatusTimer?: ReturnType<typeof setInterval>;
  deviceStatusLoaded?: boolean;
};

const tracked = globalForStatus.deviceStatus ?? new Map<string, Tracked>();
if (process.env.NODE_ENV !== "production") globalForStatus.deviceStatus = tracked;

function log(deviceId: string, kind: DeviceKind, message: string) {
  console.log(`[iot] ${KIND_LABEL[kind]} (${deviceId}) ${message}`);
}

/** Precarga los dispositivos ya registrados, para poder avisar de un MEGA/Raspberry que nunca ha conectado. */
async function ensureLoaded() {
  if (globalForStatus.deviceStatusLoaded) return;
  globalForStatus.deviceStatusLoaded = true;

  const devices = await db.device.findMany();
  for (const device of devices) {
    if (!tracked.has(device.id)) {
      tracked.set(device.id, { kind: device.kind as DeviceKind, lastSeenAt: null, online: false });
    }
  }
}

void ensureLoaded();

/** Marca un dispositivo como visto ahora mismo. Loggea solo en la transición offline/desconocido -> en línea. */
export async function markDeviceOnline(deviceId: string): Promise<{ ok: true } | { ok: false }> {
  await ensureLoaded();
  let entry = tracked.get(deviceId);

  if (!entry) {
    const device = await db.device.findUnique({ where: { id: deviceId } });
    if (!device) return { ok: false };
    entry = { kind: device.kind as DeviceKind, lastSeenAt: null, online: false };
    tracked.set(deviceId, entry);
  }

  if (!entry.online) {
    log(deviceId, entry.kind, "en línea ✅");
  }
  entry.online = true;
  entry.lastSeenAt = Date.now();
  return { ok: true };
}

export function getDeviceStatuses() {
  return [...tracked.entries()].map(([id, t]) => ({
    id,
    kind: t.kind,
    online: t.online,
    lastSeenAt: t.lastSeenAt,
  }));
}

function checkOffline() {
  const now = Date.now();
  for (const [deviceId, entry] of tracked) {
    if (entry.online && entry.lastSeenAt != null && now - entry.lastSeenAt > OFFLINE_TIMEOUT_MS) {
      entry.online = false;
      log(deviceId, entry.kind, `no reporta hace más de ${OFFLINE_TIMEOUT_MS / 1000}s — parece offline ⚠️`);
    }
  }
}

if (!globalForStatus.deviceStatusTimer) {
  globalForStatus.deviceStatusTimer = setInterval(checkOffline, CHECK_INTERVAL_MS);
}
