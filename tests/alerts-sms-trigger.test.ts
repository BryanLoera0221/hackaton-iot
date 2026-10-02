import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { reportAlert } from "../src/server/alerts-service";

test("distingue altas, escaladas y eventos repetidos", async () => {
  const patient = { id: "p1", externalId: "301A", name: "Paciente", room: { label: "301" } };
  let active: { id: string; patientId: string; type: string; createdAt: Date; exitAt: Date | null } | null = null;
  const db = {
    patient: { findUnique: async () => patient },
    alert: {
      findFirst: async () => active,
      create: async ({ data }: { data: { patientId: string; type: string } }) => {
        active = { id: "a1", ...data, createdAt: new Date(), exitAt: null };
        return active;
      },
      update: async ({ data }: { data: { type: string; exitAt: Date; createdAt: Date } }) => {
        active = { ...active!, ...data };
        return active;
      },
    },
  } as unknown as PrismaClient;

  const first = await reportAlert(db, { patientExternalId: "301A", type: "exit" });
  assert.equal(first.ok && first.created, true);
  const escalated = await reportAlert(db, { patientExternalId: "301A", type: "fall" });
  assert.equal(escalated.ok && escalated.escalated, true);
  const repeated = await reportAlert(db, { patientExternalId: "301A", type: "fall" });
  assert.equal(repeated.ok && repeated.created, false);
  assert.equal(repeated.ok && repeated.escalated, false);
  active = null;
  const directFall = await reportAlert(db, { patientExternalId: "301A", type: "fall" });
  assert.equal(directFall.ok && directFall.created, true);
  assert.equal(directFall.ok && directFall.escalated, false);
});
