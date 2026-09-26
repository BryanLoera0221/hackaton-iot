import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { db } from "~/server/db";

export const createTRPCContext = async () => {
  return { db };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
