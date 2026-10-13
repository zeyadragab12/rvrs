
alter table public.orders add column client_ip text;
create index orders_phone_recent on public.orders (customer_phone, created_at desc);
create index orders_ip_recent on public.orders (client_ip, created_at desc) where client_ip is not null;

-- Guest ordering is open, so cap how fast one phone number or one network can place orders.
create function private.enforce_order_rate_limit() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  raw text := nullif(current_setting('request.headers', true), '');
  fwd text;
  by_phone int;
  by_ip int;
begin
  if raw is not null then
    begin
      fwd := btrim(split_part(coalesce(raw::json ->> 'x-forwarded-for', ''), ',', 1));
    exception when others then
      fwd := null;
    end;
  end if;
  new.client_ip := nullif(fwd, '');

  select count(*) into by_phone from public.orders where customer_phone = new.customer_phone and created_at > now() - interval '1 hour';
  if by_phone >= 5 then
    raise exception 'too many orders from this phone number. Please try again later or call the restaurant' using errcode = '22023';
  end if;
  if new.client_ip is not null then
    select count(*) into by_ip from public.orders where client_ip = new.client_ip and created_at > now() - interval '1 hour';
    if by_ip >= 20 then
      raise exception 'too many orders from this network. Please try again later' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
create trigger t_orders_rate_limit before insert on public.orders for each row execute function private.enforce_order_rate_limit();
