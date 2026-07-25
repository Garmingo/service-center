import { auth } from "@service-center/auth";
import { db } from "@service-center/db";
import { appMembership, serviceApp } from "@service-center/db/schema/service-center";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AppShell, APP_SHELL_ICONS } from "@/components/app-shell";
import ColdMailingWorkspace from "@/components/cold-mailing-workspace";
import UserManagementWorkspace from "@/components/user-management-workspace";

export default async function ServiceAppPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!session?.user) {
    redirect("/login");
  }

  const app = await db.query.serviceApp.findFirst({
    where: eq(serviceApp.slug, slug),
  });

  if (!app || !app.isActive) {
    notFound();
  }

  const isAdmin = session.user.role === "admin";
  if (!isAdmin) {
    const membership = await db.query.appMembership.findFirst({
      where: and(eq(appMembership.appId, app.id), eq(appMembership.userId, session.user.id)),
    });

    if (!membership) {
      redirect("/dashboard");
    }
  }

  if (app.slug === "user-management") {
    if (!isAdmin) {
      redirect("/dashboard");
    }

    return (
      <AppShell
        appName={app.name}
        navigation={[
          { href: "/apps/user-management", label: "People", icon: APP_SHELL_ICONS.dashboard, active: true },
          { href: "/apps/user-management", label: "Access policies", icon: APP_SHELL_ICONS.settings },
        ]}
      >
        <UserManagementWorkspace />
      </AppShell>
    );
  }

  if (app.slug === "cold-mailing") {
    return (
      <AppShell
        appName={app.name}
        navigation={[
          { href: "/apps/cold-mailing", label: "Overview", icon: APP_SHELL_ICONS.dashboard, active: true },
          { href: "/apps/cold-mailing", label: "Settings", icon: APP_SHELL_ICONS.settings },
        ]}
      >
        <ColdMailingWorkspace />
      </AppShell>
    );
  }

  notFound();
}
