
alter table public.addresses drop column location;
alter table public.addresses add column lat double precision check (lat between -90 and 90);
alter table public.addresses add column lng double precision check (lng between -180 and 180);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  status text not null default 'pending' check (status in ('pending','completed','rejected')),
  requested_at timestamptz not null default now(),
  handled_at timestamptz
);
create unique index deletion_requests_one_pending on public.deletion_requests (user_id) where status = 'pending';
alter table public.deletion_requests enable row level security;
create policy deletion_insert_own on public.deletion_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy deletion_read on public.deletion_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.my_role() = 'owner');
create policy deletion_owner_update on public.deletion_requests for update to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');
create index on public.deletion_requests (user_id);
