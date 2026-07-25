import { auth } from "@service-center/auth";
import { db } from "@service-center/db";
import { appMembership, serviceApp } from "@service-center/db/schema/service-center";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "admin";
  const apps = isAdmin
    ? await db.select().from(serviceApp).where(eq(serviceApp.isActive, true))
    : await db
        .select({
          id: serviceApp.id,
          slug: serviceApp.slug,
          name: serviceApp.name,
          description: serviceApp.description,
          icon: serviceApp.icon,
          isActive: serviceApp.isActive,
          createdAt: serviceApp.createdAt,
          updatedAt: serviceApp.updatedAt,
        })
        .from(serviceApp)
        .innerJoin(appMembership, eq(appMembership.appId, serviceApp.id))
        .where(and(eq(serviceApp.isActive, true), eq(appMembership.userId, session.user.id)));

  return <Dashboard apps={apps} name={session.user.name} isAdmin={isAdmin} />;
}
