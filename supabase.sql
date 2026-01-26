-- VELO Supabase schema + RLS (safe to run in SQL editor)

-- Extensions
create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  default_visibility text default 'public',
  default_allow_downloads boolean default true,
  default_allow_embed boolean default true,
  hide_likes boolean default false,
  hide_saves boolean default false,
  profile_visible boolean default true,
  autoplay_previews boolean default false,
  default_muted boolean default true,
  default_speed numeric default 1.0,
  created_at timestamptz default now()
);

alter table profiles add column if not exists default_visibility text default 'public';
alter table profiles add column if not exists default_allow_downloads boolean default true;
alter table profiles add column if not exists default_allow_embed boolean default true;
alter table profiles add column if not exists hide_likes boolean default false;
alter table profiles add column if not exists hide_saves boolean default false;
alter table profiles add column if not exists profile_visible boolean default true;
alter table profiles add column if not exists autoplay_previews boolean default false;
alter table profiles add column if not exists default_muted boolean default true;
alter table profiles add column if not exists default_speed numeric default 1.0;

-- Ensure existing profiles are public by default
update profiles set profile_visible = true where profile_visible is null;

-- Auto-create profile on auth sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^a-z0-9_]+',
    '',
    'g'
  ));
  if base_username is null or base_username = '' then
    base_username := 'user';
  end if;
  final_username := base_username;
  if exists (select 1 from profiles where username = final_username) then
    final_username := base_username || '_' || substr(new.id::text, 1, 6);
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', base_username)
  )
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Clips
create table if not exists clips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  visibility text not null check (visibility in ('public','unlisted','private')),
  video_path text not null,
  thumb_path text,
  duration text,
  duration_seconds integer,
  allow_downloads boolean default true,
  allow_embed boolean default true,
  content_warning boolean default false,
  pinned boolean default false,
  clip_slug text unique,
  clip_secret text,
  created_at timestamptz default now(),
  views_count integer default 0,
  likes_count integer default 0,
  saves_count integer default 0
);

alter table clips add column if not exists duration_seconds integer;
alter table clips add column if not exists allow_downloads boolean default true;
alter table clips add column if not exists allow_embed boolean default true;
alter table clips add column if not exists content_warning boolean default false;
alter table clips add column if not exists pinned boolean default false;
alter table clips add column if not exists clip_slug text;
alter table clips add column if not exists clip_secret text;

-- Tags
create table if not exists tags (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null
);

