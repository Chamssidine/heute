import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";
import { Banner } from "./Banner";
import { EmptyState } from "./EmptyState";
import { SyncStamp } from "./SyncStamp";

import type { ViewState } from "../../lib/query";

export type { ViewState };

export interface ScreenProps<T> {
  title?: string;
  viewState: ViewState<T>;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  children: ((data: T) => React.ReactNode) | React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderEmpty?: (message?: string) => React.ReactNode;
  renderError?: (message?: string, onRetry?: () => void) => React.ReactNode;
  renderUnauthorized?: (message?: string, onLogin?: () => void) => React.ReactNode;
  headerRight?: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Screen<T>({
  title,
  viewState,
  onRefresh,
  isRefreshing = false,
  children,
  renderLoading,
  renderEmpty,
  renderError,
  renderUnauthorized,
  headerRight,
  scrollable = true,
  style,
  contentContainerStyle,
  testID,
}: ScreenProps<T>): React.ReactElement {
  const isOffline = viewState.status === "offline";
  const refreshHandler = onRefresh ?? ("onRetry" in viewState ? viewState.onRetry : undefined);

  const renderHeader = () => {
    if (!title && !viewState.updatedAt && !headerRight) {
      return null;
    }

    return (
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          {title ? (
            <Text
              style={styles.headerTitle}
              accessibilityRole="header"
              android_hyphenationFrequency="normal"
            >
              {title}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerRightContainer}>
          <SyncStamp time={viewState.updatedAt} isOffline={isOffline} />
          {headerRight}
        </View>
      </View>
    );
  };

  const renderOfflineBanner = () => {
    if (!isOffline) {
      return null;
    }

    const offlineText = viewState.updatedAt
      ? strings.common.offlineStand(viewState.updatedAt)
      : strings.common.offline;

    return (
      <View style={styles.bannerContainer}>
        <Banner
          variant="warning"
          text={offlineText}
          action={
            refreshHandler
              ? {
                  label: strings.common.retry,
                  onPress: () => {
                    void refreshHandler();
                  },
                }
              : undefined
          }
        />
      </View>
    );
  };

  const renderBodyContent = () => {
    switch (viewState.status) {
      case "loading":
        if (renderLoading) {
          return renderLoading();
        }
        return (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonCard} />
          </View>
        );

      case "empty":
        if (renderEmpty) {
          return renderEmpty(viewState.message);
        }
        return (
          <EmptyState
            message={viewState.message ?? strings.common.empty}
            action={
              refreshHandler
                ? {
                    label: strings.common.retry,
                    onPress: () => {
                      void refreshHandler();
                    },
                  }
                : undefined
            }
          />
        );

      case "error":
        if (renderError) {
          return renderError(viewState.message, viewState.onRetry);
        }
        return (
          <EmptyState
            message={viewState.message ?? strings.common.error}
            action={
              refreshHandler
                ? {
                    label: strings.common.retry,
                    onPress: () => {
                      void refreshHandler();
                    },
                  }
                : undefined
            }
          />
        );

      case "unauthorized":
        if (renderUnauthorized) {
          return renderUnauthorized(viewState.message, viewState.onLogin);
        }
        return (
          <EmptyState
            message={viewState.message ?? strings.common.unauthorizedMessage}
            action={
              viewState.onLogin
                ? {
                    label: strings.common.login,
                    onPress: viewState.onLogin,
                  }
                : undefined
            }
          />
        );

      case "offline":
      case "success":
        if (typeof children === "function") {
          return children(viewState.data);
        }
        return children;
    }
  };

  const refreshControl = refreshHandler ? (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={refreshHandler}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
    />
  ) : undefined;

  return (
    <SafeAreaView testID={testID} style={[styles.safeArea, style]} edges={["top", "left", "right"]}>
      {renderHeader()}
      {renderOfflineBanner()}

      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          refreshControl={refreshControl}
        >
          {renderBodyContent()}
        </ScrollView>
      ) : (
        <View style={[styles.nonScrollContent, contentContainerStyle]}>{renderBodyContent()}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.screenMargin,
    paddingVertical: theme.space[3],
    backgroundColor: theme.colors.bg,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: theme.space[2],
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
  },
  bannerContainer: {
    paddingHorizontal: theme.spacing.screenMargin,
    marginBottom: theme.space[3],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.screenMargin,
    paddingBottom: theme.space[6],
  },
  nonScrollContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenMargin,
  },
  skeletonContainer: {
    gap: theme.layout.skeletonGap,
    paddingVertical: theme.space[2],
  },
  skeletonTitle: {
    height: theme.layout.skeletonTitleHeight,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm,
    width: "50%",
    marginBottom: theme.space[2],
  },
  skeletonCard: {
    height: theme.layout.skeletonCardHeight,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
  },
});

export default Screen;
