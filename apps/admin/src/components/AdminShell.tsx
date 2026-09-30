"use client";

import {
  ActionIcon,
  Alert,
  AppShell,
  Button,
  Center,
  Container,
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
    // Tablette (< lg) : rail d'icônes seules ; bureau (≥ lg) : icône + libellé.
    <AppShell navbar={{ width: { base: 64, lg: 240 }, breakpoint: 0 }} padding="lg">
      <AppShell.Navbar p="xs" bg="var(--heute-surface)">
        <Group px={{ base: 0, lg: "xs" }} h={40}>
          <Title order={4} visibleFrom="lg">
            {de.appName}
          </Title>
        </Group>
        <Stack component="nav" aria-label="Navigation" gap={4} mt="xs" style={{ flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              label={
                <Text component="span" size="sm" fw={600} visibleFrom="lg">
                  {item.label}
                </Text>
              }
              leftSection={NAV_ICONS[item.href]}
              active={pathname === item.href}
              variant="light"
              mih={40}
              styles={{ section: { marginInlineEnd: 0 }, root: { justifyContent: "center" } }}
            />
          ))}
        </Stack>
        <Stack gap="xs" pt="xs" style={{ borderTop: "1px solid var(--heute-border)" }}>
          <Text size="sm" fw={600} truncate visibleFrom="lg" px="xs">
            {state.displayName}
          </Text>
          {signOutError ? (
            <Text size="xs" c="red" role="alert" px="xs">
              {signOutError}
            </Text>
          ) : null}
          <Button variant="default" size="sm" onClick={onSignOut} visibleFrom="lg">
            {de.logout}
          </Button>
          <ActionIcon
            variant="default"
            size={40}
            onClick={onSignOut}
            hiddenFrom="lg"
            aria-label={de.logout}
            title={de.logout}
            mx="auto"
          >
            <Icon>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </Icon>
          </ActionIcon>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Container size="xl" p={0}>
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const NAV_ICONS: Record<(typeof NAV_ITEMS)[number]["href"], ReactNode> = {
  "/tagesuebersicht": (
    <Icon>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Icon>
  ),
  "/dienstplan": (
    <Icon>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icon>
  ),
  "/gaeste": (
    <Icon>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M17 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6" />
    </Icon>
  ),
  "/speiseplan": (
    <Icon>
      <path d="M6 2v8a2 2 0 0 0 2 2v10M10 2v8M6 6h4M18 2c-2 2-3 5-3 8h3v12" />
    </Icon>
  ),
  "/housekeeping": (
    <Icon>
      <path d="M3 21V9l9-6 9 6v12M9 21v-7h6v7" />
    </Icon>
  ),
  "/aenderungsprotokoll": (
    <Icon>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5" />
    </Icon>
  ),
};
