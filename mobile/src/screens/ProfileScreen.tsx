import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LogOut, User } from "lucide-react-native";
import { useCart } from "../context/CartContext";
import {
  createAccount,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOut,
} from "../services/auth";

type AuthMode = "sign-in" | "create-account" | "reset-password";
type AuthAction = "email" | "google" | "sign-out" | null;

export const ProfileScreen: React.FC = () => {
  const { user, syncStatus, syncMessage } = useCart();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [action, setAction] = useState<AuthAction>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const setAuthMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
  };

  const handleEmailSubmit = async () => {
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      setNotice("");
      return;
    }
    if (mode === "create-account" && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      setNotice("");
      return;
    }
    if (mode === "sign-in" && !password) {
      setError("Enter your password.");
      setNotice("");
      return;
    }
    if (mode === "create-account" && password !== confirmPassword) {
      setError("Those passwords don't match.");
      setNotice("");
      return;
    }

    setAction("email");
    setError("");
    setNotice("");
    const result =
      mode === "create-account"
        ? await createAccount(normalizedEmail, password)
        : mode === "reset-password"
          ? await sendPasswordReset(normalizedEmail)
          : await signInWithEmail(normalizedEmail, password);
    setAction(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice(result.message ?? "You're signed in.");
    if (mode === "create-account" && result.user) {
      setPassword("");
      setConfirmPassword("");
    }
  };

  const handleGoogleLogin = async () => {
    setAction("google");
    setError("");
    setNotice("");
    const result = await signInWithGoogle();
    setAction(null);
    if (result.error) {
      setError(result.error);
    } else if (result.cancelled) {
      setNotice("Sign-in was cancelled.");
    } else if (result.user) {
      setNotice(`Signed in as ${result.user.email ?? "your account"}.`);
    }
  };

  const handleSignOut = async () => {
    setAction("sign-out");
    const result = await signOut();
    setAction(null);
    if (result.error) {
      Alert.alert("Couldn't sign out", result.error);
    }
  };

  const busy = action !== null;
  const title =
    mode === "create-account"
      ? "Create your account"
      : mode === "reset-password"
        ? "Reset your password"
        : "Sign in to Fieldwork";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarContainer}>
            <User size={44} color="#1C1917" />
          </View>

          {user ? (
            <View style={styles.profileInfo}>
              <Text style={styles.title}>Your account</Text>
              <Text style={styles.emailText}>{user.email ?? "Signed in"}</Text>
              <Text
                style={[
                  styles.statusBadge,
                  syncStatus === "error" && styles.statusBadgeError,
                  syncStatus === "syncing" && styles.statusBadgePending,
                ]}
              >
                {syncStatus === "synced"
                  ? "Cart synced across devices"
                  : syncStatus === "syncing" || syncStatus === "loading"
                    ? "Syncing your cart…"
                    : "Cart not synced"}
              </Text>
              {!!syncMessage && (
                <Text style={syncStatus === "error" ? styles.errorText : styles.infoDesc}>
                  {syncMessage}
                </Text>
              )}
              <Text style={styles.infoDesc}>
                {syncStatus === "synced"
                  ? "Your shopping bag syncs across your phone and the website while you're signed in."
                  : "Your shopping bag is saved on this phone until account sync is available."}
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, styles.signOutButton]}
                onPress={handleSignOut}
                disabled={busy}
                accessibilityRole="button"
              >
                {action === "sign-out" ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <LogOut size={16} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Sign out</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loginCard}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                Sign in to keep your shopping bag in sync across devices.
              </Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#A8A29E"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                accessibilityLabel="Email address"
                editable={!busy}
                returnKeyType={mode === "reset-password" ? "done" : "next"}
              />

              {mode !== "reset-password" && (
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password (at least 8 characters)"
                  placeholderTextColor="#A8A29E"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={mode === "create-account" ? "new-password" : "password"}
                  textContentType={mode === "create-account" ? "newPassword" : "password"}
                  accessibilityLabel="Password"
                  editable={!busy}
                  returnKeyType={mode === "create-account" ? "next" : "go"}
                  onSubmitEditing={mode === "sign-in" ? handleEmailSubmit : undefined}
                />
              )}

              {mode === "create-account" && (
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="#A8A29E"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  accessibilityLabel="Confirm password"
                  editable={!busy}
                  returnKeyType="go"
                  onSubmitEditing={handleEmailSubmit}
                />
              )}

              {!!error && <Text style={styles.errorText}>{error}</Text>}
              {!!notice && <Text style={styles.noticeText}>{notice}</Text>}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEmailSubmit}
                disabled={busy}
                accessibilityRole="button"
              >
                {action === "email" ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === "create-account"
                      ? "Create account"
                      : mode === "reset-password"
                        ? "Send reset link"
                        : "Sign in with email"}
                  </Text>
                )}
              </TouchableOpacity>

              {mode === "sign-in" && (
                <TouchableOpacity
                  onPress={() => setAuthMode("reset-password")}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text style={styles.textLink}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={busy}
                accessibilityRole="button"
              >
                {action === "google" ? (
                  <ActivityIndicator color="#1C1917" />
                ) : (
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                )}
              </TouchableOpacity>

              <View style={styles.modeLinks}>
                {mode === "reset-password" ? (
                  <TouchableOpacity
                    onPress={() => setAuthMode("sign-in")}
                    disabled={busy}
                    accessibilityRole="button"
                  >
                    <Text style={styles.textLink}>Back to sign in</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() =>
                      setAuthMode(mode === "create-account" ? "sign-in" : "create-account")
                    }
                    disabled={busy}
                    accessibilityRole="button"
                  >
                    <Text style={styles.textLink}>
                      {mode === "create-account"
                        ? "Already have an account? Sign in"
                        : "New here? Create an account"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.note}>
                Confirmation and password-reset links open securely in the app.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { flexGrow: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E7E5E4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  profileInfo: { width: "100%", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#1C1917", marginBottom: 8 },
  emailText: { fontSize: 16, color: "#57534E", marginBottom: 12 },
  statusBadge: {
    fontSize: 13,
    color: "#15803D",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    fontWeight: "600",
    marginBottom: 16,
  },
  statusBadgeError: { color: "#B91C1C", backgroundColor: "#FEE2E2" },
  statusBadgePending: { color: "#92400E", backgroundColor: "#FEF3C7" },
  infoDesc: { textAlign: "center", color: "#78716C", fontSize: 14, lineHeight: 21, marginBottom: 24 },
  loginCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E5E4",
  },
  subtitle: { fontSize: 14, color: "#78716C", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D6D3D1",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#1C1917",
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: "#1C1917",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  signOutButton: { backgroundColor: "#DC2626", paddingHorizontal: 20 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  googleButton: {
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderColor: "#D6D3D1",
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: { fontSize: 15, fontWeight: "600", color: "#1C1917" },
  errorText: { color: "#B91C1C", fontSize: 13, lineHeight: 19, marginBottom: 12 },
  noticeText: { color: "#166534", fontSize: 13, lineHeight: 19, marginBottom: 12 },
  textLink: { color: "#44403C", fontSize: 14, fontWeight: "600", textAlign: "center", paddingVertical: 12 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 12 },
  dividerLine: { height: 1, backgroundColor: "#E7E5E4", flex: 1 },
  dividerText: { color: "#A8A29E", fontSize: 13 },
  modeLinks: { alignItems: "center", marginTop: 2 },
  note: { fontSize: 11, color: "#A8A29E", textAlign: "center", lineHeight: 16, marginTop: 10 },
});
