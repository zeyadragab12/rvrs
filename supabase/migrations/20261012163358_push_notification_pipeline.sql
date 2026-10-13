
create extension if not exists pg_net with schema extensions;

-- one row per status change that has been pushed, so retries and duplicate calls never send twice
create table public.notification_log (
  history_id uuid primary key references public.order_status_history(id) on delete cascade,
  sent_at timestamptz not null default now(),
  result jsonb
);
alter table public.notification_log enable row level security;
-- no policies: only the service role (the edge function) touches this table

-- shared secret between the database trigger and the edge function. Generated inside the database and never shown.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_webhook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_webhook_secret', 'Authenticates the order status trigger to the notify-order-status function');
  end if;
end $$;

create function public.push_webhook_secret() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret'
$$;
revoke execute on function public.push_webhook_secret() from public, anon, authenticated;
grant execute on function public.push_webhook_secret() to service_role;

-- NOTE: the URL below is this project's function URL. Change the project ref for staging and production.
create function private.notify_status_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform net.http_post(
      url := 'https://jcofxaqihxydzlocvxee.supabase.co/functions/v1/notify-order-status',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret')),
      body := jsonb_build_object('history_id', new.id)
    );
  exception when others then
    -- a notification problem must never block an order or a status change
    null;
  end;
  return new;
end $$;
create trigger t_notify_status_change after insert on public.order_status_history
  for each row execute function private.notify_status_change();
