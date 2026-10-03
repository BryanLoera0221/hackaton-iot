import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Segunda opinión sobre una caída: cuando el modelo de Roboflow marca
 * "fall", el cliente manda el mismo cuadro aquí y Claude revisa la imagen.
 *
 * Usa Claude Code en modo headless (`claude -p`) con la sesión de la
 * suscripción del usuario, así que solo funciona en la máquina donde Claude
 * Code tiene sesión iniciada. CLAUDE_CLI_PATH en .env apunta al ejecutable
 * (por defecto `claude` del PATH).
 *
 * Recibe multipart/form-data con "image" (archivo) y opcionalmente
 * "detector" (texto con lo que vio Roboflow, p. ej. "Fall 87 %").
 */
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 60_000;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const VerdictSchema = z.object({
  fell: z.boolean(),
  confidence: z.enum(["baja", "media", "alta"]),
  reason: z.string(),
});

const JSON_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    fell: { type: "boolean" },
    confidence: { type: "string", enum: ["baja", "media", "alta"] },
    reason: { type: "string" },
  },
  required: ["fell", "confidence", "reason"],
  additionalProperties: false,
});

const SYSTEM = `Eres un verificador de caídas para un sistema de monitoreo de pacientes en un hospital.
Recibes un cuadro de una cámara en el que un detector automático marcó una posible caída.
Decide si la persona realmente se cayó: está en el suelo o desplomada sin control, no
acostada en una cama, sentada, agachada a propósito o haciendo ejercicio.
Si no hay ninguna persona visible, fell es false.
Responde en español; "reason" es una sola frase corta que describe lo que ves.`;

/** Salida de `claude -p --output-format json` (solo los campos que usamos). */
const CliOutputSchema = z.object({
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
});

function runClaude(cwd: string, prompt: string) {
  const bin = process.env.CLAUDE_CLI_PATH ?? "claude";
  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--json-schema",
    JSON_SCHEMA,
    "--system-prompt",
    SYSTEM,
    // Solo puede leer archivos, y solo dentro de la carpeta temporal.
    "--tools",
    "Read",
    "--allowedTools",
    "Read",
    "--strict-mcp-config",
    "--no-session-persistence",
  ];

  return new Promise<string>((resolve, reject) => {
    const child = execFile(
      bin,
      args,
      { cwd, timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        // La CLI sale con código distinto de 0 si falla, pero igual imprime el JSON.
        if (stdout) resolve(stdout);
        else reject(err ?? new Error("sin salida"));
      },
    );
    child.stdin?.end();
  });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const image = form?.get("image");
  const detector = form?.get("detector");

  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: 'falta el archivo "image"' }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: "la imagen supera 5 MB" }, { status: 413 });
  }

  const file = `frame.${EXTENSIONS[image.type] ?? "jpg"}`;
  const dir = await mkdtemp(path.join(tmpdir(), "fallguard-verify-"));

  try {
    await writeFile(path.join(dir, file), Buffer.from(await image.arrayBuffer()));

    const prompt = [
      `Lee la imagen ${file}.`,
      typeof detector === "string" && detector ? `El detector marcó: ${detector}.` : "",
      "¿La persona realmente se cayó? Responde según el esquema.",
    ]
      .filter(Boolean)
      .join(" ");

    let stdout: string;
    try {
      stdout = await runClaude(dir, prompt);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      return NextResponse.json(
        {
          error:
            code === "ENOENT"
              ? "no se encontró Claude Code (revisa CLAUDE_CLI_PATH)"
              : "Claude Code no respondió a tiempo",
        },
        { status: 502 },
      );
    }

    const out = CliOutputSchema.safeParse(JSON.parse(stdout));
    if (!out.success || out.data.is_error) {
      const detail = out.success ? out.data.result : undefined;
      return NextResponse.json(
        { error: detail ? `Claude Code: ${detail}` : "Claude Code devolvió un error" },
        { status: 502 },
      );
    }

    const verdict = VerdictSchema.safeParse(out.data.structured_output);
    if (!verdict.success) {
      return NextResponse.json({ error: "respuesta de Claude con formato inválido" }, { status: 502 });
    }

    return NextResponse.json(verdict.data);
  } catch {
    return NextResponse.json({ error: "salida de Claude Code ilegible" }, { status: 502 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
