import { NextResponse, type NextRequest } from "next/server";
import { fulfillPaystackOrder } from "@/lib/fulfill-paystack-order";
import { verifyPaystackTransaction } from "@/lib/paystack";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference || !/^[a-zA-Z0-9-]{8,100}$/.test(reference)) {
    return NextResponse.redirect(new URL("/checkout/failed", request.url));
  }

  try {
    const transaction = await verifyPaystackTransaction(reference);
    if (transaction.status !== "success") {
      return NextResponse.redirect(new URL("/checkout/failed", request.url));
    }
    await fulfillPaystackOrder(transaction);
    return NextResponse.redirect(new URL("/checkout/success", request.url));
  } catch (error) {
    console.error("Paystack callback processing failed:", error);
    return NextResponse.redirect(new URL("/checkout/processing", request.url));
  }
}