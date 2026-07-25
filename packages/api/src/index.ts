import { ORPCError, os } from "@orpc/server";
import { db } from "@service-center/db";
import { appMembership, serviceApp } from "@service-center/db/schema/service-center";
import { and, eq } from "drizzle-orm";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

function isAdmin(role: string | string[] | null | undefined) {
  return Array.isArray(role) ? role.includes("admin") : role === "admin";
}

export const adminProcedure = protectedProcedure.use(
  o.middleware(({ context, next }) => {
    if (!isAdmin(context.session?.user?.role)) {
      throw new ORPCError("FORBIDDEN");
    }

    return next();
  }),
);

export function appProcedure(appSlug: string) {
  return protectedProcedure.use(
    o.middleware(async ({ context, next }) => {
      const session = context.session;
      if (!session?.user) {
        throw new ORPCError("UNAUTHORIZED");
      }

      if (isAdmin(session.user.role)) {
        return next();
      }

      const membership = await db
        .select({ id: appMembership.id, role: appMembership.role })
        .from(appMembership)
        .innerJoin(serviceApp, eq(appMembership.appId, serviceApp.id))
        .where(and(eq(serviceApp.slug, appSlug), eq(appMembership.userId, session.user.id)))
        .limit(1);

      if (!membership[0]) {
        throw new ORPCError("FORBIDDEN");
      }

      return next({
        context: {
          appMembership: membership[0],
        },
      });
    }),
  );
}
