-- CCAVE schema additions
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists editing_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  asset_type text not null check (asset_type in ('preset','sound_effect','background','png')),
  tags text[] not null default '{}',
  file_path text not null,
  bucket text not null default 'ccave-editing',
  original_filename text not null,
  mime_type text,
  file_size bigint,
  downloads_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists thumbnail_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  asset_type text not null check (asset_type in ('background','player_png')),
  tags text[] not null default '{}',
  file_path text not null,
  bucket text not null default 'ccave-thumbnails',
  original_filename text not null,
  mime_type text,
  file_size bigint,
  downloads_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists asset_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  asset_kind text not null check (asset_kind in ('editing','thumbnail','tutorial')),
  asset_id uuid not null,
  created_at timestamptz not null default now()
);

alter table editing_assets enable row level security;
alter table thumbnail_assets enable row level security;
alter table asset_downloads enable row level security;

drop policy if exists "Public read editing_assets" on editing_assets;
create policy "Public read editing_assets" on editing_assets
  for select using (true);

drop policy if exists "Insert own editing_assets" on editing_assets;
create policy "Insert own editing_assets" on editing_assets
  for insert with check (auth.uid() = owner_id);

drop policy if exists "Update own editing_assets" on editing_assets;
create policy "Update own editing_assets" on editing_assets
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Delete own editing_assets" on editing_assets;
create policy "Delete own editing_assets" on editing_assets
  for delete using (auth.uid() = owner_id);

drop policy if exists "Public read thumbnail_assets" on thumbnail_assets;
create policy "Public read thumbnail_assets" on thumbnail_assets
  for select using (true);

drop policy if exists "Insert own thumbnail_assets" on thumbnail_assets;
create policy "Insert own thumbnail_assets" on thumbnail_assets
  for insert with check (auth.uid() = owner_id);

drop policy if exists "Update own thumbnail_assets" on thumbnail_assets;
create policy "Update own thumbnail_assets" on thumbnail_assets
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Delete own thumbnail_assets" on thumbnail_assets;
create policy "Delete own thumbnail_assets" on thumbnail_assets
  for delete using (auth.uid() = owner_id);

drop policy if exists "Insert asset_downloads" on asset_downloads;
create policy "Insert asset_downloads" on asset_downloads
  for insert with check (true);

drop policy if exists "Select own asset_downloads" on asset_downloads;
create policy "Select own asset_downloads" on asset_downloads
  for select using (auth.uid() = user_id);

drop trigger if exists editing_assets_updated_at on editing_assets;
create trigger editing_assets_updated_at
  before update on editing_assets
  for each row execute function public.set_updated_at();

drop trigger if exists thumbnail_assets_updated_at on thumbnail_assets;
create trigger thumbnail_assets_updated_at
  before update on thumbnail_assets
  for each row execute function public.set_updated_at();

create index if not exists editing_assets_title_trgm_idx on editing_assets using gin (title gin_trgm_ops);
create index if not exists editing_assets_created_at_idx on editing_assets (created_at desc);
create index if not exists editing_assets_downloads_idx on editing_assets (downloads_count desc);
create index if not exists editing_assets_tags_idx on editing_assets using gin (tags);

create index if not exists thumbnail_assets_title_trgm_idx on thumbnail_assets using gin (title gin_trgm_ops);
create index if not exists thumbnail_assets_created_at_idx on thumbnail_assets (created_at desc);
create index if not exists thumbnail_assets_downloads_idx on thumbnail_assets (downloads_count desc);
create index if not exists thumbnail_assets_tags_idx on thumbnail_assets using gin (tags);

create index if not exists asset_downloads_asset_idx on asset_downloads (asset_kind, asset_id);

alter table clips add column if not exists content_kind text not null default 'clip';
alter table clips add column if not exists downloads_count bigint not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clips_content_kind_check') then
    alter table clips add constraint clips_content_kind_check check (content_kind in ('clip','tutorial'));
  end if;
end $$;

create index if not exists clips_content_kind_idx on clips (content_kind);
create index if not exists clips_downloads_count_idx on clips (downloads_count desc);
