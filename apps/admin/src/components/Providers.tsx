"use client";

import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell.tsx";
import { AuthProvider } from "./AuthProvider.tsx";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <AuthProvider>
        <AdminShell>{children}</AdminShell>
      </AuthProvider>
    </MantineProvider>
  );
}
