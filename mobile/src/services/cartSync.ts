import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { CartItem } from "../types/product";

const LOCAL_CART_KEY = "shoppy_mobile_cart";

export type CartSyncResult = {
  items: CartItem[];
  status: "synced" | "local" | "error";
  message?: string;
};

function syncErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
    return "Shared cart sync is not set up yet. Apply database/schema.sql in your Supabase project.";
  }
  if (error.code === "42501" || error.message.toLowerCase().includes("row-level security")) {
    return "Supabase blocked access to your account cart. Check the user_carts row-level security policies.";
  }
  return "Your cart is saved on this phone, but could not sync with your account. Please try again.";
}

async function loadLocalCart(): Promise<CartItem[]> {
  const stored = await AsyncStorage.getItem(LOCAL_CART_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
}

export class CartSyncService {
  private static realtimeChannel: RealtimeChannel | null = null;

  static async loadCart(userId?: string | null): Promise<CartSyncResult> {
    if (!userId) {
      try {
        return { items: await loadLocalCart(), status: "local" };
      } catch {
        return { items: [], status: "local" };
      }
    }

    const { data, error } = await supabase
      .from("user_carts")
      .select("items")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      let localItems: CartItem[] = [];
      try {
        localItems = await loadLocalCart();
      } catch {
        // Keep the account sync error visible even when local storage is unavailable.
      }
      return { items: localItems, status: "error", message: syncErrorMessage(error) };
    }

    if (data) {
      const items = Array.isArray(data.items) ? (data.items as CartItem[]) : [];
      try {
        await AsyncStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
      } catch {
        // The server cart remains the source of truth when local storage is unavailable.
      }
      return { items, status: "synced" };
    }

    let localItems: CartItem[] = [];
    try {
      localItems = await loadLocalCart();
    } catch {
      // A new account can start with an empty server cart.
    }

    const saved = await this.saveCart(localItems, userId);
    return saved.status === "synced"
      ? { items: localItems, status: "synced" }
      : { items: localItems, status: saved.status, message: saved.message };
  }

  static async saveCart(
    items: CartItem[],
    userId?: string | null,
  ): Promise<Omit<CartSyncResult, "items">> {
    try {
      await AsyncStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    } catch {
      if (!userId) {
        return {
          status: "error",
          message: "Your cart could not be saved on this phone.",
        };
      }
    }

    if (!userId) return { status: "local" };

    try {
      const { error } = await supabase.from("user_carts").upsert(
        {
          user_id: userId,
          items,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) {
        return { status: "error", message: syncErrorMessage(error) };
      }
      return { status: "synced" };
    } catch {
      return {
        status: "error",
        message: "Your cart is saved on this phone, but could not sync with your account. Please try again.",
      };
    }
  }

  static subscribeToCartUpdates(
    userId: string,
    onCartUpdate: (items: CartItem[]) => void,
    onStatus: (status: "synced" | "error", message?: string) => void,
  ) {
    if (this.realtimeChannel) {
      void supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    const channel = supabase
      .channel(`user-carts:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_carts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            onCartUpdate([]);
            return;
          }
          const items = (payload.new as { items?: unknown }).items;
          if (Array.isArray(items)) onCartUpdate(items as CartItem[]);
        },
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          onStatus("synced");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onStatus(
            "error",
            error
              ? syncErrorMessage(error)
              : "Your cart is saved, but live updates are unavailable. Check the Supabase Realtime publication.",
          );
        }
      });

    this.realtimeChannel = channel;

    return () => {
      if (this.realtimeChannel === channel) this.realtimeChannel = null;
      void supabase.removeChannel(channel);
    };
  }
}
