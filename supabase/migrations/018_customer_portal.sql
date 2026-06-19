create table if not exists customer_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  email text not null,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz default now()
);
create index if not exists idx_portal_tokens_token on customer_portal_tokens(token);
create index if not exists idx_portal_tokens_customer on customer_portal_tokens(customer_id);

-- RLS: staff can manage tokens for their own company; service role bypasses for public portal reads
alter table customer_portal_tokens enable row level security;

create policy "company members manage portal tokens"
  on customer_portal_tokens
  for all
  using (
    company_id in (
      select company_id from profiles where id = auth.uid()
    )
  )
  with check (
    company_id in (
      select company_id from profiles where id = auth.uid()
    )
  );
