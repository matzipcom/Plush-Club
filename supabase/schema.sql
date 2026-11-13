create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  coins integer not null default 0 check (coins >= 0),
  next_coin_claim_at timestamptz,
  politics_room_reward_claimed boolean not null default false,
  politics_room_purchased boolean not null default false,
  bag jsonb not null default '[]'::jsonb check (jsonb_typeof(bag) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists next_coin_claim_at timestamptz,
  add column if not exists next_daily_bonus_at timestamptz,
  add column if not exists politics_room_reward_claimed boolean not null default false,
  add column if not exists politics_room_purchased boolean not null default false;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (bag, updated_at) on public.profiles to authenticated;

create or replace function public.claim_coins()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.next_coin_claim_at is not null and v_profile.next_coin_claim_at > now() then
    return jsonb_build_object(
      'ok', false,
      'coins', v_profile.coins,
      'next_coin_claim_at', v_profile.next_coin_claim_at
    );
  end if;

  update public.profiles
  set coins = coins + 5,
      next_coin_claim_at = now() + interval '5 minutes',
      updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  return jsonb_build_object(
    'ok', true,
    'coins', v_profile.coins,
    'next_coin_claim_at', v_profile.next_coin_claim_at
  );
end;
$$;

create or replace function public.spend_play_coin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if v_profile.coins < 1 then
    return jsonb_build_object('ok', false, 'coins', v_profile.coins);
  end if;

  update public.profiles
  set coins = coins - 1, updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  return jsonb_build_object('ok', true, 'coins', v_profile.coins);
end;
$$;

revoke all on function public.claim_coins() from public, anon;
revoke all on function public.spend_play_coin() from public, anon;
grant execute on function public.claim_coins() to authenticated;
grant execute on function public.spend_play_coin() to authenticated;

create or replace function public.claim_daily_bonus()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.next_daily_bonus_at is not null and v_profile.next_daily_bonus_at > now() then
    return jsonb_build_object(
      'ok', false,
      'coins', v_profile.coins,
      'next_daily_bonus_at', v_profile.next_daily_bonus_at
    );
  end if;

  update public.profiles
  set coins = coins + 200,
      next_daily_bonus_at = now() + interval '24 hours',
      updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  return jsonb_build_object(
    'ok', true,
    'coins', v_profile.coins,
    'next_daily_bonus_at', v_profile.next_daily_bonus_at
  );
end;
$$;

revoke all on function public.claim_daily_bonus() from public, anon;
grant execute on function public.claim_daily_bonus() to authenticated;

create or replace function public.purchase_politics_room()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if v_profile.politics_room_purchased then
    return jsonb_build_object('ok', true, 'purchased', true, 'purchased_now', false, 'coins', v_profile.coins);
  end if;
  if v_profile.coins < 1000 then
    return jsonb_build_object('ok', false, 'purchased', false, 'purchased_now', false, 'coins', v_profile.coins);
  end if;

  update public.profiles
  set coins = coins - 1000,
      politics_room_purchased = true,
      updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  return jsonb_build_object('ok', true, 'purchased', true, 'purchased_now', true, 'coins', v_profile.coins);
end;
$$;

revoke all on function public.purchase_politics_room() from public, anon;
grant execute on function public.purchase_politics_room() to authenticated;
drop function if exists public.enter_politics_room();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if requested_username is null then
    requested_username := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (id, username)
  values (new.id, requested_username);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

update public.profiles as profile
set bag = coalesce((
  select jsonb_agg(
    case
      when entry.item ->> 'id' is null then entry.item || jsonb_build_object('id', gen_random_uuid())
      else entry.item
    end
    order by entry.ordinality
  )
  from jsonb_array_elements(profile.bag) with ordinality as entry(item, ordinality)
), '[]'::jsonb)
where jsonb_typeof(profile.bag) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(profile.bag) as entry(item)
    where entry.item ->> 'id' is null
  );