-- Clip tags join
create table if not exists clip_tags (
  clip_id uuid references clips(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  primary key (clip_id, tag_id)
);

-- Likes
create table if not exists likes (
  clip_id uuid references clips(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (clip_id, user_id)
);

-- Saves
create table if not exists saves (
  clip_id uuid references clips(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (clip_id, user_id)
);

-- Follows
create table if not exists follows (
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'follows_no_self') then
    alter table follows add constraint follows_no_self check (follower_id <> following_id);
  end if;
end;
$$;

-- Views (optional)
create table if not exists views (
  clip_id uuid references clips(id) on delete cascade not null,
  viewer_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Comments
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  clip_id uuid references clips(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table comments;
  end if;
end;
$$;

-- Reports
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references profiles(id) on delete set null,
  clip_id uuid references clips(id) on delete set null,
  reported_user_id uuid references profiles(id) on delete set null,
  reason text not null,
  created_at timestamptz default now()
);

-- Collections
create table if not exists collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  visibility text not null check (visibility in ('public','private')),
  created_at timestamptz default now()
);

create table if not exists collection_clips (
  collection_id uuid references collections(id) on delete cascade not null,
  clip_id uuid references clips(id) on delete cascade not null,
  added_at timestamptz default now(),
  primary key (collection_id, clip_id)
);

-- Counters via triggers
create or replace function handle_like_insert()
returns trigger as $$
begin
  update clips set likes_count = likes_count + 1 where id = new.clip_id;
  return new;
end;
$$ language plpgsql;

create or replace function handle_like_delete()
returns trigger as $$
begin
  update clips set likes_count = greatest(likes_count - 1, 0) where id = old.clip_id;
  return old;
end;
$$ language plpgsql;

create or replace function handle_save_insert()
returns trigger as $$
begin
  update clips set saves_count = saves_count + 1 where id = new.clip_id;
  return new;
end;
$$ language plpgsql;

create or replace function handle_save_delete()
returns trigger as $$
begin
  update clips set saves_count = greatest(saves_count - 1, 0) where id = old.clip_id;
  return old;
end;
$$ language plpgsql;

create or replace function handle_view_insert()
returns trigger as $$
begin
  update clips set views_count = views_count + 1 where id = new.clip_id;
  return new;
end;
$$ language plpgsql;

create trigger likes_insert_trigger
after insert on likes
for each row execute procedure handle_like_insert();

create trigger likes_delete_trigger
after delete on likes
for each row execute procedure handle_like_delete();

create trigger saves_insert_trigger
after insert on saves
for each row execute procedure handle_save_insert();

create trigger saves_delete_trigger
after delete on saves
for each row execute procedure handle_save_delete();

create trigger views_insert_trigger
after insert on views
for each row execute procedure handle_view_insert();

-- Unlisted access helper (RPC)
create or replace function get_unlisted_clip(p_slug text, p_secret text)
returns setof clips
language sql
security definer
as $$
  select * from clips
  where visibility = 'unlisted'
    and clip_slug = p_slug
    and clip_secret = p_secret
  limit 1;
$$;

create or replace function delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from storage.objects
    where owner = auth.uid()
      and bucket_id in ('clips', 'thumbs');
  delete from comments where user_id = auth.uid();
  delete from follows where follower_id = auth.uid() or following_id = auth.uid();
  delete from likes where user_id = auth.uid();
  delete from saves where user_id = auth.uid();
  delete from views where viewer_id = auth.uid();
  delete from reports where reporter_id = auth.uid() or reported_user_id = auth.uid();
  delete from collection_clips
    where collection_id in (select id from collections where user_id = auth.uid());
  delete from collections where user_id = auth.uid();
  delete from clips where user_id = auth.uid();
  delete from profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_account() to authenticated;

-- Indexes
create index if not exists clips_user_id_idx on clips(user_id);
create index if not exists clips_visibility_idx on clips(visibility);
create index if not exists clip_tags_tag_id_idx on clip_tags(tag_id);
create index if not exists likes_user_id_idx on likes(user_id);
create index if not exists saves_user_id_idx on saves(user_id);
create index if not exists comments_clip_id_idx on comments(clip_id);
create unique index if not exists clips_slug_idx on clips(clip_slug);

-- RLS
alter table profiles enable row level security;
alter table clips enable row level security;
alter table tags enable row level security;
alter table clip_tags enable row level security;
alter table likes enable row level security;
alter table saves enable row level security;
alter table follows enable row level security;
alter table views enable row level security;
alter table comments enable row level security;
alter table reports enable row level security;
alter table collections enable row level security;
alter table collection_clips enable row level security;

-- Profiles policies
create policy "Public profiles are viewable" on profiles
  for select using (true);

create policy "Users can insert their profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Clips policies
create policy "Public clips are viewable" on clips
  for select using (visibility = 'public');

create policy "Users can view own clips" on clips
  for select using (auth.uid() = user_id);

create policy "Users can insert own clips" on clips
  for insert with check (auth.uid() = user_id);

create policy "Users can update own clips" on clips
  for update using (auth.uid() = user_id);

create policy "Users can delete own clips" on clips
  for delete using (auth.uid() = user_id);

-- Tags policies
create policy "Tags are viewable" on tags
  for select using (true);

create policy "Users can insert tags" on tags
  for insert with check (auth.uid() is not null);

-- Clip tags policies
create policy "Clip tags are viewable" on clip_tags
  for select using (true);

create policy "Users can manage own clip tags" on clip_tags
  for insert with check (
    auth.uid() = (select user_id from clips where clips.id = clip_id)
  );

create policy "Users can delete own clip tags" on clip_tags
  for delete using (
    auth.uid() = (select user_id from clips where clips.id = clip_id)
  );

-- Likes policies
create policy "Likes are viewable" on likes
  for select using (true);

create policy "Users can like" on likes
  for insert with check (auth.uid() = user_id);

create policy "Users can remove like" on likes
  for delete using (auth.uid() = user_id);

-- Saves policies
create policy "Saves are viewable" on saves
  for select using (auth.uid() = user_id);

create policy "Users can save" on saves
  for insert with check (auth.uid() = user_id);

create policy "Users can remove save" on saves
  for delete using (auth.uid() = user_id);

-- Follows policies
create policy "Follows are viewable" on follows
  for select using (true);

create policy "Users can follow" on follows
  for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow" on follows
  for delete using (auth.uid() = follower_id);

-- Views policies
create policy "Views are insertable" on views
  for insert with check (true);

-- Comments policies
create policy "Comments are viewable" on comments
  for select using (true);

create policy "Users can comment" on comments
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments" on comments
  for delete using (auth.uid() = user_id);

-- Reports policies
create policy "Reports are insertable" on reports
  for insert with check (auth.uid() = reporter_id);

create policy "Reports are viewable by authenticated users" on reports
  for select using (auth.uid() is not null);

-- Collections policies
create policy "Collections are viewable if public or owner" on collections
  for select using (visibility = 'public' or auth.uid() = user_id);

create policy "Users can insert own collections" on collections
  for insert with check (auth.uid() = user_id);

create policy "Users can update own collections" on collections
  for update using (auth.uid() = user_id);

create policy "Users can delete own collections" on collections
  for delete using (auth.uid() = user_id);

-- Collection clips policies
create policy "Collection clips viewable if collection public or owner" on collection_clips
  for select using (
    exists (
      select 1 from collections
      where collections.id = collection_id
      and (collections.visibility = 'public' or collections.user_id = auth.uid())
    )
  );

create policy "Users can manage own collection clips" on collection_clips
  for insert with check (
    exists (select 1 from collections where collections.id = collection_id and collections.user_id = auth.uid())
  );

create policy "Users can delete own collection clips" on collection_clips
  for delete using (
    exists (select 1 from collections where collections.id = collection_id and collections.user_id = auth.uid())
  );
