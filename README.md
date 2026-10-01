# Fieldwork Supply

A server-rendered storefront built with Next.js for Vercel. Supabase stores products, guest carts, accounts, and orders. Paystack collects payments. Mailgun sends payment-confirmation emails. Google sign-in runs through Supabase Auth.

The included Fieldwork products, names, prices, images, NGN currency, and free-delivery fee are examples. Replace them with your shop details before accepting real payments.

## Run Locally

From this folder (`Stage 2`):

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The sample storefront works before provider credentials are added. Checkout will remain unavailable until the required Paystack and Supabase settings are present.

Copy `.env.example` to `.env.local` and fill it in as you set up each provider. Do not commit `.env.local` or paste secret keys into chat. The `.env.example` file contains placeholders only.

## 1. Supabase Database

1. Create a project at [supabase.com](https://supabase.com/).
2. In the Supabase SQL Editor, run [`database/schema.sql`](database/schema.sql). It creates product, guest-cart, and order tables and inserts sample products.
3. In Project Settings → API, copy the project URL, anon/publishable key, and service-role key into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_PRIVATE_SERVICE_ROLE_KEY
```

The service-role key is private and must never use a `NEXT_PUBLIC_` name. Server routes use it to read prices and write orders. Row-level security is enabled; browser clients cannot write orders or carts directly.

## 2. Google Sign-In

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, configure the OAuth consent screen, and create an OAuth client ID with application type **Web application**.
2. In the Supabase Dashboard, open Authentication → Sign In / Providers → Google. Enable Google and enter the Google client ID and client secret there.
3. Copy the Supabase callback URL shown on that provider settings page. Add that exact URL to the Google OAuth client's **Authorized redirect URIs**.
4. In Supabase Authentication → URL Configuration, set the site URL to `http://localhost:3000` while developing. Add `http://localhost:3000/auth/callback` and your eventual deployed URL plus `/auth/callback` to the redirect URL allowlist.
5. When deploying, also add the production domain to the Google OAuth client's authorized JavaScript origins and update the Supabase site URL/redirect allowlist.

Google's client secret belongs in Supabase's provider settings, not in the frontend or this repository.

## 3. Paystack Payments

1. Create and activate a [Paystack account](https://paystack.com/). Start with **Test Mode**; test transactions do not move real money.
2. In the Paystack Dashboard, open Settings → API Keys & Webhooks and copy the **test secret key** into `.env.local`:

```env
PAYSTACK_SECRET_KEY=sk_test_YOUR_TEST_SECRET
```

Only the server uses this key. Do not expose it to the browser or commit it.

3. Set the shop currency, seller country, and delivery charge in the same file. Amounts are in the currency's smallest unit: for NGN, `150000` means ₦1,500. `0` means free delivery.

```env
STORE_CURRENCY=NGN
STORE_COUNTRY=NG
SHIPPING_FEE_MINOR_UNITS=0
```

4. In Paystack Settings → API Keys & Webhooks, set the webhook URL to `https://YOUR_DOMAIN/api/webhooks/paystack`. Paystack signs webhook requests with your secret key; there is no separate webhook secret in this app. The handler checks the signature and verifies each payment directly with Paystack before marking its order paid.
5. Run a test checkout. Use Paystack's documented test payment details from its test-mode documentation. The success return and webhook may both arrive; the order and email logic is idempotent.
6. Before launch, complete Paystack business verification, replace the test key with the **live secret key** in Vercel, and set the production webhook URL. Never use a test key in production or a live key during local testing.

The sample currency is NGN and the checkout currently offers Nigeria, Ghana, Kenya, and South Africa as delivery countries. Confirm supported countries/currency and delivery pricing for your Paystack merchant account before launch. Tax is not calculated by the sample checkout.

## 4. Mailgun Order Emails

1. Create a [Mailgun account](https://www.mailgun.com/) and add a sending domain.
2. Follow Mailgun's DNS instructions to verify the domain (including SPF/DKIM) before sending to customers.
3. Add the Mailgun API key, verified domain, and an allowed sender address to `.env.local`:

```env
MAILGUN_API_KEY=YOUR_PRIVATE_MAILGUN_KEY
MAILGUN_DOMAIN=mg.your-domain.example
MAILGUN_FROM_EMAIL=orders@mg.your-domain.example
MAILGUN_REGION=US
```

Use `EU` for an EU Mailgun account. The receipt is sent only after Paystack confirms payment; the order contains the chosen delivery address and the email contains the order summary.

## 5. Replace the Sample Shop

Before opening sales, provide/update:

- Store name, logo, support email, and production domain.
- Product names, descriptions, category, images, and actual prices in your chosen currency.
- Currency, countries you deliver to, delivery fee per region, and whether prices include tax.
- Returns/refunds and delivery-time wording for the storefront.

The sample catalog lives in [`lib/catalog.ts`](lib/catalog.ts) and its database seed is in [`database/schema.sql`](database/schema.sql). Keep the prices in both places synchronized until all products are managed from an admin screen.

## 6. Deploy to Vercel

1. Push the project to a Git repository and import it in [Vercel](https://vercel.com/).
2. Because this app is nested inside the repository, set Vercel's **Root Directory** to `Stage 2`.
3. Add every value from `.env.example` to the Vercel project environment settings for Preview and Production. Keep the Supabase service-role key, Paystack secret key, and Mailgun API key private.
4. Deploy a Preview first and test a complete Paystack test-mode order, database record, webhook, and Mailgun receipt.
5. Add the Vercel domain to Supabase's redirect allowlist and Google OAuth settings. Add the deployed Paystack webhook endpoint. Only after these checks should you switch to live Paystack credentials.

## When I Need Your Input

You do not need to send me passwords, API keys, client secrets, or database credentials. Enter those directly into `.env.local` and your provider dashboards. To customize the project, tell me the store name, real product list/prices/images, currency, delivery countries and fees, tax policy, support email, and domain. I can then update the sample catalog, checkout, and written policies to match.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
