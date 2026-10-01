import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CheckoutItem = { productId: string; quantity: number };
type ShippingInput = {
  name?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  region?: unknown;
  postalCode?: unknown;
  country?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let body: { email?: unknown; items?: unknown; shipping?: ShippingInput };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const shipping = {
    name: text(body.shipping?.name, 120),
    phone: text(body.shipping?.phone, 40),
    address_line_1: text(body.shipping?.addressLine1, 180),
    address_line_2: text(body.shipping?.addressLine2, 180),
    city: text(body.shipping?.city, 100),
    region: text(body.shipping?.region, 100),
    postal_code: text(body.shipping?.postalCode, 30),
    country: text(body.shipping?.country, 2).toUpperCase(),
  };
  const rawItems = body.items;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !shipping.name ||
    !/^[+()\d\s.-]{7,40}$/.test(shipping.phone) ||
    !shipping.address_line_1 ||
    !shipping.city ||
    !shipping.region ||
    !["NG", "GH", "KE", "ZA"].includes(shipping.country) ||
    !Array.isArray(rawItems) ||
    rawItems.length === 0 ||
    rawItems.length > 40
  ) {
    return Response.json({ error: "Add a valid email and at least one item." }, { status: 400 });
  }

  const items: CheckoutItem[] = [];
  for (const item of rawItems) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !/^[a-z0-9-]{1,80}$/.test(item.productId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 20
    ) {
      return Response.json({ error: "One or more cart items are invalid." }, { status: 400 });
    }
    items.push({ productId: item.productId, quantity: item.quantity });
  }

  const supabase = createSupabaseAdmin();
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const currency = (process.env.STORE_CURRENCY ?? "NGN").toUpperCase();
  const rawShippingFee = process.env.SHIPPING_FEE_MINOR_UNITS;
  if (!supabase || !paystackSecret) {
    return Response.json(
      { error: "Checkout needs Supabase and Paystack credentials. See the Stage 2 setup guide." },
      { status: 503 },
    );
  }
  if (!/^(NGN|GHS|KES|ZAR|USD)$/.test(currency)) {
    return Response.json({ error: "The store currency is not supported by Paystack." }, { status: 503 });
  }
  if (!rawShippingFee || !/^\d+$/.test(rawShippingFee)) {
    return Response.json({ error: "Set SHIPPING_FEE_MINOR_UNITS before accepting orders." }, { status: 503 });
  }
  const shippingFeeMinor = Number(rawShippingFee);
  if (!Number.isSafeInteger(shippingFeeMinor)) {
    return Response.json({ error: "The configured shipping fee is invalid." }, { status: 503 });
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, price_minor, active")
    .in("id", productIds);

  if (productError) return Response.json({ error: "F" }, { status: 500 });
  const productById = new Map((products ?? []).map((product) => [product.id, product]));
  if (items.some((item) => !productById.get(item.productId)?.active)) {
    return Response.json({ error: "A product is no longer available." }, { status: 400 });
  }

  const orderItems = items.map((item) => {
    const product = productById.get(item.productId)!;
    return {
      product_id: product.id,
      name: product.name,
      quantity: item.quantity,
      unit_price_minor: product.price_minor,
    };
  });
  const subtotalMinor = orderItems.reduce(
    (total, item) => total + item.unit_price_minor * item.quantity,
    0,
  );
  const amountTotalMinor = subtotalMinor + shippingFeeMinor;
  if (!Number.isSafeInteger(amountTotalMinor) || amountTotalMinor < 1) {
    return Response.json({ error: "The order total is invalid." }, { status: 400 });
  }

  const orderId = randomUUID();
  const reference = randomUUID().replaceAll("-", "");
  let userId: string | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseAnonKey) {
    const cookieStore = await cookies();
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => {
          for (const { name, value, options } of values) {
            cookieStore.set(name, value, options);
          }
        },
      },
    });
    const { data } = await authClient.auth.getUser();
    userId = data.user?.id ?? null;
  }

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    user_id: userId,
    buyer_email: email,
    amount_total_minor: amountTotalMinor,
    amount_shipping_minor: shippingFeeMinor,
    amount_tax_minor: 0,
    currency,
    status: "pending",
    paystack_reference: reference,
    items: orderItems,
    shipping_details: shipping,
  });

  if (orderError) return Response.json({ error: "Your order could not be saved." }, { status: 500 });

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountTotalMinor,
        currency,
        reference,
        callback_url: `${new URL(request.url).origin}/checkout/callback`,
        metadata: { order_id: orderId },
      }),
    });
    const result = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };

    if (!response.ok || !result.status || !result.data?.authorization_url) {
      throw new Error(result.message ?? "Paystack did not return a payment URL.");
    }

    return Response.json({ url: result.data.authorization_url });
  } catch (error) {
    await supabase.from("orders").update({ status: "failed" }).eq("id", orderId);
    console.error("Paystack transaction initialization failed:", error);
    return Response.json({ error: "Paystack checkout could not be started. Please try again." }, { status: 502 });
  }
}