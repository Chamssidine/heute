export const fontSizes = {
  caption: 13,
  label: 15,
  body: 17,
  heading: 20,
  title: 24,
  display: 40,
} as const;

export const lineHeights = {
  caption: 18,
  label: 20,
  body: 24,
  heading: 28,
  title: 32,
  display: 48,
} as const;

export const fontWeights = {
  regular: "400",
  semibold: "600",
  bold: "700",
} as const;

export const typography = {
  display: {
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    fontWeight: fontWeights.bold,
  },
  title: {
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
    fontWeight: fontWeights.bold,
  },
  heading: {
    fontSize: fontSizes.heading,
    lineHeight: lineHeights.heading,
    fontWeight: fontWeights.semibold,
  },
  body: {
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    fontWeight: fontWeights.regular,
  },
  bodyStrong: {
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    fontWeight: fontWeights.semibold,
  },
  label: {
    fontSize: fontSizes.label,
    lineHeight: lineHeights.label,
    fontWeight: fontWeights.semibold,
  },
  caption: {
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    fontWeight: fontWeights.regular,
  },
} as const;

export const tabularNums = {
  fontVariant: ["tabular-nums"] as "tabular-nums"[],
};
