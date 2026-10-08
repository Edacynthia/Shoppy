import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useCart } from "../context/CartContext";
import { signInWithGoogle, signOut } from "../services/auth";
import { User, LogOut } from "lucide-react-native";

export const ProfileScreen: React.FC = () => {
  const { user } = useCart();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { user: authedUser, error } = await signInWithGoogle();
    setLoading(false);

    if (error) {
      Alert.alert("Sign In Error", error);
    } else if (authedUser) {
      Alert.alert("Signed In", `Welcome, ${authedUser.email}! Your cart is now automatically synced across devices.`);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <User size={48} color="#1C1917" />
        </View>

        {user ? (
          <View style={styles.profileInfo}>
            <Text style={styles.emailText}>{user.email}</Text>
            <Text style={styles.statusBadge}>🟢 Synced with Website</Text>
            <Text style={styles.infoDesc}>
              Any items you add to your shopping bag here or on the website will synchronize automatically in real-time.
            </Text>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <LogOut size={16} color="#FFFFFF" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Sign In to Shoppy</Text>
            <Text style={styles.loginSub}>
              Connect your account to sync your cart across your phone and web browser seamlessly.
            </Text>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1C1917" />
              ) : (
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.note}>
              Sign-in completes securely inside the app via deep links (no website redirect).
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E7E5E4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  profileInfo: { width: "100%", alignItems: "center" },
  emailText: { fontSize: 18, fontWeight: "700", color: "#1C1917", marginBottom: 6 },
  statusBadge: {
    fontSize: 13,
    color: "#15803D",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "600",
    marginBottom: 16,
  },
  infoDesc: { textAlign: "center", color: "#78716C", fontSize: 13, lineHeight: 20, marginBottom: 24 },
  signOutButton: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  signOutText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  loginCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    alignItems: "center",
  },
  loginTitle: { fontSize: 20, fontWeight: "700", color: "#1C1917", marginBottom: 8 },
  loginSub: { fontSize: 13, color: "#78716C", textAlign: "center", lineHeight: 18, marginBottom: 20 },
  googleButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderColor: "#D6D3D1",
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: { fontSize: 15, fontWeight: "600", color: "#1C1917" },
  note: { fontSize: 11, color: "#A8A29E", textAlign: "center", marginTop: 12 },
});
