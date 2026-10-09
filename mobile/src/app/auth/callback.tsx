import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { completeAuthFromUrl, friendlyAuthError } from "../../services/auth";
import { supabase } from "../../services/supabase";

export default function AuthCallbackScreen() {
  const handledUrls = useRef(new Set<string>());
  const [processing, setProcessing] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [complete, setComplete] = useState(false);
  const [status, setStatus] = useState("Completing secure sign-in…");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUrl = useCallback(async (url: string) => {
    if (handledUrls.current.has(url)) return;
    handledUrls.current.add(url);
    setProcessing(true);
    setError("");

    try {
      const result = await completeAuthFromUrl(url);
      const isRecovery = result.type === "recovery";
      setRecovery(isRecovery);
      setStatus(
        isRecovery
          ? "Choose a new password for your account."
          : result.user
            ? "Your email is confirmed and you're signed in."
            : "Your email is confirmed. You can now sign in."
      );
      setComplete(true);
    } catch (callbackError) {
      setError(friendlyAuthError(callbackError));
      setStatus("");
    } finally {
      setProcessing(false);
    }
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          void handleUrl(url);
        } else {
          setProcessing(false);
          setStatus("Open this screen from the sign-in or password-reset link in your email.");
        }
      })
      .catch((linkError: unknown) => {
        setProcessing(false);
        setError(friendlyAuthError(linkError));
      });

    return () => subscription.remove();
  }, [handleUrl]);

  const handlePasswordUpdate = async () => {
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }

    setProcessing(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setProcessing(false);

    if (updateError) {
      setError(friendlyAuthError(updateError));
      return;
    }
    setRecovery(false);
    setStatus("Your password has been updated.");
  };

  const continueToAccount = () => router.replace("/(main)/profile");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {recovery ? "Reset your password" : "Secure sign-in"}
        </Text>
        {processing ? (
          <ActivityIndicator size="large" color="#1C1917" />
        ) : (
          <>
            {!!status && <Text style={styles.status}>{status}</Text>}
            {!!error && <Text style={styles.error}>{error}</Text>}

            {recovery && complete ? (
              <>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="New password (at least 8 characters)"
                  placeholderTextColor="#A8A29E"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  accessibilityLabel="New password"
                  editable={!processing}
                />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#A8A29E"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  accessibilityLabel="Confirm new password"
                  editable={!processing}
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handlePasswordUpdate}
                  disabled={processing}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>Update password</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.button}
                onPress={continueToAccount}
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>
                  {complete ? "Continue to your account" : "Back to sign in"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: { color: "#1C1917", fontSize: 24, fontWeight: "700", textAlign: "center" },
  status: { color: "#57534E", fontSize: 15, lineHeight: 22, textAlign: "center" },
  error: { color: "#B91C1C", fontSize: 14, lineHeight: 21, textAlign: "center" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D6D3D1",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#1C1917",
    fontSize: 15,
  },
  button: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#1C1917",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
