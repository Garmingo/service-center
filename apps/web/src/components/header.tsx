"use client";

import { ThemeToggle, Wordmark } from "@garmingo/ui-primitives";
import Link from "next/link";

import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <header className="border-b border-line bg-bg-elevated">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <nav className="flex items-center gap-6" aria-label="Primary navigation">
          <Link href="/" aria-label="Garmingo Service Center">
            <Wordmark className="h-6 w-auto" />
          </Link>
          <div className="hidden items-center gap-4 text-small text-fg2 sm:flex">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} href={to} className="transition-colors hover:text-fg1">
                {label}
              </Link>
            );
          })}
          </div>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
