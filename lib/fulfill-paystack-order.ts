import "server-only";

import { sendOrderConfirmation } from "@/lib/mailgun";
import type { PaystackTransaction } from "@/lib/paystack";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type OrderLine = { name: string; quantity: number; unit_price_minor: number };
type ShippingDetails = {
  name?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

export async function fulfillPaystackOrder(transaction: PaystackTransaction) {
  if (transaction.status !== "success") throw new Error("Paystack payment is not successful.");

  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Order storage is unavailable.");

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, buyer_email, amount_total_minor, currency, items, shipping_details, status, paystack_reference, email_sent_at")
    .eq("paystack_reference", transaction.reference)
    .maybeSingle();

  if (orderError || !order) throw new Error("The Paystack reference does not match an order.");
  if (
    order.paystack_reference !== transaction.reference ||
    order.amount_total_minor !== transaction.amount ||
    order.currency.toUpperCase() !== transaction.currency.toUpperCase()
  ) {
    throw new Error("The verified Paystack transaction does not match the saved order.");
  }

  if (order.status !== "paid") {
    const { error } = await supabase
      .from("orders")
      .update({ status: "paid", paystack_transaction_id: String(transaction.id) })
      .eq("id", order.id);
    if (error) throw new Error("The paid order could not be recorded.");
  }

  if (order.email_sent_at) return { orderId: order.id, emailSent: true };

  const { data: claimed, error: claimError } = await supabase
    .from("orders")
    .update({ email_claimed_at: new Date().toISOString() })
    .eq("id", order.id)
    .is("email_sent_at", null)
    .is("email_claimed_at", null)
    .select("id")
    .maybeSingle();

  if (claimError) throw new Error("The order confirmation could not be claimed.");
  if (!claimed) return { orderId: order.id, emailSent: false };

  try {
    const items = Array.isArray(order.items) ? (order.items as OrderLine[]) : [];
    const shippingDetails = (order.shipping_details ?? {}) as ShippingDetails;
    await sendOrderConfirmation({
      id: order.id,
      buyer_email: order.buyer_email,
      amount_total_minor: order.amount_total_minor,
      currency: order.currency,
      items,
      shipping_details: shippingDetails,
    });

    const { error } = await supabase
      .from("orders")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) throw new Error("The email delivery status could not be saved.");
    return { orderId: order.id, emailSent: true };
  } catch (error) {
    await supabase
      .from("orders")
      .update({ email_claimed_at: null })
      .eq("id", order.id)
      .is("email_sent_at", null);
    throw error;
  }
}