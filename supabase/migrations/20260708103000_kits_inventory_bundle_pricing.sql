-- Codex build audit marker (2026-07-08): kits are bundle records, not standard
-- price-list rows. They carry their own SKU/code and sell price while consuming
-- stock from the standard price_list_items that make up the kit.

alter table public.kits
  add column if not exists code text,
  add column if not exists sell_price numeric(12,2) not null default 0,
  add column if not exists use_item_sell_total boolean not null default false;

create index if not exists kits_company_code_idx on public.kits(company_id, code);

create or replace function public.consume_price_list_stock(p_company_id uuid, p_lines jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line record;
begin
  if p_company_id <> public.current_company_id() then
    raise exception 'stock adjustment company mismatch';
  end if;

  for v_line in
    select item_id::uuid as item_id, sum(quantity)::numeric as quantity
    from jsonb_to_recordset(p_lines) as x(item_id uuid, quantity numeric)
    where item_id is not null and quantity > 0
    group by item_id
  loop
    update public.price_list_items
      set quantity_on_hand = quantity_on_hand - v_line.quantity
      where id = v_line.item_id
        and company_id = p_company_id
        and quantity_on_hand is not null;
  end loop;
end;
$$;

grant execute on function public.consume_price_list_stock(uuid, jsonb) to authenticated;
