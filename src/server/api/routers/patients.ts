import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const patientsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.patient.findMany({
      include: { room: true },
      orderBy: { name: "asc" },
    });
  }),
});
