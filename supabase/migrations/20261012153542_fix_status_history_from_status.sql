
create or replace function public.update_order_status(p_order_id uuid, p_to public.order_status, p_reason text default null)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  prev public.order_status;
  r public.user_role := private.my_role();
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or r is null or r = 'customer' or not private.can_access_branch(o.branch_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  prev := o.status;
  if not private.transition_allowed(o.method, prev, p_to) then
    raise exception 'invalid transition % -> %', prev, p_to using errcode = '22023';
  end if;
  if r = 'kitchen' and not (prev in ('confirmed','preparing') and p_to in ('preparing','ready_for_pickup','out_for_delivery')) then
    raise exception 'kitchen staff cannot make this change' using errcode = '42501';
  end if;
  if p_to in ('rejected','cancelled') and coalesce(btrim(p_reason),'') = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  update public.orders set status = p_to,
    rejection_reason = case when p_to in ('rejected','cancelled') then p_reason else rejection_reason end
    where id = p_order_id returning * into o;
  insert into public.order_status_history (order_id, from_status, to_status, actor_id, reason)
    values (p_order_id, prev, p_to, (select auth.uid()), p_reason);
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
    values ((select auth.uid()), 'order_status', 'order', p_order_id, jsonb_build_object('from', prev, 'to', p_to, 'reason', p_reason));
  return o;
end $$;
