import { createTRPCRouter } from "~/server/api/trpc";
import { alertsRouter } from "~/server/api/routers/alerts";
import { patientsRouter } from "~/server/api/routers/patients";

export const appRouter = createTRPCRouter({
  alerts: alertsRouter,
  patients: patientsRouter,
});

export type AppRouter = typeof appRouter;
