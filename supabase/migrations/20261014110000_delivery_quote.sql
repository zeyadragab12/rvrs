-- Lets the app show the real delivery fee before the customer places the order.
-- Uses the same zone lookup as create_order (cheapest active zone that covers the point). Read-only; nothing is created.
create function public.delivery_quote(p_branch_id uuid, p_lat double precision, p_lng double precision) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  br public.branches;
  zone public.delivery_zones;
  pt extensions.geometry;
begin
  select * into br from public.branches where id = p_branch_id and is_active;
  if not found or not br.delivery_enabled then
    return jsonb_build_object('ok', false, 'reason', 'delivery_unavailable');
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return jsonb_build_object('ok', false, 'reason', 'outside_area');
  end if;
  pt := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326);
  select * into zone from public.delivery_zones
    where branch_id = p_branch_id and is_active and extensions.st_covers(geom, pt)
    order by delivery_fee limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'outside_area');
  end if;
  return jsonb_build_object('ok', true, 'fee', zone.delivery_fee, 'min_order', zone.min_order, 'zone', zone.name);
end $$;
revoke execute on function public.delivery_quote(uuid, double precision, double precision) from public;
grant execute on function public.delivery_quote(uuid, double precision, double precision) to anon, authenticated;
