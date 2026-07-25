import { AppTopbar, Sidebar } from "@garmingo/ui-blocks";
import { Button, ThemeToggle } from "@garmingo/ui-primitives";
import { ArrowLeftIcon, LayoutGridIcon, SettingsIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import UserMenu from "./user-menu";

export function AppShell({
  appName,
  children,
  navigation,
}: {
  appName: string;
  children: React.ReactNode;
  navigation: ReadonlyArray<{ href: string; label: string; icon: React.ReactNode; active?: boolean }>;
}) {
  return (
    <div className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[16rem_1fr]">
      <Sidebar>
        <div className="px-3 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeftIcon size={14} />}>
              All applications
            </Button>
          </Link>
        </div>
        <Sidebar.Section label={appName}>
          {navigation.map((item) => (
            <Sidebar.Item key={item.href} icon={item.icon} active={item.active}>
              <Link href={item.href as Route}>{item.label}</Link>
            </Sidebar.Item>
          ))}
        </Sidebar.Section>
        <div className="mt-auto flex items-center justify-between px-3 py-4">
          <ThemeToggle />
          <UserMenu />
        </div>
      </Sidebar>
      <div className="min-w-0">
        <AppTopbar breadcrumbs={[{ label: "Service Center", href: "/dashboard" }, { label: appName }]} />
        <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export const APP_SHELL_ICONS = {
  dashboard: <LayoutGridIcon size={18} />,
  settings: <SettingsIcon size={18} />,
};
