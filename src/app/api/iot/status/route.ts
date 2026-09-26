import { NextResponse } from "next/server";
import { z } from "zod";
import { getDeviceStatuses, markDeviceOnline } from "~/server/device-status";

// Prisma necesita el runtime de Node, no el edge.
export const runtime = "nodejs";

/**
 * Heartbeat opcional: cualquier dispositivo (MEGA/ESP o Raspberry) puede
 * pegarle acá periódicamente para confirmar que sigue en línea, aunque no
 * tenga un evento real que reportar. No es obligatorio — /api/iot/fall y
 * /api/iot/bed-status también marcan "en línea" al dispositivo que les pega.
 */
const bodySchema = z.object({
  deviceId: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "body inválido, se espera { deviceId: string }" }, { status: 400 });
  }

  const result = await markDeviceOnline(parsed.data.deviceId);

  if (!result.ok) {
    return NextResponse.json(
      { error: `dispositivo "${parsed.data.deviceId}" no está registrado` },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

/** Para revisar el estado sin esperar al mensaje de consola. */
export async function GET() {
  return NextResponse.json({ devices: getDeviceStatuses() });
}
