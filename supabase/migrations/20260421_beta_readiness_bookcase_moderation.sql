create table if not exists public.bookcase_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  row2_shelf text not null default 'reading' check (row2_shelf in ('reading', 'to_read', 'read', 'dnf')),
  row3_shelf text not null default 'to_read' check (row3_shelf in ('reading', 'to_read', 'read', 'dnf')),
  row2_custom_name text,
  row3_custom_name text,
  updated_at timestamptz not null default now(),
  constraint bookcase_preferences_unique_rows check (row2_shelf <> row3_shelf)
);

create index if not exists bookcase_preferences_updated_idx
  on public.bookcase_preferences (updated_at desc);

alter table public.bookcase_preferences enable row level security;

drop policy if exists "Bookcase preferences are viewable by everyone" on public.bookcase_preferences;
drop policy if exists "Users can manage own bookcase preferences" on public.bookcase_preferences;
create policy "Bookcase preferences are viewable by everyone" on public.bookcase_preferences for select
  using (true);
create policy "Users can manage own bookcase preferences" on public.bookcase_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.moderator_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.moderator_users enable row level security;

drop policy if exists "Users can view own moderator role" on public.moderator_users;
create policy "Users can view own moderator role" on public.moderator_users for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view own reports" on public.content_reports;
drop policy if exists "Users can create own reports" on public.content_reports;
drop policy if exists "Moderators can review reports" on public.content_reports;
drop policy if exists "Moderators can update reports" on public.content_reports;

create policy "Users can view own reports" on public.content_reports for select
  using (auth.uid() = reporter_id);
create policy "Users can create own reports" on public.content_reports for insert
  with check (auth.uid() = reporter_id);
create policy "Moderators can review reports" on public.content_reports for select
  using (
    exists (
      select 1
      from public.moderator_users
      where moderator_users.user_id = auth.uid()
    )
  );
create policy "Moderators can update reports" on public.content_reports for update
  using (
    exists (
      select 1
      from public.moderator_users
      where moderator_users.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.moderator_users
      where moderator_users.user_id = auth.uid()
    )
  );
