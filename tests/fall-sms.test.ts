import assert from "node:assert/strict";
import { test } from "node:test";
import { queueFallSms, sendFallSms } from "../src/server/fall-sms";

const config = {
  accountSid: "AC0123456789abcdef0123456789abcdef",
  authToken: "test-token",
  recipient: "+525551234567",
  from: "+15551234567",
  messagingServiceSid: "",
};

test("envía un aviso genérico directamente a Twilio", async () => {
  let request: { url: string; init: RequestInit } | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    request = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({ sid: "SM0123456789abcdef0123456789abcdef", status: "queued" }), { status: 201 });
  };
  const result = await sendFallSms(config, fetcher);
  assert.equal(result, "accepted");
  assert.equal(request?.url, `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`);
  const headers = request?.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`);
  assert.equal(headers["Content-Type"], "application/x-www-form-urlencoded");
  assert.equal(headers["X-RapidAPI-Key"], undefined);
  const body = new URLSearchParams(String(request?.init.body));
  assert.equal(body.get("To"), config.recipient);
  assert.equal(body.get("From"), config.from);
  assert.match(String(body.get("Body")), /posible caida/i);
  assert.doesNotMatch(String(body.get("Body")), /paciente|habitaci[oó]n|301A/i);
});

test("permite un Messaging Service como remitente", async () => {
  let body: URLSearchParams | undefined;
  const fetcher: typeof fetch = async (_url, init) => {
    body = new URLSearchParams(String(init?.body));
    return new Response(JSON.stringify({ sid: "SM0123456789abcdef0123456789abcdef", status: "accepted" }), { status: 201 });
  };
  assert.equal(await sendFallSms({ ...config, from: "", messagingServiceSid: "MG0123456789abcdef0123456789abcdef" }, fetcher), "accepted");
  assert.equal(body?.get("MessagingServiceSid"), "MG0123456789abcdef0123456789abcdef");
  assert.equal(body?.has("From"), false);
});

test("no confunde HTTP exitoso con aceptación de envío", async () => {
  const fetcher: typeof fetch = async () =>
    new Response(JSON.stringify({ sid: "SM0123456789abcdef0123456789abcdef", status: "failed" }), { status: 201 });
  await assert.rejects(sendFallSms(config, fetcher), /rechazado/i);
});

test("no registra el cuerpo de error de Twilio", async () => {
  const fetcher: typeof fetch = async () => new Response("sensitive provider details", { status: 400 });
  await assert.rejects(sendFallSms(config, fetcher), /^Error: proveedor SMS respondió HTTP 400$/);
});

test("requiere configuración completa antes de enviar", async () => {
  let called = false;
  const fetcher: typeof fetch = async () => {
    called = true;
    throw new Error("unexpected request");
  };
  assert.equal(await sendFallSms({ ...config, authToken: "" }, fetcher), "disabled");
  assert.equal(await sendFallSms({ ...config, from: "" }, fetcher), "disabled");
  assert.equal(called, false);
});

test("rechaza destinatarios que no están en formato internacional", async () => {
  await assert.rejects(sendFallSms({ ...config, recipient: "6145222098" }), /destinatario SMS inválido/);
});

test("el envío automático permanece apagado sin activación explícita", () => {
  const previous = process.env.FALL_SMS_ENABLED;
  const originalFetch = globalThis.fetch;
  let called = false;
  process.env.FALL_SMS_ENABLED = "false";
  globalThis.fetch = async () => {
    called = true;
    throw new Error("unexpected request");
  };
  try {
    queueFallSms();
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.FALL_SMS_ENABLED;
    else process.env.FALL_SMS_ENABLED = previous;
  }
});
