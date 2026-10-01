import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CartItem = { productId: string; quantity: number };

function readItems(value: unknown): CartItem[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;

  const items: CartItem[] = [];
  for (const item of value) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !/^[a-z0-9-]{1,80}$/.test(item.productId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      return null;
    }
    items.push({ productId: item.productId, quantity: item.quantity });
  }

  return items;
}

export async function GET() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("fieldwork_cart")?.value;
  if (!cartId) return Response.json({ items: [], persisted: false });

  const supabase = createSupabaseAdmin();
  if (!supabase) return Response.json({ items: [], persisted: false });

  const { data, error } = await supabase
    .from("guest_carts")
    .select("items")
    .eq("id", cartId)
    .maybeSingle();

  if (error) return Response.json({ error: "Cart could not be loaded." }, { status: 500 });
  return Response.json({ items: data?.items ?? [], persisted: true });
}

export async function PUT(request: Request) {
  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const items = readItems(body.items);
  if (!items) return Response.json({ error: "Invalid cart items." }, { status: 400 });

  const supabase = createSupabaseAdmin();
  if (!supabase) return Response.json({ persisted: false });

  const cookieStore = await cookies();
  const cartId = cookieStore.get("fieldwork_cart")?.value ?? randomUUID();
  const { error } = await supabase
    .from("guest_carts")
    .upsert({ id: cartId, items, updated_at: new Date().toISOString() });

  if (error) return Response.json({ error: "Cart could not be saved." }, { status: 500 });

  cookieStore.set("fieldwork_cart", cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ persisted: true });
}