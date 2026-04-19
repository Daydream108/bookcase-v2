drop policy if exists "System can insert notifications" on public.notifications;

create policy "System can insert notifications"
  on public.notifications
  for insert
  with check (auth.uid() = actor_id);
