# Bookcase Handoff

This is the single source of truth for project status and the next must-have queue.

## Current Status

Most of the Supabase wiring is live. The redesign, mobile layout, auth, password recovery, email confirmation resend, search, rating, shelving, reviews, posts, streaks, notifications, clubs, explore, roadmap, Goodreads onboarding, animated bookcase, half-star ratings, thread up/downvotes, nested comment replies, direct bookcase add/remove, moderation reporting, user blocking, live notification preferences, stronger onboarding, broader-catalog search/import, notification filters and deep links, comic/graphic novel/manga import tagging, tracker session edit/delete, reusable broader-catalog pickers, a first-class safety center, and server-ready bookcase layout sync all read or write through `lib/db.ts`.

Latest completed pushes:
- `eb29b1b` - `ship error pages, half-stars, downvotes, nested replies, bookcase add/remove`
- `56dc91f` - `ship bookcase redesign, search, and goodreads import`

## What Just Shipped

- App-level error boundary in `app/error.tsx` and 404 page in `app/not-found.tsx`.
- Half-star ratings end to end. `components/redesign/Stars.tsx` exposes `StarDisplay` and `HalfStarInput`; they are wired into the book page sidebar, review modal, review list, landing page, and home `ReviewCard`.
- Downvotes on threads. `setPostVote` plus `listPostVotes` in `lib/db.ts` drive the stacked up/down vote control.
- Nested comment replies with a 2-level depth cap on the book page.
- Direct bookcase add/remove from the visible `+` slots on profile shelves.
- Search now reaches beyond the local Supabase catalog. `app/api/catalog/search/route.ts` queries Open Library through `lib/openlibrary.ts`, the search page shows broader-catalog matches, and `importCatalogBook` in `lib/db.ts` lets users import a missing result straight into Bookcase.
- Password recovery and email confirmation recovery are now live. Login links to `/forgot-password`, signup can resend confirmation emails, `/auth/callback` finishes Supabase email redirects, `/auth/confirm` forwards token-hash links into that flow, and `/reset-password` updates the user's password in-app.
- Reporting now has repo-backed storage and UI. Reviews, threads, comments, and clubs all expose `ReportButton`, backed by `content_reports`.
- Blocking is now enforced through the app read paths. Blocked users are filtered out of feeds, search results, clubs, notifications, and profile activity, and profile pages hide shelf data when a block exists.
- Notification settings are now real account-backed preferences instead of local-only placeholders. `notification_preferences` gates notification inserts at write time.
- New-user onboarding is stronger. `/home` has a real checklist, Goodreads import ends with concrete next steps, and the first "add books" step now pushes new users toward `/import`.
- Reading tracker reliability is tighter. Same-day same-book logs accumulate instead of clobbering, streaks derive from actual session dates, yearly goal sync is timezone-safe, and `/streak` now shows recent sessions back to the reader.
- Catalog fallback is better. Missing covers now fall back to ISBN-driven Open Library covers so sparse catalog rows look more complete without waiting on a backfill.
- Notifications are easier to use. `/notifications` now has filter tabs plus real click-through targets for follows, likes, replies, clubs, roadmap items, and thread activity.
- Broader-catalog imports now classify comic formats. Open Library imports can attach `Comic`, `Graphic Novel`, or `Manga` tags automatically so those titles are searchable and visibly supported in the product instead of being treated as invisible edge cases.
- `/safety` now gives readers a real safety center with their submitted reports, blocked-reader management, and a moderator queue that activates once the new migration is applied and moderator rows exist.
- The streak tracker now supports broader-catalog picking, session history windows, and edit/delete controls for logged sessions.
- Bookcase row 2 and row 3 can now sync through a real `bookcase_preferences` table when the new migration is applied, while still falling back to local storage if the table is not live yet.
- Profile shelves, streak logging, and thread creation now share a reusable broader-catalog picker, so missing books can be imported in-place instead of becoming dead ends.

## Need Next

These are the next must-have product gaps after this pass.

1. Apply and verify `supabase/migrations/20260421_beta_readiness_bookcase_moderation.sql` in production so synced bookcase layouts and moderator review tools are actually live on the deployed app.
2. Expand search depth until long-tail catalog coverage feels competitive with Fable, Pagebound, or StoryGraph.
3. Add a proper moderator assignment flow and more review actions, since moderators are currently granted by inserting rows in `moderator_users`.
4. Finish bookcase customization beyond stock shelves: custom row names, custom list-backed rows, and richer shelf editing controls.
5. Notifications polish: per-type filter memory, deep links for every notification variant, and better bulk actions.
6. Catalog support beyond prose books should be verified and polished everywhere: comics, manga, graphic novels, omnibus editions, and other visual reading formats need to feel first-class in every flow.
7. Demo polish and QA: finish remaining text cleanup, run the live smoke test, and verify every new flow on the real Cloudflare worker.

## Immediate Follow-Up

### 1. Apply the new Supabase migrations
- Run `supabase/migrations/20260421_safety_preferences_tracker.sql` and `supabase/migrations/20260421_beta_readiness_bookcase_moderation.sql` against the live project before relying on synced bookcase layouts or moderator review tools.
- If the Supabase project already exists, do not rerun `supabase/bookcase.sql`. Use `supabase/migrations/20260421_existing_project_safe_apply.sql` instead so you avoid seed collisions like duplicate `book_genres` rows.

Why this matters:
- The repo now contains the schema, but production still needs the tables and RLS policies created.

### 2. Manual live smoke test
- Re-run the end-to-end deploy smoke test after the next push so we verify the new moderation, preferences, onboarding, and tracker flows on the real Cloudflare worker.

