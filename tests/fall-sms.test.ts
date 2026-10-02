import assert from "node:assert/strict";
import { test } from "node:test";
import { queueFallSms, sendFallSms } from "../src/server/fall-sms";

const config = {
  rapidApiKey: "test-key",
  d7Token: "test-token",
  recipient: "+525551234567",
  originator: "FallGuard",
};

test("envía un aviso genérico y acepta solo la confirmación del proveedor", async () => {
  let request: { url: string; init: RequestInit } | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    request = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({ status: "accepted", request_id: "abc" }), { status: 202 });
  };

  const result = await sendFallSms(config, fetcher);
  assert.equal(result, "accepted");
  assert.equal(request?.url, "https://d7sms.p.rapidapi.com/messages/v1/send");
  assert.equal((request?.init.headers as Record<string, string>)["X-RapidAPI-Key"], "test-key");
  assert.equal((request?.init.headers as Record<string, string>).Token, "test-token");
  const body = JSON.parse(String(request?.init.body)) as { messages: Array<Record<string, unknown>> };
  assert.deepEqual(body.messages[0]?.recipients, ["+525551234567"]);
  assert.match(String(body.messages[0]?.content), /posible caida/i);
  assert.doesNotMatch(String(body.messages[0]?.content), /paciente|habitaci[oó]n|301A/i);
});

test("no confunde HTTP exitoso con aceptación de envío", async () => {
  const fetcher: typeof fetch = async () =>
    new Response(JSON.stringify({ status: "rejected" }), { status: 200 });
  await assert.rejects(sendFallSms(config, fetcher), /rechazado/i);
});

test("requiere configuración completa antes de enviar", async () => {
  let called = false;
  const fetcher: typeof fetch = async () => {
    called = true;
    throw new Error("unexpected request");
  };
  assert.equal(await sendFallSms({ ...config, d7Token: "" }, fetcher), "disabled");
  assert.equal(called, false);
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
