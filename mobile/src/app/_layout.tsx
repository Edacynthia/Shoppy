import { Stack } from "expo-router";
import { CartProvider } from "../context/CartContext";

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(main)" />
        <Stack.Screen
          name="product/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="checkout"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/callback"
          options={{ headerShown: false }}
        />
      </Stack>
    </CartProvider>
  );
}