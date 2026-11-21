-- Marquee tracking tables. Run this once in the Supabase SQL editor.
-- A row is visible only to the signed-in user who owns it.

create table if not exists public.tracked_shows (
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id integer not null check (tmdb_id > 0),
  status text not null check (status in ('watching', 'watchlist', 'stopped')),
  title text not null check (char_length(title) between 1 and 300),
  year text check (year is null or char_length(year) = 4),
  poster_url text check (
    poster_url is null
    or poster_url like 'https://image.tmdb.org/t/p/%'
  ),
  genres text[] not null default '{}',
  rating smallint check (rating is null or rating between 1 and 20),
  imdb_id text check (imdb_id is null or imdb_id ~ '^tt[0-9]{7,10}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create table if not exists public.episode_watches (
  user_id uuid not null references auth.users (id) on delete cascade,
  show_tmdb_id integer not null check (show_tmdb_id > 0),
  season_number integer not null check (season_number between 0 and 200),
  episode_number integer not null check (episode_number between 1 and 1000),
  name text not null check (char_length(name) between 1 and 300),
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes > 0),
  rating smallint check (rating is null or rating between 1 and 20),
  note text check (note is null or char_length(note) <= 500),
  imdb_id text check (imdb_id is null or imdb_id ~ '^tt[0-9]{7,10}$'),
  watched_at timestamptz not null default now(),
  primary key (user_id, show_tmdb_id, season_number, episode_number)
);

create table if not exists public.tracked_movies (
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id integer not null check (tmdb_id > 0),
  status text not null check (status in ('watchlist', 'watched')),
  title text not null check (char_length(title) between 1 and 300),
  year text check (year is null or char_length(year) = 4),
  poster_url text check (
    poster_url is null
    or poster_url like 'https://image.tmdb.org/t/p/%'
  ),
  genres text[] not null default '{}',
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes > 0),
  watched_on date,
  rating smallint check (rating is null or rating between 1 and 20),
  note text check (note is null or char_length(note) <= 500),
  imdb_id text check (imdb_id is null or imdb_id ~ '^tt[0-9]{7,10}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id),
  check (
    (status = 'watchlist' and watched_on is null)
    or (status = 'watched' and watched_on is not null)
  )
);

alter table public.tracked_shows enable row level security;
alter table public.episode_watches enable row level security;
alter table public.tracked_movies enable row level security;

drop policy if exists "tracked_shows_own" on public.tracked_shows;
create policy "tracked_shows_own"
  on public.tracked_shows
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "episode_watches_own" on public.episode_watches;
create policy "episode_watches_own"
  on public.episode_watches
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tracked_movies_own" on public.tracked_movies;
create policy "tracked_movies_own"
  on public.tracked_movies
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.tracked_shows to authenticated;
grant select, insert, update, delete on public.episode_watches to authenticated;
grant select, insert, update, delete on public.tracked_movies to authenticated;

-- Show ratings, and half-star scores from 0.5. Safe to run again on an existing project.
alter table public.tracked_shows add column if not exists rating smallint;
alter table public.tracked_shows drop constraint if exists tracked_shows_rating_check;
alter table public.tracked_shows
  add constraint tracked_shows_rating_check
  check (rating is null or rating between 1 and 20);

-- Ratings now include 0.5 (stored as 1). Safe to run again on an existing project.
alter table public.episode_watches drop constraint if exists episode_watches_rating_check;
alter table public.episode_watches
  add constraint episode_watches_rating_check
  check (rating is null or rating between 1 and 20);

alter table public.tracked_movies drop constraint if exists tracked_movies_rating_check;
alter table public.tracked_movies
  add constraint tracked_movies_rating_check
  check (rating is null or rating between 1 and 20);

-- IMDb ids from an exported CSV, so a second upload can skip titles already brought in.
alter table public.tracked_shows add column if not exists imdb_id text;
alter table public.tracked_shows drop constraint if exists tracked_shows_imdb_id_check;
alter table public.tracked_shows
  add constraint tracked_shows_imdb_id_check
  check (imdb_id is null or imdb_id ~ '^tt[0-9]{7,10}$');

alter table public.episode_watches add column if not exists imdb_id text;
alter table public.episode_watches drop constraint if exists episode_watches_imdb_id_check;
alter table public.episode_watches
  add constraint episode_watches_imdb_id_check
  check (imdb_id is null or imdb_id ~ '^tt[0-9]{7,10}$');

alter table public.tracked_movies add column if not exists imdb_id text;
alter table public.tracked_movies drop constraint if exists tracked_movies_imdb_id_check;
alter table public.tracked_movies
  add constraint tracked_movies_imdb_id_check
  check (imdb_id is null or imdb_id ~ '^tt[0-9]{7,10}$');
