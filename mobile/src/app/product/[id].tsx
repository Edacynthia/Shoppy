import React from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { sampleProducts } from "../../types/product";
import { formatNgn } from "../../utils/format";
import { ArrowLeft, Plus } from "lucide-react-native";
import { useCart } from "../../context/CartContext";

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = sampleProducts.find((p) => p.id === id);
  const { addToCart } = useCart();

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Product not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#1C1917" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
          {product.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{product.badge}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatNgn(product.priceMinor)}</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            addToCart(product.id);
            router.push("/(main)/cart");
          }}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add to Bag</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#E7E5E4",
  },
  backButton: { width: 36, height: 36, justifyContent: "center" },
  navTitle: { fontSize: 16, fontWeight: "600", color: "#1C1917" },
  content: { paddingBottom: 24 },
  imageContainer: { width: "100%", height: 340, position: "relative" },
  image: { width: "100%", height: "100%" },
  badge: {
    position: "absolute", top: 16, left: 16,
    backgroundColor: "rgba(28, 25, 23, 0.85)",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  infoSection: { padding: 20 },
  name: { fontSize: 24, fontWeight: "700", color: "#1C1917", marginBottom: 8 },
  price: { fontSize: 20, fontWeight: "700", color: "#44403C", marginBottom: 16 },
  description: { fontSize: 15, color: "#57534E", lineHeight: 22 },
  footer: {
    padding: 16, borderTopWidth: 1, borderTopColor: "#E7E5E4",
    backgroundColor: "#FFFFFF",
  },
  addButton: {
    backgroundColor: "#1C1917", flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingVertical: 14, borderRadius: 8, gap: 8,
  },
  addButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  errorText: { fontSize: 16, color: "#78716C", textAlign: "center", marginTop: 40 },
});