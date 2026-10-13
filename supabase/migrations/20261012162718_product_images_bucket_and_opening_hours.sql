
-- Public product photos. Only the owner can upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and private.my_role() = 'owner');
create policy product_images_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and private.my_role() = 'owner')
  with check (bucket_id = 'product-images' and private.my_role() = 'owner');
create policy product_images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and private.my_role() = 'owner');

-- Orders are refused outside opening hours (Cairo time). Empty hours mean "not configured yet" and are not enforced.
create function private.branch_is_open(h jsonb) returns boolean language plpgsql stable set search_path = '' as $$
declare
  nowc timestamp := now() at time zone 'Africa/Cairo';
  t time := (now() at time zone 'Africa/Cairo')::time;
  today jsonb := h -> lower(to_char(nowc, 'dy'));
  prev jsonb := h -> lower(to_char(nowc - interval '1 day', 'dy'));
  o time; c time;
begin
  if h is null or h = '{}'::jsonb then return true; end if;
  if today is not null then
    o := (today ->> 'open')::time; c := (today ->> 'close')::time;
    if (o <= c and t >= o and t < c) or (o > c and t >= o) then return true; end if;
  end if;
  if prev is not null then
    o := (prev ->> 'open')::time; c := (prev ->> 'close')::time;
    if o > c and t < c then return true; end if;
  end if;
  return false;
end $$;

create function private.enforce_branch_open() returns trigger language plpgsql security definer set search_path = '' as $$
declare h jsonb;
begin
  select opening_hours into h from public.branches where id = new.branch_id;
  if not private.branch_is_open(h) then
    raise exception 'this branch is closed right now' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger t_orders_open_hours before insert on public.orders for each row execute function private.enforce_branch_open();
