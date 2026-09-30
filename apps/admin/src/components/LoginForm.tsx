"use client";

import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
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
    <Center mih="100vh">
      <Paper withBorder p="xl" w={380} component="form" onSubmit={onSubmit}>
        <Stack>
          <Title order={2}>{de.login.title}</Title>
          {error ? (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          ) : null}
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
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Button type="submit" loading={busy}>
            {de.login.submit}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
