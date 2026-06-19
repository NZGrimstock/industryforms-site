-- Company logos storage bucket
insert into storage.buckets (id, name, public)
  values ('company-logos', 'company-logos', true)
  on conflict (id) do nothing;

create policy "company members can upload logos" on storage.objects
  for insert with check (
    bucket_id = 'company-logos'
    and auth.uid() is not null
  );

create policy "company members can update logos" on storage.objects
  for update using (
    bucket_id = 'company-logos'
    and auth.uid() is not null
  );

create policy "anyone can view logos" on storage.objects
  for select using (bucket_id = 'company-logos');

create policy "company members can delete logos" on storage.objects
  for delete using (
    bucket_id = 'company-logos'
    and auth.uid() is not null
  );
