import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { CartItem, CartLine, sampleProducts } from "../types/product";
import { CartSyncService } from "../services/cartSync";
import { supabase } from "../services/supabase";

export type CartSyncStatus = "loading" | "local" | "syncing" | "synced" | "error";

type CartContextType = {
  items: CartItem[];
  cartLines: CartLine[];
  itemCount: number;
  subtotal: number;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  user: any;
  loading: boolean;
  syncStatus: CartSyncStatus;
  syncMessage: string;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<CartSyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState("");
  const itemsRef = useRef<CartItem[]>([]);
  const writeRevision = useRef(0);

  // Monitor auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load and synchronize cart
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | undefined;
    let active = true;
    const revision = ++writeRevision.current;

    async function initCart() {
      setLoading(true);
      setSyncStatus(user?.id ? "syncing" : "local");
      setSyncMessage("");
      const result = await CartSyncService.loadCart(user?.id);
      if (!active) return;

      itemsRef.current = result.items;
      setItems(result.items);
      setSyncStatus(result.status);
      setSyncMessage(result.message ?? "");
      setLoading(false);

      if (user?.id) {
        unsubscribeRealtime = CartSyncService.subscribeToCartUpdates(user.id, (updatedItems) => {
          itemsRef.current = updatedItems;
          setItems(updatedItems);
        }, (status, message) => {
          if (!active) return;
          setSyncStatus(status);
          setSyncMessage(message ?? "");
        });
      }
    }

    void initCart().catch(() => {
      if (!active) return;
      setLoading(false);
      setSyncStatus("error");
      setSyncMessage("Your cart could not be loaded. Please try again.");
    });

    return () => {
      active = false;
      if (writeRevision.current === revision) writeRevision.current += 1;
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [user]);

  const persistChanges = (newItems: CartItem[]) => {
    itemsRef.current = newItems;
    setItems(newItems);
    const revision = ++writeRevision.current;
    setSyncStatus(user?.id ? "syncing" : "local");
    setSyncMessage("");
    void CartSyncService.saveCart(newItems, user?.id).then((result) => {
      if (writeRevision.current !== revision) return;
      setSyncStatus(result.status);
      setSyncMessage(result.message ?? "");
    });
  };

  const addToCart = (productId: string) => {
    const currentItems = itemsRef.current;
    const existing = currentItems.find((i) => i.productId === productId);
    let updated: CartItem[];
    if (existing) {
      updated = currentItems.map((i) =>
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      updated = [...currentItems, { productId, quantity: 1 }];
    }
    persistChanges(updated);
  };

  const removeFromCart = (productId: string) => {
    const updated = itemsRef.current.filter((i) => i.productId !== productId);
    persistChanges(updated);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updated = itemsRef.current.map((i) =>
      i.productId === productId ? { ...i, quantity } : i
    );
    persistChanges(updated);
  };

  const clearCart = () => {
    persistChanges([]);
  };

  // Convert raw CartItem[] into rich CartLine[] with product metadata
  const cartLines: CartLine[] = items.flatMap((item) => {
    const product = sampleProducts.find((p) => p.id === item.productId);
    return product ? [{ product, quantity: item.quantity }] : [];
  });

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartLines.reduce(
    (sum, line) => sum + line.product.priceMinor * line.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        cartLines,
        itemCount,
        subtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        user,
        loading,
        syncStatus,
        syncMessage,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
