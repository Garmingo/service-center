"use client";

import { Badge, Button, Card, Heading, Text } from "@garmingo/ui-primitives";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { orpc } from "@/utils/orpc";

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const apiStatus = healthCheck.isLoading
    ? "Checking"
    : healthCheck.data
      ? "Operational"
      : "Unavailable";

  return (
    <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-10 px-4 py-14 sm:px-6">
      <section className="flex max-w-3xl flex-col gap-5">
        <Badge variant="brand" dot>
          Internal operations platform
        </Badge>
        <Heading level="h1">Operate every Garmingo workflow with confidence.</Heading>
        <Text variant="body" className="max-w-2xl text-fg2">
          A focused workspace for teams, customer operations, and outbound campaigns.
        </Text>
        <div>
          <Link href="/dashboard">
            <Button>Open workspace</Button>
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Card.Eyebrow>Platform</Card.Eyebrow>
          <Card.Title>Service Center</Card.Title>
          <Card.Body>One secure entry point for staff applications.</Card.Body>
        </Card>
        <Card>
          <Card.Eyebrow>Access</Card.Eyebrow>
          <Card.Title>Role-aware</Card.Title>
          <Card.Body>Apps and actions are available only to the people who need them.</Card.Body>
        </Card>
        <Card>
          <Card.Eyebrow>API status</Card.Eyebrow>
          <Card.Title>{apiStatus}</Card.Title>
          <Card.Body>
            {healthCheck.data ? "All core services are reachable." : "Connecting to core services."}
          </Card.Body>
        </Card>
      </section>
    </main>
  );
}
