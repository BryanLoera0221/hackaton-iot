import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy al modelo de Roboflow "fall-c3gmv/1" (Serverless Cloud API).
 * La API key vive solo en el servidor (ROBOFLOW_API_KEY en .env) y viaja en
 * el header Authorization, nunca en la query ni en el cliente.
 *
 * Recibe multipart/form-data con el campo "image" (archivo) y responde con
 * el JSON de predicciones del modelo tal cual.
 */
const MODEL_ID = "fall-c3gmv/1";
const ROBOFLOW_URL = `https://serverless.roboflow.com/${MODEL_ID}`;
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ROBOFLOW_API_KEY no está configurada" }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const image = form?.get("image");

  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: 'falta el archivo "image"' }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: "la imagen supera 8 MB" }, { status: 413 });
  }

  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");

  const res = await fetch(ROBOFLOW_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: base64,
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ error: "no se pudo contactar a Roboflow" }, { status: 502 });
  }

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      { error: "Roboflow rechazó la solicitud", detail: json },
      { status: 502 },
    );
  }

  return NextResponse.json(json);
}
