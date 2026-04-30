-- Boyscation sync schema (v1)
-- Paste this into Supabase SQL Editor and click "Run".
-- Safe to re-run: uses "create table if not exists" and "create or replace".

-- =========================================================================
-- Tables
-- =========================================================================

create table if not exists trips (
  id              text primary key,
  name            text not null,
  destination     text not null default '',
  start_date      text not null,
  end_date        text not null,
  travelers       jsonb not null default '[]',
  notes           text not null default '',
  is_template     boolean not null default false,
  archived_at     bigint,
  currency        text not null default 'USD',
  created_at      bigint not null,
  updated_at      bigint not null,
  admin_token     text not null unique,
  editor_token    text not null unique,
  viewer_token    text not null unique,
  last_edited_by  text
);

create table if not exists activities (
  id                 text primary key,
  trip_id            text not null references trips(id) on delete cascade,
  date               text not null,
  "order"            int not null,
  time               text not null default '',
  title              text not null default '',
  location           text not null default '',
  map_link           text not null default '',
  cost               numeric not null default 0,
  status             text not null default 'idea',
  notes              text not null default '',
  image_id           text,
  category           text not null default 'other',
  paid_by            text,
  split_among        jsonb not null default '[]',
  split_mode         text not null default 'equal',
  transport_mode     text,
  carrier            text not null default '',
  flight_number      text not null default '',
  arrive_time        text not null default '',
  arrive_location    text not null default '',
  confirmation_code  text not null default '',
  updated_at         bigint not null,
  deleted_at         bigint,
  last_edited_by     text
);
create index if not exists activities_trip_id_idx on activities (trip_id);
create index if not exists activities_trip_date_order_idx on activities (trip_id, date, "order");

create table if not exists settlements (
  id              text primary key,
  trip_id         text not null references trips(id) on delete cascade,
  from_name       text not null,
  to_name         text not null,
  amount          numeric not null,
  note            text not null default '',
  created_at      bigint not null,
  deleted_at      bigint,
  last_edited_by  text
);
create index if not exists settlements_trip_id_idx on settlements (trip_id);

create table if not exists ideas (
  id              text primary key,
  trip_id         text not null references trips(id) on delete cascade,
  author_name     text not null,
  title           text not null,
  notes           text not null default '',
  suggested_date  text,
  status          text not null default 'pending',
  activity_id     text,
  created_at      bigint not null
);
create index if not exists ideas_trip_status_idx on ideas (trip_id, status);

-- =========================================================================
-- Token helpers
-- =========================================================================

create or replace function current_token() returns text
  language sql stable as $$
    select current_setting('request.headers', true)::jsonb ->> 'x-access-token';
$$;

create or replace function resolve_token(tok text)
  returns table (trip_id text, role text)
  language sql stable as $$
    select id, 'admin'  from trips where admin_token  = tok
    union all
    select id, 'editor' from trips where editor_token = tok
    union all
    select id, 'viewer' from trips where viewer_token = tok
    limit 1;
$$;

-- Public RPC for resolving the current request's token (client calls this first)
create or replace function resolve_current_token()
  returns table (trip_id text, role text)
  language sql stable security definer as $$
    select * from resolve_token(current_token());
$$;

-- =========================================================================
-- Provisioning RPC: anon-callable; creates trip + returns tokens
-- =========================================================================

create or replace function create_shared_trip(payload jsonb)
  returns jsonb
  language plpgsql
  security definer as $$
declare
  t_id text := payload->>'id';
  -- Two UUIDs = 64 hex chars (~256 bits of entropy) per token
  admin_tok  text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  editor_tok text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  viewer_tok text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin

  insert into trips (
    id, name, destination, start_date, end_date, travelers, notes,
    is_template, archived_at, currency, created_at, updated_at,
    admin_token, editor_token, viewer_token
  ) values (
    t_id,
    payload->>'name',
    coalesce(payload->>'destination',''),
    payload->>'start_date',
    payload->>'end_date',
    coalesce(payload->'travelers', '[]'::jsonb),
    coalesce(payload->>'notes',''),
    coalesce((payload->>'is_template')::boolean, false),
    nullif(payload->>'archived_at','')::bigint,
    coalesce(payload->>'currency','USD'),
    coalesce((payload->>'created_at')::bigint, (extract(epoch from now())*1000)::bigint),
    coalesce((payload->>'updated_at')::bigint, (extract(epoch from now())*1000)::bigint),
    admin_tok, editor_tok, viewer_tok
  );

  return jsonb_build_object(
    'trip_id', t_id,
    'admin_token', admin_tok,
    'editor_token', editor_tok,
    'viewer_token', viewer_tok
  );
