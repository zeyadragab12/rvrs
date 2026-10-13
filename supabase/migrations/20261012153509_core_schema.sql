
create extension if not exists postgis with schema extensions;
create schema if not exists private;

create type public.user_role as enum ('customer','owner','branch_manager','cashier','kitchen');
create type public.fulfillment_method as enum ('delivery','pickup');
create type public.order_status as enum ('pending','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','rejected','cancelled');
create type public.payment_method as enum ('cash','card');
create type public.payment_status as enum ('unpaid','pending','paid','failed','refund_pending','partially_refunded','refunded');
create type public.discount_type as enum ('fixed','percentage');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  locale text not null default 'en' check (locale in ('en','ar')),
  notification_prefs jsonb not null default '{"order_updates":true,"promotions":false}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  address text,
  location extensions.geography(point,4326),
  phone text,
  opening_hours jsonb not null default '{}',
  delivery_enabled boolean not null default false,
  pickup_enabled boolean not null default true,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_branches (
  user_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (user_id, branch_id)
);
create index on public.staff_branches (branch_id);

create table public.branch_closures (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);
create index on public.branch_closures (branch_id);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  geom extensions.geometry(polygon,4326) not null,
  delivery_fee numeric(10,2) not null check (delivery_fee >= 0),
  min_order numeric(10,2) not null default 0 check (min_order >= 0),
  is_active boolean not null default true
);
create index on public.delivery_zones using gist (geom);
create index on public.delivery_zones (branch_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  image_path text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  image_paths text[] not null default '{}',
  base_price numeric(10,2) not null check (base_price >= 0),
  allergens text[],
  sort_order int not null default 0,
  is_published boolean not null default false,
  is_available boolean not null default true,
  is_archived boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products (category_id);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name_en text not null,
  name_ar text,
  is_required boolean not null default false,
  min_select int not null default 0,
  max_select int not null default 1,
  sort_order int not null default 0,
  check (max_select >= min_select and min_select >= 0)
);
create index on public.option_groups (product_id);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups(id) on delete cascade,
  name_en text not null,
  name_ar text,
  price_delta numeric(10,2) not null default 0,
  is_available boolean not null default true,
  sort_order int not null default 0
);
create index on public.options (group_id);

create table public.branch_product_settings (
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_override numeric(10,2) check (price_override >= 0),
  is_available boolean not null default true,
  daily_limit int check (daily_limit >= 0),
  primary key (branch_id, product_id)
);
create index on public.branch_product_settings (product_id);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type public.discount_type not null,
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order numeric(10,2) not null default 0,
  usage_limit int,
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  branch_ids uuid[],
  product_ids uuid[],
  category_ids uuid[],
  is_active boolean not null default true,
  check (discount_type <> 'percentage' or discount_value <= 100)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  address_line text not null,
  notes text,
  location extensions.geography(point,4326),
  created_at timestamptz not null default now()
);
create index on public.addresses (user_id);

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('RV-' || nextval('public.order_number_seq')),
  user_id uuid references public.profiles(id) on delete set null,
  guest_token_hash text,
  customer_name text not null,
  customer_phone text not null,
  branch_id uuid not null references public.branches(id),
  method public.fulfillment_method not null,
  address_snapshot jsonb,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  other_charges numeric(10,2) not null default 0 check (other_charges >= 0),
  total numeric(10,2) not null check (total >= 0),
  promotion_id uuid references public.promotions(id),
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  status public.order_status not null default 'pending',
  notes text,
  rejection_reason text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  check (method = 'pickup' or address_snapshot is not null),
  check (user_id is not null or guest_token_hash is not null)
);
create index on public.orders (user_id, created_at desc);
create index on public.orders (branch_id, status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  options jsonb not null default '[]',
  notes text,
  line_total numeric(10,2) not null
);
create index on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index on public.order_status_history (order_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text not null,
  provider_reference text,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'EGP',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);
create index on public.payments (order_id);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payment_id uuid references public.payments(id),
  payload jsonb,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text check (platform in ('ios','android')),
  created_at timestamptz not null default now()
);
create index on public.device_tokens (user_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);

create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_profiles before update on public.profiles for each row execute function private.touch_updated_at();
create trigger t_branches before update on public.branches for each row execute function private.touch_updated_at();
create trigger t_products before update on public.products for each row execute function private.touch_updated_at();
create trigger t_orders before update on public.orders for each row execute function private.touch_updated_at();
create trigger t_payments before update on public.payments for each row execute function private.touch_updated_at();

create function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.phone);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
