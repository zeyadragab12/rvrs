-- Smash Card: the order after ten completed orders is free (up to a cap), applied by the server at checkout.
insert into public.app_settings (key, value) values ('loyalty.reward_cap', '200') on conflict (key) do nothing;

alter table public.orders add column loyalty_reward boolean not null default false;
-- Backstop for the check inside create_order: a customer can only have one reward order in flight.
create unique index orders_one_open_reward_per_user on public.orders (user_id)
  where loyalty_reward and status not in ('completed', 'rejected', 'cancelled');

-- Progress for the signed-in customer. Counts completed orders only; the free order completing resets the card.
create function public.my_loyalty() returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (select count(*)::int as done from public.orders where user_id = (select auth.uid()) and status = 'completed')
  select jsonb_build_object(
    'completed', c.done,
    'reward_pending', exists (select 1 from public.orders where user_id = (select auth.uid()) and loyalty_reward
                              and status not in ('completed', 'rejected', 'cancelled')),
    'reward_cap', coalesce((select (value)::text::numeric from public.app_settings where key = 'loyalty.reward_cap'), 200))
  from c
$$;
revoke execute on function public.my_loyalty() from public, anon;
grant execute on function public.my_loyalty() to authenticated;

-- Replace create_order with a version that accepts p_use_reward. The old signature is dropped so no unrewarded overload is left callable.
drop function public.create_order(uuid, public.fulfillment_method, jsonb, text, text, public.payment_method, text, jsonb, text, text);

