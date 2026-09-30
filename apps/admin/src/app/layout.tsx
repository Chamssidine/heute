import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "../components/Providers.tsx";
import { de } from "../strings/de.ts";

export const metadata: Metadata = { title: de.appName };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
