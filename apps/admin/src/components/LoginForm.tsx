"use client";

import { Button, Center, Paper, PasswordInput, Stack, TextInput, Title } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { de } from "../strings/de.ts";
import { useAuth } from "./AuthProvider.tsx";

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : de.login.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Center mih="100vh" p="md">
      <Paper
        withBorder
        p="xl"
        w="100%"
        maw={400}
        radius="md"
        shadow="sm"
        component="form"
        onSubmit={onSubmit}
      >
        <Stack gap="md">
          <Title order={2} fz="xl" fw={600}>
            {de.login.title}
          </Title>
          <TextInput
            label={de.login.email}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordInput
            label={de.login.password}
            autoComplete="current-password"
            required
            error={error}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Button type="submit" size="md" fullWidth loading={busy}>
            {de.login.submit}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
