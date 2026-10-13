-- The Smash Card also reports orders still in progress, so the app can show a pending stamp straight after ordering.
-- A pending stamp becomes a real one only when the order is completed, so staff stay in control of what counts.
-- Reward orders are excluded: they spend the card rather than add to it.
create or replace function public.my_loyalty() returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (select count(*)::int as done from public.orders where user_id = (select auth.uid()) and status = 'completed')
  select jsonb_build_object(
    'completed', c.done,
    'in_progress', (select count(*)::int from public.orders
                    where user_id = (select auth.uid()) and not loyalty_reward
                      and status not in ('completed', 'rejected', 'cancelled')),
    'reward_pending', exists (select 1 from public.orders where user_id = (select auth.uid()) and loyalty_reward
                              and status not in ('completed', 'rejected', 'cancelled')),
    'reward_cap', coalesce((select (value)::text::numeric from public.app_settings where key = 'loyalty.reward_cap'), 200))
  from c
$$;
