import { colors, chipColors, darkColors, type ColorToken, type ChipVariant } from "./colors";
import { typography, tabularNums, fontSizes, lineHeights, fontWeights } from "./typography";
import {
  space,
  spacing,
  radius,
  borders,
  insets,
  layout,
  iconSizes,
  opacities,
  animations,
} from "./spacing";

export const theme = {
  colors,
  chipColors,
  darkColors,
  typography,
  tabularNums,
  fontSizes,
  lineHeights,
  fontWeights,
  space,
  spacing,
  radius,
  borders,
  insets,
  layout,
  iconSizes,
  opacities,
  animations,
} as const;

export {
  colors,
  chipColors,
  darkColors,
  typography,
  tabularNums,
  fontSizes,
  lineHeights,
  fontWeights,
  space,
  spacing,
  radius,
  borders,
  insets,
  layout,
  iconSizes,
  opacities,
  animations,
};

export type Theme = typeof theme;
export type { ColorToken, ChipVariant };
export default theme;
