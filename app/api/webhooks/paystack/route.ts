import { createHmac, timingSafeEqual } from "node:crypto";
import { fulfillPaystackOrder } from "@/lib/fulfill-paystack-order";
import { verifyPaystackTransaction } from "@/lib/paystack";

export const runtime = "nodejs";

type PaystackWebhook = {
  event?: string;
  data?: { reference?: string };
};

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  if (!secret || !signature || !/^[a-f\d]{128}$/i.test(signature)) {
    return Response.json({ error: "Webhook signature is missing or invalid." }, { status: 401 });
  }

  const rawBody = await request.text();
  const expected = createHmac("sha512", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  if (!timingSafeEqual(expected, received)) {
    return Response.json({ error: "Webhook signature did not match." }, { status: 401 });
  }

  let event: PaystackWebhook;
  try {
    event = JSON.parse(rawBody) as PaystackWebhook;
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (event.event !== "charge.success") return Response.json({ received: true });
  const reference = event.data?.reference;
  if (!reference) return Response.json({ error: "Transaction reference is missing." }, { status: 400 });

  try {
    const transaction = await verifyPaystackTransaction(reference);
    if (transaction.status !== "success") return Response.json({ received: true });
    await fulfillPaystackOrder(transaction);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook processing failed:", error);
    return Response.json({ error: "Payment could not be processed." }, { status: 500 });
  }
}