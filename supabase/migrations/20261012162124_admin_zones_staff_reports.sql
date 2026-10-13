
-- Delivery zones as GeoJSON (the table stores PostGIS geometry)
create function public.zones_for_branch(p_branch uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', z.id, 'name', z.name, 'delivery_fee', z.delivery_fee,
    'min_order', z.min_order, 'is_active', z.is_active,
    'geojson', extensions.st_asgeojson(z.geom)::jsonb) order by z.name), '[]'::jsonb)
  from public.delivery_zones z
  where z.branch_id = p_branch and private.can_access_branch(z.branch_id) and private.is_staff()
$$;

create function public.save_zone(p_id uuid, p_branch uuid, p_name text, p_geojson jsonb, p_fee numeric, p_min numeric, p_active boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare g extensions.geometry; zid uuid;
begin
  if private.my_role() is distinct from 'owner' then raise exception 'only the owner can edit delivery zones' using errcode = '42501'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'zone name is required' using errcode = '22023'; end if;
  if p_fee < 0 or p_min < 0 then raise exception 'fee and minimum order cannot be negative' using errcode = '22023'; end if;
  begin
    g := extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326);
  exception when others then
    raise exception 'invalid GeoJSON polygon' using errcode = '22023';
  end;
  if extensions.geometrytype(g) <> 'POLYGON' then raise exception 'zone must be a single polygon' using errcode = '22023'; end if;
  if not extensions.st_isvalid(g) then raise exception 'polygon is not valid (check for crossing lines)' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.delivery_zones (branch_id, name, geom, delivery_fee, min_order, is_active)
      values (p_branch, btrim(p_name), g, p_fee, p_min, p_active) returning id into zid;
  else
    update public.delivery_zones set name = btrim(p_name), geom = g, delivery_fee = p_fee, min_order = p_min, is_active = p_active
      where id = p_id and branch_id = p_branch returning id into zid;
    if zid is null then raise exception 'zone not found' using errcode = '22023'; end if;
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
    values ((select auth.uid()), 'zone_save', 'delivery_zone', zid, jsonb_build_object('name', p_name, 'fee', p_fee, 'min_order', p_min, 'active', p_active));
  return zid;
end $$;

-- Staff management (owner only)
create function public.list_staff() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'email', u.email, 'full_name', p.full_name, 'role', p.role,
    'is_active', p.is_active, 'branch_ids', coalesce((select jsonb_agg(sb.branch_id) from public.staff_branches sb where sb.user_id = p.id), '[]'::jsonb))
    order by p.role, u.email), '[]'::jsonb)
  from public.profiles p join auth.users u on u.id = p.id
  where p.role <> 'customer' and private.my_role() = 'owner'
$$;

create function public.set_staff_role(p_email text, p_role public.user_role, p_branch_ids uuid[] default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if private.my_role() is distinct from 'owner' then raise exception 'only the owner can manage staff' using errcode = '42501'; end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then raise exception 'No account with that email. They need to create an account in the app first.' using errcode = '22023'; end if;
  if uid = (select auth.uid()) and p_role <> 'owner' then raise exception 'You cannot remove your own owner role.' using errcode = '22023'; end if;
  if p_role in ('branch_manager','cashier','kitchen') and coalesce(array_length(p_branch_ids, 1), 0) = 0 then
    raise exception 'choose at least one branch for this role' using errcode = '22023';
  end if;
  update public.profiles set role = p_role, is_active = true where id = uid;
  delete from public.staff_branches where user_id = uid;
  if p_role in ('branch_manager','cashier','kitchen') then
    insert into public.staff_branches (user_id, branch_id) select uid, b from unnest(p_branch_ids) b;
  end if;
end $$;

-- Sales report
create function public.sales_report(p_from timestamptz, p_to timestamptz, p_branch uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.user_role := private.my_role();
begin
  if r is null or r in ('customer','kitchen') then raise exception 'not allowed' using errcode = '42501'; end if;
  return (
    with o as (
      select * from public.orders
      where created_at >= p_from and created_at < p_to and (p_branch is null or branch_id = p_branch) and private.can_access_branch(branch_id)
    ), v as (select * from o where status not in ('rejected','cancelled'))
    select jsonb_build_object(
      'orders', (select count(*) from o),
      'valid_orders', (select count(*) from v),
      'gross', coalesce((select sum(total) from v), 0),
      'delivery_fees', coalesce((select sum(delivery_fee) from v), 0),
      'discounts', coalesce((select sum(discount) from v), 0),
      'avg', coalesce((select round(avg(total), 2) from v), 0),
      'delivery_orders', (select count(*) from v where method = 'delivery'),
      'pickup_orders', (select count(*) from v where method = 'pickup'),
      'rejected', (select count(*) from o where status = 'rejected'),
      'cancelled', (select count(*) from o where status = 'cancelled'),
      'by_payment', coalesce((select jsonb_agg(jsonb_build_object('method', m, 'orders', c, 'gross', g)) from (select payment_method m, count(*) c, sum(total) g from v group by 1) x), '[]'::jsonb),
      'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'orders', c, 'gross', g) order by d) from (select (created_at at time zone 'Africa/Cairo')::date d, count(*) c, sum(total) g from v group by 1) x), '[]'::jsonb),
      'products', coalesce((select jsonb_agg(jsonb_build_object('name', n, 'qty', q, 'gross', g) order by q desc) from (select i.product_name n, sum(i.quantity) q, sum(i.line_total) g from public.order_items i join v on v.id = i.order_id group by 1) x), '[]'::jsonb)
    )
  );
end $$;

revoke execute on function public.zones_for_branch(uuid), public.save_zone(uuid, uuid, text, jsonb, numeric, numeric, boolean),
  public.list_staff(), public.set_staff_role(text, public.user_role, uuid[]), public.sales_report(timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.zones_for_branch(uuid), public.save_zone(uuid, uuid, text, jsonb, numeric, numeric, boolean),
  public.list_staff(), public.set_staff_role(text, public.user_role, uuid[]), public.sales_report(timestamptz, timestamptz, uuid) to authenticated;
