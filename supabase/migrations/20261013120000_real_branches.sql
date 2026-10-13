-- Real RVRS branches. Positions come from the Google Maps links the owner supplied.
-- All branches: open 24/7 (empty opening_hours means "not configured", which the app and database treat as always open),
-- delivery and pickup on, 5 km delivery circle, 100 EGP fee, no minimum order.
-- RVRS Playa Strip is not here yet because its map link has not been supplied.

-- The branches table stores a geography point, which is awkward over REST. This hands the app plain lat/lng.
-- Security invoker (the default), so row-level security on branches still decides what is visible.
create function public.list_branches() returns table (
  id uuid, name_en text, name_ar text, address text, phone text,
  delivery_enabled boolean, pickup_enabled boolean, is_demo boolean, opening_hours jsonb,
  lat double precision, lng double precision
)
language sql stable set search_path = '' as $$
  select b.id, b.name_en, b.name_ar, b.address, b.phone, b.delivery_enabled, b.pickup_enabled, b.is_demo, b.opening_hours,
         extensions.st_y(b.location::extensions.geometry), extensions.st_x(b.location::extensions.geometry)
  from public.branches b
  where b.is_active
  order by b.name_en
$$;
revoke execute on function public.list_branches() from public;
grant execute on function public.list_branches() to anon, authenticated;

with new_branches as (
  insert into public.branches (name_en, name_ar, address, phone, location, opening_hours, delivery_enabled, pickup_enabled, is_active, is_demo)
  select v.name_en, v.name_ar, v.address, '0121 4122220',
         extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
         '{}'::jsonb, true, true, true, false
  from (values
    ('RVRS New Giza – The Gardens', 'ريفرس نيو جيزة – ذا جاردنز', 'The Gardens, New Giza, Cairo', 30.0043919, 31.0655234),
    ('RVRS Hacienda White', 'ريفرس هاسيندا وايت', 'Hacienda White, North Coast (Sahel)', 31.0034633, 28.6600293),
    ('RVRS Seashell', 'ريفرس سي شيل', 'Seashell, North Coast (Sahel)', 31.0022206, 28.6919874),
    ('RVRS Playa Beach', 'ريفرس بلايا بيتش', 'Playa Beach, Sidi Abdel Rahman, North Coast (Sahel)', 31.0376996, 28.5851169)
  ) as v(name_en, name_ar, address, lat, lng)
  returning id, name_en, location
)
insert into public.delivery_zones (branch_id, name, geom, delivery_fee, min_order, is_active)
select id, name_en || ' - 5 km',
       extensions.st_buffer(location, 5000, 16)::extensions.geometry,
       100, 0, true
from new_branches;

-- Retire the fictional demo branch. It is deactivated, not deleted, so nothing that refers to it breaks.
update public.branches set is_active = false where is_demo;
