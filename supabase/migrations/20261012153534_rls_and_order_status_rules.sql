
-- helpers (private schema is not exposed through the API)
create function private.my_role() returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and is_active
$$;
create function private.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() in ('owner','branch_manager','cashier','kitchen'), false)
$$;
create function private.can_access_branch(b uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when private.my_role() = 'owner' then true
    when private.my_role() in ('branch_manager','cashier','kitchen') then
      exists (select 1 from public.staff_branches sb where sb.user_id = (select auth.uid()) and sb.branch_id = b)
    else false end
$$;
grant usage on schema private to authenticated;
grant execute on function private.my_role(), private.is_staff(), private.can_access_branch(uuid) to authenticated;

-- enable RLS everywhere
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.staff_branches enable row level security;
alter table public.branch_closures enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.branch_product_settings enable row level security;
alter table public.promotions enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.device_tokens enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: own row, only safe columns editable; owner reads all
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.my_role() = 'owner');
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name, phone, locale, notification_prefs) on public.profiles to authenticated;

-- public menu data
create policy branches_read on public.branches for select to anon, authenticated
  using (is_active or private.can_access_branch(id));
create policy zones_read on public.delivery_zones for select to anon, authenticated using (is_active);
create policy closures_read on public.branch_closures for select to anon, authenticated using (true);
create policy categories_read on public.categories for select to anon, authenticated using (is_active);
create policy products_read on public.products for select to anon, authenticated
  using ((is_published and not is_archived) or private.is_staff());
create policy option_groups_read on public.option_groups for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id and ((p.is_published and not p.is_archived) or private.is_staff())));
create policy options_read on public.options for select to anon, authenticated using (
  exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id
          where g.id = group_id and ((p.is_published and not p.is_archived) or private.is_staff())));
create policy bps_read on public.branch_product_settings for select to anon, authenticated using (true);

-- staff menu/branch management (owner everywhere; managers within their branches)
create policy branches_write on public.branches for all to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');
create policy zones_write on public.delivery_zones for all to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');
create policy zones_staff_read on public.delivery_zones for select to authenticated using (private.can_access_branch(branch_id));
create policy closures_write on public.branch_closures for all to authenticated
  using (private.can_access_branch(branch_id) and private.my_role() in ('owner','branch_manager'))
  with check (private.can_access_branch(branch_id) and private.my_role() in ('owner','branch_manager'));
create policy categories_write on public.categories for all to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');
create policy products_write on public.products for all to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');
create policy option_groups_write on public.option_groups for all to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');
create policy options_write on public.options for all to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');
create policy bps_write on public.branch_product_settings for all to authenticated
  using (private.can_access_branch(branch_id) and private.my_role() in ('owner','branch_manager'))
  with check (private.can_access_branch(branch_id) and private.my_role() in ('owner','branch_manager'));
create policy promotions_staff on public.promotions for all to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');
create policy staff_branches_read on public.staff_branches for select to authenticated
  using (user_id = (select auth.uid()) or private.my_role() = 'owner');
create policy staff_branches_write on public.staff_branches for all to authenticated
  using (private.my_role() = 'owner') with check (private.my_role() = 'owner');

-- customer-owned data
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy device_tokens_own on public.device_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- orders: read only. All writes go through security-definer functions or Edge Functions (service role).
create policy orders_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or private.can_access_branch(branch_id));
create policy order_items_read on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id
          and (o.user_id = (select auth.uid()) or private.can_access_branch(o.branch_id))));
create policy history_read on public.order_status_history for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id
          and (o.user_id = (select auth.uid()) or private.can_access_branch(o.branch_id))));
create policy payments_read on public.payments for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id
          and (o.user_id = (select auth.uid())
               or (private.can_access_branch(o.branch_id) and private.my_role() in ('owner','branch_manager','cashier')))));
create policy audit_read on public.audit_logs for select to authenticated using (private.my_role() = 'owner');
-- payment_events: no policies, service role only

-- central order status transition rules
create function private.transition_allowed(m public.fulfillment_method, f public.order_status, t public.order_status)
returns boolean language sql immutable set search_path = '' as $$
  select case f
    when 'pending' then t in ('confirmed','rejected','cancelled')
    when 'confirmed' then t in ('preparing','cancelled')
    when 'preparing' then (m = 'pickup' and t = 'ready_for_pickup') or (m = 'delivery' and t = 'out_for_delivery') or t = 'cancelled'
    when 'ready_for_pickup' then t in ('completed','cancelled')
    when 'out_for_delivery' then t in ('completed','cancelled')
    else false end
$$;

create function public.update_order_status(p_order_id uuid, p_to public.order_status, p_reason text default null)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  r public.user_role := private.my_role();
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or r is null or r = 'customer' or not private.can_access_branch(o.branch_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not private.transition_allowed(o.method, o.status, p_to) then
    raise exception 'invalid transition % -> %', o.status, p_to using errcode = '22023';
  end if;
  if r = 'kitchen' and not (o.status in ('confirmed','preparing') and p_to in ('preparing','ready_for_pickup','out_for_delivery')) then
    raise exception 'kitchen staff cannot make this change' using errcode = '42501';
  end if;
  if p_to in ('rejected','cancelled') and coalesce(btrim(p_reason),'') = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  update public.orders set status = p_to,
    rejection_reason = case when p_to in ('rejected','cancelled') then p_reason else rejection_reason end
    where id = p_order_id returning * into o;
  insert into public.order_status_history (order_id, from_status, to_status, actor_id, reason)
    values (p_order_id, (select status from public.orders where false), p_to, (select auth.uid()), p_reason);
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
    values ((select auth.uid()), 'order_status', 'order', p_order_id, jsonb_build_object('to', p_to, 'reason', p_reason));
  return o;
end $$;
revoke execute on function public.update_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;

-- live order updates
alter publication supabase_realtime add table public.orders;
