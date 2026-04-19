create table if not exists blocked_users (
  user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  constraint blocked_users_no_self check (user_id <> blocked_user_id)
);

create index if not exists blocked_users_user_idx on public.blocked_users (user_id);
create index if not exists blocked_users_blocked_idx on public.blocked_users (blocked_user_id);

create table if not exists blocked_authors (
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

create index if not exists blocked_authors_user_idx on public.blocked_authors (user_id);
create index if not exists blocked_authors_author_idx on public.blocked_authors (author_id);

create table if not exists blocked_tags (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create index if not exists blocked_tags_user_idx on public.blocked_tags (user_id);
create index if not exists blocked_tags_tag_idx on public.blocked_tags (tag_id);

create table if not exists review_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

create index if not exists review_saves_user_idx on public.review_saves (user_id, created_at desc);
create index if not exists review_saves_review_idx on public.review_saves (review_id);

create table if not exists reading_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_pages_read int not null default 0,
  total_minutes_read int not null default 0,
  total_sessions int not null default 0,
  active_days int not null default 0,
  pages_this_week int not null default 0,
  minutes_this_week int not null default 0,
  pages_this_month int not null default 0,
  minutes_this_month int not null default 0,
  books_completed_this_year int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_activity_date date,
  current_milestone text,
  updated_at timestamptz not null default now()
);

create table if not exists reading_goals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  year int not null,
  book_goal int not null default 24,
  page_goal int not null default 5000,
  minute_goal int not null default 3000,
  books_completed int not null default 0,
  pages_completed int not null default 0,
  minutes_completed int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);

create index if not exists reading_goals_year_idx on public.reading_goals (year, completed_at);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  title text not null,
  description text,
  icon text not null default 'sparkles',
  metadata jsonb not null default '{}'::jsonb,
  unlocked_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

create index if not exists badges_user_idx on public.badges (user_id, unlocked_at desc);

alter table public.book_posts
  add column if not exists contains_spoiler boolean not null default false;

alter table public.book_post_comments
  add column if not exists contains_spoiler boolean not null default false;

alter table public.activity_events
  drop constraint if exists activity_events_event_type_check;

alter table public.activity_events
  add constraint activity_events_event_type_check
  check (
    event_type in (
      'book_logged',
      'book_reviewed',
      'list_created',
      'list_book_added',
      'started_reading',
      'finished_reading',
      'followed_user',
      'badge_unlocked'
    )
  );

alter table public.blocked_users enable row level security;
alter table public.blocked_authors enable row level security;
alter table public.blocked_tags enable row level security;
alter table public.review_saves enable row level security;
alter table public.reading_stats enable row level security;
alter table public.streaks enable row level security;
alter table public.reading_goals enable row level security;
alter table public.badges enable row level security;

drop policy if exists "Users can view own blocked users" on public.blocked_users;
drop policy if exists "Users can insert own blocked users" on public.blocked_users;
drop policy if exists "Users can delete own blocked users" on public.blocked_users;
create policy "Users can view own blocked users" on public.blocked_users for select
  using (auth.uid() = user_id);
create policy "Users can insert own blocked users" on public.blocked_users for insert
  with check (auth.uid() = user_id);
create policy "Users can delete own blocked users" on public.blocked_users for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own blocked authors" on public.blocked_authors;
drop policy if exists "Users can insert own blocked authors" on public.blocked_authors;
drop policy if exists "Users can delete own blocked authors" on public.blocked_authors;
create policy "Users can view own blocked authors" on public.blocked_authors for select
  using (auth.uid() = user_id);
create policy "Users can insert own blocked authors" on public.blocked_authors for insert
  with check (auth.uid() = user_id);
create policy "Users can delete own blocked authors" on public.blocked_authors for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own blocked tags" on public.blocked_tags;
drop policy if exists "Users can insert own blocked tags" on public.blocked_tags;
drop policy if exists "Users can delete own blocked tags" on public.blocked_tags;
create policy "Users can view own blocked tags" on public.blocked_tags for select
  using (auth.uid() = user_id);
create policy "Users can insert own blocked tags" on public.blocked_tags for insert
  with check (auth.uid() = user_id);
create policy "Users can delete own blocked tags" on public.blocked_tags for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own saved reviews" on public.review_saves;
drop policy if exists "Users can save reviews" on public.review_saves;
drop policy if exists "Users can unsave reviews" on public.review_saves;
create policy "Users can view own saved reviews" on public.review_saves for select
  using (auth.uid() = user_id);
create policy "Users can save reviews" on public.review_saves for insert
  with check (auth.uid() = user_id);
create policy "Users can unsave reviews" on public.review_saves for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own reading stats" on public.reading_stats;
drop policy if exists "Users can manage own reading stats" on public.reading_stats;
create policy "Users can view own reading stats" on public.reading_stats for select
  using (auth.uid() = user_id);
create policy "Users can manage own reading stats" on public.reading_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own streaks" on public.streaks;
drop policy if exists "Users can manage own streaks" on public.streaks;
create policy "Users can view own streaks" on public.streaks for select
  using (auth.uid() = user_id);
create policy "Users can manage own streaks" on public.streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own reading goals" on public.reading_goals;
drop policy if exists "Users can manage own reading goals" on public.reading_goals;
create policy "Users can view own reading goals" on public.reading_goals for select
  using (auth.uid() = user_id);
create policy "Users can manage own reading goals" on public.reading_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Badges are viewable by everyone" on public.badges;
drop policy if exists "Users can manage own badges" on public.badges;
create policy "Badges are viewable by everyone" on public.badges for select
  using (true);
create policy "Users can manage own badges" on public.badges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
