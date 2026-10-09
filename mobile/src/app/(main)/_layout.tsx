import { Tabs } from "expo-router";
import { ShoppingBag, Store, User } from "lucide-react-native";
import { useCart } from "../../context/CartContext";

export default function TabLayout() {
  const { itemCount } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: "#FAF8F5" },
        headerTintColor: "#1C1917",
        tabBarActiveTintColor: "#1C1917",
        tabBarInactiveTintColor: "#A8A29E",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E7E5E4",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Store",
          tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarLabel: "Bag",
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Account",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}