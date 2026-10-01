import Storefront from "@/app/storefront";
import { getStoreCurrency, loadProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await loadProducts();

  return <Storefront products={products} currency={getStoreCurrency()} />;
}