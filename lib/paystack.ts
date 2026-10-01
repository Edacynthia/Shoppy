import "server-only";

export type PaystackTransaction = {
  id: number;
  reference: string;
  status: string;
  amount: number;
  currency: string;
};

export async function verifyPaystackTransaction(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured.");

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    },
  );
  const result = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: PaystackTransaction;
  };

  if (!response.ok || !result.status || !result.data) {
    throw new Error(result.message ?? "Paystack could not verify this payment.");
  }

  return result.data;
}