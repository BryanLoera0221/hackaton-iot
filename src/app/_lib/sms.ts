/** Cliente de /api/sms/fall: SMS al cuidador (prueba manual o caída por cámara). */

export type SmsResult =
  | { status: "sent" }
  | { status: "cooldown"; retryInSeconds: number }
  | { status: "disabled" | "error"; error: string };

export type SmsState = SmsResult | { status: "sending" };

export async function sendSms(kind: "prueba" | "camara"): Promise<SmsResult> {
  try {
    const res = await fetch("/api/sms/fall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    return (await res.json()) as SmsResult;
  } catch {
    return { status: "error", error: "no se pudo contactar al servidor" };
  }
}

export function smsFailed(sms: SmsState) {
  return sms.status === "error" || sms.status === "disabled";
}

export function smsText(sms: SmsState) {
  switch (sms.status) {
    case "sending":
      return "Enviando SMS al cuidador…";
    case "sent":
      return "SMS enviado al cuidador";
    case "cooldown":
      return `SMS no enviado: ya se avisó hace poco (espera ${sms.retryInSeconds} s)`;
    default:
      return `SMS no enviado: ${sms.error}`;
  }
}
