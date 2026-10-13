-- RVRS business rule tests.
--
-- Everything runs inside one transaction that is rolled back, so no data is kept.
-- It builds its own fixtures (branches, menu, promos, staff) and never touches real data.
-- Run against a development or staging database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rules.sql
-- A failed check stops with a message that starts with "ASSERT". Success prints PASS at the end.

begin;

-- ---------------------------------------------------------------- helpers
create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    set local role authenticated;
  end if;
end $$;

-- Runs a statement and requires it to fail with a message matching the pattern.
create function pg_temp.fails(sql text, pattern text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    assert sqlerrm ilike pattern, format('expected an error like %L but got %L for: %s', pattern, sqlerrm, sql);
    return;
  end;
  assert false, format('expected an error like %L but the statement succeeded: %s', pattern, sql);
end $$;

create function pg_temp.order_sql(br uuid, method text, items jsonb, phone text, pay text, key text, addr jsonb default null, promo text default null)
returns text language sql as $$
  select format('select public.create_order(%L, %L, %L::jsonb, %L, %L, %L, %L, %L::jsonb, %L)',
                br, method, items, 'Test Customer', phone, pay, key, addr, promo)
$$;

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, instance_id, aud, role, email)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u || '@test.invalid'
from unnest(array[
  'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006'
]::uuid[]) u;

-- 01 owner, 02 manager (B1), 03 cashier (B1), 04 kitchen (B1), 05 cashier (B2), 06 customer
update public.profiles set role = 'owner' where id = 'a0000000-0000-0000-0000-000000000001';
update public.profiles set role = 'branch_manager' where id = 'a0000000-0000-0000-0000-000000000002';
update public.profiles set role = 'cashier' where id in ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005');
update public.profiles set role = 'kitchen' where id = 'a0000000-0000-0000-0000-000000000004';
update public.profiles set full_name = 'Zed Customer' where id = 'a0000000-0000-0000-0000-000000000006';

insert into public.branches (id, name_en, delivery_enabled, pickup_enabled, is_active, opening_hours, is_demo) values
  ('a0000000-0000-0000-0000-0000000000b1', 'TEST B1', true, true, true, '{}', true),
  ('a0000000-0000-0000-0000-0000000000b2', 'TEST B2', true, true, true, '{}', true);
insert into public.staff_branches values
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-0000000000b1'),
  ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-0000000000b1'),
  ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-0000000000b1'),
  ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-0000000000b2');

insert into public.delivery_zones (branch_id, name, geom, delivery_fee, min_order) values
  ('a0000000-0000-0000-0000-0000000000b1', 'TEST zone',
   extensions.st_setsrid(extensions.st_geomfromtext('POLYGON((30.9 29.9, 31.1 29.9, 31.1 30.1, 30.9 30.1, 30.9 29.9))'), 4326), 30, 100);

insert into public.categories (id, name_en) values ('a0000000-0000-0000-0000-0000000000c1', 'TEST category');
insert into public.products (id, category_id, name_en, base_price, is_published) values
  ('a0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000c1', 'TEST Burger', 100, true),
  ('a0000000-0000-0000-0000-0000000000d2', 'a0000000-0000-0000-0000-0000000000c1', 'TEST Fries', 40, true),
  ('a0000000-0000-0000-0000-0000000000d3', 'a0000000-0000-0000-0000-0000000000c1', 'TEST Hidden', 10, false),
  ('a0000000-0000-0000-0000-0000000000d4', 'a0000000-0000-0000-0000-0000000000c1', 'TEST Other', 10, true);
insert into public.option_groups (id, product_id, name_en, is_required, min_select, max_select) values
  ('a0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000d1', 'Patty', true, 1, 1),
  ('a0000000-0000-0000-0000-0000000000e2', 'a0000000-0000-0000-0000-0000000000d1', 'Extras', false, 0, 2),
  ('a0000000-0000-0000-0000-0000000000e3', 'a0000000-0000-0000-0000-0000000000d4', 'Foreign', false, 0, 1);
