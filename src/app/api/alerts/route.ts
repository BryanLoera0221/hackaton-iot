import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { reportAlert } from "~/server/alerts-service";

// Prisma necesita el runtime de Node, no el edge.
export const runtime = "nodejs";

const bodySchema = z.object({
  // El "externalId" es el ID que manda el Arduino/gateway, ej. "301A".
  patientExternalId: z.string().min(1),
  // "fall" por default: mantiene compatibilidad con callers viejos que
  // todavía no mandan `type` (ej. el sketch de Arduino actual).
  type: z.enum(["fall", "exit"]).default("fall"),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'body inválido, se espera { patientExternalId: string, type?: "fall" | "exit" }' },
      { status: 400 },
    );
  }

  const result = await reportAlert(db, parsed.data);

  if (!result.ok) {
    return NextResponse.json(
      { error: `no existe un paciente con externalId "${parsed.data.patientExternalId}"` },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { ok: true, alert: result.alert, escalated: result.escalated },
    { status: 201 },
  );
}
