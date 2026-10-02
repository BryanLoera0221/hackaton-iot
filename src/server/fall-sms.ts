/** D7SMS en RapidAPI. Nunca incluye datos del paciente ni de la habitación. */
export type FallSmsConfig = {
  rapidApiKey: string;
  d7Token: string;
  recipient: string;
  originator: string;
};

const ENDPOINT = "https://d7sms.p.rapidapi.com/messages/v1/send";
const GENERIC_MESSAGE = "FallGuard: posible caida. Revise el panel de enfermeria.";

export async function sendFallSms(
  config: FallSmsConfig,
  fetcher: typeof fetch = fetch,
): Promise<"accepted" | "disabled"> {
  const { rapidApiKey, d7Token, recipient, originator } = config;
  if (!rapidApiKey || !d7Token || !recipient || !originator) return "disabled";
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) throw new Error("destinatario SMS inválido");
  if (originator.length > 11) throw new Error("remitente SMS demasiado largo");

  const response = await fetcher(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": rapidApiKey,
      "X-RapidAPI-Host": "d7sms.p.rapidapi.com",
      Token: d7Token,
    },
    body: JSON.stringify({
      messages: [{
        channel: "sms",
        content: GENERIC_MESSAGE,
        data_coding: "text",
        originator,
        recipients: [recipient],
      }],
    }),
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) throw new Error(`proveedor SMS respondió HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("status" in body) || body.status !== "accepted") {
    throw new Error("proveedor SMS rechazado o respuesta inesperada");
  }
  return "accepted";
}

/** No retrasa ni cambia la respuesta que espera el dispositivo. */
export function queueFallSms(): void {
  if (process.env.FALL_SMS_ENABLED !== "true") return;

  const config: FallSmsConfig = {
    rapidApiKey: process.env.RAPIDAPI_KEY ?? "",
    d7Token: process.env.D7_SMS_TOKEN ?? "",
    recipient: process.env.FALL_SMS_RECIPIENT ?? "",
    originator: process.env.FALL_SMS_ORIGINATOR ?? "FallGuard",
  };
  if (!config.rapidApiKey || !config.d7Token || !config.recipient) {
    console.error("[sms] configuración incompleta; aviso no enviado");
    return;
  }

  void sendFallSms(config)
    .then((result) => {
      if (result === "accepted") console.info("[sms] solicitud aceptada por D7SMS (entrega no confirmada)");
    })
    .catch((error: unknown) => {
      // Nunca registrar cabeceras, tokens, números ni respuestas del proveedor.
      const reason = error instanceof Error ? error.message : "error desconocido";
      console.error(`[sms] aviso no aceptado: ${reason}`);
    });
}