insert into public.options (id, group_id, name_en, price_delta, is_available) values
  ('a0000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-0000000000e1', 'Single', 0, true),
  ('a0000000-0000-0000-0000-0000000000f2', 'a0000000-0000-0000-0000-0000000000e1', 'Double', 50, true),
  ('a0000000-0000-0000-0000-0000000000f3', 'a0000000-0000-0000-0000-0000000000e2', 'Cheese', 10, true),
  ('a0000000-0000-0000-0000-0000000000f4', 'a0000000-0000-0000-0000-0000000000e2', 'Bacon', 20, true),
  ('a0000000-0000-0000-0000-0000000000f5', 'a0000000-0000-0000-0000-0000000000e2', 'Sauce', 5, true),
  ('a0000000-0000-0000-0000-0000000000f6', 'a0000000-0000-0000-0000-0000000000e3', 'Foreign option', 1, true),
  ('a0000000-0000-0000-0000-0000000000f7', 'a0000000-0000-0000-0000-0000000000e2', 'Sold out', 1, false);
insert into public.promotions (code, discount_type, discount_value, min_order, usage_limit, ends_at, product_ids) values
  ('T10', 'percentage', 10, 100, 2, null, null),
  ('TPAST', 'fixed', 5, 0, null, now() - interval '1 day', null),
  ('TFRIES', 'percentage', 50, 0, null, null, array['a0000000-0000-0000-0000-0000000000d2']::uuid[]);

-- ---------------------------------------------------------------- 1. pricing, options, zones, promos, idempotency
do $$
declare
  b1 constant uuid := 'a0000000-0000-0000-0000-0000000000b1';
  burger constant uuid := 'a0000000-0000-0000-0000-0000000000d1';
  fries constant uuid := 'a0000000-0000-0000-0000-0000000000d2';
  hidden constant uuid := 'a0000000-0000-0000-0000-0000000000d3';
  single constant uuid := 'a0000000-0000-0000-0000-0000000000f1';
  dbl constant uuid := 'a0000000-0000-0000-0000-0000000000f2';
  cheese constant uuid := 'a0000000-0000-0000-0000-0000000000f3';
  bacon constant uuid := 'a0000000-0000-0000-0000-0000000000f4';
  sauce constant uuid := 'a0000000-0000-0000-0000-0000000000f5';
  foreign_opt constant uuid := 'a0000000-0000-0000-0000-0000000000f6';
  soldout constant uuid := 'a0000000-0000-0000-0000-0000000000f7';
  addr constant jsonb := '{"address_line":"Test street 1","lat":30.0,"lng":31.0}';
  far constant jsonb := '{"address_line":"Far away","lat":31.5,"lng":31.0}';
  r jsonb; r2 jsonb; one_burger jsonb;