create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null,
  toy_kind text not null check (toy_kind in ('bear', 'chick', 'duck', 'frog', 'bunny', 'cat', 'mayor', 'legislator', 'diplomat', 'minister', 'councilor', 'candidate', 'spokesperson', 'chizzilla', 'moonjaeger', 'mulcorita', 'moonkorita')),
  toy_color text not null check (toy_color = 'rainbow' or toy_color ~ '^#[0-9A-Fa-f]{6}$'),
  price integer not null check (price between 1 and 1000000),
  listed_at timestamptz not null default now(),
  buyer_id uuid references public.profiles (id) on delete set null,
  sold_at timestamptz,
  cancelled_at timestamptz
);

alter table public.market_listings
  drop constraint if exists market_listings_toy_kind_check;
alter table public.market_listings
  add constraint market_listings_toy_kind_check
  check (toy_kind in (
    'bear', 'chick', 'duck', 'frog', 'bunny', 'cat',
    'mayor', 'legislator', 'diplomat', 'minister', 'councilor', 'candidate', 'spokesperson', 'chizzilla', 'moonjaeger', 'mulcorita', 'moonkorita'
  ));

create unique index if not exists market_listings_active_item_unique
  on public.market_listings (item_id)
  where sold_at is null and cancelled_at is null;

create index if not exists market_listings_active_date_idx
  on public.market_listings (listed_at desc)
  where sold_at is null and cancelled_at is null;

alter table public.market_listings enable row level security;

drop policy if exists "market_listings_read_visible" on public.market_listings;
create policy "market_listings_read_visible"
  on public.market_listings for select to authenticated
  using (
    (sold_at is null and cancelled_at is null)
    or seller_id = (select auth.uid())
    or buyer_id = (select auth.uid())
  );

grant select on public.market_listings to authenticated;
revoke insert, update, delete on public.market_listings from anon, authenticated;

create or replace function public.create_market_listing(p_item_id uuid, p_price integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_item jsonb;
  v_position bigint;
  v_listing_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_price is null or p_price < 1 or p_price > 1000000 then
    raise exception 'Price must be between 1 and 1000000 coins';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  select entry.item, entry.ordinality
  into v_item, v_position
  from jsonb_array_elements(v_profile.bag) with ordinality as entry(item, ordinality)
  where entry.item ->> 'id' = p_item_id::text
  limit 1;
  if v_item is null then
    raise exception 'This toy is no longer in your bag';
  end if;

  update public.profiles as profile
  set bag = (
    select coalesce(jsonb_agg(entry.item order by entry.ordinality), '[]'::jsonb)
    from jsonb_array_elements(v_profile.bag) with ordinality as entry(item, ordinality)
    where entry.ordinality <> v_position
  ), updated_at = now()
  where profile.id = v_user_id;

  insert into public.market_listings (seller_id, item_id, toy_kind, toy_color, price)
  values (v_user_id, p_item_id, v_item ->> 'kind', v_item ->> 'color', p_price)
  returning id into v_listing_id;

  return v_listing_id;
end;
$$;

create or replace function public.buy_market_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_listing public.market_listings%rowtype;
  v_buyer public.profiles%rowtype;
begin
  if v_buyer_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_listing
  from public.market_listings
  where id = p_listing_id and sold_at is null and cancelled_at is null
  for update;
  if not found then
    raise exception 'This listing is no longer available';
  end if;
  if v_listing.seller_id = v_buyer_id then
    raise exception 'You cannot buy your own listing';
  end if;

  perform profile.id
  from public.profiles as profile
  where profile.id in (v_buyer_id, v_listing.seller_id)
  order by profile.id
  for update;

  select * into v_buyer from public.profiles where id = v_buyer_id;
  if not found then
    raise exception 'Buyer profile not found';
  end if;
  if v_buyer.coins < v_listing.price then
    raise exception 'Not enough coins';
  end if;

  update public.profiles
  set coins = coins - v_listing.price,
      bag = bag || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(),
        'kind', v_listing.toy_kind,
        'color', v_listing.toy_color,
        'collectedAt', floor(extract(epoch from now()) * 1000)::bigint
      )),
      updated_at = now()
  where id = v_buyer_id;

  update public.profiles
  set coins = coins + v_listing.price, updated_at = now()
  where id = v_listing.seller_id;

  update public.market_listings
  set buyer_id = v_buyer_id, sold_at = now()
  where id = p_listing_id;

  return jsonb_build_object('listing_id', p_listing_id, 'price', v_listing.price);
