"use client";

import { AreaChart } from "@garmingo/ui-charts";
import { Badge, Button, Card, Heading, Text } from "@garmingo/ui-primitives";
import { PlusIcon } from "lucide-react";

const DELIVERY_DATA = [
  { day: "Mon", sent: 0, delivered: 0 },
  { day: "Tue", sent: 0, delivered: 0 },
  { day: "Wed", sent: 0, delivered: 0 },
  { day: "Thu", sent: 0, delivered: 0 },
  { day: "Fri", sent: 0, delivered: 0 },
];

export default function ColdMailingWorkspace() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex max-w-2xl flex-col gap-2">
          <Badge variant="brand" dot>
            Outbound workspace
          </Badge>
          <Heading level="h1">Campaign operations</Heading>
          <Text variant="body" className="text-fg2">
            Build reviewed outreach campaigns, protect sender reputation, and keep every response in context.
          </Text>
        </div>
        <Button leftIcon={<PlusIcon size={14} />}>Create campaign</Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <Card.Eyebrow>Campaigns</Card.Eyebrow>
          <Card.Title>0 active</Card.Title>
          <Card.Body>Create a project and review its eligible contacts before scheduling delivery.</Card.Body>
        </Card>
        <Card>
          <Card.Eyebrow>Sender health</Card.Eyebrow>
          <Card.Title>No accounts</Card.Title>
          <Card.Body>Add an SMTP and IMAP sender account to start a monitored delivery workflow.</Card.Body>
        </Card>
        <Card>
          <Card.Eyebrow>Inbox</Card.Eyebrow>
          <Card.Title>0 replies</Card.Title>
          <Card.Body>Inbound replies will be matched by Message-ID and stop any pending follow-up sends.</Card.Body>
        </Card>
      </section>

      <AreaChart
        eyebrow="Last five days"
        title="Delivery activity"
        data={DELIVERY_DATA}
        xKey="day"
        showLegend
        series={[
          { key: "sent", label: "Sent", color: "brand" },
          { key: "delivered", label: "Delivered", color: "success" },
        ]}
      />
    </div>
  );
}