begin
  reset role; perform pg_temp.as_user(null);
  one_burger := jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 1, 'option_ids', jsonb_build_array(single)));

  -- delivery: (100 + 50 + 10) x 2 = 320, fee 30
  r := public.create_order(b1, 'delivery', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 2, 'option_ids', jsonb_build_array(dbl, cheese))),
                           'Test', '+201000000001', 'cash', 'rules-price-0001', addr);
  assert (r->>'total')::numeric = 350, 'delivery total should be 350, got ' || (r->>'total');
  assert r->>'status' = 'pending', 'new orders start pending';
  assert r->>'guest_token' is not null, 'guest orders get a token';

  -- same key again returns the same order and no second row
  r2 := public.create_order(b1, 'delivery', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 2, 'option_ids', jsonb_build_array(dbl, cheese))),
                            'Test', '+201000000001', 'cash', 'rules-price-0001', addr);
  assert (r2->>'duplicate')::boolean and r2->>'order_id' = r->>'order_id', 'duplicate key returns the original order';

  -- client prices are ignored: a tampered price field changes nothing
  r := public.create_order(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', fries, 'quantity', 3, 'price', 1, 'unit_price', 1)),
                           'Test', '+201000000002', 'cash', 'rules-price-0002');
  assert (r->>'total')::numeric = 120, 'pickup fries x3 should be 120, got ' || (r->>'total');

  -- promo: 10% of 320 = 32, plus fee 30 = 318
  r := public.create_order(b1, 'delivery', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 2, 'option_ids', jsonb_build_array(dbl, cheese))),
                           'Test', '+201000000003', 'cash', 'rules-promo-0001', addr, 't10');
  assert (r->>'total')::numeric = 318, 'promo total should be 318, got ' || (r->>'total');
  -- product-restricted promo applies only to eligible lines: 50% of 120 fries = 60
  r := public.create_order(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', fries, 'quantity', 3), jsonb_build_object('product_id', burger, 'quantity', 1, 'option_ids', jsonb_build_array(single))),
                           'Test', '+201000000004', 'cash', 'rules-promo-0002', null, 'TFRIES');
  assert (r->>'total')::numeric = 160, 'restricted promo should discount fries only (220 - 60 = 160), got ' || (r->>'total');
  -- usage limit of 2: T10 used once above, once more is fine, third is refused
  perform public.create_order(b1, 'delivery', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 2, 'option_ids', jsonb_build_array(single))),
                              'Test', '+201000000005', 'cash', 'rules-promo-0003', addr, 'T10');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'delivery', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 2, 'option_ids', jsonb_build_array(single))), '+201000000006', 'cash', 'rules-promo-0004', addr, 'T10'), '%fully used%');

  -- refusals
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', hidden, 'quantity', 1)), '+201000000007', 'cash', 'rules-bad-0001'), '%product unavailable%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 1, 'option_ids', jsonb_build_array(foreign_opt))), '+201000000007', 'cash', 'rules-bad-0002'), '%invalid or unavailable option%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 1, 'option_ids', jsonb_build_array(single, soldout))), '+201000000007', 'cash', 'rules-bad-0003'), '%invalid or unavailable option%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 1)), '+201000000007', 'cash', 'rules-bad-0004'), '%choose the right number%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', burger, 'quantity', 1, 'option_ids', jsonb_build_array(single, cheese, bacon, sauce))), '+201000000007', 'cash', 'rules-bad-0005'), '%choose the right number%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', fries, 'quantity', 0)), '+201000000007', 'cash', 'rules-bad-0006'), '%invalid quantity%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', jsonb_build_array(jsonb_build_object('product_id', fries, 'quantity', 51)), '+201000000007', 'cash', 'rules-bad-0007'), '%invalid quantity%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', '[]'::jsonb, '+201000000007', 'cash', 'rules-bad-0008'), '%cart must contain%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'delivery', one_burger, '+201000000007', 'cash', 'rules-bad-0009', far), '%outside this branch delivery area%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'delivery', jsonb_build_array(jsonb_build_object('product_id', fries, 'quantity', 1)), '+201000000007', 'cash', 'rules-bad-0010', addr), '%minimum order for this area%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'delivery', one_burger, '+201000000007', 'cash', 'rules-bad-0011'), '%delivery address with location is required%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', one_burger, '+201000000007', 'card', 'rules-bad-0012'), '%card payment is not enabled%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', one_burger, '+201000000007', 'cash', 'rules-bad-0013', null, 'NOPE'), '%promo code is not valid%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', one_burger, '+201000000007', 'cash', 'rules-bad-0014', null, 'TPAST'), '%promo code is not valid%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', one_burger, '+201000000007', 'cash', 'rules-bad-0015', null, 'TFRIES'), '%does not apply%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', one_burger, 'abc', 'cash', 'rules-bad-0016'), '%valid phone number%');
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', one_burger, '+201000000007', 'cash', 'short'), '%idempotency key%');
  perform pg_temp.fails(pg_temp.order_sql('a0000000-0000-0000-0000-00000000dead', 'pickup', one_burger, '+201000000007', 'cash', 'rules-bad-0017'), '%branch not available%');
end $$;

-- ---------------------------------------------------------------- 2. opening hours and rate limits
do $$
declare
  b1 constant uuid := 'a0000000-0000-0000-0000-0000000000b1';
  fries constant uuid := 'a0000000-0000-0000-0000-0000000000d2';
  items constant jsonb := jsonb_build_array(jsonb_build_object('product_id', 'a0000000-0000-0000-0000-0000000000d2', 'quantity', 1));
  i int; ip text;
begin
  reset role;
  update public.branches set opening_hours = '{"zzz":{"open":"10:00","close":"22:00"}}' where id = b1;
  perform pg_temp.as_user(null);
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', items, '+201100000001', 'cash', 'rules-hours-0001'), '%closed right now%');
  reset role;
  update public.branches set opening_hours = '{}' where id = b1;

  -- five orders per phone per hour, the sixth is refused, another phone still works
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.9, 10.0.0.1"}', true);
  perform pg_temp.as_user(null);
  for i in 1..5 loop
    perform public.create_order(b1, 'pickup', items, 'Test', '+201199999999', 'cash', 'rules-rate-000' || i);
  end loop;
  perform pg_temp.fails(pg_temp.order_sql(b1, 'pickup', items, '+201199999999', 'cash', 'rules-rate-0006'), '%too many orders from this phone%');
  perform public.create_order(b1, 'pickup', items, 'Test', '+201188888888', 'cash', 'rules-rate-0007');
  reset role;
  select client_ip into ip from public.orders where idempotency_key = 'rules-rate-0007';
  assert ip = '203.0.113.9', 'client ip comes from the first x-forwarded-for entry, got ' || coalesce(ip, 'null');