create function public.create_order(
  p_branch_id uuid,
  p_method public.fulfillment_method,
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method public.payment_method,
  p_idempotency_key text,
  p_address jsonb default null,
  p_promo_code text default null,
  p_notes text default null,
  p_use_reward boolean default false
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  br public.branches;
  existing public.orders;
  it jsonb; pid uuid; qty int; prod public.products; bps public.branch_product_settings;
  unit numeric(10,2); delta numeric(10,2); n int; c int; g public.option_groups;
  opt_ids uuid[]; opt_snapshot jsonb; lines jsonb := '[]'::jsonb; line_total numeric(10,2);
  subtotal numeric(10,2) := 0; discount numeric(10,2) := 0; fee numeric(10,2) := 0; min_order numeric(10,2) := 0;
  eligible numeric(10,2) := 0; promo public.promotions; promo_id uuid;
  zone public.delivery_zones; pt extensions.geometry; addr jsonb;
  new_id uuid; new_number text; guest_token text; guest_hash text; total numeric(10,2);
  cash_ok boolean; l jsonb;
  done_orders int; reward_cap numeric(10,2);
begin
  if coalesce(length(p_idempotency_key), 0) not between 8 and 100 then
    raise exception 'invalid idempotency key' using errcode = '22023';
  end if;
  if uid is not null and private.my_role() is null then
    raise exception 'account is not active' using errcode = '42501';
  end if;

  -- duplicate submission: return the original order
  select * into existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if existing.user_id is distinct from uid then
      raise exception 'idempotency key already used' using errcode = '23505';
    end if;
    return jsonb_build_object('order_id', existing.id, 'order_number', existing.order_number,
      'total', existing.total, 'status', existing.status, 'guest_token', null, 'duplicate', true);
  end if;

  if coalesce(btrim(p_customer_name), '') = '' or length(p_customer_name) > 100 then
    raise exception 'customer name is required' using errcode = '22023';
  end if;
  if coalesce(p_customer_phone, '') !~ '^\+?[0-9 ]{7,15}$' then
    raise exception 'a valid phone number is required' using errcode = '22023';
  end if;
  if length(coalesce(p_notes, '')) > 500 then raise exception 'notes too long' using errcode = '22023'; end if;

  select * into br from public.branches where id = p_branch_id and is_active;
  if not found then raise exception 'branch not available' using errcode = '22023'; end if;
  if (p_method = 'delivery' and not br.delivery_enabled) or (p_method = 'pickup' and not br.pickup_enabled) then
    raise exception 'this branch does not offer %', p_method using errcode = '22023';
  end if;
  if exists (select 1 from public.branch_closures bc where bc.branch_id = p_branch_id and now() between bc.starts_at and bc.ends_at) then
    raise exception 'branch is closed right now' using errcode = '22023';
  end if;

  -- payment method must be enabled by the restaurant
  if p_payment_method = 'cash' then
    select coalesce((select (value)::text::boolean from public.app_settings
      where key = case when p_method = 'delivery' then 'payments.cash_on_delivery' else 'payments.cash_on_pickup' end), false) into cash_ok;
    if not cash_ok then raise exception 'cash is not accepted for this order type' using errcode = '22023'; end if;
  else
    if not coalesce((select (value)::text::boolean from public.app_settings where key = 'payments.card_enabled'), false) then
      raise exception 'card payment is not enabled' using errcode = '22023';
    end if;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'cart must contain 1 to 50 items' using errcode = '22023';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    pid := (it->>'product_id')::uuid;
    qty := (it->>'quantity')::int;
    if qty is null or qty not between 1 and 50 then raise exception 'invalid quantity' using errcode = '22023'; end if;
    select * into prod from public.products where id = pid and is_published and not is_archived and is_available;
    if not found then raise exception 'product unavailable' using errcode = '22023'; end if;
    select * into bps from public.branch_product_settings where branch_id = p_branch_id and product_id = pid;
    if found and not bps.is_available then raise exception '% is unavailable at this branch', prod.name_en using errcode = '22023'; end if;
    unit := coalesce(bps.price_override, prod.base_price);

    opt_ids := array(select distinct x::uuid from jsonb_array_elements_text(coalesce(it->'option_ids', '[]'::jsonb)) x);
    select count(*) into n from public.options o join public.option_groups og on og.id = o.group_id
      where og.product_id = pid and o.is_available and o.id = any(opt_ids);
    if n <> coalesce(array_length(opt_ids, 1), 0) then
      raise exception 'invalid or unavailable option for %', prod.name_en using errcode = '22023';
    end if;
    for g in select * from public.option_groups where product_id = pid loop
      select count(*) into c from public.options o where o.group_id = g.id and o.id = any(opt_ids);
      if c > g.max_select or c < greatest(g.min_select, case when g.is_required then 1 else 0 end) then
        raise exception 'choose the right number of "%" for %', g.name_en, prod.name_en using errcode = '22023';
      end if;
    end loop;
    select coalesce(sum(o.price_delta), 0),
           coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'group', og.name_en, 'name', o.name_en, 'price_delta', o.price_delta)
                    order by og.sort_order, o.sort_order), '[]'::jsonb)
      into delta, opt_snapshot
      from public.options o join public.option_groups og on og.id = o.group_id
      where og.product_id = pid and o.id = any(opt_ids);

    line_total := (unit + delta) * qty;
    subtotal := subtotal + line_total;
    lines := lines || jsonb_build_object('product_id', pid, 'category_id', prod.category_id, 'name', prod.name_en,
      'unit_price', unit + delta, 'quantity', qty, 'options', opt_snapshot,
      'notes', left(it->>'notes', 300), 'line_total', line_total);
  end loop;

  -- delivery zone and fee
  if p_method = 'delivery' then
    if p_address is null or coalesce(btrim(p_address->>'address_line'), '') = '' or p_address->>'lat' is null or p_address->>'lng' is null then
      raise exception 'delivery address with location is required' using errcode = '22023';
    end if;
    pt := extensions.st_setsrid(extensions.st_makepoint((p_address->>'lng')::float8, (p_address->>'lat')::float8), 4326);
    select * into zone from public.delivery_zones
      where branch_id = p_branch_id and is_active and extensions.st_covers(geom, pt)
      order by delivery_fee limit 1;
    if not found then raise exception 'address is outside this branch delivery area' using errcode = '22023'; end if;
    fee := zone.delivery_fee; min_order := zone.min_order;
    if subtotal < min_order then raise exception 'minimum order for this area is % EGP', min_order using errcode = '22023'; end if;
    addr := jsonb_build_object('address_line', left(p_address->>'address_line', 300), 'notes', left(p_address->>'notes', 300),
      'lat', (p_address->>'lat')::float8, 'lng', (p_address->>'lng')::float8, 'zone', zone.name);
  end if;

  -- Smash Card reward: the order after ten completed orders is free, up to a cap. The server decides, never the app.
  if p_use_reward then
    if uid is null then raise exception 'sign in to use your reward' using errcode = '42501'; end if;
    if coalesce(btrim(p_promo_code), '') <> '' then
      raise exception 'a reward cannot be combined with a promo code' using errcode = '22023';
    end if;
    select count(*) into done_orders from public.orders where user_id = uid and status = 'completed';
    if done_orders % 11 <> 10 then raise exception 'no reward available yet' using errcode = '22023'; end if;
    if exists (select 1 from public.orders where user_id = uid and loyalty_reward
               and status not in ('completed', 'rejected', 'cancelled')) then
      raise exception 'your reward is already being used on another order' using errcode = '22023';
    end if;
    reward_cap := coalesce((select (value)::text::numeric from public.app_settings where key = 'loyalty.reward_cap'), 200);
    discount := least(subtotal, reward_cap);
  end if;

  -- promotion
  if not p_use_reward and coalesce(btrim(p_promo_code), '') <> '' then
    select * into promo from public.promotions where code = upper(btrim(p_promo_code)) and is_active
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
      and (branch_ids is null or p_branch_id = any(branch_ids));
    if not found then raise exception 'promo code is not valid' using errcode = '22023'; end if;
    if subtotal < promo.min_order then raise exception 'minimum order for this code is % EGP', promo.min_order using errcode = '22023'; end if;
    for l in select * from jsonb_array_elements(lines) loop
      if (promo.product_ids is null and promo.category_ids is null)
         or ((l->>'product_id')::uuid = any(coalesce(promo.product_ids, '{}')))
         or ((l->>'category_id')::uuid = any(coalesce(promo.category_ids, '{}'))) then
        eligible := eligible + (l->>'line_total')::numeric;
      end if;
    end loop;
    if eligible = 0 then raise exception 'promo code does not apply to these items' using errcode = '22023'; end if;
    discount := case promo.discount_type when 'fixed' then least(promo.discount_value, eligible)
                else round(eligible * promo.discount_value / 100, 2) end;
    update public.promotions set used_count = used_count + 1
      where id = promo.id and (usage_limit is null or used_count < usage_limit);
    if not found then raise exception 'promo code has been fully used' using errcode = '22023'; end if;
    promo_id := promo.id;
  end if;

  total := subtotal - discount + fee;

  if uid is null then
    guest_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    guest_hash := encode(sha256(convert_to(guest_token, 'utf8')), 'hex');
  end if;

  insert into public.orders (user_id, guest_token_hash, customer_name, customer_phone, branch_id, method, address_snapshot,
    subtotal, discount, delivery_fee, total, promotion_id, payment_method, notes, idempotency_key, loyalty_reward)
  values (uid, guest_hash, btrim(p_customer_name), btrim(p_customer_phone), p_branch_id, p_method, addr,
    subtotal, discount, fee, total, promo_id, p_payment_method, p_notes, p_idempotency_key, p_use_reward)
  returning id, order_number into new_id, new_number;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, options, notes, line_total)
  select new_id, (x->>'product_id')::uuid, x->>'name', (x->>'unit_price')::numeric, (x->>'quantity')::int,
         x->'options', x->>'notes', (x->>'line_total')::numeric
  from jsonb_array_elements(lines) x;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id) values (new_id, null, 'pending', uid);

  return jsonb_build_object('order_id', new_id, 'order_number', new_number, 'total', total,
    'status', 'pending', 'guest_token', guest_token, 'duplicate', false);
end $$;
revoke execute on function public.create_order(uuid, public.fulfillment_method, jsonb, text, text, public.payment_method, text, jsonb, text, text, boolean) from public;
grant execute on function public.create_order(uuid, public.fulfillment_method, jsonb, text, text, public.payment_method, text, jsonb, text, text, boolean) to anon, authenticated;
