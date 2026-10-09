create table if not exists public.user_carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_carts enable row level security;

grant select, insert, update, delete on public.user_carts to authenticated;

drop policy if exists "Users manage their own cart" on public.user_carts;
create policy "Users manage their own cart"
  on public.user_carts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'The supabase_realtime publication is missing; enable Realtime before applying this migration.';
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
