import {
  Badge,
  Button,
  Card,
  createTheme,
  Modal,
  Notification,
  PasswordInput,
  Select,
  Skeleton,
  Table,
  TextInput,
  type CSSVariablesResolver,
} from "@mantine/core";
import { danger, dark, gray, primary, semantic, success, warning } from "./tokens.ts";

// Échelle fixe 12 / 14 / 16 / 20 / 24, deux graisses (400 et 600), grille 4/8.
const inputStyles = {
  input: { borderColor: "var(--heute-border-strong)" },
  label: { marginBottom: "var(--mantine-spacing-xs)" },
};

export const theme = createTheme({
  colors: { primary, success, warning, danger, gray, dark },
  primaryColor: "primary",
  primaryShade: { light: 6, dark: 4 },
  autoContrast: true,
  white: "#FFFFFF",
  black: semantic.light.text,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSizes: { xs: "12px", sm: "14px", md: "16px", lg: "20px", xl: "24px" },
  lineHeights: { xs: "1.5", sm: "1.43", md: "1.5", lg: "1.4", xl: "1.33" },
  headings: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "24px", lineHeight: "32px", fontWeight: "600" },
      h2: { fontSize: "20px", lineHeight: "28px", fontWeight: "600" },
      h3: { fontSize: "16px", lineHeight: "24px", fontWeight: "600" },
      h4: { fontSize: "14px", lineHeight: "20px", fontWeight: "600" },
      h5: { fontSize: "12px", lineHeight: "16px", fontWeight: "600" },
      h6: { fontSize: "12px", lineHeight: "16px", fontWeight: "600" },
    },
  },
  spacing: { xs: "8px", sm: "12px", md: "16px", lg: "24px", xl: "32px" },
  radius: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "999px" },
  defaultRadius: "sm",
  shadows: {
    xs: "none",
    sm: "0 1px 2px rgba(17, 24, 39, 0.06)",
    md: "0 4px 12px rgba(17, 24, 39, 0.12)",
    lg: "0 8px 24px rgba(17, 24, 39, 0.16)",
    xl: "0 16px 40px rgba(17, 24, 39, 0.2)",
  },
  focusRing: "always",
  respectReducedMotion: true,
  cursorType: "pointer",
  components: {
    Button: Button.extend({
      defaultProps: { size: "sm", fw: 600 },
      styles: {
        root: {
          minHeight: 32,
          transition: "background-color 150ms ease, border-color 150ms ease, transform 100ms ease",
        },
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: { size: "sm" },
      styles: inputStyles,
    }),
    PasswordInput: PasswordInput.extend({
      defaultProps: { size: "sm" },
      styles: inputStyles,
    }),
    Select: Select.extend({
      defaultProps: { size: "sm", allowDeselect: false, checkIconPosition: "right" },
      styles: inputStyles,
    }),
    Table: Table.extend({
      defaultProps: {
        verticalSpacing: 4,
        horizontalSpacing: "sm",
        highlightOnHover: true,
        stickyHeader: true,
        withTableBorder: true,
        withColumnBorders: false,
      },
      styles: {
        th: {
          fontWeight: 600,
          color: "var(--heute-text-muted)",
          backgroundColor: "var(--heute-surface-muted)",
        },
        td: { fontVariantNumeric: "tabular-nums" },
        tr: { minHeight: 32 },
      },
    }),
    Badge: Badge.extend({
      defaultProps: { size: "md", radius: "xl", variant: "light", tt: "none", fw: 600 },
    }),
    Card: Card.extend({
      defaultProps: { padding: "md", radius: "md", withBorder: true, shadow: "xs" },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: "md",
        shadow: "lg",
        padding: "lg",
        centered: true,
        transitionProps: { duration: 150 },
      },
      styles: { title: { fontSize: "20px", fontWeight: 600 } },
    }),
    Notification: Notification.extend({
      defaultProps: { radius: "sm", withBorder: true },
      styles: { root: { boxShadow: "var(--mantine-shadow-md)" } },
    }),
    Skeleton: Skeleton.extend({
      defaultProps: { radius: "sm" },
    }),
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--heute-bg": semantic.light.bg,
    "--heute-surface": semantic.light.surface,
    "--heute-surface-muted": semantic.light.surfaceMuted,
    "--heute-border": semantic.light.border,
    "--heute-border-strong": semantic.light.borderStrong,
    "--heute-text": semantic.light.text,
    "--heute-text-muted": semantic.light.textMuted,
    "--heute-marker": semantic.light.marker,
    "--heute-on-marker": semantic.light.onMarker,
    "--mantine-color-body": semantic.light.bg,
  },
  dark: {
    "--heute-bg": semantic.dark.bg,
    "--heute-surface": semantic.dark.surface,
    "--heute-surface-muted": semantic.dark.surfaceMuted,
    "--heute-border": semantic.dark.border,
    "--heute-border-strong": semantic.dark.borderStrong,
    "--heute-text": semantic.dark.text,
    "--heute-text-muted": semantic.dark.textMuted,
    "--heute-marker": semantic.dark.marker,
    "--heute-on-marker": semantic.dark.onMarker,
    "--mantine-color-body": semantic.dark.bg,
  },
});