Why this matters:
- This pass touched several core loops and needs a real browser check, not just local build success.

## Lower-Priority But Real

- Down/up-vote button on the home feed card, since voting still only works on the book page.
- Explore grid sizing cleanup.
- More visible share-copy confirmation.
- Search caching or full-text search.
- Real legal/footer pages on the landing page.

## Manual Smoke Test Still Needed

Nothing has been verified end-to-end on the live Cloudflare Worker since the latest wiring.

Suggested path:
- Sign up
- Goodreads import
- Confirm the signup email and make sure it lands in `/import`
- Request a password reset email and finish the `/reset-password` flow
- Search by title, author, username, and club
- Import a broader-catalog result that was not already in Supabase
- Rate a book with a half-star value
- Shelf a book
- Add and remove a book directly from the profile bookcase
- Block a reader and verify they disappear from search/feed/profile activity
- Submit a report on a review, thread, comment, and club
- Write a review
- Like another user's review
- Share a link
- Start a thread
- Comment on a thread, then reply to a comment
- Upvote and downvote a thread
- Trigger the 404 page by visiting `/does-not-exist`
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

- `lib/db.ts`: Supabase queries, types, adapters, Goodreads bulk import helpers, notifications helper, `setPostVote`, `listPostVotes`, `removeUserBook`, and `importCatalogBook`
- `lib/auth-redirect.ts`: shared auth callback URL builder and safe local redirect sanitizer
- `lib/goodreads.ts`: Goodreads CSV parser and preview helpers
- `lib/openlibrary.ts`: Open Library search normalization and cover helpers
- `lib/share.ts`: Web Share API wrapper with clipboard fallback
- `lib/supabase/client.ts` and `lib/supabase/server.ts`: browser/server Supabase factories
- `lib/supabase/config.ts`: repo-safe public Supabase config
- `components/redesign/ReportButton.tsx`: reusable report popover for reviews, threads, comments, and clubs
- `app/error.tsx` and `app/not-found.tsx`: app-level error and 404 boundaries
- `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`, and `app/(auth)/auth/callback/page.tsx`: password reset request, password update, and Supabase email redirect handling
- `app/auth/confirm/route.ts`: compatibility redirect for token-hash email links
- `app/api/catalog/search/route.ts`: broader-catalog search proxy
- `app/(main)/import/page.tsx`: Goodreads onboarding/import UI
- `app/(main)/streak/page.tsx`: streak tracker, goal editor, and recent session history
- `app/(main)/profile/[username]/page.tsx`: profile page with bookcase and inline picker modal for add/remove
- `app/(main)/search/page.tsx`: local search plus broader-catalog import UI
- `components/redesign/Bookcase.tsx`: reusable wooden shelf component with `onAddToShelf` and `onRemoveFromShelf`
- `components/redesign/Stars.tsx`: `StarDisplay` and `HalfStarInput`
- `components/redesign/PostUpvoteButton.tsx`: legacy `PostUpvoteButton` plus `PostVoteButtons`
- `components/redesign/LikeButton.tsx`: optimistic review-like button
- `components/redesign/Sidebar.tsx`: profile summary, unread count, streak, safety nav link
- `components/redesign/home/PostComposer.tsx`: inline book picker and post form
- `components/redesign/CatalogBookPickerModal.tsx`: shared local-plus-broader-catalog picker with in-place import
- `app/(main)/safety/page.tsx`: safety center for reports, blocked readers, and moderator queue
- `supabase/migrations/20260421_beta_readiness_bookcase_moderation.sql`: bookcase sync and moderator policy migration
- `app/auth/signout/route.ts`: POST handler for sidebar signout
- `supabase/migrations/20260421_safety_preferences_tracker.sql`: notification preference, report storage, and block-policy migration

## Gotchas

- `book_posts.book_id` is not null, so every post must reference a book.
- `reading_sessions` has a unique constraint on `(user_id, session_date, book_id)`.
- `streaks` is one row per user, and `touchStreak()` in `lib/db.ts` handles increment/reset logic.
- `book_post_upvotes.vote_value` is constrained to `in (1, -1)`, and a trigger keeps `book_posts.upvotes` as the signed sum.
- `book_post_comments.parent_id` is self-referential; the book page builds a tree and caps nesting at 2 levels.
- Supabase nested joins need FK hints when multiple foreign keys exist between the same tables.
- `roadmap_features.has_voted` is hydrated per request from `roadmap_votes`; it is not stored.
- Async page params in Next 15 should use `use()` in client components or `await params` in server components.
- `notifications` RLS requires `auth.uid() = actor_id`, so client-created notifications must use the current user as actor.
- Reporting and live notification preference storage require the `20260421_safety_preferences_tracker.sql` migration to be applied in Supabase.
- Supabase Auth needs the app origin and `/auth/callback` on the redirect allow list or confirmation/reset emails will bounce before the app can finish the flow.
- Bookcase row 2 and row 3 now prefer `bookcase_preferences` when that table exists; otherwise they still fall back to `localStorage` under `bookcase-layout:{profileId}`.
- Moderator review tooling depends on `moderator_users` and the updated `content_reports` policies from `20260421_beta_readiness_bookcase_moderation.sql`.

## Commit Style

Use short lowercase imperative commit messages with no ticket prefix.

Examples:
- `ship error pages, half-stars, downvotes, nested replies, bookcase add/remove`
- `wire review likes, share actions, settings, expanded search, event notifications`
- `finish codex handoff features`
- `fix cloudflare supabase build config`