end $$;

-- ---------------------------------------------------------------- 3. who can see and change what
do $$
declare
  b1 constant uuid := 'a0000000-0000-0000-0000-0000000000b1';
  items constant jsonb := jsonb_build_array(jsonb_build_object('product_id', 'a0000000-0000-0000-0000-0000000000d2', 'quantity', 2, 'notes', 'no salt'));
  owner_id constant uuid := 'a0000000-0000-0000-0000-000000000001';
  manager constant uuid := 'a0000000-0000-0000-0000-000000000002';
  cashier constant uuid := 'a0000000-0000-0000-0000-000000000003';
  kitchen constant uuid := 'a0000000-0000-0000-0000-000000000004';
  other_cashier constant uuid := 'a0000000-0000-0000-0000-000000000005';
  customer constant uuid := 'a0000000-0000-0000-0000-000000000006';
  r jsonb; oid uuid; g jsonb; q jsonb; n int; tok text; rows_changed int;
begin
  -- guest order and token access
  reset role; perform pg_temp.as_user(null);
  g := public.create_order(b1, 'pickup', items, 'Guest Person', '+201200000001', 'cash', 'rules-perm-guest');
  tok := g->>'guest_token';
  assert public.get_guest_order((g->>'order_id')::uuid, tok) is not null, 'guest can read their order with the token';
  assert public.get_guest_order((g->>'order_id')::uuid, 'wrong') is null, 'wrong token reads nothing';
  select count(*) into n from public.orders; assert n = 0, 'anonymous users read no orders directly';
  perform pg_temp.fails(format('select public.update_order_status(%L, ''confirmed'')', g->>'order_id'), '%permission denied%');

  -- signed-in customer
  reset role; perform pg_temp.as_user(customer);
  r := public.create_order(b1, 'pickup', items, 'Zed Customer', '+201200000002', 'cash', 'rules-perm-cust');
  oid := (r->>'order_id')::uuid;
  assert r->>'guest_token' is null, 'signed-in orders need no guest token';
  select count(*) into n from public.orders; assert n = 1, 'customer sees only their own order, saw ' || n;
  perform pg_temp.fails(format('update public.profiles set role = ''owner'' where id = %L', customer), '%permission denied%');
  perform pg_temp.fails(format('select public.update_order_status(%L, ''confirmed'')', oid), '%not allowed%');
  update public.profiles set full_name = 'Zed C' where id = customer; get diagnostics rows_changed = row_count;
  assert rows_changed = 1, 'customer can edit their own name';

  -- branch isolation
  reset role; perform pg_temp.as_user(other_cashier);
  select count(*) into n from public.orders; assert n = 0, 'cashier of another branch sees nothing, saw ' || n;
  perform pg_temp.fails(format('select public.update_order_status(%L, ''confirmed'')', oid), '%not allowed%');

  -- kitchen cannot read customers directly
  reset role; perform pg_temp.as_user(kitchen);
  select count(*) into n from public.orders; assert n = 0, 'kitchen reads no orders directly';
  select count(*) into n from public.order_items; assert n = 0, 'kitchen reads no order items directly';
  perform pg_temp.fails(format('select public.update_order_status(%L, ''confirmed'')', oid), '%kitchen staff cannot%');

  -- the status flow
  reset role; perform pg_temp.as_user(cashier);
  perform pg_temp.fails(format('select public.update_order_status(%L, ''completed'')', oid), '%invalid transition%');
  perform pg_temp.fails(format('select public.update_order_status(%L, ''rejected'')', oid), '%reason is required%');
  perform public.update_order_status(oid, 'confirmed');

  reset role; perform pg_temp.as_user(kitchen);
  q := public.kitchen_queue();
  assert q::text like '%' || oid::text || '%', 'kitchen queue lists the confirmed order';
  assert position('Zed' in q::text) = 0 and position('+2012' in q::text) = 0, 'kitchen queue hides customer name and phone';
  assert q::text like '%no salt%', 'kitchen queue keeps item notes';
  perform public.update_order_status(oid, 'preparing');
  perform public.update_order_status(oid, 'ready_for_pickup');
  perform pg_temp.fails(format('select public.update_order_status(%L, ''completed'')', oid), '%kitchen staff cannot%');
  perform pg_temp.fails(format('select public.update_order_status(%L, ''out_for_delivery'')', oid), '%invalid transition%');

  reset role; perform pg_temp.as_user(cashier);
  perform public.update_order_status(oid, 'completed');
  perform pg_temp.fails(format('select public.update_order_status(%L, ''cancelled'', ''late'')', oid), '%invalid transition%');

  reset role;
  select count(*) into n from public.order_status_history where order_id = oid;
  assert n = 5, 'history records every step (expected 5), got ' || n;
  select count(*) into n from public.audit_logs where entity = 'order' and entity_id = oid;
  assert n = 4, 'audit log records every staff change (expected 4), got ' || n;

  -- rejection with a reason
  reset role; perform pg_temp.as_user(null);
  g := public.create_order(b1, 'pickup', items, 'Guest Person', '+201200000003', 'cash', 'rules-perm-reject');
  reset role; perform pg_temp.as_user(manager);
  perform public.update_order_status((g->>'order_id')::uuid, 'rejected', 'out of stock');
  reset role;
  assert (select rejection_reason from public.orders where id = (g->>'order_id')::uuid) = 'out of stock', 'rejection reason is stored';
