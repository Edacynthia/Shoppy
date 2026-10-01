import CheckoutForm from "@/app/checkout/checkout-form";
import { getShippingFeeMinor, getStoreCurrency, loadProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const products = await loadProducts();
  return (
    <CheckoutForm
      products={products}
      currency={getStoreCurrency()}
      shippingFeeMinor={getShippingFeeMinor()}
      defaultCountry={process.env.STORE_COUNTRY ?? "NG"}
    />
  );
}