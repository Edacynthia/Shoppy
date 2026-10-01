"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/catalog";

type CartLine = { productId: string; quantity: number };
type BagLine = { product: Product; quantity: number };

const categories = ["All objects", "Tableware", "Soft goods", "Small things"];
const filters: Record<string, string[]> = {
  "All objects": [],
  Tableware: ["tableware"],
  "Soft goods": ["textile"],
  "Small things": ["accessory"],
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default function Storefront({ products, currency }: { products: Product[]; currency: string }) {
  const [category, setCategory] = useState(categories[0]);
  const [bag, setBag] = useState<BagLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let active = true;

    async function restoreBag() {
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { items?: CartLine[] };
          const restored = (data.items ?? []).flatMap((line) => {
            const product = products.find((item) => item.id === line.productId);
            return product && line.quantity > 0
              ? [{ product, quantity: line.quantity }]
              : [];
          });
          if (active && restored.length) {
            setBag(restored);
            setCartReady(true);
            return;
          }
        }
      } catch {
        // The local cart remains usable when the database is not configured yet.
      }

      try {
        const stored = window.localStorage.getItem("fieldwork-bag");
        const lines = stored ? (JSON.parse(stored) as CartLine[]) : [];
        const restored = lines.flatMap((line) => {
          const product = products.find((item) => item.id === line.productId);
          return product && line.quantity > 0
            ? [{ product, quantity: line.quantity }]
            : [];
        });
        if (active) setBag(restored);
      } catch {
        if (active) setBag([]);
      }

      if (active) setCartReady(true);
    }

    void restoreBag();
    return () => {
      active = false;
    };
  }, [products]);

  useEffect(() => {
    if (!cartReady) return;

    const lines = bag.map(({ product, quantity }) => ({
      productId: product.id,
      quantity,
    }));

    try {
      window.localStorage.setItem("fieldwork-bag", JSON.stringify(lines));
    } catch {
      // The server-side cart remains available when browser storage is disabled.
    }

    void fetch("/api/cart", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: lines }),
    }).catch(() => undefined);
  }, [bag, cartReady]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserEmail(session?.user.email ?? "");
    });

    void supabase.auth.getUser().then(({ data, error }) => {
      if (active) setUserEmail(error ? "" : data.user?.email ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setBagOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const visibleProducts = products.filter(
    (product) => !filters[category].length || filters[category].includes(product.category),
  );
  const itemCount = bag.reduce((count, line) => count + line.quantity, 0);
  const subtotal = bag.reduce(
    (total, line) => total + line.product.priceMinor * line.quantity,
    0,
  );

  function addToBag(product: Product) {
    setBag((current) => {
      const match = current.find((line) => line.product.id === product.id);
      return match
        ? current.map((line) =>
            line.product.id === product.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...current, { product, quantity: 1 }];
    });
    setNotice(`${product.name} added to your bag.`);
    window.setTimeout(() => setNotice(""), 2500);
  }

  function changeQuantity(productId: string, delta: number) {
    setBag((current) =>
      current
        .map((line) =>
          line.product.id === productId
            ? { ...line, quantity: line.quantity + delta }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  return (
    <main>
      <div className="announcement">
        <span>Objects for everyday rituals.</span>
        <span className="announcement-right"><Globe2 size={13} aria-hidden="true" /> Shipping from our studio</span>
      </div>

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Fieldwork Supply home">
          fieldwork<span>.</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#collection">Shop all</a>
          <a href="#story">Our point of view</a>
          <a href="#newsletter">Notes from the studio</a>
        </nav>
        <div className="header-actions">
          <button
            className="text-button account-button"
            type="button"
            aria-label={userEmail ? `Sign out ${userEmail}` : "Sign in with Google"}
            data-testid="test-auth-toggle"
            onClick={async () => {
              try {
                const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                if (!url || !key) {
                  setNotice("Google sign-in needs Supabase credentials first.");
                  window.setTimeout(() => setNotice(""), 3500);
                  return;
                }
                const supabase = createBrowserClient(url, key);
                if (userEmail) {
                  const { error } = await supabase.auth.signOut();
                  if (error) throw error;
                  return;
                }
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                });
                if (error) throw error;
              } catch {
                setNotice("Google sign-in could not start. Check Supabase setup.");
                window.setTimeout(() => setNotice(""), 3500);
              }
            }}
          >
            {userEmail ? <><span className="account-email" title={userEmail}>{userEmail}</span><span>Sign out</span></> : <span>Sign in</span>}
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
          <button
            className="bag-button"
            type="button"
            aria-label={`Open shopping bag, ${itemCount} items`}
            onClick={() => setBagOpen(true)}
            data-testid="test-open-bag"
          >
            <ShoppingBag size={18} strokeWidth={1.7} aria-hidden="true" />
            <span>Bag</span>
            <span className="bag-count">{itemCount}</span>
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={14} aria-hidden="true" /> Considered goods, made to be used</p>
          <h1>Good things.<br /><em>Better days.</em></h1>
          <p className="hero-description">
            Useful, beautiful objects from small makers who care as much about
            how things are made as how they make you feel.
          </p>
          <a className="button button-dark" href="#collection">
            Meet your new favorites <ArrowDownRight size={16} aria-hidden="true" />
          </a>
          <div className="hero-note"><span className="note-dot" /> A little more thoughtful, by design.</div>
        </div>
        <div className="hero-art" role="img" aria-label="Sunlit still life of handmade ceramic tableware">
          <div className="hero-art-label"><span>Objects with a point of view</span><span>01 / 04</span></div>
          <div className="hero-sticker">MADE<br />WITH<br />INTENTION</div>
          <div className="hero-credit">A slower sort of everyday.</div>
        </div>
        <div className="hero-index">EST. 2024 <span>·</span> INDEPENDENT OBJECTS</div>
      </section>

      <section className="ticker" aria-label="Our values">
        <div className="ticker-track">
          {Array.from({ length: 2 }, (_, row) => (
            <span key={row} className="ticker-group">
              <span>Small batch, always</span><i>✳</i><span>Made to keep</span><i>✳</i>
              <span>Good materials only</span><i>✳</i><span>People before things</span><i>✳</i>
            </span>
          ))}
        </div>
      </section>

      <section className="collection section-wrap" id="collection">
        <div className="section-heading">
          <div><p className="eyebrow">THE GOOD STUFF</p><h2>Useful with a little <em>extra.</em></h2></div>
          <p className="section-aside">Small runs. Thoughtfully chosen.<br />Ready for real life.</p>
        </div>
        <div className="collection-toolbar">
          <div className="category-tabs" role="tablist" aria-label="Filter products">
            {categories.map((item) => (
              <button
                key={item}
                className={`category-tab${category === item ? " active" : ""}`}
                type="button"
                role="tab"
                aria-selected={category === item}
                onClick={() => setCategory(item)}
                data-testid={`test-category-${item.toLowerCase().replaceAll(" ", "-")}`}
              >
                {item}
              </button>
            ))}
          </div>
          <span className="result-count">{visibleProducts.length} OBJECTS</span>
        </div>
        <div className="product-grid">
          {visibleProducts.map((product, index) => (
            <article className="product-card" key={product.id} style={{ animationDelay: `${index * 70}ms` }}>
              <div
                className={`product-image ${product.imageClass}`}
                role="img"
                aria-label={product.imageAlt}
                style={{ backgroundImage: `url("${product.imageUrl}")` }}
              >
                <span className="product-badge">{product.badge}</span>
                <button
                  className="quick-add"
                  type="button"
                  onClick={() => addToBag(product)}
                  aria-label={`Add ${product.name} to bag`}
                  data-testid={`test-add-${product.id}`}
                >
                  <Plus size={19} strokeWidth={1.7} aria-hidden="true" />
                </button>
              </div>
              <div className="product-details">
                <div><h3>{product.name}</h3><p>{product.description}</p></div>
                <span className="product-price">{formatPrice(product.priceMinor, currency)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto" id="story">
        <div className="manifesto-art" role="img" aria-label="Thoughtfully crafted objects in a calm home" />
        <div className="manifesto-copy">
          <p className="eyebrow">A NOTE ON BUYING LESS</p>
          <h2>Keep the things<br />that <em>keep you.</em></h2>
          <p>
            We believe the things we live with should earn their place. So we
            work with independent makers, choose honest materials, and bring
            you fewer, better things you&apos;ll reach for every day.
          </p>
          <a href="#collection" className="underlined-link">A little about us <ArrowRight size={15} aria-hidden="true" /></a>
          <span className="manifesto-stamp">GOOD<br />BY NATURE</span>
        </div>
      </section>

      <section className="newsletter section-wrap" id="newsletter">
        <div><p className="eyebrow">VERY OCCASIONAL, ALWAYS GOOD</p><h2>Notes from the <em>studio.</em></h2></div>
        <p>New makers, small releases, and considered things for the everyday.</p>
        <a className="underlined-link" href="#collection">Find your next favorite <ArrowRight size={15} aria-hidden="true" /></a>
      </section>

      <footer className="site-footer">
        <a className="wordmark footer-mark" href="#top">fieldwork<span>.</span></a>
        <span>Thoughtful things for everyday living.</span>
        <span>© 2026 FIELDWORK SUPPLY</span>
      </footer>

      {notice && <div className="toast" role="status" aria-live="polite"><Check size={15} aria-hidden="true" />{notice}</div>}

      {bagOpen && (
        <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setBagOpen(false); }}>
          <aside className="bag-drawer" role="dialog" aria-modal="true" aria-labelledby="bag-title">
            <div className="drawer-heading">
              <div><p className="eyebrow">GOOD CHOICES</p><h2 id="bag-title">Your bag <span>({itemCount})</span></h2></div>
              <button type="button" className="icon-button" onClick={() => setBagOpen(false)} aria-label="Close shopping bag" data-testid="test-close-bag"><X size={21} /></button>
            </div>
            {bag.length === 0 ? (
              <div className="bag-empty"><ShoppingBag size={28} strokeWidth={1.2} /><p>Your next favorite is out there.</p><button type="button" className="underlined-link" onClick={() => { setBagOpen(false); document.querySelector("#collection")?.scrollIntoView({ behavior: "smooth" }); }}>Find it here <ArrowRight size={15} /></button></div>
            ) : (
              <>
                <div className="bag-lines">
                  {bag.map(({ product, quantity }) => (
                    <div className="bag-line" key={product.id}>
                      <div className={`bag-thumb ${product.imageClass}`} role="img" aria-label={product.imageAlt} style={{ backgroundImage: `url("${product.imageUrl}")` }} />
                      <div className="bag-line-info"><h3>{product.name}</h3><p>{formatPrice(product.priceMinor, currency)}</p><div className="quantity-control" aria-label={`${product.name} quantity`}>
                        <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)} data-testid={`test-quantity-minus-${product.id}`}><Minus size={13} /></button>
                        <span>{quantity}</span>
                        <button type="button" aria-label={`Add one ${product.name}`} onClick={() => changeQuantity(product.id, 1)} data-testid={`test-quantity-plus-${product.id}`}><Plus size={13} /></button>
                      </div></div>
                      <span className="line-total">{formatPrice(product.priceMinor * quantity, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="drawer-bottom">
                  <p className="shipping-note"><Check size={14} /> Delivery details are collected securely during checkout.</p>
                  <div className="subtotal"><span>Subtotal</span><strong>{formatPrice(subtotal, currency)}</strong></div>
                  <Link className="button button-dark checkout-button" href="/checkout" onClick={() => setBagOpen(false)} data-testid="test-checkout-link">
                    Continue to checkout <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  <div className="secure-note"><Check size={13} /> Secure payments by Paystack</div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}