import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { sampleProducts, Product } from "../../types/product";
import { formatNgn } from "../../utils/format";
import { useCart } from "../../context/CartContext";
import { Plus } from "lucide-react-native";

const categories = ["All", "tableware", "textile", "accessory"] as const;

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { addToCart } = useCart();

  const filteredProducts = sampleProducts.filter(
    (p) => selectedCategory === "All" || p.category === selectedCategory
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        {item.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>{formatNgn(item.priceMinor)}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addToCart(item.id)}
          >
            <Plus size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>Fieldwork</Text>
        <Text style={styles.brandSubtitle}>Thoughtful things for everyday</Text>
      </View>

      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  brandTitle: { fontSize: 28, fontWeight: "700", color: "#1C1917", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 13, color: "#78716C", marginTop: 2 },
  categoryBar: { paddingVertical: 12, paddingHorizontal: 16 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F0ECE6",
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: "#1C1917" },
  categoryText: { fontSize: 13, color: "#57534E", fontWeight: "500" },
  categoryTextActive: { color: "#FFFFFF" },
  listContainer: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { justifyContent: "space-between" },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7E5E4",
  },
  imageContainer: { width: "100%", height: 160, position: "relative" },
  image: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(28, 25, 23, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  cardDetails: { padding: 10 },
  productName: { fontSize: 14, fontWeight: "600", color: "#1C1917" },
  productDesc: { fontSize: 11, color: "#78716C", marginTop: 2, height: 28 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  productPrice: { fontSize: 14, fontWeight: "700", color: "#1C1917" },
  addButton: {
    backgroundColor: "#1C1917",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});