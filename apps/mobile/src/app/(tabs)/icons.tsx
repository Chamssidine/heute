import React from "react";
import { ColorValue } from "react-native";
import { TabIcon, type MaterialCommunityIconName } from "./tab-icons";

export type { MaterialCommunityIconName };

export interface MaterialCommunityIconsProps {
  name: MaterialCommunityIconName | string;
  size?: number;
  color?: ColorValue;
  testID?: string;
}

/**
 * Composant MaterialCommunityIcons pour les onglets.
 * Implémente les 6 icônes de docs/design/screens.md §6 via TabIcon.
 * Dès que @expo/vector-icons sera ajouté aux dépendances du projet,
 * il suffira de basculer l'import vers le package officiel.
 */
export const MaterialCommunityIcons: React.FC<MaterialCommunityIconsProps> = ({
  name,
  size,
  color,
}) => {
  return <TabIcon name={name as MaterialCommunityIconName} size={size} color={color} />;
};

export default MaterialCommunityIcons;
