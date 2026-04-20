# Handoff Notes for Codex

Most of the Supabase wiring work is now live. The redesign, mobile layout, auth, search, rating, shelving, reviews, posts, streaks, notifications, clubs, explore, and roadmap all read real data through `lib/db.ts`.

## Status for 2026-04-20

- Done today: clubs, club detail, club membership, club posting, post comments, profile favorites, reading goals, badges, book tags, review saves, and activity-event writes are implemented.
- Build fix: public Supabase config now has repo-safe fallbacks, so Cloudflare prerender no longer depends on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` being injected during build.
- Main follow-up: run a manual live smoke test after the next deploy.

## Architecture

- Framework: Next.js 15 app router on Cloudflare Workers via `@opennextjs/cloudflare`
- Backend: Supabase (`https://dnkjfbxjsicqbtwoqhao.supabase.co`) with RLS enforced, schema in [supabase/bookcase.sql](supabase/bookcase.sql)
- Deploy: Cloudflare native Git integration, pushes to `main` auto-deploy
- Data layer: [lib/db.ts](lib/db.ts) is the single source of truth for reads and writes
- Adapters: `toUiBook(dbBook, stats?)` and `toUiUser(dbProfile)` keep the redesign components working without broad prop rewrites
- Auth client: client pages use `useMemo(() => createClient(), [])` for a stable Supabase instance
- Public config: [lib/supabase/config.ts](lib/supabase/config.ts) provides safe fallbacks for the public URL and anon key

## Remaining Feature Gaps for Tomorrow

### 1. Search only covers titles
- [app/(main)/search/page.tsx](app/(main)/search/page.tsx) is wired to the real database, but results are still limited to book titles.
- The UI still implies broader discovery, so authors, moods, readers, clubs, and discussion results either need to be added or the copy should be narrowed.

### 2. Settings page is still a static shell
- `/settings` is mostly presentational right now.
- Preferences, account controls, and notification toggles are not persisted yet.

### 3. Review likes and reactions are still local-only
- Review cards render a `VoteBar`, but those interactions are not saved to Supabase.
- If the live site supports review likes, we still need a real table or write path plus optimistic updates.

### 4. Share actions are UI-only
- Book, review, and post share buttons do not trigger a real share flow yet.
- We should wire native share or copy-link behavior, or hide those controls until they work.

### 5. Notifications are readable but not generated
- [app/(main)/notifications/page.tsx](app/(main)/notifications/page.tsx) can list and mark notifications read.
- The app still does not insert notification rows when people comment, join clubs, upvote, or interact elsewhere, so the inbox stays sparse.

### 6. Manual deployed smoke test
- Nothing has been verified end-to-end on the live Cloudflare Worker after the latest data wiring.
- Suggested path: sign up -> sign in -> search -> rate -> shelf -> review -> post -> comment -> join club -> log session -> verify streak, profile, and notifications.

## File Map

- [lib/db.ts](lib/db.ts): Supabase queries, types, and DB-to-UI adapters
- [lib/supabase/client.ts](lib/supabase/client.ts) and [lib/supabase/server.ts](lib/supabase/server.ts): browser and server Supabase factories
- [lib/supabase/config.ts](lib/supabase/config.ts): shared public Supabase config with repo-safe fallbacks
- [app/auth/signout/route.ts](app/auth/signout/route.ts): POST handler for sidebar signout
- [components/redesign/Sidebar.tsx](components/redesign/Sidebar.tsx): real profile, unread count, and streak data
- [components/redesign/home/PostComposer.tsx](components/redesign/home/PostComposer.tsx): inline book picker and post form

## Gotchas

- `book_posts.book_id` is not null, so every post must reference a book
- `reading_sessions` has a unique constraint on `(user_id, session_date, book_id)`, so same-day same-book logs upsert
- `streaks` is one row per user, and `touchStreak(supabase, userId)` in `lib/db.ts` handles increment and reset logic
- Supabase nested joins need FK hints when there are multiple foreign keys between two tables
- `roadmap_features.has_voted` is hydrated per request from `roadmap_votes`; it is not a stored column
- Async page params in Next 15 should use `use()` in client components or `await params` in server components

## Commit Style

Lowercase imperative, short, no ticket prefix. Recent examples:
- `add mobile layout: hamburger drawer, responsive grids, viewport meta`
- `fix broken main layout: drop grid shell, use margin-left offset`
- `fix Cover size prop to accept string for percentage widths`
