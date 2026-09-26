import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ALERT_ACK_EVENT, alertEvents, type AlertAckPayload } from "~/server/events";
import { reportAlert } from "~/server/alerts-service";

export const alertsRouter = createTRPCRouter({
  // Historial reciente, para pintar la lista al cargar el dashboard.
  // El feed en vivo llega por SSE (/api/alerts/stream); esto es solo
  // el estado inicial + lo que ya pasó.
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.alert.findMany({
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
      const alert = await ctx.db.alert.update({
        where: { id: input.id },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: input.by ?? "enfermero",
        },
      });

      const payload: AlertAckPayload = {
        id: alert.id,
        acknowledgedAt: alert.acknowledgedAt!.toISOString(),
        acknowledgedBy: alert.acknowledgedBy,
      };
      alertEvents.emit(ALERT_ACK_EVENT, payload);

      return alert;
    }),

  // Dispara una alerta contra el pipeline real (Prisma + SSE), igual que lo
  // haría el gateway del Arduino. Usado por el botón de demo "en vivo".
  simulate: publicProcedure
    .input(
      z.object({
        patientExternalId: z.string().min(1),
        type: z.enum(["fall", "exit"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await reportAlert(ctx.db, input);
      if (!result.ok) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `no existe un paciente con externalId "${input.patientExternalId}"`,
        });
      }
      return result;
    }),
});
