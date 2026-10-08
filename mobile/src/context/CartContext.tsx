import React, { createContext, useContext, useEffect, useState } from "react";
import { CartItem, CartLine, Product, sampleProducts } from "../types/product";
import { CartSyncService } from "../services/cartSync";
import { supabase } from "../services/supabase";

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
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

    async function initCart() {
      setLoading(true);
      const loaded = await CartSyncService.loadCart(user?.id);
      setItems(loaded);
      setLoading(false);

      // If user is authenticated, subscribe to live web changes!
      if (user?.id) {
        unsubscribeRealtime = CartSyncService.subscribeToCartUpdates(user.id, (updatedItems) => {
          setItems(updatedItems);
        });
      }
    }

    initCart();

    return () => {
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [user]);

  // Save changes to storage / Supabase
  const persistChanges = (newItems: CartItem[]) => {
    setItems(newItems);
    CartSyncService.saveCart(newItems, user?.id);
  };

  const addToCart = (productId: string) => {
    const existing = items.find((i) => i.productId === productId);
    let updated: CartItem[];
    if (existing) {
      updated = items.map((i) =>
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      updated = [...items, { productId, quantity: 1 }];
    }
    persistChanges(updated);
  };

  const removeFromCart = (productId: string) => {
    const updated = items.filter((i) => i.productId !== productId);
    persistChanges(updated);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updated = items.map((i) =>
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
