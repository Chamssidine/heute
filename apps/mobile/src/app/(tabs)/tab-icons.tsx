import React from "react";
import { ColorValue, StyleSheet, View } from "react-native";
import { theme } from "../../lib/theme";

export type MaterialCommunityIconName =
  | "calendar-today"
  | "calendar-month"
  | "account-group"
  | "broom"
  | "silverware-fork-knife"
  | "account-circle";

export interface TabIconProps {
  name: MaterialCommunityIconName;
  color?: ColorValue;
  size?: number;
}

export const TabIcon: React.FC<TabIconProps> = ({
  name,
  color = theme.colors.textMuted,
  size = theme.iconSizes.lg,
}) => {
  const strokeWidth = 2;
  const innerSize = size;

  switch (name) {
    case "calendar-today":
      return (
        <View
          style={[
            styles.container,
            {
              width: innerSize,
              height: innerSize,
              borderColor: color,
              borderWidth: strokeWidth,
              borderRadius: theme.radius.sm,
            },
          ]}
          accessible={false}
          importantForAccessibility="no"
        >
          <View style={[styles.calendarTopBar, { backgroundColor: color }]} />
          <View style={[styles.calendarTodayDot, { backgroundColor: color }]} />
        </View>
      );

    case "calendar-month":
      return (
        <View
          style={[
            styles.container,
            {
              width: innerSize,
              height: innerSize,
              borderColor: color,
              borderWidth: strokeWidth,
              borderRadius: theme.radius.sm,
            },
          ]}
          accessible={false}
          importantForAccessibility="no"
        >
          <View style={[styles.calendarTopBar, { backgroundColor: color }]} />
          <View style={styles.calendarGrid}>
            <View style={[styles.gridDot, { backgroundColor: color }]} />
            <View style={[styles.gridDot, { backgroundColor: color }]} />
            <View style={[styles.gridDot, { backgroundColor: color }]} />
            <View style={[styles.gridDot, { backgroundColor: color }]} />
          </View>
        </View>
      );

    case "account-group":
      return (
        <View
          style={[styles.container, { width: innerSize, height: innerSize }]}
          accessible={false}
          importantForAccessibility="no"
        >
          {/* Personne en arrière-plan */}
          <View
            style={[
              styles.avatarHead,
              {
                left: innerSize * 0.45,
                top: innerSize * 0.1,
                width: innerSize * 0.28,
                height: innerSize * 0.28,
                borderRadius: innerSize * 0.14,
                backgroundColor: color,
                opacity: 0.6,
              },
            ]}
          />
          <View
            style={[
              styles.avatarBody,
              {
                left: innerSize * 0.38,
                top: innerSize * 0.45,
                width: innerSize * 0.48,
                height: innerSize * 0.4,
                borderTopLeftRadius: innerSize * 0.24,
                borderTopRightRadius: innerSize * 0.24,
                backgroundColor: color,
                opacity: 0.6,
              },
            ]}
          />
          {/* Personne au premier plan */}
          <View
            style={[
              styles.avatarHead,
              {
                left: innerSize * 0.15,
                top: innerSize * 0.18,
                width: innerSize * 0.32,
                height: innerSize * 0.32,
                borderRadius: innerSize * 0.16,
                backgroundColor: color,
              },
            ]}
          />
          <View
            style={[
              styles.avatarBody,
              {
                left: innerSize * 0.08,
                top: innerSize * 0.54,
                width: innerSize * 0.52,
                height: innerSize * 0.42,
                borderTopLeftRadius: innerSize * 0.26,
                borderTopRightRadius: innerSize * 0.26,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      );

    case "broom":
      return (
        <View
          style={[styles.container, { width: innerSize, height: innerSize }]}
          accessible={false}
          importantForAccessibility="no"
        >
          {/* Manche de balai oblique */}
          <View
            style={[
              styles.broomHandle,
              {
                backgroundColor: color,
                height: innerSize * 0.6,
                width: strokeWidth,
                top: innerSize * 0.08,
                left: innerSize * 0.58,
                transform: [{ rotate: "35deg" }],
              },
            ]}
          />
          {/* Tête de balai */}
          <View
            style={[
              styles.broomHead,
              {
                borderColor: color,
                borderWidth: strokeWidth,
                backgroundColor: color,
                width: innerSize * 0.48,
                height: innerSize * 0.3,
                bottom: innerSize * 0.1,
                left: innerSize * 0.15,
                borderTopLeftRadius: theme.radius.sm,
                borderTopRightRadius: theme.radius.sm,
                transform: [{ rotate: "15deg" }],
              },
            ]}
          />
        </View>
      );

    case "silverware-fork-knife":
      return (
        <View
          style={[styles.container, { width: innerSize, height: innerSize }]}
          accessible={false}
          importantForAccessibility="no"
        >
          {/* Fourchette */}
          <View style={[styles.forkContainer, { left: innerSize * 0.16 }]}>
            <View style={styles.forkProngsRow}>
              <View style={[styles.forkProng, { backgroundColor: color }]} />
              <View style={[styles.forkProng, { backgroundColor: color }]} />
              <View style={[styles.forkProng, { backgroundColor: color }]} />
            </View>
            <View
              style={[
                styles.utensilHandle,
                { backgroundColor: color, height: innerSize * 0.48, width: strokeWidth },
              ]}
            />
          </View>
          {/* Couteau */}
          <View style={[styles.knifeContainer, { right: innerSize * 0.16 }]}>
            <View
              style={[
                styles.knifeBlade,
                {
                  backgroundColor: color,
                  width: innerSize * 0.16,
                  height: innerSize * 0.38,
                  borderTopRightRadius: innerSize * 0.16,
                },
              ]}
            />
            <View
              style={[
                styles.utensilHandle,
                { backgroundColor: color, height: innerSize * 0.45, width: strokeWidth },
              ]}
            />
          </View>
        </View>
      );

    case "account-circle":
      return (
        <View
          style={[
            styles.container,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              overflow: "hidden",
            },
          ]}
          accessible={false}
          importantForAccessibility="no"
        >
          <View
            style={[
              styles.avatarHead,
              {
                width: innerSize * 0.36,
                height: innerSize * 0.36,
                borderRadius: (innerSize * 0.36) / 2,
                backgroundColor: color,
                top: innerSize * 0.16,
                alignSelf: "center",
              },
            ]}
          />
          <View
            style={[
              styles.avatarBody,
              {
                width: innerSize * 0.64,
                height: innerSize * 0.36,
                borderTopLeftRadius: (innerSize * 0.64) / 2,
                borderTopRightRadius: (innerSize * 0.64) / 2,
                backgroundColor: color,
                bottom: 0,
                alignSelf: "center",
              },
            ]}
          />
        </View>
      );
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  calendarTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "28%",
  },
  calendarTodayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: "20%",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 12,
    height: 12,
    gap: 3,
    marginTop: "24%",
    justifyContent: "center",
    alignItems: "center",
  },
  gridDot: {
    width: 3,
    height: 3,
    borderRadius: 1,
  },
  avatarHead: {
    position: "absolute",
  },
  avatarBody: {
    position: "absolute",
  },
  broomHandle: {
    position: "absolute",
    borderRadius: 1,
  },
  broomHead: {
    position: "absolute",
  },
  forkContainer: {
    position: "absolute",
    top: "12%",
    alignItems: "center",
  },
  forkProngsRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 1,
  },
  forkProng: {
    width: 1.5,
    height: 6,
    borderRadius: 0.5,
  },
  knifeContainer: {
    position: "absolute",
    top: "12%",
    alignItems: "center",
  },
  knifeBlade: {
    marginBottom: 1,
  },
  utensilHandle: {
    borderRadius: 1,
  },
});

export default TabIcon;
