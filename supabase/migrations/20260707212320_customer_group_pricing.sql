-- Codex build audit marker (2026-07-08): per-customer-group pricing foundation.
-- Customer groups own optional price overrides for price_list_items; quote/job/
-- invoice builders resolve the override for the selected customer's group.

create table if not exists public.customer_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, name)
);

create table if not exists public.customer_group_prices (
  customer_group_id uuid not null references public.customer_groups(id) on delete cascade,
  price_list_item_id uuid not null references public.price_list_items(id) on delete cascade,
  sell_price numeric(12,2) not null check (sell_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(customer_group_id, price_list_item_id)
);

alter table public.customers
  add column if not exists pricing_group_id uuid references public.customer_groups(id) on delete set null;

create index if not exists customer_groups_company_idx on public.customer_groups(company_id);
create index if not exists customer_group_prices_item_idx on public.customer_group_prices(price_list_item_id);
create index if not exists customers_pricing_group_idx on public.customers(pricing_group_id);

create or replace function public.ensure_customer_group_price_company()
returns trigger
language plpgsql
as $$
declare
  v_group_company uuid;
  v_item_company uuid;
begin
  select company_id into v_group_company from public.customer_groups where id = new.customer_group_id;
  select company_id into v_item_company from public.price_list_items where id = new.price_list_item_id;
  if v_group_company is null or v_item_company is null or v_group_company <> v_item_company then
    raise exception 'customer group price must link records from the same company';
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_customer_group_price_company on public.customer_group_prices;
create trigger ensure_customer_group_price_company
  before insert or update on public.customer_group_prices
  for each row execute function public.ensure_customer_group_price_company();

create or replace function public.ensure_customer_pricing_group_company()
returns trigger
language plpgsql
as $$
declare
  v_group_company uuid;
begin
  if new.pricing_group_id is null then
    return new;
  end if;
  select company_id into v_group_company from public.customer_groups where id = new.pricing_group_id;
  if v_group_company is null or v_group_company <> new.company_id then
    raise exception 'customer pricing group must belong to the customer company';
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_customer_pricing_group_company on public.customers;
create trigger ensure_customer_pricing_group_company
  before insert or update of company_id, pricing_group_id on public.customers
  for each row execute function public.ensure_customer_pricing_group_company();

alter table public.customer_groups enable row level security;
alter table public.customer_group_prices enable row level security;

create policy "members select customer_groups" on public.customer_groups
  for select using (company_id = current_company_id());
create policy "admins write customer_groups" on public.customer_groups
  for all using (company_id = current_company_id() and is_admin_or_owner())
  with check (company_id = current_company_id() and is_admin_or_owner());

create policy "members select customer_group_prices" on public.customer_group_prices
  for select using (
    exists (
      select 1 from public.customer_groups g
      join public.price_list_items p on p.id = price_list_item_id and p.company_id = g.company_id
      where g.id = customer_group_id
        and g.company_id = current_company_id()
    )
  );
create policy "admins write customer_group_prices" on public.customer_group_prices
  for all using (
    exists (
      select 1 from public.customer_groups g
      join public.price_list_items p on p.id = price_list_item_id and p.company_id = g.company_id
      where g.id = customer_group_id
        and g.company_id = current_company_id()
        and is_admin_or_owner()
    )
  )
  with check (
    exists (
      select 1 from public.customer_groups g
      join public.price_list_items p on p.id = price_list_item_id and p.company_id = g.company_id
      where g.id = customer_group_id
        and g.company_id = current_company_id()
        and is_admin_or_owner()
    )
  );

grant select, insert, update, delete on table public.customer_groups to authenticated;
grant select, insert, update, delete on table public.customer_group_prices to authenticated;
