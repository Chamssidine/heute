import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { Banner } from "../../../components/ui/Banner";
import { Button } from "../../../components/ui/Button";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import { useAuth } from "../hooks";
import { AUTH_MESSAGES } from "../model";

export interface LoginFormProps {
  onSuccess?: () => void;
  initialEmail?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  initialEmail = "",
  style,
  testID = "login-form",
}) => {
  const auth = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = auth.status === "loading";

  const clearError = useCallback(() => {
    setLocalError(null);
    auth.onRetry?.();
  }, [auth]);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      clearError();
    },
    [clearError],
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      clearError();
    },
    [clearError],
  );

  const handleSubmit = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLocalError(strings.auth.emptyFieldsError);
      return;
    }

    clearError();
    setIsSubmitting(true);

    try {
      await auth.signIn({
        email: trimmedEmail,
        password,
      });
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : AUTH_MESSAGES.genericError;
      setLocalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [auth, clearError, email, password, onSuccess]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", default: undefined })}
      style={styles.keyboardAvoid}
    >
      <ScrollView
        testID={testID}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, style]}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {strings.auth.title}
          </Text>
          <Text style={styles.subtitle}>{strings.auth.subtitle}</Text>
        </View>

        {localError ? (
          <View style={styles.errorContainer}>
            <Banner
              testID="banner-auth-error"
              variant="danger"
              text={localError}
              onClose={clearError}
            />
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{strings.auth.emailLabel}</Text>
            <TextInput
              testID="input-email"
              accessible={true}
              accessibilityLabel={strings.auth.emailLabel}
              style={styles.input}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              placeholder={strings.auth.emailPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              editable={!isLoading && !isSubmitting}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{strings.auth.passwordLabel}</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                testID="input-password"
                accessible={true}
                accessibilityLabel={strings.auth.passwordLabel}
                style={styles.passwordInput}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                placeholder={strings.auth.passwordPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                editable={!isLoading && !isSubmitting}
              />
              <Pressable
                testID="button-toggle-password"
                onPress={togglePasswordVisibility}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  isPasswordVisible ? strings.auth.hidePasswordA11y : strings.auth.showPasswordA11y
                }
                hitSlop={theme.space[1]}
                style={({ pressed }) => [
                  styles.toggleButton,
                  pressed && styles.toggleButtonPressed,
                ]}
              >
                <Text style={styles.toggleText}>
                  ({isPasswordVisible ? strings.auth.hidePassword : strings.auth.showPassword})
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actionContainer}>
            <Button
              testID="button-login"
              title={strings.auth.loginAction}
              variant="primary"
              size="large"
              fullWidth={true}
              loading={isLoading || isSubmitting}
              disabled={isLoading || isSubmitting}
              onPress={handleSubmit}
            />
          </View>

          <Text style={styles.helpText}>{strings.auth.helpText}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.screenMargin,
    paddingVertical: theme.space[6],
  },
  header: {
    alignItems: "center",
    marginBottom: theme.space[6],
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    textAlign: "center",
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.space[1],
  },
  errorContainer: {
    marginBottom: theme.space[4],
  },
  form: {
    width: "100%",
  },
  field: {
    marginBottom: theme.space[4],
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
    marginBottom: theme.space[2],
  },
  input: {
    minHeight: theme.layout.minTouchTarget,
    height: theme.layout.minTouchTarget,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    ...theme.typography.body,
    color: theme.colors.text,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: theme.layout.minTouchTarget,
    height: theme.layout.minTouchTarget,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: theme.space[3],
    ...theme.typography.body,
    color: theme.colors.text,
  },
  toggleButton: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space[3],
  },
  toggleButtonPressed: {
    opacity: theme.opacities.pressed,
  },
  toggleText: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  actionContainer: {
    marginTop: theme.space[6],
    marginBottom: theme.space[4],
  },
  helpText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});

export default LoginForm;
