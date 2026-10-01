import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type Product = {
  id: string;
  name: string;
  description: string;
  priceMinor: number;
  category: "tableware" | "textile" | "accessory";
  badge: string;
  imageUrl: string;
  imageAlt: string;
  imageClass: string;
};

export const sampleProducts: Product[] = [
  {
    id: "sunday-stoneware-set",
    name: "Sunday stoneware set",
    description: "Hand-finished stoneware, set of two",
    priceMinor: 680000,
    category: "tableware",
    badge: "MADE BY HAND",
    imageUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Handmade ceramic cup and plate in warm natural light",
    imageClass: "image-stoneware",
  },
  {
    id: "soft-form-pitcher",
    name: "Soft form pitcher",
    description: "Sculptural everyday pitcher, 600 ml",
    priceMinor: 540000,
    category: "tableware",
    badge: "SMALL BATCH",
    imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Artisan shaping a clay vessel in a pottery studio",
    imageClass: "image-pitcher",
  },
  {
    id: "everyday-linen-pair",
    name: "Everyday linen pair",
    description: "Washed European linen, set of two",
    priceMinor: 360000,
    category: "textile",
    badge: "NATURAL LINEN",
    imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Relaxed linen textiles in a softly lit living space",
    imageClass: "image-linen",
  },
  {
    id: "weekend-market-tote",
    name: "Weekend market tote",
    description: "Heavy cotton canvas, built for the long haul",
    priceMinor: 420000,
    category: "textile",
    badge: "BEST LOVED",
    imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Everyday canvas carryall with thoughtfully made details",
    imageClass: "image-tote",
  },
  {
    id: "little-sun-incense-holder",
    name: "Little sun incense holder",
    description: "Cast brass, made to gather a little ash",
    priceMinor: 280000,
    category: "accessory",
    badge: "MADE TO KEEP",
    imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Small brass and ceramic home ritual objects",
    imageClass: "image-incense",
  },
  {
    id: "slow-morning-bowl",
    name: "Slow morning bowl",
    description: "Wheel-thrown stoneware, one of a kind",
    priceMinor: 440000,
    category: "tableware",
    badge: "ONE OF A KIND",
    imageUrl: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Quiet still life with a handmade stoneware bowl",
    imageClass: "image-bowl",
  },
];

export async function loadProducts(): Promise<Product[]> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return sampleProducts;

  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price_minor, category, badge, image_url, image_alt, image_class")
    .eq("active", true)
    .order("sort_order");

  if (error || !data?.length) return sampleProducts;

  return data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    priceMinor: product.price_minor,
    category: product.category as Product["category"],
    badge: product.badge,
    imageUrl: product.image_url,
    imageAlt: product.image_alt,
    imageClass: product.image_class,
  }));
}

export function getStoreCurrency() {
  return (process.env.STORE_CURRENCY ?? "NGN").toUpperCase();
}

export function getShippingFeeMinor() {
  const amount = Number(process.env.SHIPPING_FEE_MINOR_UNITS ?? "0");
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
}