end $$;

-- ---------------------------------------------------------------- 4. menu, zones, staff, reports, audit
do $$
declare
  b1 constant uuid := 'a0000000-0000-0000-0000-0000000000b1';
  fries constant uuid := 'a0000000-0000-0000-0000-0000000000d2';
  owner_id constant uuid := 'a0000000-0000-0000-0000-000000000001';
  manager constant uuid := 'a0000000-0000-0000-0000-000000000002';
  cashier constant uuid := 'a0000000-0000-0000-0000-000000000003';
  kitchen constant uuid := 'a0000000-0000-0000-0000-000000000004';
  other_cashier constant uuid := 'a0000000-0000-0000-0000-000000000005';
  poly constant jsonb := '{"type":"Polygon","coordinates":[[[30.9,29.9],[31.1,29.9],[31.1,30.1],[30.9,30.1],[30.9,29.9]]]}';
  bowtie constant jsonb := '{"type":"Polygon","coordinates":[[[0,0],[1,1],[1,0],[0,1],[0,0]]]}';
  rep jsonb; expected numeric; n int; rows_changed int;
begin
  -- price changes: owner only, and audited
  reset role; perform pg_temp.as_user(cashier);
  update public.products set base_price = 1 where id = fries; get diagnostics rows_changed = row_count;
  assert rows_changed = 0, 'cashier cannot change prices';
  reset role; perform pg_temp.as_user(manager);
  update public.products set base_price = 1 where id = fries; get diagnostics rows_changed = row_count;
  assert rows_changed = 0, 'manager cannot change base prices';
  perform pg_temp.fails(format('insert into public.option_groups (product_id, name_en) values (%L, ''X'')', fries), '%row-level security%');
  insert into public.branch_product_settings (branch_id, product_id, is_available, price_override) values (b1, fries, false, 99);
  reset role; perform pg_temp.as_user(cashier);
  perform pg_temp.fails(format('insert into public.branch_product_settings (branch_id, product_id, is_available) values (%L, %L, false)', 'a0000000-0000-0000-0000-0000000000b1', fries), '%row-level security%');
  reset role; perform pg_temp.as_user(owner_id);
  update public.products set base_price = 41 where id = fries; get diagnostics rows_changed = row_count;
  assert rows_changed = 1, 'owner can change prices';
  reset role;
  select count(*) into n from public.audit_logs where action = 'product_change' and entity_id = fries;
  assert n = 1, 'price change is audited, rows: ' || n;

  -- photo uploads
  reset role; perform pg_temp.as_user(owner_id);
  insert into storage.objects (bucket_id, name, owner_id) values ('product-images', 'rules/owner.webp', owner_id::text);
  reset role; perform pg_temp.as_user(cashier);
  perform pg_temp.fails($q$insert into storage.objects (bucket_id, name, owner_id) values ('product-images', 'rules/cashier.webp', 'x')$q$, '%row-level security%');

  -- delivery zones
  reset role; perform pg_temp.as_user(owner_id);
  perform public.save_zone(null, b1, 'Second zone', poly, 25, 80, true);
  perform pg_temp.fails(format('select public.save_zone(null, %L, ''Bad'', %L::jsonb, 10, 0, true)', b1, bowtie), '%not valid%');
  perform pg_temp.fails(format('select public.save_zone(null, %L, ''Bad'', %L::jsonb, 10, 0, true)', b1, '{"type":"Point","coordinates":[1,1]}'), '%single polygon%');
  perform pg_temp.fails(format('select public.save_zone(null, %L, ''Neg'', %L::jsonb, -1, 0, true)', b1, poly), '%cannot be negative%');
  reset role; perform pg_temp.as_user(manager);
  perform pg_temp.fails(format('select public.save_zone(null, %L, ''X'', %L::jsonb, 1, 1, true)', b1, poly), '%only the owner%');

  -- staff management
  reset role; perform pg_temp.as_user(owner_id);
  perform public.set_staff_role('a0000000-0000-0000-0000-000000000006@test.invalid', 'kitchen', array[b1]);
  assert (select role from public.profiles where id = 'a0000000-0000-0000-0000-000000000006') = 'kitchen', 'owner can give a role';
  perform pg_temp.fails($q$select public.set_staff_role('a0000000-0000-0000-0000-000000000006@test.invalid', 'cashier', '{}')$q$, '%at least one branch%');
  perform pg_temp.fails($q$select public.set_staff_role('nobody@test.invalid', 'cashier', array['a0000000-0000-0000-0000-0000000000b1']::uuid[])$q$, '%No account with that email%');
  perform pg_temp.fails(format('select public.set_staff_role(%L, ''cashier'', array[%L]::uuid[])', owner_id || '@test.invalid', b1), '%cannot remove your own owner role%');
  assert jsonb_array_length(public.list_staff()) >= 5, 'owner lists staff';
  reset role; perform pg_temp.as_user(manager);
  perform pg_temp.fails($q$select public.set_staff_role('a0000000-0000-0000-0000-000000000006@test.invalid', 'owner', '{}')$q$, '%only the owner%');
  assert jsonb_array_length(public.list_staff()) = 0, 'non-owners list no staff';
  reset role;
  select count(*) into n from public.audit_logs where action = 'permission_change';
  assert n >= 1, 'role changes are audited';

  -- reports
  reset role;
  select coalesce(sum(total), 0) into expected from public.orders
    where branch_id = b1 and status not in ('rejected', 'cancelled');
  perform pg_temp.as_user(manager);
  rep := public.sales_report(now() - interval '1 day', now() + interval '1 day', b1);
  assert (rep->>'gross')::numeric = expected, format('report gross %s should equal the order totals %s', rep->>'gross', expected);
  assert (rep->>'rejected')::int = 1, 'report counts the rejected order';
  assert (rep->>'orders')::int = (rep->>'valid_orders')::int + 1, 'rejected orders are not in valid orders';
  reset role; perform pg_temp.as_user(other_cashier);
  rep := public.sales_report(now() - interval '1 day', now() + interval '1 day', b1);
  assert (rep->>'orders')::int = 0, 'another branch sees none of this branch in reports';
  reset role; perform pg_temp.as_user(kitchen);
  perform pg_temp.fails($q$select public.sales_report(now() - interval '1 day', now() + interval '1 day')$q$, '%not allowed%');
  reset role; perform pg_temp.as_user(manager);
  select count(*) into n from public.audit_logs; assert n = 0, 'only the owner reads the audit log, manager saw ' || n;
  reset role; perform pg_temp.as_user(owner_id);
  select count(*) into n from public.audit_logs; assert n > 0, 'owner reads the audit log';
