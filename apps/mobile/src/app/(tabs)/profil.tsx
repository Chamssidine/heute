import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Screen, type ViewState } from "../../components/ui/Screen";
import { useAuth } from "../../features/auth/hooks";
import type { CurrentUser } from "../../features/auth/model";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export default function ProfilScreen(): React.ReactElement {
  const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = auth.user;
  const isAuthenticated = auth.isAuthenticated && user != null;

  const handleLoginRedirect = useCallback(() => {
    router.push("/anmeldung");
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await auth.signOut();
      router.replace("/anmeldung");
    } finally {
      setIsLoggingOut(false);
    }
  }, [auth]);

  const viewState: ViewState<CurrentUser> = isAuthenticated
    ? {
        status: "success",
        data: user,
      }
    : {
        status: "unauthorized",
        message: strings.common.unauthorizedMessage,
        onLogin: handleLoginRedirect,
      };

  const roleLabel = user
    ? (strings.profil.roles[user.role as keyof typeof strings.profil.roles] ?? user.role)
    : "";
  const departmentLabel = user
    ? (strings.profil.departments[user.department as keyof typeof strings.profil.departments] ??
      user.department)
    : "";

  return (
    <Screen testID="screen-profil" title={strings.tabs.profil} viewState={viewState}>
      {user ? (
        <View style={styles.container}>
          <Card title={user.displayName} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{strings.profil.roleLabel}</Text>
              <Text style={styles.value}>{roleLabel}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{strings.profil.departmentLabel}</Text>
              <Text style={styles.value}>{departmentLabel}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{strings.auth.emailLabel}</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
          </Card>

          <Card title={strings.profil.notifications} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.value}>{strings.profil.notificationsAllowed}</Text>
            </View>
          </Card>

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>{strings.profil.appVersion}</Text>
          </View>

          <View style={styles.logoutContainer}>
            <Button
              testID="button-logout"
              title={strings.profil.logoutAction}
              variant="secondary"
              size="large"
              fullWidth={true}
              loading={isLoggingOut}
              disabled={isLoggingOut}
              onPress={handleLogout}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.space[4],
  },
  card: {
    marginBottom: theme.space[1],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.space[2],
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
  },
  value: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: theme.space[3],
  },
  versionText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  logoutContainer: {
    marginTop: theme.space[4],
  },
});
