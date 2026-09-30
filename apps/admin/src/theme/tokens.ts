import type { MantineColorsTuple } from "@mantine/core";

// Source : docs/design/tokens.md §3. Seul fichier de l'admin qui contient des codes hexadécimaux.
// Palettes Mantine (10 teintes) : 0 = fond doux (`*Soft`), 6 = couleur pleine, 9 = texte sur fond doux (`on*Soft`).

export const primary: MantineColorsTuple = [
  "#DBEAFE",
  "#C7DBFD",
  "#B0CBFC",
  "#9DC0FF",
  "#8AB4FF",
  "#3B6FE8",
  "#1D4ED8",
  "#1A44BC",
  "#1E3A8A",
  "#172B66",
];

export const success: MantineColorsTuple = [
  "#DCFCE7",
  "#BBF7D0",
  "#86EFAC",
  "#4ADE80",
  "#22C55E",
  "#16A34A",
  "#15803D",
  "#166534",
  "#14532D",
  "#14532D",
];

export const warning: MantineColorsTuple = [
  "#FEF3C7",
  "#FDE68A",
  "#FCD34D",
  "#FBBF24",
  "#F59E0B",
  "#D97706",
  "#B45309",
  "#92400E",
  "#78350F",
  "#78350F",
];

export const danger: MantineColorsTuple = [
  "#FEE2E2",
  "#FECACA",
  "#FCA5A5",
  "#F87171",
  "#EF4444",
  "#DC2626",
  "#B91C1C",
  "#991B1B",
  "#7F1D1D",
  "#7F1D1D",
];

// Neutres (clair) : bg, surfaceMuted, neutralSoft, border, borderStrong, textMuted, onNeutralSoft, text.
export const gray: MantineColorsTuple = [
  "#F5F6F8",
  "#EEF0F3",
  "#E5E7EB",
  "#CDD2DA",
  "#A9B2C0",
  "#8A94A3",
  "#6B7686",
  "#4B5563",
  "#374151",
  "#111827",
];

// Neutres (sombre) : 0 = text, 2 = textMuted, 4 = border, 5 = surfaceMuted, 6 = surface, 7 = bg.
export const dark: MantineColorsTuple = [
  "#F2F4F7",
  "#D5DAE2",
  "#A9B2C0",
  "#6B7686",
  "#2E3846",
  "#202833",
  "#171D25",
  "#0F141A",
  "#0B1015",
  "#080B0F",
];

export const semantic = {
  light: {
    bg: "#F5F6F8",
    surface: "#FFFFFF",
    surfaceMuted: "#EEF0F3",
    border: "#CDD2DA",
    borderStrong: "#8A94A3",
    text: "#111827",
    textMuted: "#4B5563",
    marker: "#FDE047",
    onMarker: "#111827",
  },
  dark: {
    bg: "#0F141A",
    surface: "#171D25",
    surfaceMuted: "#202833",
    border: "#2E3846",
    borderStrong: "#6B7686",
    text: "#F2F4F7",
    textMuted: "#A9B2C0",
    marker: "#FDE047",
    onMarker: "#111827",
  },
} as const;
