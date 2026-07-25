"use client";

import { Button, Card, Input, PasswordInput } from "@garmingo/ui-primitives";
import { alerts } from "@garmingo/ui-hooks";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import z from "zod";

import { authClient } from "@/lib/auth-client";

export default function SignInForm() {
  const router = useRouter();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            router.push("/dashboard");
            alerts.success({ title: "Signed in", description: "Welcome back to Garmingo Service Center." });
          },
          onError: (error) => {
            alerts.danger({ title: "Could not sign in", description: error.error.message || error.error.statusText });
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) {
    return <div className="h-72 animate-pulse rounded-md bg-bg-sunken" />;
  }

  return (
    <Card className="w-full">
      <Card.Eyebrow>Garmingo Service Center</Card.Eyebrow>
      <Card.Title>Sign in</Card.Title>
      <Card.Body>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="email">
            {(field) => (
                <Input
                  type="email"
                  label="Work email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={field.state.meta.errors[0]?.message}
                />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
                <PasswordInput
                  label="Password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={field.state.meta.errors[0]?.message}
                />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </Card.Body>
    </Card>
  );
}