end;
$$;

grant execute on function create_shared_trip(jsonb) to anon, authenticated;
grant execute on function resolve_current_token() to anon, authenticated;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table trips       enable row level security;
alter table activities  enable row level security;
alter table settlements enable row level security;
alter table ideas       enable row level security;

-- ---- trips ----
drop policy if exists trips_select on trips;
create policy trips_select on trips for select
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = trips.id));

drop policy if exists trips_update on trips;
create policy trips_update on trips for update
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = trips.id and r.role in ('editor','admin')))
  with check (exists (select 1 from resolve_token(current_token()) r where r.trip_id = trips.id and r.role in ('editor','admin')));

drop policy if exists trips_delete on trips;
create policy trips_delete on trips for delete
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = trips.id and r.role = 'admin'));

-- ---- activities ----
drop policy if exists activities_select on activities;
create policy activities_select on activities for select
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = activities.trip_id));

drop policy if exists activities_insert on activities;
create policy activities_insert on activities for insert
  with check (exists (select 1 from resolve_token(current_token()) r where r.trip_id = activities.trip_id and r.role in ('editor','admin')));

drop policy if exists activities_update on activities;
create policy activities_update on activities for update
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = activities.trip_id and r.role in ('editor','admin')))
  with check (exists (select 1 from resolve_token(current_token()) r where r.trip_id = activities.trip_id and r.role in ('editor','admin')));

drop policy if exists activities_delete on activities;
create policy activities_delete on activities for delete
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = activities.trip_id and r.role in ('editor','admin')));

-- ---- settlements ----
drop policy if exists settlements_select on settlements;
create policy settlements_select on settlements for select
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = settlements.trip_id));

drop policy if exists settlements_insert on settlements;
create policy settlements_insert on settlements for insert
  with check (exists (select 1 from resolve_token(current_token()) r where r.trip_id = settlements.trip_id and r.role in ('editor','admin')));

drop policy if exists settlements_update on settlements;
create policy settlements_update on settlements for update
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = settlements.trip_id and r.role in ('editor','admin')))
  with check (exists (select 1 from resolve_token(current_token()) r where r.trip_id = settlements.trip_id and r.role in ('editor','admin')));

drop policy if exists settlements_delete on settlements;
create policy settlements_delete on settlements for delete
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = settlements.trip_id and r.role in ('editor','admin')));

-- ---- ideas ----
drop policy if exists ideas_select on ideas;
create policy ideas_select on ideas for select
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = ideas.trip_id));

drop policy if exists ideas_insert on ideas;
create policy ideas_insert on ideas for insert
  with check (exists (select 1 from resolve_token(current_token()) r where r.trip_id = ideas.trip_id));

drop policy if exists ideas_update on ideas;
create policy ideas_update on ideas for update
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = ideas.trip_id and r.role in ('editor','admin')))
  with check (exists (select 1 from resolve_token(current_token()) r where r.trip_id = ideas.trip_id and r.role in ('editor','admin')));

drop policy if exists ideas_delete on ideas;
create policy ideas_delete on ideas for delete
  using (exists (select 1 from resolve_token(current_token()) r where r.trip_id = ideas.trip_id and r.role in ('editor','admin')));

-- =========================================================================
-- Storage bucket for activity images (public read)
-- =========================================================================

insert into storage.buckets (id, name, public)
  values ('trip-images', 'trip-images', true)
  on conflict (id) do nothing;

drop policy if exists "trip-images read" on storage.objects;
create policy "trip-images read"
  on storage.objects for select
  using (bucket_id = 'trip-images');

drop policy if exists "trip-images write" on storage.objects;
create policy "trip-images write"
  on storage.objects for insert
  with check (bucket_id = 'trip-images');

drop policy if exists "trip-images update" on storage.objects;
create policy "trip-images update"
  on storage.objects for update
  using (bucket_id = 'trip-images');

drop policy if exists "trip-images delete" on storage.objects;
create policy "trip-images delete"
  on storage.objects for delete
  using (bucket_id = 'trip-images');
