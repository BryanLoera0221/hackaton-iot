/** SMS de caída por la API oficial de Twilio, sin datos del paciente. */
export type FallSmsConfig = {
  accountSid: string;
  authToken: string;
  recipient: string;
  from: string;
  messagingServiceSid: string;
};

/** Textos fijos y sin datos del paciente (el SMS no es un canal seguro). */
export const SMS_MESSAGES = {
  sensor: "FallGuard: posible caida. Revise el panel de enfermeria.",
  camara: "FallGuard: caida detectada por camara y confirmada por IA. Revise el panel de enfermeria.",
  prueba: "FallGuard: mensaje de prueba. Si lo recibe, los avisos por SMS funcionan.",
} as const;

export type SmsKind = keyof typeof SMS_MESSAGES;
const E164 = /^\+[1-9]\d{7,14}$/;
const ACCOUNT_SID = /^AC[0-9a-fA-F]{32}$/;
const SERVICE_SID = /^MG[0-9a-fA-F]{32}$/;
const MESSAGE_SID = /^SM[0-9a-fA-F]{32}$/;

export async function sendFallSms(
  config: FallSmsConfig,
  fetcher: typeof fetch = fetch,
  kind: SmsKind = "sensor",
): Promise<"accepted" | "disabled"> {
  const { accountSid, authToken, recipient, from, messagingServiceSid } = config;
  if (!accountSid || !authToken || !recipient || (!from && !messagingServiceSid)) return "disabled";
  if (!ACCOUNT_SID.test(accountSid)) throw new Error("Account SID de Twilio inválido");
  if (!E164.test(recipient)) throw new Error("destinatario SMS inválido");
  if (messagingServiceSid) {
    if (!SERVICE_SID.test(messagingServiceSid)) throw new Error("Messaging Service SID inválido");
  } else if (!E164.test(from)) {
    throw new Error("remitente SMS inválido");
  }

  const body = new URLSearchParams({ To: recipient, Body: SMS_MESSAGES[kind] });
  if (messagingServiceSid) body.set("MessagingServiceSid", messagingServiceSid);
  else body.set("From", from);

  const response = await fetcher(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(3000),
    },
  );

  if (!response.ok) throw new Error(`proveedor SMS respondió HTTP ${response.status}`);
  // No usar ni registrar el cuerpo de error del proveedor: puede incluir datos sensibles.
  const result: unknown = await response.json();
  if (
    !result || typeof result !== "object" ||
    !("sid" in result) || typeof result.sid !== "string" || !MESSAGE_SID.test(result.sid) ||
    !("status" in result) || (result.status !== "queued" && result.status !== "accepted")
  ) {
    throw new Error("proveedor SMS rechazado o respuesta inesperada");
  }
  return "accepted";
}

export function fallSmsConfigFromEnv(): FallSmsConfig {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    recipient: process.env.FALL_SMS_RECIPIENT ?? "",
    from: process.env.TWILIO_FROM ?? "",
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID ?? "",
  };
}

/** No retrasa ni cambia la respuesta que espera el dispositivo. */
export function queueFallSms(): void {
  if (process.env.FALL_SMS_ENABLED !== "true") return;

  const config = fallSmsConfigFromEnv();
  if (!config.accountSid || !config.authToken || !config.recipient || (!config.from && !config.messagingServiceSid)) {
    console.error("[sms] configuración incompleta; aviso no enviado");
    return;
  }

  void sendFallSms(config)
    .then((result) => {
      if (result === "accepted") console.info("[sms] solicitud aceptada por Twilio (entrega no confirmada)");
    })
    .catch(() => {
      // Nunca registrar errores sin filtrar, cabeceras, tokens, números ni respuestas del proveedor.
      console.error("[sms] aviso no aceptado; revise la configuración y el estado en Twilio");
    });
}
