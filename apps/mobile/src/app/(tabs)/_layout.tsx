import React from "react";
import { Tabs } from "expo-router";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";
import { TabIcon } from "./tab-icons";

export default function TabsLayout(): React.ReactElement {
  return (
    <Tabs
      initialRouteName="heute"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: theme.borders.width,
          minHeight: 56,
          height: 60,
        },
        tabBarItemStyle: {
          minHeight: theme.layout.minTouchTarget,
          paddingVertical: theme.space[1],
        },
        tabBarLabelStyle: {
          ...theme.typography.caption,
          fontSize: 11,
          fontWeight: theme.fontWeights.semibold,
        },
      }}
    >
      <Tabs.Screen
        name="heute"
        options={{
          title: strings.tabs.heute,
          tabBarLabel: strings.tabs.heute,
          tabBarAccessibilityLabel: strings.tabs.heute,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="calendar-today" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dienstplan"
        options={{
          title: strings.tabs.dienstplan,
          tabBarLabel: strings.tabs.dienstplan,
          tabBarAccessibilityLabel: strings.tabs.dienstplan,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="calendar-month" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: strings.tabs.team,
          tabBarLabel: strings.tabs.team,
          tabBarAccessibilityLabel: strings.tabs.team,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="aufgaben"
        options={{
          title: strings.tabs.aufgaben,
          tabBarLabel: strings.tabs.aufgaben,
          tabBarAccessibilityLabel: strings.tabs.aufgaben,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="broom" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="kueche"
        options={{
          title: strings.tabs.kueche,
          tabBarLabel: strings.tabs.kueche,
          tabBarAccessibilityLabel: strings.tabs.kueche,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="silverware-fork-knife" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: strings.tabs.profil,
          tabBarLabel: strings.tabs.profil,
          tabBarAccessibilityLabel: strings.tabs.profil,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="account-circle" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
