"use client";

import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { cssVariablesResolver, theme } from "../theme/theme.ts";
import { AdminShell } from "./AdminShell.tsx";
import { AuthProvider } from "./AuthProvider.tsx";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <AuthProvider>
        <AdminShell>{children}</AdminShell>
      </AuthProvider>
    </MantineProvider>
  );
}
