-- Café Foundou — shared menu storage, owner allowlist, and publish workflow.
--
-- Run this once in the fresh "foundou-demo" Supabase project.
--
-- Model:
--   public.owners             allowlist of the single owner account
--   public.menu_draft         one editable JSONB document
--   public.menu_publications  append-only published snapshots (latest wins)
--
-- The browser only ever receives the public/publishable key. Visitors read the
-- latest snapshot through public.get_published_menu(); they cannot read drafts
-- or publication history.

begin;

create table if not exists public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Exactly one draft row. The admin client uses the bundled default menu when
-- this table is empty and creates the row on the first save.
create table if not exists public.menu_draft (
  id smallint primary key default 1,
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint menu_draft_single_row check (id = 1),
  constraint menu_draft_categories_array check (jsonb_typeof(categories) = 'array')
);

-- Published snapshots are never updated by the application. Publishing inserts
-- a new row; the newest row is the live menu.
create table if not exists public.menu_publications (
  id bigint generated always as identity primary key,
  categories jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null,
  constraint menu_publications_categories_array check (jsonb_typeof(categories) = 'array')
);

create index if not exists menu_publications_published_at_idx
  on public.menu_publications (published_at desc);

alter table public.owners enable row level security;
alter table public.menu_draft enable row level security;
alter table public.menu_publications enable row level security;

-- Checks the allowlist without exposing the owners table to RLS recursion.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.owners
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

-- Owners may read their own allowlist row, so the admin can confirm access.
drop policy if exists owners_select_self on public.owners;
create policy owners_select_self on public.owners
  for select to authenticated
  using (user_id = auth.uid());

-- Owners may read the draft. Writes go through save_menu_draft() only.
drop policy if exists menu_draft_owner_read on public.menu_draft;
create policy menu_draft_owner_read on public.menu_draft
  for select to authenticated
  using (id = 1 and public.is_owner());

-- Owners may inspect publication history. Visitors cannot read this table.
drop policy if exists menu_publications_owner_read on public.menu_publications;
create policy menu_publications_owner_read on public.menu_publications
  for select to authenticated
  using (public.is_owner());

grant usage on schema public to anon, authenticated;

revoke all on public.owners from anon, authenticated;
grant select on public.owners to authenticated;

revoke all on public.menu_draft from anon, authenticated;
grant select on public.menu_draft to authenticated;

revoke all on public.menu_publications from anon, authenticated;
grant select on public.menu_publications to authenticated;

-- Save the whole draft as one JSONB document. This is the only write path for
-- the admin. It rejects non-owner callers even though it runs as definer.
create or replace function public.save_menu_draft(p_categories jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if not public.is_owner() then
    raise exception 'Only the owner can save the menu draft.'
      using errcode = '42501';
  end if;

  if p_categories is null or jsonb_typeof(p_categories) <> 'array' then
    raise exception 'The menu draft must be a JSON array.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_categories) < 1 then
    raise exception 'The menu draft must contain at least one category.'
      using errcode = '22023';
  end if;

  if pg_column_size(p_categories) > 1048576 then
    raise exception 'The menu draft is too large.'
      using errcode = '22023';
  end if;

  insert into public.menu_draft (id, categories, updated_at, updated_by)
  values (1, p_categories, v_now, auth.uid())
  on conflict (id) do update
    set categories = excluded.categories,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  return v_now;
end;
$$;

revoke all on function public.save_menu_draft(jsonb) from public;
grant execute on function public.save_menu_draft(jsonb) to authenticated;

-- Filter the draft down to what customers may see:
--   * confirmed items only
--   * visible items only
--   * an integer price that is not null and not negative
--   * categories with at least one surviving item
-- Then insert an immutable snapshot and return its metadata.
create or replace function public.publish_menu()
returns table (publication_id bigint, published_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_categories jsonb;
  v_published jsonb;
  v_id bigint;
  v_at timestamptz := now();
begin
  if not public.is_owner() then
    raise exception 'Only the owner can publish the menu.'
      using errcode = '42501';
  end if;

  select d.categories
    into v_categories
    from public.menu_draft d
   where d.id = 1;

  if v_categories is null then
    raise exception 'Save the menu draft before publishing.'
      using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(published_category order by category_order), '[]'::jsonb)
    into v_published
    from (
      select
        jsonb_build_object(
          'id', category->>'id',
          'name', category->>'name',
          'isDefault', case
            when category->>'isDefault' = 'true' then true
            else false
          end,
          'items', (
            select coalesce(jsonb_agg(published_item order by item_order), '[]'::jsonb)
              from (
                select
                  jsonb_strip_nulls(
                    jsonb_build_object(
                      'id', item->>'id',
                      'name', item->>'name',
                      'price', (item->>'price')::integer,
                      'status', 'confirmed',
                      'visible', true,
                      'source', case
                        when item->>'source' in ('owner-update', 'coffee-increase', 'board')
                          then item->>'source'
                        else 'owner-update'
                      end,
                      'note', item->'note',
                      'originalPrice', item->'originalPrice'
                    )
                  ) as published_item,
                  item_order
                from jsonb_array_elements(
                  case
                    when jsonb_typeof(category->'items') = 'array'
                      then category->'items'
                    else '[]'::jsonb
                  end
                ) with ordinality as items(item, item_order)
                where jsonb_typeof(item) = 'object'
                  and item->>'status' = 'confirmed'
                  and item->>'visible' = 'true'
                  and jsonb_typeof(item->'price') = 'number'
                  and item->>'price' ~ '^[0-9]{1,9}$'
                  and coalesce(item->>'id', '') <> ''
                  and coalesce(item->>'name', '') <> ''
              ) valid_items
          )
        ) as published_category,
        category_order
      from jsonb_array_elements(v_categories) with ordinality as categories(category, category_order)
      where jsonb_typeof(category) = 'object'
        and coalesce(category->>'id', '') <> ''
        and coalesce(category->>'name', '') <> ''
    ) valid_categories
   where jsonb_array_length(published_category->'items') > 0;

  if jsonb_array_length(v_published) = 0 then
    raise exception 'Nothing to publish: no confirmed, visible item has a price.'
      using errcode = '22023';
  end if;

  insert into public.menu_publications (categories, published_at, published_by)
  values (v_published, v_at, auth.uid())
  returning id into v_id;

  return query select v_id, v_at;
end;
$$;

revoke all on function public.publish_menu() from public;
grant execute on function public.publish_menu() to authenticated;

-- Public read path. Only the newest snapshot is returned.
create or replace function public.get_published_menu()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select p.categories
    from public.menu_publications p
   order by p.id desc
   limit 1;
$$;

revoke all on function public.get_published_menu() from public;
grant execute on function public.get_published_menu() to anon, authenticated;

comment on table public.owners is
  'Allowlist of owner accounts. Grants admin access to the draft and publish RPCs.';
comment on table public.menu_draft is
  'Single editable menu document shared by the owner admin.';
comment on table public.menu_publications is
  'Append-only published menu snapshots. The newest row is the public menu.';

-- Bootstrap the owner after creating the account in Authentication > Users:
--
--   insert into public.owners (user_id)
--   select id from auth.users where email = 'owner@example.com';
--
-- Run that in the SQL Editor. It is deliberately not automatic: a trigger that
-- made every new auth user an owner would turn public sign-ups into admin users.

commit;
