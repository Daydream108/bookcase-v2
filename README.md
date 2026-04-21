# Bookcase Handoff

This is the single source of truth for project status and the next must-have queue.

## Current Status

Most of the Supabase wiring is live. The redesign, mobile layout, auth, search, rating, shelving, reviews, posts, streaks, notifications, clubs, explore, roadmap, Goodreads onboarding, animated bookcase, half-star ratings, thread up/downvotes, nested comment replies, and direct bookcase add/remove all read or write through `lib/db.ts`.

Latest completed push:
- `eb29b1b` — `ship error pages, half-stars, downvotes, nested replies, bookcase add/remove`
- `56dc91f` — `ship bookcase redesign, search, and goodreads import`

## What just shipped

- App-level error boundary (`app/error.tsx`) and 404 page (`app/not-found.tsx`).
- Half-star ratings end to end. `components/redesign/Stars.tsx` exposes `StarDisplay` and `HalfStarInput`; wired into the book page sidebar, review modal, review list, landing page, and home `ReviewCard`. Schema already allowed `numeric(3,1)`.
- Downvotes on threads. `setPostVote` + `listPostVotes` in `lib/db.ts` drive a new `PostVoteButtons` with stacked up/down arrows and a signed score.
- Nested comment replies with a 2-level depth cap. Per-comment reply composer on the book page, backed by the existing `book_post_comments.parent_id` column.
- Direct bookcase add/remove from the `+` slots. New `removeUserBook` helper; `Bookcase` takes `onAddToShelf` / `onRemoveFromShelf`; the profile page mounts a live-search picker modal.

## Must-Have Queue

### 1. Add-a-book flow from empty search
- When search returns nothing, users need a real path to import a missing book into Supabase.
- Best path is Open Library or Google Books lookup by title, author, or ISBN.
- If multiple editions match, let the user choose instead of silently creating bad data.
- Search coverage itself needs to expand so the catalog feels much closer to Fable, Pagebound, or StoryGraph, where users expect basically every normal book they look for to be discoverable.
- The goal is not just "empty search can import a book" — it is "most searches should already find the book, and misses should be rare."

Why this matters:
- A reading app breaks if users cannot add the book they want to track.

### 2. Password reset and email-recovery flow
- Add "Forgot password?" on login.
- Add reset-password token handling and reset UI.
- Add resend-confirmation support after signup.

Why this matters:
- Users can currently get stranded after signup or lockout.

### 3. Moderation, reporting, and blocking
- Add report actions for reviews, threads, comments, and clubs.
- Add block-user UX and enforce it in feeds, notifications, and profiles.
- Add real storage/workflow behind reports.

Why this matters:
- This is a public social app. Safety cannot stay implicit.

### 4. Notification settings that actually work
- The settings toggles cannot remain local-only if they stay visible.
- Either store server-side notification prefs and honor them at write time, or hide the toggles until they are real.

Why this matters:
- Fake settings break trust.

### 5. Better onboarding after signup/import
- After Goodreads import or skip, guide the user into favorites, follows, clubs, ratings, and first reading session.
- Add useful empty states on `/home`.

Why this matters:
- Signup now reaches import, but the first-session path is still incomplete.

### 6. Streak and reading tracker reliability
- The streak needs to update correctly when a user logs reading and it needs to stay accurate across refreshes, same-day logs, and day changes.
- The reading tracker flow needs to reliably save session data, show it back to the user, and keep profile / goal surfaces in sync.
- Re-check the edge cases around duplicate same-day sessions, timezone boundaries, and how imported history should or should not affect the live streak.

Why this matters:
- Streaks and tracking are core habit loops in the product, so if they feel inconsistent the app loses trust fast.
- Users need to believe that logging reading actually counts.

### 7. Book catalog quality
- Backfill or fetch missing `cover_url` values.
- Prefer ISBN-driven enrichment.
- Clean up duplicate editions as add-a-book lands.

Why this matters:
- Catalog trust is product trust in a reading app.

## Lower-Priority But Real

- Persist bookcase row config server-side (currently localStorage-only per user) and support custom row names.
- Down/up-vote button on the home feed card (currently display-only; voting works on the book page).
- Notify the parent comment author on reply (currently only the thread author is notified).
- Explore grid sizing cleanup.
- More visible share-copy confirmation.
- Search caching or full-text search.
- Real legal/footer pages on the landing page.

