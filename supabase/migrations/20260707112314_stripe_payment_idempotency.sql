-- Codex build audit marker (2026-07-07): make Stripe invoice payment settlement
-- idempotent under webhook replay and add durable public portal login throttling.

with duplicate_stripe_payments as (
  select
    id,
    row_number() over (
      partition by stripe_payment_intent_id
      order by paid_at asc, created_at asc, id asc
    ) as duplicate_rank
  from payments
  where stripe_payment_intent_id is not null
)
update payments
set
  stripe_payment_intent_id = null,
  notes = concat_ws(E'\n', notes, 'Codex audit: duplicate Stripe PaymentIntent id cleared before unique index.')
where id in (
  select id
  from duplicate_stripe_payments
  where duplicate_rank > 1
);

create unique index if not exists idx_payments_stripe_payment_intent_id_unique
  on payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create or replace function record_stripe_invoice_payment(
  p_invoice_id uuid,
  p_payment_intent_id text,
  p_amount numeric,
  p_paid_at timestamptz default now()
)
returns table(applied boolean, invoice_status text, invoice_amount_paid numeric)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice_total numeric;
  v_invoice_paid numeric;
  v_payment_inserted boolean := false;
  v_payment_sum numeric;
  v_new_paid numeric;
  v_new_status invoice_status;
begin
  select total, amount_paid
    into v_invoice_total, v_invoice_paid
  from invoices
  where id = p_invoice_id
  for update;

  if not found then
    return query select false, 'not_found'::text, 0::numeric;
    return;
  end if;

  insert into payments (
    invoice_id,
    amount,
    method,
    stripe_payment_intent_id,
    notes,
    paid_at
  )
  values (
    p_invoice_id,
    p_amount,
    'stripe',
    p_payment_intent_id,
    'Stripe payment ' || p_payment_intent_id,
    coalesce(p_paid_at, now())
  )
  on conflict (stripe_payment_intent_id)
    where (stripe_payment_intent_id is not null)
    do nothing
  returning true into v_payment_inserted;

  if coalesce(v_payment_inserted, false) then
    v_new_paid := coalesce(v_invoice_paid, 0) + p_amount;
  else
    select coalesce(sum(amount), 0)
      into v_payment_sum
    from payments
    where invoice_id = p_invoice_id;

    v_new_paid := greatest(coalesce(v_invoice_paid, 0), v_payment_sum);
  end if;

  v_new_status := case
    when v_new_paid >= v_invoice_total then 'paid'::invoice_status
    else 'partially_paid'::invoice_status
  end;

  update invoices
  set
    amount_paid = v_new_paid,
    status = v_new_status,
    paid_at = case when v_new_status = 'paid' then coalesce(p_paid_at, now()) else null end
  where id = p_invoice_id;

  return query select coalesce(v_payment_inserted, false), v_new_status::text, v_new_paid;
end;
$$;

revoke all on function record_stripe_invoice_payment(uuid, text, numeric, timestamptz) from public;
revoke all on function record_stripe_invoice_payment(uuid, text, numeric, timestamptz) from anon, authenticated;
grant execute on function record_stripe_invoice_payment(uuid, text, numeric, timestamptz) to service_role;

create table if not exists portal_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text,
  email_hash text not null,
  created_at timestamptz not null default now()
);

alter table portal_login_attempts enable row level security;

revoke all on table portal_login_attempts from public;
revoke all on table portal_login_attempts from anon, authenticated;
grant all on table portal_login_attempts to service_role;

create index if not exists idx_portal_login_attempts_ip_created
  on portal_login_attempts (ip_hash, created_at desc)
  where ip_hash is not null;

create index if not exists idx_portal_login_attempts_email_created
  on portal_login_attempts (email_hash, created_at desc);

create or replace function record_portal_login_attempt(
  p_ip_hash text,
  p_email_hash text,
  p_window_since timestamptz,
  p_max_per_ip integer,
  p_max_per_email integer,
  p_delete_before timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ip_count integer;
  v_email_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('portal-login-ip:' || coalesce(p_ip_hash, 'unknown'), 0));
  perform pg_advisory_xact_lock(hashtextextended('portal-login-email:' || p_email_hash, 0));

  delete from portal_login_attempts
  where created_at < p_delete_before;

  select count(*)
    into v_ip_count
  from portal_login_attempts
  where ip_hash = p_ip_hash
    and created_at >= p_window_since;

  select count(*)
    into v_email_count
  from portal_login_attempts
  where email_hash = p_email_hash
    and created_at >= p_window_since;

  if v_ip_count >= p_max_per_ip or v_email_count >= p_max_per_email then
    return false;
  end if;

  insert into portal_login_attempts (ip_hash, email_hash)
  values (p_ip_hash, p_email_hash);

  return true;
end;
$$;

revoke all on function record_portal_login_attempt(text, text, timestamptz, integer, integer, timestamptz) from public;
revoke all on function record_portal_login_attempt(text, text, timestamptz, integer, integer, timestamptz) from anon, authenticated;
grant execute on function record_portal_login_attempt(text, text, timestamptz, integer, integer, timestamptz) to service_role;
