import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const room1 = await db.room.create({ data: { label: "302-A" } });
  const room2 = await db.room.create({ data: { label: "302-B" } });

  await db.patient.createMany({
    data: [
      { externalId: "101", name: "María Torres", roomId: room1.id },
      { externalId: "102", name: "Jorge Reyes", roomId: room2.id },
      { externalId: "103", name: "Lucía Palma", roomId: room2.id },
    ],
  });

  console.log("Seed listo: 3 pacientes, 2 habitaciones.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