## Manual Smoke Test Still Needed

Nothing has been verified end-to-end on the live Cloudflare Worker since the latest wiring.

Suggested path:
- Sign up
- Goodreads import
- Search by title, author, username, and club
- Rate a book with a half-star value
- Shelf a book
- Add and remove a book directly from the profile bookcase
- Write a review
- Like another user's review
- Share a link
- Start a thread
- Comment on a thread, then reply to a comment
- Upvote and downvote a thread
- Trigger the 404 page (visit `/does-not-exist`)
- Join a club
- Log a reading session
- Verify streak, profile stats, imported lists, and notifications

## Architecture

- Framework: Next.js 15 app router on Cloudflare Workers via `@opennextjs/cloudflare`
- Backend: Supabase with RLS enforced, schema in `supabase/bookcase.sql`
- Deploy: Cloudflare native Git integration, pushes to `main` auto-deploy
- Data layer: `lib/db.ts` is the main read/write source of truth
- Adapters: `toUiBook(dbBook, stats?)` and `toUiUser(dbProfile)` keep redesign components working without broad prop rewrites
- Auth client: client pages use `useMemo(() => createClient(), [])`
- Public config: `lib/supabase/config.ts` provides safe public URL and anon-key fallbacks

## File Map

- `lib/db.ts`: Supabase queries, types, adapters, Goodreads bulk import helpers, notifications helper (includes `setPostVote`, `listPostVotes`, `removeUserBook`)
- `lib/goodreads.ts`: Goodreads CSV parser and preview helpers
- `lib/share.ts`: Web Share API wrapper with clipboard fallback
- `lib/supabase/client.ts` and `lib/supabase/server.ts`: browser/server Supabase factories
- `lib/supabase/config.ts`: repo-safe public Supabase config
- `app/error.tsx` and `app/not-found.tsx`: app-level error + 404 boundaries
- `app/(main)/import/page.tsx`: Goodreads onboarding/import UI
- `app/(main)/profile/[username]/page.tsx`: profile page with bookcase + inline picker modal for add/remove
- `components/redesign/Bookcase.tsx`: reusable wooden shelf component (takes `onAddToShelf` / `onRemoveFromShelf`)
- `components/redesign/Stars.tsx`: `StarDisplay` (overlay-clip) and `HalfStarInput` (half-width buttons)
- `components/redesign/PostUpvoteButton.tsx`: `PostUpvoteButton` (legacy upvote-only) and `PostVoteButtons` (up + down)
- `components/redesign/LikeButton.tsx`: optimistic review-like button
- `components/redesign/Sidebar.tsx`: profile summary, unread count, streak
- `components/redesign/home/PostComposer.tsx`: inline book picker and post form
- `app/auth/signout/route.ts`: POST handler for sidebar signout

## Gotchas

- `book_posts.book_id` is not null, so every post must reference a book.
- `reading_sessions` has a unique constraint on `(user_id, session_date, book_id)`.
- `streaks` is one row per user, and `touchStreak()` in `lib/db.ts` handles increment/reset logic.
- `book_post_upvotes.vote_value` is constrained to `in (1, -1)`; an insert/update/delete trigger keeps `book_posts.upvotes` as the signed sum.
- `book_post_comments.parent_id` is self-referential; the book page builds a tree and caps nesting at 2 levels.
- Supabase nested joins need FK hints when multiple foreign keys exist between the same tables.
- `roadmap_features.has_voted` is hydrated per request from `roadmap_votes`; it is not stored.
- Async page params in Next 15 should use `use()` in client components or `await params` in server components.
- `notifications` RLS requires `auth.uid() = actor_id`, so client-created notifications must use the current user as actor.
- The bookcase row 2/3 shelf choice is stored in `localStorage` under `bookcase-layout:{profileId}`; not synced across devices yet.

## Commit Style

Use short lowercase imperative commit messages with no ticket prefix.

Examples:
- `ship error pages, half-stars, downvotes, nested replies, bookcase add/remove`
- `wire review likes, share actions, settings, expanded search, event notifications`
- `finish codex handoff features`
- `fix cloudflare supabase build config`
