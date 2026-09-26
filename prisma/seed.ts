import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Mismos 12 pacientes que src/mock/data.ts (PATIENTS), para que el dashboard
 * se vea igual al prender FALLGUARD_CONFIG.useLiveFeed.
 */
const PATIENTS = [
  { id: "301A", room: "301", bed: "A", name: "Amelia Cortés", age: 78, risk: "alto", weightKg: 61.4 },
  { id: "301B", room: "301", bed: "B", name: "Rubén Salas", age: 69, risk: "medio", weightKg: 79.8 },
  { id: "302A", room: "302", bed: "A", name: "María Torres", age: 84, risk: "alto", weightKg: 54.2 },
  { id: "302B", room: "302", bed: "B", name: "Jorge Reyes", age: 72, risk: "medio", weightKg: 88.1 },
  { id: "303A", room: "303", bed: "A", name: "Lucía Palma", age: 66, risk: "bajo", weightKg: 63.7 },
  { id: "304A", room: "304", bed: "A", name: "Ernesto Vidal", age: 81, risk: "alto", weightKg: 68.2 },
  { id: "304B", room: "304", bed: "B", name: "Carmen Aguirre", age: 75, risk: "medio", weightKg: 57.9 },
  { id: "305A", room: "305", bed: "A", name: "Tomás Iriarte", age: 59, risk: "bajo", weightKg: 91.3 },
  { id: "306A", room: "306", bed: "A", name: "Rosa Mendieta", age: 88, risk: "alto", weightKg: 49.6 },
  { id: "307A", room: "307", bed: "A", name: "Hugo Balmaceda", age: 71, risk: "medio", weightKg: 82.5 },
  { id: "308A", room: "308", bed: "A", name: "Inés Cabrera", age: 79, risk: "alto", weightKg: 58.3 },
  { id: "309A", room: "309", bed: "A", name: "Pedro Nicolás", age: 64, risk: "bajo", weightKg: 74.0 },
] as const;

async function main() {
  const roomLabels = [...new Set(PATIENTS.map((p) => p.room))];
  const roomByLabel = new Map<string, string>();

  for (const label of roomLabels) {
    const room = await db.room.create({ data: { label } });
    roomByLabel.set(label, room.id);
  }

  const patientByExternalId = new Map<string, string>();

  for (const p of PATIENTS) {
    const patient = await db.patient.create({
      data: {
        externalId: p.id,
        name: p.name,
        bed: p.bed,
        age: p.age,
        risk: p.risk,
        weightKg: p.weightKg,
        roomId: roomByLabel.get(p.room),
      },
    });
    patientByExternalId.set(p.id, patient.id);
  }

  // Dispositivos reales del prototipo, mapeados a la misma cama de prueba
  // (301A) para que ambos sensores apunten al mismo paciente en la demo.
  // Ver docs/setup-backend.md.
  await db.device.create({
    data: {
      id: "FALL-001",
      kind: "fall",
      patientId: patientByExternalId.get("301A")!,
    },
  });

  await db.device.create({
    data: {
      id: "BED-001",
      kind: "bed",
      patientId: patientByExternalId.get("301A")!,
    },
  });

  const now = Date.now();

  // Un par de alertas activas al arrancar, reflejando INITIAL_ALERTS del mock:
  // una caída ya escalada desde salida de cama, y una salida simple.
  await db.alert.create({
    data: {
      patientId: patientByExternalId.get("306A")!,
      type: "fall",
      createdAt: new Date(now - 74_000),
      exitAt: new Date(now - 86_000),
    },
  });

  await db.alert.create({
    data: {
      patientId: patientByExternalId.get("302A")!,
      type: "exit",
      createdAt: new Date(now - 212_000),
    },
  });

  // Historial ya atendido, reflejando INITIAL_HISTORY del mock.
  const history: Array<{ pid: string; type: string; minutesAgo: number; resp: number; nurse: string }> = [
    { pid: "308A", type: "exit", minutesAgo: 7, resp: 38, nurse: "L. Ramírez" },
    { pid: "301A", type: "fall", minutesAgo: 23, resp: 26, nurse: "M. Soto" },
    { pid: "304A", type: "exit", minutesAgo: 41, resp: 52, nurse: "L. Ramírez" },
    { pid: "306A", type: "exit", minutesAgo: 58, resp: 44, nurse: "J. Herrera" },
    { pid: "302B", type: "fall", minutesAgo: 76, resp: 31, nurse: "M. Soto" },
    { pid: "307A", type: "exit", minutesAgo: 94, resp: 84, nurse: "J. Herrera" },
    { pid: "303A", type: "exit", minutesAgo: 118, resp: 67, nurse: "L. Ramírez" },
    { pid: "309A", type: "fall", minutesAgo: 141, resp: 29, nurse: "M. Soto" },
  ];

  for (const h of history) {
    const acknowledgedAt = new Date(now - h.minutesAgo * 60_000);
    const exitAt = h.type === "fall" ? new Date(acknowledgedAt.getTime() - h.resp * 1000 - 6_000) : null;
    const createdAt = h.type === "fall" && exitAt ? new Date(exitAt.getTime() + 6_000) : new Date(acknowledgedAt.getTime() - h.resp * 1000);

    await db.alert.create({
      data: {
        patientId: patientByExternalId.get(h.pid)!,
        type: h.type,
        createdAt,
        exitAt,
        acknowledged: true,
        acknowledgedAt,
        acknowledgedBy: h.nurse,
      },
    });
  }

  console.log(`Seed listo: ${PATIENTS.length} pacientes, ${roomLabels.length} habitaciones.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
