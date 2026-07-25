import { db } from "@service-center/db";
import { user } from "@service-center/db/schema/auth";
import { serviceApp } from "@service-center/db/schema/service-center";
import { env } from "@service-center/env/server";
import { eq } from "drizzle-orm";

import { auth } from "./index";

function getBootstrapAdmin() {
  const email = env.BOOTSTRAP_ADMIN_EMAIL;
  const name = env.BOOTSTRAP_ADMIN_NAME;
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !name || !password) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, and BOOTSTRAP_ADMIN_PASSWORD are required.",
    );
  }

  return { email: email.toLowerCase(), name, password };
}

async function seedBootstrapAdmin() {
  const admin = getBootstrapAdmin();
  const existing = await db.query.user.findFirst({
    where: eq(user.email, admin.email),
  });

  if (!existing) {
    await auth.api.createUser({
      body: {
        email: admin.email,
        name: admin.name,
        password: admin.password,
        role: "admin",
      },
    });
    return;
  }

  if (existing.role !== "admin") {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, existing.id));
  }
}

async function seedServiceApps() {
  await db
    .insert(serviceApp)
    .values([
      {
        id: "app_user_management",
        slug: "user-management",
        name: "User management",
        description: "Manage staff accounts and access to Service Center applications.",
        icon: "Users",
      },
      {
        id: "app_cold_mailing",
        slug: "cold-mailing",
        name: "Cold mailing",
        description: "Build compliant outbound campaigns and monitor delivery.",
        icon: "Send",
      },
    ])
    .onConflictDoNothing();
}

await seedBootstrapAdmin();
await seedServiceApps();
