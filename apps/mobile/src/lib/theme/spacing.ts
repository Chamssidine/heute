export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
} as const;

export const spacing = {
  ...space,
  screenMargin: 16,
  cardGap: 12,
  cardPadding: 16,
} as const;

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  full: 999,
} as const;

export const borders = {
  none: 0,
  width: 1,
} as const;

export const insets = {
  zero: 0,
} as const;

export const layout = {
  minTouchTarget: 48,
  touchSpacing: 8,
  buttonHeightDefault: 48,
  buttonHeightLarge: 56,
  chipHeight: 28,
  listRowMinHeight: 56,
  statusButtonHeight: 56,
  emptyStatePaddingVertical: 32,
  snackbarHeight: 48,
  snackbarBottomOffset: 16,
  skeletonTitleHeight: 24,
  skeletonLineHeight: 16,
  skeletonCardHeight: 72,
  skeletonGap: 12,
} as const;

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const opacities = {
  pressed: 0.7,
  disabled: 0.5,
  transparent: 0,
  opaque: 1,
} as const;

export const animations = {
  duration: 150,
  durationSlow: 200,
  snackbarDurationMs: 5000,
} as const;
