"use client";

import {
  Alert,
  AppShell,
  Button,
  Center,
  Group,
  Loader,
  NavLink,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { de } from "../strings/de.ts";
import { useAuth } from "./AuthProvider.tsx";
import { LoginForm } from "./LoginForm.tsx";

export const NAV_ITEMS = [
  { href: "/tagesuebersicht", label: de.nav.overview },
  { href: "/dienstplan", label: de.nav.schedule },
  { href: "/gaeste", label: de.nav.guests },
  { href: "/speiseplan", label: de.nav.menu },
  { href: "/housekeeping", label: de.nav.housekeeping },
  { href: "/aenderungsprotokoll", label: de.nav.auditLog },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { state, signOut } = useAuth();
  const pathname = usePathname();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function onSignOut() {
    setSignOutError(null);
    try {
      await signOut();
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : de.login.genericError);
    }
  }

  if (state.status === "loading") {
    return (
      <Center mih="100vh">
        <Loader aria-label={de.loading} />
      </Center>
    );
  }

  if (state.status === "signedOut") {
    return <LoginForm />;
  }

  if (state.status === "error") {
    return (
      <Center mih="100vh">
        <Stack align="center" maw={420}>
          <Alert color="red" role="alert">
            {state.message}
          </Alert>
          {signOutError ? (
            <Alert color="red" role="alert">
              {signOutError}
            </Alert>
          ) : null}
          <Button variant="default" onClick={onSignOut}>
            {de.logout}
          </Button>
        </Stack>
      </Center>
    );
  }

  if (state.status === "forbidden") {
    return (
      <Center mih="100vh">
        <Stack align="center" maw={420}>
          <Title order={2}>{de.noAccess}</Title>
          <Text ta="center">{de.noAccessHint}</Text>
          {signOutError ? (
            <Alert color="red" role="alert">
              {signOutError}
            </Alert>
          ) : null}
          <Button variant="default" onClick={onSignOut}>
            {de.logout}
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 260, breakpoint: "sm" }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={4}>{de.appName}</Title>
          <Group>
            <Text size="sm">{state.displayName}</Text>
            {signOutError ? (
              <Text size="sm" c="red" role="alert">
                {signOutError}
              </Text>
            ) : null}
            <Button variant="default" size="xs" onClick={onSignOut}>
              {de.logout}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs" component="nav" aria-label="Navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            active={pathname === item.href}
          />
        ))}
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
