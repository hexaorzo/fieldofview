-- Storage policies for photographer portfolio uploads.
-- Run after 0001_init.sql.

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "portfolio_public_read" on storage.objects;
create policy "portfolio_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'portfolio');

drop policy if exists "portfolio_user_insert" on storage.objects;
create policy "portfolio_user_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "portfolio_user_update" on storage.objects;
create policy "portfolio_user_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "portfolio_user_delete" on storage.objects;
create policy "portfolio_user_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

