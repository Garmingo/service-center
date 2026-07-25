"use client";

import { Button, Menu } from "@garmingo/ui-primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOutIcon, UserIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="h-9 w-24 animate-pulse rounded-md bg-bg-sunken" />;
  }

  if (!session) {
    return (
      <Link href="/login">
        <Button variant="secondary">Sign in</Button>
      </Link>
    );
  }

  return (
    <Menu>
      <Menu.Trigger>
        <Button variant="secondary" leftIcon={<UserIcon size={14} />}>
          {session.user.name}
        </Button>
      </Menu.Trigger>
      <Menu.Popup>
        <div className="px-3 py-2">
          <div className="text-small font-medium text-fg1">{session.user.name}</div>
          <div className="text-caption text-fg3">{session.user.email}</div>
        </div>
        <Menu.Separator />
        <Menu.Item
          icon={<LogOutIcon size={14} />}
          variant="danger"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/");
                },
              },
            });
          }}
        >
          Sign out
        </Menu.Item>
      </Menu.Popup>
    </Menu>
  );
}
