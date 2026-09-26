import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const alertsRouter = createTRPCRouter({
  // Historial reciente, para pintar la lista al cargar el dashboard.
  // El feed en vivo llega por SSE (/api/alerts/stream); esto es solo
  // el estado inicial + lo que ya pasó.
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.fallAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        patient: { include: { room: true } },
      },
    });
  }),

  acknowledge: publicProcedure
    .input(
      z.object({
        id: z.string(),
        by: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.fallAlert.update({
        where: { id: input.id },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: input.by ?? "enfermero",
        },
      });
    }),
});
