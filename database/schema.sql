create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null,
  price_minor integer not null check (price_minor >= 0),
  category text not null check (category in ('tableware', 'textile', 'accessory')),
  badge text not null default '',
  image_url text not null,
  image_alt text not null,
  image_class text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_carts (
  id uuid primary key,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  buyer_email text not null,
  amount_total_minor integer not null check (amount_total_minor >= 0),
  amount_shipping_minor integer not null default 0,
  amount_tax_minor integer not null default 0,
  currency text not null default 'ngn',
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  items jsonb not null,
  shipping_details jsonb not null default '{}'::jsonb,
  billing_details jsonb not null default '{}'::jsonb,
  paystack_reference text unique,
  paystack_transaction_id text,
  email_claimed_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists amount_total_minor integer not null default 0,
  add column if not exists amount_shipping_minor integer not null default 0,
  add column if not exists amount_tax_minor integer not null default 0,
  add column if not exists shipping_details jsonb not null default '{}'::jsonb,
  add column if not exists billing_details jsonb not null default '{}'::jsonb,
  add column if not exists paystack_reference text unique,
  add column if not exists paystack_transaction_id text;

alter table public.products
  add column if not exists price_minor integer not null default 0;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price_cents'
  ) then
    update public.products set price_minor = price_cents * 100 where price_minor = 0 and price_cents > 0;
    alter table public.products drop column price_cents;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'amount_total_cents'
  ) then
    update public.orders set amount_total_minor = amount_total_cents * 100 where amount_total_minor = 0;
    alter table public.orders drop column amount_total_cents;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'amount_shipping_cents'
  ) then
    update public.orders set amount_shipping_minor = amount_shipping_cents * 100 where amount_shipping_minor = 0;
    alter table public.orders drop column amount_shipping_cents;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'amount_tax_cents'
  ) then
    update public.orders set amount_tax_minor = amount_tax_cents * 100 where amount_tax_minor = 0;
    alter table public.orders drop column amount_tax_cents;
  end if;

  alter table public.orders drop column if exists stripe_session_id;
  alter table public.orders drop column if exists stripe_payment_intent_id;
end $$;

alter table public.orders alter column currency set default 'ngn';

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_buyer_email_idx on public.orders (buyer_email);

-- User carts: syncs across web and mobile for authenticated shoppers.
-- The mobile app reads/writes this table directly via the anon key and
-- subscribes to realtime updates so a cart change on one device shows up
-- instantly on every other signed-in device.
create table if not exists public.user_carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'The supabase_realtime publication is missing; enable Realtime before applying this schema.';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_carts'
  ) then
    alter publication supabase_realtime add table public.user_carts;
  end if;
end $$;

alter table public.user_carts enable row level security;
grant select, insert, update, delete on public.user_carts to authenticated;

drop policy if exists "Users manage their own cart" on public.user_carts;
create policy "Users manage their own cart"
  on public.user_carts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own cart" on public.user_carts;
create policy "Users can read their own cart"
  on public.user_carts for select
  to authenticated
  using (auth.uid() = user_id);

alter table public.products enable row level security;
alter table public.guest_carts enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Published products are readable" on public.products;
create policy "Published products are readable"
  on public.products for select
  to anon, authenticated
  using (active = true);

insert into public.products
  (id, name, description, price_minor, category, badge, image_url, image_alt, image_class, sort_order)
values
  ('sunday-stoneware-set', 'Sunday stoneware set', 'Hand-finished stoneware, set of two', 680000, 'tableware', 'MADE BY HAND', 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=85', 'Handmade ceramic cup and plate in warm natural light', 'image-stoneware', 1),
  ('soft-form-pitcher', 'Soft form pitcher', 'Sculptural everyday pitcher, 600 ml', 540000, 'tableware', 'SMALL BATCH', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=85', 'Artisan shaping a clay vessel in a pottery studio', 'image-pitcher', 2),
  ('everyday-linen-pair', 'Everyday linen pair', 'Washed European linen, set of two', 360000, 'textile', 'NATURAL LINEN', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85', 'Relaxed linen textiles in a softly lit living space', 'image-linen', 3),
  ('weekend-market-tote', 'Weekend market tote', 'Heavy cotton canvas, built for the long haul', 420000, 'textile', 'BEST LOVED', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85', 'Everyday canvas carryall with thoughtfully made details', 'image-tote', 4),
  ('little-sun-incense-holder', 'Little sun incense holder', 'Cast brass, made to gather a little ash', 280000, 'accessory', 'MADE TO KEEP', 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1000&q=85', 'Small brass and ceramic home ritual objects', 'image-incense', 5),
  ('slow-morning-bowl', 'Slow morning bowl', 'Wheel-thrown stoneware, one of a kind', 440000, 'tableware', 'ONE OF A KIND', 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1000&q=85', 'Quiet still life with a handmade stoneware bowl', 'image-bowl', 6)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_minor = excluded.price_minor,
  category = excluded.category,
  badge = excluded.badge,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  image_class = excluded.image_class,
  sort_order = excluded.sort_order;