
-- Kitchen staff must not read customer details: remove them from direct order access and give them a limited queue function.
drop policy orders_read on public.orders;
create policy orders_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (private.can_access_branch(branch_id) and private.my_role() <> 'kitchen'));
drop policy order_items_read on public.order_items;
create policy order_items_read on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id
          and (o.user_id = (select auth.uid()) or (private.can_access_branch(o.branch_id) and private.my_role() <> 'kitchen'))));
drop policy history_read on public.order_status_history;
create policy history_read on public.order_status_history for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id
          and (o.user_id = (select auth.uid()) or (private.can_access_branch(o.branch_id) and private.my_role() <> 'kitchen'))));

create function public.kitchen_queue() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'status', o.status, 'method', o.method,
    'created_at', o.created_at, 'notes', o.notes,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'name', i.product_name, 'quantity', i.quantity,
                'options', (select coalesce(jsonb_agg(jsonb_build_object('name', x->>'name')), '[]'::jsonb) from jsonb_array_elements(i.options) x),
                'notes', i.notes)), '[]'::jsonb) from public.order_items i where i.order_id = o.id)
  ) order by o.created_at), '[]'::jsonb)
  from public.orders o
  where o.status in ('confirmed','preparing') and private.is_staff() and private.can_access_branch(o.branch_id)
$$;
revoke execute on function public.kitchen_queue() from public, anon;
grant execute on function public.kitchen_queue() to authenticated;

-- audit trail for price, availability and permission changes
create function private.audit_product_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.base_price is distinct from old.base_price or new.is_available is distinct from old.is_available
     or new.is_archived is distinct from old.is_archived or new.is_published is distinct from old.is_published then
    insert into public.audit_logs (actor_id, action, entity, entity_id, details) values (
      (select auth.uid()), 'product_change', 'product', new.id,
      jsonb_build_object('name', new.name_en,
        'base_price', jsonb_build_array(old.base_price, new.base_price),
        'is_available', jsonb_build_array(old.is_available, new.is_available),
        'is_archived', jsonb_build_array(old.is_archived, new.is_archived),
        'is_published', jsonb_build_array(old.is_published, new.is_published)));
  end if;
  return new;
end $$;
create trigger t_audit_products after update on public.products for each row execute function private.audit_product_change();

create function private.audit_role_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
    insert into public.audit_logs (actor_id, action, entity, entity_id, details) values (
      (select auth.uid()), 'permission_change', 'profile', new.id,
      jsonb_build_object('role', jsonb_build_array(old.role, new.role), 'is_active', jsonb_build_array(old.is_active, new.is_active)));
  end if;
  return new;
end $$;
create trigger t_audit_roles after update on public.profiles for each row execute function private.audit_role_change();
