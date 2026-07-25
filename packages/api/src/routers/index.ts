import type { RouterClient } from "@orpc/server";
import { db } from "@service-center/db";
import { appMembership, auditLog, serviceApp } from "@service-center/db/schema/service-center";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure, publicProcedure } from "../index";

const appMembershipInput = z.object({
  userId: z.string().min(1),
  appId: z.string().min(1),
  role: z.string().min(1).max(64),
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  admin: {
    listApps: adminProcedure.handler(async () => {
      return db.select().from(serviceApp).where(eq(serviceApp.isActive, true));
    }),
    listUserAccess: adminProcedure
      .input(z.object({ userId: z.string().min(1) }))
      .handler(async ({ input }) => {
        return db
          .select({
            id: appMembership.id,
            appId: serviceApp.id,
            appName: serviceApp.name,
            role: appMembership.role,
          })
          .from(appMembership)
          .innerJoin(serviceApp, eq(appMembership.appId, serviceApp.id))
          .where(eq(appMembership.userId, input.userId));
      }),
    setUserAppAccess: adminProcedure.input(appMembershipInput).handler(async ({ context, input }) => {
      const [membership] = await db
        .insert(appMembership)
        .values({
          id: crypto.randomUUID(),
          appId: input.appId,
          userId: input.userId,
          role: input.role,
        })
        .onConflictDoUpdate({
          target: [appMembership.appId, appMembership.userId],
          set: { role: input.role, updatedAt: new Date() },
        })
        .returning();

      if (!membership) {
        throw new Error("Failed to create application membership.");
      }

      await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        actorUserId: context.session?.user.id,
        action: "app_membership.upserted",
        targetType: "app_membership",
        targetId: membership.id,
        metadata: { appId: input.appId, userId: input.userId, role: input.role },
      });

      return membership;
    }),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