end $$;

-- ---------------------------------------------------------------- 5. Smash Card reward (11th order free)
do $$
declare
  b1 constant uuid := 'a0000000-0000-0000-0000-0000000000b1';
  fries constant uuid := 'a0000000-0000-0000-0000-0000000000d2';
  cust constant uuid := 'a0000000-0000-0000-0000-000000000006';
  items constant jsonb := jsonb_build_array(jsonb_build_object('product_id', 'a0000000-0000-0000-0000-0000000000d2', 'quantity', 3));
  r jsonb; loyalty jsonb; base int;
begin
  reset role;
  update public.app_settings set value = '50' where key = 'loyalty.reward_cap';
  -- Earlier sections already completed some of this customer's orders, so top up to exactly nine.
  select count(*) into base from public.orders where user_id = cust and status = 'completed';
  -- Seed the rest directly. Triggers are off only for the seed so status rules and rate limits do not apply to fixtures.
  set local session_replication_role = replica;
  insert into public.orders (user_id, customer_name, customer_phone, branch_id, method, subtotal, total, payment_method, status, idempotency_key)
    select cust, 'Seed', '+201900000001', b1, 'pickup'::public.fulfillment_method, 40, 40, 'cash'::public.payment_method, 'completed'::public.order_status, 'loy-seed-' || g
    from generate_series(1, 9 - base) g;
  set local session_replication_role = origin;

  perform pg_temp.as_user(cust);
  loyalty := public.my_loyalty();
  assert (loyalty->>'completed')::int = 9 and not (loyalty->>'reward_pending')::boolean, 'nine stamps, nothing pending';
  perform pg_temp.fails($q$select public.create_order('a0000000-0000-0000-0000-0000000000b1', 'pickup', '[{"product_id":"a0000000-0000-0000-0000-0000000000d2","quantity":3}]'::jsonb, 'T', '+201900000002', 'cash', 'loy-early-0001', null, null, null, true)$q$, '%no reward available%');

  -- the tenth completed order unlocks the reward
  reset role;
  set local session_replication_role = replica;
  insert into public.orders (user_id, customer_name, customer_phone, branch_id, method, subtotal, total, payment_method, status, idempotency_key)
    values (cust, 'Seed', '+201900000001', b1, 'pickup', 40, 40, 'cash', 'completed', 'loy-seed-10');
  set local session_replication_role = origin;
  perform pg_temp.as_user(cust);

  perform pg_temp.fails($q$select public.create_order('a0000000-0000-0000-0000-0000000000b1', 'pickup', '[{"product_id":"a0000000-0000-0000-0000-0000000000d2","quantity":3}]'::jsonb, 'T', '+201900000003', 'cash', 'loy-promo-0001', null, 'T10', null, true)$q$, '%cannot be combined%');

  -- fries x3 = 120, reward cap 50: discount 50, total 70
  r := public.create_order(b1, 'pickup', items, 'T', '+201900000004', 'cash', 'loy-reward-0001', null, null, null, true);
  assert (r->>'total')::numeric = 70, 'reward should discount up to the cap (120 - 50 = 70), got ' || (r->>'total');
  assert (public.my_loyalty()->>'reward_pending')::boolean, 'reward shows as pending once used';
  perform pg_temp.fails($q$select public.create_order('a0000000-0000-0000-0000-0000000000b1', 'pickup', '[{"product_id":"a0000000-0000-0000-0000-0000000000d2","quantity":3}]'::jsonb, 'T', '+201900000005', 'cash', 'loy-reward-0002', null, null, null, true)$q$, '%already being used%');

  -- a guest cannot use a reward
  reset role; perform pg_temp.as_user(null);
  perform pg_temp.fails($q$select public.create_order('a0000000-0000-0000-0000-0000000000b1', 'pickup', '[{"product_id":"a0000000-0000-0000-0000-0000000000d2","quantity":3}]'::jsonb, 'T', '+201900000006', 'cash', 'loy-guest-0001', null, null, null, true)$q$, '%sign in%');

  -- once the reward order completes the card resets (11 completed orders)
  reset role;
  set local session_replication_role = replica;
  update public.orders set status = 'completed' where id = (r->>'order_id')::uuid;
  set local session_replication_role = origin;
  perform pg_temp.as_user(cust);
  perform pg_temp.fails($q$select public.create_order('a0000000-0000-0000-0000-0000000000b1', 'pickup', '[{"product_id":"a0000000-0000-0000-0000-0000000000d2","quantity":3}]'::jsonb, 'T', '+201900000007', 'cash', 'loy-reset-0001', null, null, null, true)$q$, '%no reward available%');
end $$;

select 'PASS: all business rule checks' as result;
rollback;