end;
$$;

create or replace function public.cancel_market_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_listing public.market_listings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_listing
  from public.market_listings
  where id = p_listing_id and seller_id = v_user_id and sold_at is null and cancelled_at is null
  for update;
  if not found then
    raise exception 'This listing cannot be cancelled';
  end if;

  update public.profiles
  set bag = bag || jsonb_build_array(jsonb_build_object(
        'id', v_listing.item_id,
        'kind', v_listing.toy_kind,
        'color', v_listing.toy_color,
        'collectedAt', floor(extract(epoch from now()) * 1000)::bigint
      )),
      updated_at = now()
  where id = v_user_id;

  update public.market_listings set cancelled_at = now() where id = p_listing_id;
end;
$$;

revoke all on function public.create_market_listing(uuid, integer) from public;
revoke all on function public.buy_market_listing(uuid) from public;
revoke all on function public.cancel_market_listing(uuid) from public;
grant execute on function public.create_market_listing(uuid, integer) to authenticated;
grant execute on function public.buy_market_listing(uuid) to authenticated;
grant execute on function public.cancel_market_listing(uuid) to authenticated;

create or replace function public.claim_daily_bonus()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.next_daily_bonus_at is not null and v_profile.next_daily_bonus_at > now() then
    return jsonb_build_object(
      'ok', false,
      'coins', v_profile.coins,
      'next_daily_bonus_at', v_profile.next_daily_bonus_at
    );
  end if;

  update public.profiles
  set coins = coins + 200,
      next_daily_bonus_at = now() + interval '24 hours',
      updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  return jsonb_build_object(
    'ok', true,
    'coins', v_profile.coins,
    'next_daily_bonus_at', v_profile.next_daily_bonus_at
  );
end;
$$;

revoke all on function public.claim_daily_bonus() from public;
grant execute on function public.claim_daily_bonus() to authenticated;

create or replace function public.play_roulette(p_item_id uuid, p_multiplier integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_item jsonb;
  v_position bigint;
  v_item_price integer;
  v_coins_won integer;
  v_result_type text;
  v_random_spin integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  
  if p_multiplier is null or p_multiplier < 1 or p_multiplier > 15 then
    raise exception 'Invalid multiplier';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  select entry.item, entry.ordinality
  into v_item, v_position
  from jsonb_array_elements(v_profile.bag) with ordinality as entry(item, ordinality)
  where entry.item ->> 'id' = p_item_id::text
  limit 1;
  if v_item is null then
    raise exception 'This toy is no longer in your bag';
  end if;

  -- Get the base price for the toy kind
  v_item_price := case v_item ->> 'kind'
    when 'chizzilla' then 1000
    when 'moonjaeger' then 1000
    when 'mulcorita' then 1000
    when 'moonkorita' then 1000
    else 15
  end;

  v_random_spin := floor(random() * 31)::integer;

  if v_random_spin < 15 then
    v_result_type := 'black';
    v_coins_won := v_item_price * p_multiplier;
  elsif v_random_spin < 30 then
    v_result_type := 'red';
    v_coins_won := v_item_price * p_multiplier;
  else
    v_result_type := 'green';
    v_coins_won := v_item_price * p_multiplier;
  end if;

  update public.profiles as profile
  set bag = (
    select coalesce(jsonb_agg(entry.item order by entry.ordinality), '[]'::jsonb)
    from jsonb_array_elements(v_profile.bag) with ordinality as entry(item, ordinality)
    where entry.ordinality <> v_position
  ), 
  coins = coins + v_coins_won,
  updated_at = now()
  where profile.id = v_user_id;

  return jsonb_build_object(
    'result', v_result_type,
    'multiplier', p_multiplier,
    'coins_won', v_coins_won,
    'toy_kind', v_item ->> 'kind',
    'toy_color', v_item ->> 'color'
  );
end;
$$;

revoke all on function public.play_roulette(uuid, integer) from public;
grant execute on function public.play_roulette(uuid, integer) to authenticated;