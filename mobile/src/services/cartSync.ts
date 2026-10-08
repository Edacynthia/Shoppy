import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { CartItem } from "../types/product";

const LOCAL_CART_KEY = "shoppy_mobile_cart";

export class CartSyncService {
  private static realtimeChannel: any = null;

  /**
   * Loads cart either from Supabase user_carts (if logged in) or AsyncStorage (guest)
   */
  static async loadCart(userId?: string | null): Promise<CartItem[]> {
    if (userId) {
      try {
        const { data, error } = await supabase
          .from("user_carts")
          .select("items")
          .eq("user_id", userId)
          .maybeSingle();

        if (!error && data?.items) {
          return data.items as CartItem[];
        }
      } catch (e) {
        console.warn("Failed to load cart from Supabase:", e);
      }
    }

    // Fallback to local storage for guests
    try {
      const stored = await AsyncStorage.getItem(LOCAL_CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Saves cart to Supabase user_carts (broadcasting to web) and/or AsyncStorage
   */
  static async saveCart(items: CartItem[], userId?: string | null): Promise<void> {
    // Always keep a local copy for offline support
    try {
      await AsyncStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    } catch {}

    // If authenticated, sync with user_carts so website updates in real time
    if (userId) {
      try {
        await supabase.from("user_carts").upsert({
          user_id: userId,
          items,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Failed to sync cart to Supabase:", e);
      }
    }
  }

  /**
   * Subscribes to Realtime updates on user_carts so any change made on the web
   * immediately updates the mobile app!
   */
  static subscribeToCartUpdates(userId: string, onCartUpdate: (items: CartItem[]) => void) {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = supabase
      .channel(`public:user_carts:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_carts",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.items) {
            onCartUpdate(payload.new.items as CartItem[]);
          }
        }
      )
      .subscribe();

    return () => {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    };
  }
}
