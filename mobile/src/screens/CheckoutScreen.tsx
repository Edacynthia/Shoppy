import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useCart } from "../context/CartContext";
import { formatNgn } from "../utils/format";
import { ArrowLeft, CheckCircle2 } from "lucide-react-native";

export const CheckoutScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { subtotal, cartLines, user } = useCart();
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const deliveryFee = 0; // Free delivery
  const total = subtotal + deliveryFee;

  const handleDemoCheckout = async () => {
    if (!email || !name || !address || !city) {
      Alert.alert("Missing Details", "Please fill in all delivery information.");
      return;
    }

    setProcessing(true);

    // Simulated Paystack checkout flow (ready for Paystack Mobile SDK / Webview checkout)
    setTimeout(() => {
      setProcessing(false);
      setOrderComplete(true);
    }, 2000);
  };

  if (orderComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <CheckCircle2 size={64} color="#15803D" />
          <Text style={styles.successTitle}>Demo order preview complete</Text>
          <Text style={styles.successSubtitle}>
            No payment was processed and no order was placed. Live payments are available through the web checkout.
          </Text>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate("Shop")}
          >
            <Text style={styles.homeBtnText}>Back to Store</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color="#1C1917" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>Contact & Delivery</Text>
        <TextInput
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Full name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="Street address"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
        />
        <TextInput
          placeholder="City & State"
          value={city}
          onChangeText={setCity}
          style={styles.input}
        />

        <Text style={styles.sectionHeader}>Order Summary</Text>
        <View style={styles.summaryCard}>
          {cartLines.map((line) => (
            <View key={line.product.id} style={styles.summaryRow}>
              <Text style={styles.summaryItemText}>
                {line.product.name} × {line.quantity}
              </Text>
              <Text style={styles.summaryItemPrice}>
                {formatNgn(line.product.priceMinor * line.quantity)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>Free</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatNgn(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handleDemoCheckout}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payBtnText}>Preview checkout ({formatNgn(total)})</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E5E4",
  },
  backButton: { width: 36, height: 36, justifyContent: "center" },
  navTitle: { fontSize: 16, fontWeight: "600", color: "#1C1917" },
  content: { padding: 16 },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#1C1917", marginVertical: 12 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E5E4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 14,
    color: "#1C1917",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    padding: 16,
    marginTop: 8,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryItemText: { fontSize: 13, color: "#57534E", flex: 1, marginRight: 8 },
  summaryItemPrice: { fontSize: 13, fontWeight: "600", color: "#1C1917" },
  summaryLabel: { fontSize: 14, color: "#78716C" },
  summaryValue: { fontSize: 14, color: "#15803D", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E7E5E4", marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#1C1917" },
  totalValue: { fontSize: 18, fontWeight: "700", color: "#1C1917" },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E7E5E4",
    backgroundColor: "#FFFFFF",
  },
  payBtn: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  payBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  successContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  successTitle: { fontSize: 22, fontWeight: "700", color: "#1C1917", marginTop: 16, textAlign: "center" },
  successSubtitle: { fontSize: 14, color: "#78716C", textAlign: "center", marginTop: 8, lineHeight: 20 },
  homeBtn: { backgroundColor: "#1C1917", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 24 },
  homeBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
