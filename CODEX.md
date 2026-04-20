# Handoff notes for Codex

Every page now reads and writes real Supabase data via `lib/db.ts`. The visual redesign, mobile layout, auth, search, rating, shelving, reviews, posts, streaks, notifications, clubs (read-only), explore, and roadmap are wired end-to-end.

## Architecture

- **Framework**: Next.js 15 (app router) on Cloudflare Workers via `@opennextjs/cloudflare`
- **Backend**: Supabase (`https://dnkjfbxjsicqbtwoqhao.supabase.co`) — ~35 tables, RLS enforced, see [supabase/bookcase.sql](supabase/bookcase.sql)
- **Deploy**: Cloudflare native Git integration, pushes to `main` auto-deploy
- **Data layer**: all reads/writes go through [lib/db.ts](lib/db.ts) — page-level helpers accept `SupabaseClient` so they work from client or server
- **Adapters**: `toUiBook(dbBook, stats?)` and `toUiUser(dbProfile)` in `lib/db.ts` convert DB shapes to the shape the existing `Cover`/`Avatar` components expect — avoids component rewrites
- **Auth client**: `useMemo(() => createClient(), [])` in client pages to keep a stable Supabase instance across renders

## Known gaps (pick any — user will prioritize)

### 1. Club membership and creation
- Schema exists (`clubs`, `club_members`, `club_posts`) but only `listClubs()` is implemented
- [app/(main)/clubs/page.tsx](app/(main)/clubs/page.tsx) is read-only — no join/leave buttons, no create-club form, no club detail page
- Need: `joinClub`, `leaveClub`, `createClub`, `listClubPosts`, `postToClub` helpers + a `/clubs/[id]` route

### 2. Post comments
- `book_post_comments` table exists in schema, not exposed anywhere in UI
- Book posts and home feed show upvote counts but no comment thread
- Need: `listPostComments`, `createComment`, `deleteComment` helpers + comment UI on post cards

### 3. Favorite books (pinned to profile)
- `favorite_books` table exists, max 4 pinned per user
- [app/(main)/profile/[username]/page.tsx](app/(main)/profile/[username]/page.tsx) has no favorites section
- Need: `listFavorites`, `pinFavorite`, `unpinFavorite` helpers + a "Favorites" row on profile with reorder UI

### 4. Reading goals
- `reading_goals` table exists (yearly goal, book count target)
- No UI anywhere
- Need: goal set/edit flow on profile or streak page, progress bar on home dashboard

### 5. Badges
- `badges` table exists with earned badges per user
- Profile page does not display them
- Need: `listBadges(userId)` helper + badge row on profile, plus badge-earned toast on relevant actions

### 6. Book tags
- `tags` + `book_tags` tables exist
- [app/(main)/book/[id]/page.tsx](app/(main)/book/[id]/page.tsx) removed the mock tags display — never added back with real data
- Need: `listBookTags`, `addTag`, `removeTag` helpers + a tag chip row on the book page

### 7. Review saves/bookmarks
- `review_saves` table exists
- Review cards on book page have no save/bookmark button
- Need: `toggleReviewSave` helper + bookmark icon on review cards

### 8. Activity events not auto-populated
- `activity_events` table is read by `listRecentActivity` on the home feed
- No DB-side triggers write to it on user_books insert, review insert, session log, etc.
- Either add Postgres triggers (cleanest) or have `lib/db.ts` explicitly insert activity rows alongside the main writes
- Currently home feed activity sidebar will look sparse until this is fixed

### 9. Smoke test on deployed Worker
- Nothing has been verified end-to-end on the Cloudflare deployment
- Should manually test: signup → sign in → search → rate → shelf → review → post → log session → check streak → upvote roadmap
- Watch browser console and Worker logs for RLS denials or missing FK hints in Supabase queries

## File map

- [lib/db.ts](lib/db.ts) — single source of truth for all Supabase queries and types (`DbBookCard`, `DbProfile`, `DbReview`, `DbRoadmapFeature`, etc.)
- [lib/supabase/client.ts](lib/supabase/client.ts) / [lib/supabase/server.ts](lib/supabase/server.ts) — SSR-aware Supabase client factories
- [app/auth/signout/route.ts](app/auth/signout/route.ts) — POST handler for sidebar signout form
- [components/redesign/Sidebar.tsx](components/redesign/Sidebar.tsx) — reads real profile + unread count + streak
- [components/redesign/home/PostComposer.tsx](components/redesign/home/PostComposer.tsx) — inline book picker + post form (book_posts requires book_id, so search-pick is mandatory)

## Gotchas

- `book_posts.book_id` is NOT NULL — every post must reference a book. This is why the home composer has an inline book picker instead of a plain textarea.
- `reading_sessions` has a unique constraint on `(user_id, session_date, book_id)` — same-day same-book logs upsert rather than duplicate.
- `streaks` row is per-user (PK on user_id). `touchStreak(supabase, userId)` in `lib/db.ts` hand-rolls the increment/reset logic because there's no DB trigger for it.
- Supabase nested joins need FK hints when there are multiple FKs between two tables, e.g. `profile:profiles!reviews_user_id_fkey(*)` rather than `profile:profiles(*)`.
- `roadmap_features.has_voted` is not a column — `listRoadmapFeatures()` hydrates it per-request by joining against `roadmap_votes` for the current user.
- Async page params in Next 15 — use the `use()` hook or `await params` in server components.

## Commit style

Lowercase imperative, short, no ticket prefix. Recent examples:
- `add mobile layout: hamburger drawer, responsive grids, viewport meta`
- `fix broken main layout: drop grid shell, use margin-left offset`
- `fix Cover size prop to accept string for percentage widths`
