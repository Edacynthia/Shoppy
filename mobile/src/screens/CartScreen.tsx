import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useCart } from "../context/CartContext";
import { formatNgn } from "../utils/format";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react-native";

export const CartScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { cartLines, subtotal, updateQuantity, removeFromCart, user } = useCart();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Shopping Bag</Text>
        {user ? (
          <Text style={styles.syncNotice}>🟢 Synced with web account ({user.email})</Text>
        ) : (
          <Text style={styles.syncNotice}>💡 Sign in to sync your bag with the website</Text>
        )}
      </View>

      {cartLines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your bag is empty.</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate("Shop")}
          >
            <Text style={styles.browseButtonText}>Explore Collection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartLines}
            keyExtractor={(item) => item.product.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.cartCard}>
                <Image
                  source={{ uri: item.product.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.product.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color="#A8A29E" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemPrice}>
                    {formatNgn(item.product.priceMinor)}
                  </Text>

                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus size={14} color="#1C1917" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus size={14} color="#1C1917" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />

          <View style={styles.checkoutFooter}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>{formatNgn(subtotal)}</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => navigation.navigate("Checkout")}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#E7E5E4" },
  title: { fontSize: 22, fontWeight: "700", color: "#1C1917" },
  syncNotice: { fontSize: 12, color: "#78716C", marginTop: 4 },
  list: { padding: 16 },
  cartCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E7E5E4",
  },
  cardImage: { width: 72, height: 72, borderRadius: 8 },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productName: { fontSize: 14, fontWeight: "600", color: "#1C1917", flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#44403C" },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F4",
    borderRadius: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 6,
  },
  qtyBtn: { padding: 4 },
  qtyText: { marginHorizontal: 8, fontSize: 13, fontWeight: "600", color: "#1C1917" },
  checkoutFooter: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E7E5E4",
  },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  subtotalLabel: { fontSize: 15, color: "#78716C" },
  subtotalValue: { fontSize: 18, fontWeight: "700", color: "#1C1917" },
  checkoutButton: {
    backgroundColor: "#1C1917",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  checkoutText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { fontSize: 16, color: "#78716C", marginBottom: 16 },
  browseButton: { backgroundColor: "#1C1917", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  browseButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
