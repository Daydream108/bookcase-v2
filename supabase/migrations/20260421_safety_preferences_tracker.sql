create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notify_follows boolean not null default true,
  notify_comments boolean not null default true,
  notify_upvotes boolean not null default true,
  notify_likes boolean not null default true,
  notify_club_activity boolean not null default true,
  notify_roadmap_updates boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('review', 'book_post', 'book_post_comment', 'club')),
  entity_id uuid not null,
  reason_category text not null check (reason_category in (
    'spam',
    'harassment',
    'hate',
    'spoilers',
    'self_harm',
    'sexual_content',
    'other'
  )),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists notification_preferences_updated_idx
  on public.notification_preferences (updated_at desc);
create index if not exists content_reports_reporter_idx
  on public.content_reports (reporter_id, created_at desc);
create index if not exists content_reports_entity_idx
  on public.content_reports (entity_type, entity_id);
create index if not exists content_reports_status_idx
  on public.content_reports (status, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.content_reports enable row level security;

drop policy if exists "Users can view own notification preferences" on public.notification_preferences;
drop policy if exists "Users can upsert own notification preferences" on public.notification_preferences;
create policy "Users can view own notification preferences" on public.notification_preferences for select
  using (auth.uid() = user_id);
create policy "Users can upsert own notification preferences" on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own reports" on public.content_reports;
drop policy if exists "Users can create own reports" on public.content_reports;
create policy "Users can view own reports" on public.content_reports for select
  using (auth.uid() = reporter_id);
create policy "Users can create own reports" on public.content_reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can view own blocked users" on public.blocked_users;
create policy "Users can view own blocked users" on public.blocked_users for select
  using (auth.uid() = user_id or auth.uid() = blocked_user_id);
