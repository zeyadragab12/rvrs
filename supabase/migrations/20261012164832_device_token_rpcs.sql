
-- A phone can change hands. Registering a token moves it to the signed-in user instead of failing on the old owner's row.
create function public.register_device_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_token !~ '^Expo(nent)?PushToken\[.+\]$' then raise exception 'invalid push token' using errcode = '22023'; end if;
  if p_platform not in ('ios','android') then raise exception 'invalid platform' using errcode = '22023'; end if;
  delete from public.device_tokens where token = p_token and user_id <> uid;
  insert into public.device_tokens (user_id, token, platform) values (uid, p_token, p_platform)
    on conflict (token) do update set platform = excluded.platform;
end $$;

create function public.unregister_device_token(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.device_tokens where token = p_token and user_id = (select auth.uid())
$$;

revoke execute on function public.register_device_token(text, text), public.unregister_device_token(text) from public, anon;
grant execute on function public.register_device_token(text, text), public.unregister_device_token(text) to authenticated;
