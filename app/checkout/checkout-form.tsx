"use client";

import { ArrowLeft, ArrowUpRight, Check, LockKeyhole, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { Product } from "@/lib/catalog";

type CartItem = { productId: string; quantity: number };
type CheckoutLine = { product: Product; quantity: number };
type ShippingDetails = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

function price(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default function CheckoutForm({
  products,
  currency,
  shippingFeeMinor,
  defaultCountry,
}: {
  products: Product[];
  currency: string;
  shippingFeeMinor: number;
  defaultCountry: string;
}) {
  const [items, setItems] = useState<CheckoutLine[]>([]);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shipping, setShipping] = useState<ShippingDetails>({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    postalCode: "",
    country: defaultCountry.toUpperCase(),
  });

  useEffect(() => {
    let active = true;

    async function loadBag() {
      let savedItems: CartItem[] = [];
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { items?: CartItem[] };
          savedItems = data.items ?? [];
        }
      } catch {
        savedItems = [];
      }

      if (!savedItems.length) {
        try {
          const stored = window.localStorage.getItem("fieldwork-bag");
          savedItems = stored ? (JSON.parse(stored) as CartItem[]) : [];
        } catch {
          savedItems = [];
        }
      }

      if (!active) return;
      setItems(savedItems.flatMap((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return product && Number.isInteger(item.quantity) && item.quantity > 0
          ? [{ product, quantity: item.quantity }]
          : [];
      }));
      setReady(true);
    }

    void loadBag();
    return () => {
      active = false;
    };
  }, [products]);

  const total = items.reduce((sum, item) => sum + item.product.priceMinor * item.quantity, 0);

  function updateShipping(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setShipping((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          shipping,
          items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout could not be started.");
      window.location.assign(data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Please try checkout again.");
      setBusy(false);
    }
  }

  return (
    <main className="checkout-shell">
      <header className="checkout-top">
        <Link className="wordmark" href="/" aria-label="Fieldwork Supply home">fieldwork<span>.</span></Link>
        <span>SECURE CHECKOUT</span>
      </header>
      {!ready ? (
        <div className="checkout-layout"><div className="checkout-main"><p className="eyebrow">YOUR BAG</p><h1 className="checkout-heading">Loading your bag…</h1></div></div>
      ) : items.length === 0 ? (
        <div className="checkout-layout"><div className="checkout-main checkout-empty">
          <ShoppingBag size={28} strokeWidth={1.3} />
          <h1>Your bag is taking a breather.</h1>
          <p>Head back to the collection and find something good.</p>
          <Link className="button button-dark" href="/#collection"><ArrowLeft size={15} /> Back to the collection</Link>
        </div></div>
      ) : (
        <div className="checkout-layout">
          <section className="checkout-main">
            <div className="checkout-heading">
              <p className="eyebrow">STEP 1 <span>·</span> PAYMENT &amp; DELIVERY</p>
              <h1>One good thing,<br /><em>on its way.</em></h1>
              <p>Add your contact and delivery details, then pay securely with Paystack.</p>
            </div>
            <form className="checkout-form" onSubmit={submit}>
              <label htmlFor="checkout-email">Email for your order updates</label>
              <input
                id="checkout-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                data-testid="test-checkout-email"
              />
              <label htmlFor="shipping-name">Full name</label>
              <input id="shipping-name" name="name" value={shipping.name} onChange={updateShipping} autoComplete="name" required data-testid="test-shipping-name" />
              <label htmlFor="shipping-phone">Phone number</label>
              <input id="shipping-phone" name="phone" type="tel" value={shipping.phone} onChange={updateShipping} autoComplete="tel" required data-testid="test-shipping-phone" />
              <label htmlFor="shipping-address-line-1">Street address</label>
              <input id="shipping-address-line-1" name="addressLine1" value={shipping.addressLine1} onChange={updateShipping} autoComplete="address-line1" required data-testid="test-shipping-address" />
              <label htmlFor="shipping-address-line-2">Apartment, suite, etc. (optional)</label>
              <input id="shipping-address-line-2" name="addressLine2" value={shipping.addressLine2} onChange={updateShipping} autoComplete="address-line2" data-testid="test-shipping-address-2" />
              <div className="address-row">
                <div><label htmlFor="shipping-city">City</label><input id="shipping-city" name="city" value={shipping.city} onChange={updateShipping} autoComplete="address-level2" required data-testid="test-shipping-city" /></div>
                <div><label htmlFor="shipping-region">State / region</label><input id="shipping-region" name="region" value={shipping.region} onChange={updateShipping} autoComplete="address-level1" required data-testid="test-shipping-region" /></div>
              </div>
              <div className="address-row">
                <div><label htmlFor="shipping-postal-code">Postal code (optional)</label><input id="shipping-postal-code" name="postalCode" value={shipping.postalCode} onChange={updateShipping} autoComplete="postal-code" data-testid="test-shipping-postal-code" /></div>
                <div><label htmlFor="shipping-country">Country</label><select id="shipping-country" name="country" value={shipping.country} onChange={updateShipping} autoComplete="country" data-testid="test-shipping-country"><option value="NG">Nigeria</option><option value="GH">Ghana</option><option value="KE">Kenya</option><option value="ZA">South Africa</option></select></div>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-dark checkout-button" type="submit" disabled={busy} data-testid="test-checkout-submit">
                {busy ? "Opening secure checkout…" : "Continue to payment"}<ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </form>
            <div className="checkout-secure"><LockKeyhole size={14} /> Payment is processed securely by Paystack.</div>
          </section>
          <aside className="checkout-summary" aria-label="Order summary">
            <h2>Your order <span>({items.reduce((sum, item) => sum + item.quantity, 0)})</span></h2>
            {items.map(({ product, quantity }) => (
              <div className="checkout-item" key={product.id}>
                <div className={`checkout-item-image ${product.imageClass}`} role="img" aria-label={product.imageAlt} style={{ backgroundImage: `url("${product.imageUrl}")` }} />
                <div><h3>{product.name}</h3><p>Quantity: {quantity}</p></div>
                <span>{price(product.priceMinor * quantity, currency)}</span>
              </div>
            ))}
            <div className="checkout-total"><span>Subtotal</span><strong>{price(total, currency)}</strong></div>
            <div className="checkout-total"><span>Delivery</span><strong>{shippingFeeMinor ? price(shippingFeeMinor, currency) : "Free"}</strong></div>
            <div className="checkout-total grand-total"><span>Total</span><strong>{price(total + shippingFeeMinor, currency)}</strong></div>
            <p className="shipping-note"><Check size={14} /> Delivery amount is set by the store. Applicable taxes are not included.</p>
            <Link className="underlined-link" href="/#collection"><ArrowLeft size={14} /> Keep looking</Link>
          </aside>
        </div>
      )}
      <footer className="checkout-footer"><span>FIELDWORK SUPPLY</span><span>Thoughtful things for everyday living.</span><span>Payments secured by Paystack</span></footer>
    </main>
  );
}