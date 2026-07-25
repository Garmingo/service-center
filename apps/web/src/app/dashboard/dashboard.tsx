"use client";

import { Badge, Button, Card, Heading, Text } from "@garmingo/ui-primitives";
import { ArrowUpRightIcon, SendIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

type ServiceApp = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
};

const ICONS = {
  "user-management": UsersIcon,
  "cold-mailing": SendIcon,
} as const;

export default function Dashboard({
  apps,
  name,
  isAdmin,
}: {
  apps: ServiceApp[];
  name: string;
  isAdmin: boolean;
}) {
  return (
    <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-10 px-4 py-12 sm:px-6">
      <section className="flex flex-col gap-4">
        <Badge variant={isAdmin ? "brand" : "neutral"} dot>
          {isAdmin ? "Administrator workspace" : "Your workspace"}
        </Badge>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex max-w-2xl flex-col gap-2">
            <Heading level="h1">Good to see you, {name}.</Heading>
            <Text variant="body" className="text-fg2">
              Open an application to continue where your work matters most.
            </Text>
          </div>
          {isAdmin ? (
            <Link href="/apps/user-management">
              <Button variant="secondary">Manage access</Button>
            </Link>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="apps-heading">
        <div className="mb-4 flex items-center justify-between">
          <Heading level="h3" id="apps-heading">
            Your applications
          </Heading>
          <Text variant="small" className="text-fg3">
            {apps.length} available
          </Text>
        </div>
        {apps.length === 0 ? (
          <Card>
            <Card.Title>No applications assigned</Card.Title>
            <Card.Body>
              Ask a Service Center administrator to grant access to the application you need.
            </Card.Body>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {apps.map((app) => {
              const Icon = ICONS[app.slug as keyof typeof ICONS] ?? ArrowUpRightIcon;

              return (
                <Card key={app.id}>
                  <Card.Eyebrow>Application</Card.Eyebrow>
                  <Card.Title>{app.name}</Card.Title>
                  <Card.Body>{app.description}</Card.Body>
                  <Card.Footer>
                    <Link href={`/apps/${app.slug}`}>
                      <Button variant="secondary" rightIcon={<Icon size={14} />}>
                        Open app
                      </Button>
                    </Link>
                  </Card.Footer>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
