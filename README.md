# Bookcase Handoff

This is now the single source of truth for project status and tomorrow's must-have queue.

## Current Status

Most of the Supabase wiring is live. The redesign, mobile layout, auth, search, rating, shelving, reviews, posts, streaks, notifications, clubs, explore, roadmap, and Goodreads onboarding all read or write through `lib/db.ts`.

Latest completed push:
- `56dc91f` — `ship bookcase redesign, search, and goodreads import`

## Must-Have Queue For Tomorrow

These are the real needs, not just nice-to-haves.

### 1. Error handling and missing-page UX
- Add `app/error.tsx`.
- Add `app/not-found.tsx`.
- Keep inline empty states where helpful, but stop hard crashes and blank-page failures at the app level.

Why this matters:
- Broken routes and runtime exceptions still feel like total app failure.

### 2. Add-a-book flow from empty search
- When search returns nothing, users need a real path to import a missing book into Supabase.
- Best path is Open Library or Google Books lookup by title, author, or ISBN.
- If multiple editions match, let the user choose instead of silently creating bad data.
- Search coverage itself needs to expand so the catalog feels much closer to Fable, Pagebound, or StoryGraph, where users expect basically every normal book they look for to be discoverable.
- The goal is not just "empty search can import a book" — it is "most searches should already find the book, and misses should be rare."

Why this matters:
- A reading app breaks if users cannot add the book they want to track.

### 3. Password reset and email-recovery flow
- Add "Forgot password?" on login.
- Add reset-password token handling and reset UI.
- Add resend-confirmation support after signup.

Why this matters:
- Users can currently get stranded after signup or lockout.

### 4. Moderation, reporting, and blocking
- Add report actions for reviews, threads, comments, and clubs.
- Add block-user UX and enforce it in feeds, notifications, and profiles.
- Add real storage/workflow behind reports.

Why this matters:
- This is a public social app. Safety cannot stay implicit.

### 5. Notification settings that actually work
- The settings toggles cannot remain local-only if they stay visible.
- Either store server-side notification prefs and honor them at write time, or hide the toggles until they are real.

Why this matters:
- Fake settings break trust.

### 6. Comment replies and thread structure
- Add nested replies for book-thread comments.
- Cap depth so it stays readable.
- Reply actions should target a specific comment, not just dump into one flat list.

Why this matters:
- Flat comments do not scale once book discussions get active.

### 7. Half-star ratings
- Support `0.5` increments anywhere a user writes a rating.
- Align UI, schema, and rating display logic.

Why this matters:
- Ratings are a core action and whole-star-only is too coarse.

### 8. Downvotes on discussion threads
- Support both upvote and downvote for book threads.
- Keep one vote row per user per post and treat score as signed total.

Why this matters:
- Discussion quality tooling is incomplete with upvotes only.

### 9. Better onboarding after signup/import
- After Goodreads import or skip, guide the user into favorites, follows, clubs, ratings, and first reading session.
- Add useful empty states on `/home`.

Why this matters:
- Signup now reaches import, but the first-session path is still incomplete.

### 10. Streak and reading tracker reliability
- The streak needs to update correctly when a user logs reading and it needs to stay accurate across refreshes, same-day logs, and day changes.
- The reading tracker flow needs to reliably save session data, show it back to the user, and keep profile / goal surfaces in sync.
- Re-check the edge cases around duplicate same-day sessions, timezone boundaries, and how imported history should or should not affect the live streak.

Why this matters:
- Streaks and tracking are core habit loops in the product, so if they feel inconsistent the app loses trust fast.
- Users need to believe that logging reading actually counts.

### 11. Direct bookcase add/remove controls
- Users need to be able to add books directly into the profile bookcase from the visible `+` spaces.
- Users need to be able to remove books from the bookcase without relying on hidden or indirect management flows.
- This should work for the favorites shelf and any other rows that visibly present empty slots.

Why this matters:
- The bookcase is now one of the main profile features, so it cannot stay mostly display-only.
- Empty `+` slots create a clear expectation that users can click to add a book right there.

### 12. Book catalog quality
- Backfill or fetch missing `cover_url` values.
- Prefer ISBN-driven enrichment.
- Clean up duplicate editions as add-a-book lands.

Why this matters:
- Catalog trust is product trust in a reading app.

## Lower-Priority But Real

- Persisted profile bookcase row config and custom row names.
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
- Rate a book
- Shelf a book
- Write a review
- Like another user's review
- Share a link
- Start a thread
- Comment on a thread
- Upvote a thread
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

- `lib/db.ts`: Supabase queries, types, adapters, Goodreads bulk import helpers, notifications helper
- `lib/goodreads.ts`: Goodreads CSV parser and preview helpers
- `lib/share.ts`: Web Share API wrapper with clipboard fallback
- `lib/supabase/client.ts` and `lib/supabase/server.ts`: browser/server Supabase factories
- `lib/supabase/config.ts`: repo-safe public Supabase config
- `app/(main)/import/page.tsx`: Goodreads onboarding/import UI
- `app/(main)/profile/[username]/page.tsx`: profile page with bookcase
- `components/redesign/Bookcase.tsx`: reusable wooden shelf component
- `components/redesign/LikeButton.tsx`: optimistic review-like button
- `components/redesign/Sidebar.tsx`: profile summary, unread count, streak
- `components/redesign/home/PostComposer.tsx`: inline book picker and post form
- `app/auth/signout/route.ts`: POST handler for sidebar signout

## Gotchas

- `book_posts.book_id` is not null, so every post must reference a book.
- `reading_sessions` has a unique constraint on `(user_id, session_date, book_id)`.
- `streaks` is one row per user, and `touchStreak()` in `lib/db.ts` handles increment/reset logic.
- Supabase nested joins need FK hints when multiple foreign keys exist between the same tables.
- `roadmap_features.has_voted` is hydrated per request from `roadmap_votes`; it is not stored.
- Async page params in Next 15 should use `use()` in client components or `await params` in server components.
- `notifications` RLS requires `auth.uid() = actor_id`, so client-created notifications must use the current user as actor.
- `components/redesign/home/ReviewCard.tsx` is legacy and is not currently mounted anywhere.

## Commit Style

Use short lowercase imperative commit messages with no ticket prefix.

Examples:
- `wire review likes, share actions, settings, expanded search, event notifications`
- `finish codex handoff features`
- `fix cloudflare supabase build config`
