"use client";

import { alerts } from "@garmingo/ui-hooks";
import { Badge, Button, Card, Heading, Input, Text } from "@garmingo/ui-primitives";
import { useEffect, useState, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
};

export default function UserManagementWorkspace() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  async function loadUsers() {
    setIsLoading(true);
    const { data, error } = await authClient.admin.listUsers({
      query: { limit: 100, offset: 0 },
    });
    setIsLoading(false);

    if (error) {
      alerts.danger({ title: "Could not load users", description: error.message });
      return;
    }

    setUsers(data.users as ManagedUser[]);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function createUser() {
    startTransition(async () => {
      const { error } = await authClient.admin.createUser({
        email,
        name,
        password,
        role: "user",
      });

      if (error) {
        alerts.danger({ title: "Could not create user", description: error.message });
        return;
      }

      setEmail("");
      setName("");
      setPassword("");
      alerts.success({ title: "User created", description: "The staff member can now sign in." });
      await loadUsers();
    });
  }

  function setRole(userId: string, role: "admin" | "user") {
    startTransition(async () => {
      const { error } = await authClient.admin.setRole({ userId, role });
      if (error) {
        alerts.danger({ title: "Could not update role", description: error.message });
        return;
      }

      await loadUsers();
    });
  }

  function toggleBan(member: ManagedUser) {
    startTransition(async () => {
      const result = member.banned
        ? await authClient.admin.unbanUser({ userId: member.id })
        : await authClient.admin.banUser({ userId: member.id, banReason: "Access paused by an administrator." });

      if (result.error) {
        alerts.danger({ title: "Could not update access", description: result.error.message });
        return;
      }

      await loadUsers();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="flex max-w-2xl flex-col gap-2">
          <Badge variant="brand" dot>
            Administrator only
          </Badge>
          <Heading level="h1">People and access</Heading>
          <Text variant="body" className="text-fg2">
            Create staff accounts, define global roles, and pause access when it is no longer needed.
          </Text>
        </div>
      </section>

      <Card>
        <Card.Eyebrow>New team member</Card.Eyebrow>
        <Card.Title>Create a staff account</Card.Title>
        <Card.Body>
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Full name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input
              label="Work email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label="Temporary password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </Card.Body>
        <Card.Footer>
          <Button
            disabled={isPending || name.trim().length < 2 || !email || password.length < 12}
            onClick={createUser}
          >
            {isPending ? "Saving…" : "Create user"}
          </Button>
        </Card.Footer>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Heading level="h3">Staff directory</Heading>
          <Text variant="small" className="text-fg3">
            {users.length} people
          </Text>
        </div>
        <Card>
          <Card.Body>
            {isLoading ? (
              <Text variant="body" className="text-fg2">
                Loading staff…
              </Text>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] text-left text-small">
                  <thead className="border-b border-line text-fg3">
                    <tr>
                      <th className="px-3 py-3 font-medium">Person</th>
                      <th className="px-3 py-3 font-medium">Role</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((member) => (
                      <tr key={member.id} className="border-b border-line last:border-0">
                        <td className="px-3 py-4">
                          <div className="font-medium text-fg1">{member.name}</div>
                          <div className="text-caption text-fg3">{member.email}</div>
                        </td>
                        <td className="px-3 py-4">
                          <Badge variant={member.role === "admin" ? "brand" : "neutral"}>
                            {member.role === "admin" ? "Administrator" : "Member"}
                          </Badge>
                        </td>
                        <td className="px-3 py-4">
                          <Badge variant={member.banned ? "danger" : "success"} dot>
                            {member.banned ? "Paused" : "Active"}
                          </Badge>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => setRole(member.id, member.role === "admin" ? "user" : "admin")}
                            >
                              Make {member.role === "admin" ? "member" : "admin"}
                            </Button>
                            <Button
                              size="sm"
                              variant={member.banned ? "secondary" : "danger"}
                              disabled={isPending}
                              onClick={() => toggleBan(member)}
                            >
                              {member.banned ? "Restore access" : "Pause access"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      </section>
    </div>
  );
}
