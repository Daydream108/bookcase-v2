# Handoff Notes for Codex

Most of the Supabase wiring work is now live. The redesign, mobile layout, auth, search, rating, shelving, reviews, posts, streaks, notifications, clubs, explore, and roadmap all read real data through `lib/db.ts`.

## Status for 2026-04-20 (latest push)

See **Next Features** section below for the active feature queue (half-star ratings, downvotes, comment replies, bookcase visual, explore sizing fix).


- Done today (earlier Codex pass): clubs, club detail, club membership, club posting, post comments, profile favorites, reading goals, badges, book tags, review saves, activity-event writes.
- Build fix: public Supabase config now has repo-safe fallbacks, so Cloudflare prerender no longer depends on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` being injected during build.
- Done in follow-up push (commit 0014792):
  - Review likes write to the `likes` table via [components/redesign/LikeButton.tsx](components/redesign/LikeButton.tsx) with optimistic UI.
  - Share buttons (book, review, thread) use Web Share API with clipboard fallback via [lib/share.ts](lib/share.ts).
  - Settings page loads and persists real profile fields (display name, username, bio, location) plus local-only privacy and notification toggles.
  - Search covers books (title and author), readers, and public clubs with All/Books/Readers/Clubs tabs.
  - Notifications now insert on follow, post upvote, post comment, review like, and club join. RLS requires `actor_id = auth.uid()`, which is always satisfied.
- Main follow-up: run a manual live smoke test after the next deploy.

## Architecture

- Framework: Next.js 15 app router on Cloudflare Workers via `@opennextjs/cloudflare`
- Backend: Supabase (`https://dnkjfbxjsicqbtwoqhao.supabase.co`) with RLS enforced, schema in [supabase/bookcase.sql](supabase/bookcase.sql)
- Deploy: Cloudflare native Git integration, pushes to `main` auto-deploy
- Data layer: [lib/db.ts](lib/db.ts) is the single source of truth for reads and writes
- Adapters: `toUiBook(dbBook, stats?)` and `toUiUser(dbProfile)` keep the redesign components working without broad prop rewrites
- Auth client: client pages use `useMemo(() => createClient(), [])` for a stable Supabase instance
- Public config: [lib/supabase/config.ts](lib/supabase/config.ts) provides safe fallbacks for the public URL and anon key

## Remaining Gaps

### 1. Manual deployed smoke test (highest priority)
- Nothing has been verified end-to-end on the live Cloudflare Worker since the latest wiring.
- Suggested path: sign up -> sign in -> search (try a book title, an author name, a username, a club) -> rate -> shelf -> review -> like another user's review -> share (should copy a link) -> post a thread -> comment -> upvote -> join club -> log session -> verify streak, profile stats, and the notifications inbox actually fills up.

### 2. Notification preference toggles are client-only
- The toggles on [app/(main)/settings/page.tsx](app/(main)/settings/page.tsx) persist to `localStorage` under `bookcase:prefs` but don't gate actual writes.
- If a user turns off "new followers" notifications, we still insert a `follow` row. Decide whether to: (a) add a `notification_prefs` table, (b) skip inserts at source based on the recipient's prefs, or (c) hide preferences until they mean something.

### 3. Mentions / `list_mention` notifications
- The notification `type` check allows `list_mention`, but nothing in the app generates mentions yet.
- Either wire `@username` parsing in comments/posts or remove the claim from the notifications type map.

### 4. `roadmap_status` notifications
- When an admin flips a feature to `in_progress` or `completed`, voters should get a `roadmap_status` notification.
- Current RLS requires `actor_id = auth.uid()`, so this likely needs either an admin role or a Postgres trigger running as a service role.

### 5. Share action copy confirmation is a flash toast
- Works, but consider a visible "copied!" chip on the button itself for touch devices where the toast appears far away from the tap target.

### 6. Search results are uncached
- Three parallel queries per keystroke (180 ms debounced). Fine for now, but if the books table grows we should push to Postgres full-text search or cache author lookups.

## Next Features (2026-04-20 request)

### A. Half-star ratings (0.5 → 5.0)
- Users need to vote in 0.5 increments, not just whole stars.
- Schema: `user_books.rating` and `reviews.rating` are currently `int`. Switch to `numeric(2,1)` with CHECK (rating >= 0.5 AND rating <= 5 AND rating * 2 = floor(rating * 2)).
- UI: replace the 5-star input in review modal and quick-rate on book page with a 10-step hover/click target (each star = two zones, left half and right half).
- Aggregation: `books.avg_rating` math already handles floats, but re-verify `toUiBook` + any `.toFixed(1)` call sites.

### B. Downvote button on threads (and reviews?)
- Current `book_post_upvotes.vote_value` column already supports `-1`, but `togglePostUpvote` in [lib/db.ts](lib/db.ts) only ever writes `+1`.
- Add a second `△` button that writes `vote_value = -1` and toggles in the same row (only one of up/down can be active per user per post). `upvotes` count becomes `SUM(vote_value)` — confirm the trigger/computed column reflects that.
- Decide whether review likes also get a dislike, or if reviews stay like-only (recommended: reviews stay like-only, threads get up/down — matches most book apps).

### C. Reply to a specific comment (nested threading)
- `book_post_comments` currently has no parent column. Add `parent_comment_id uuid references book_post_comments(id)` (nullable).
- Cap display at 2 levels deep to avoid Reddit-style rabbit holes; deeper replies get flattened under the L2 parent.
- UI: every comment needs a "Reply" button that opens an inline composer scoped to that comment.

### D. Explore page — book covers are way too big
- [app/(main)/explore/page.tsx](app/\(main\)/explore/page.tsx) currently renders full-resolution covers at whatever width the grid gives them (~340px wide on desktop).
- Target: 160-180px max-width tiles, CSS grid `repeat(auto-fill, minmax(160px, 1fr))`. Or switch to a Letterboxd-style poster wall with smaller covers + more per row.

### E. Animated bookcase on profile page (biggest visual feature)
- Screenshot shows a wooden 3-shelf bookcase on the user's profile with real spines: author surname printed vertically on the spine, title across the top, natural cloth/leather spine colors keyed to each book.
- Shelves are fixed at **3 rows** for now.
- **Row 1 is always Favorites** — user can't rename or reassign row 1.
- **Rows 2 and 3 are user-pickable** from a fixed enum: `currently_reading`, `want_to_read`, `finished`, `series`, `dnf`, or a custom named list.
- Each spine needs to be clickable — link to `/book/:id`.
- Nice-to-have: spine tilt/hover animation; "tap a spine to pull it off the shelf" is already the caption in the screenshot, so either implement the pull-out preview card or drop the caption.
- Schema: add `profile_shelf_config` row per user: `{ row2_type, row2_custom_name?, row2_list_id?, row3_type, row3_custom_name?, row3_list_id? }`. Or reuse the existing `lists` table and let rows 2/3 point at a list id.
- Spine generation: derive spine color from book genre/cover dominant color, spine width from `page_count` (pages → mm, mapped to a small range like 10–40 px).
- File to touch: [app/(main)/profile/[username]/page.tsx](app/\(main\)/profile/[username]/page.tsx) and a new `components/redesign/Bookcase.tsx`.

### F. Misc gaps flagged during the 2026-04-20 review
- No `app/error.tsx` or `app/not-found.tsx` — bad book IDs and runtime errors show a blank page.
- No "add a book" flow — if a book isn't in Supabase already, the user hits a dead end. Needs an Open Library / Google Books import on empty search.
- Most `cover_url` fields are null — covers fall back to the colored card. Consider a backfill job that queries Open Library by ISBN.
- No onboarding for new signups — they land on an empty `/home` with nothing to do.
- Modals don't close on Escape.
- Comments are flat (covered above by C).
- Notifications page has no "mark all read" and no filter tabs.

## File Map

- [lib/db.ts](lib/db.ts): Supabase queries, types, and DB-to-UI adapters. `insertNotification` helper at top is the single place that writes to `notifications`.
- [lib/share.ts](lib/share.ts): Web Share API wrapper with clipboard + textarea fallbacks. Returns `'shared' | 'copied' | 'failed'`.
- [lib/supabase/client.ts](lib/supabase/client.ts) and [lib/supabase/server.ts](lib/supabase/server.ts): browser and server Supabase factories
- [lib/supabase/config.ts](lib/supabase/config.ts): shared public Supabase config with repo-safe fallbacks
- [app/auth/signout/route.ts](app/auth/signout/route.ts): POST handler for sidebar signout
- [components/redesign/LikeButton.tsx](components/redesign/LikeButton.tsx): optimistic review-like button backed by `toggleLike`.
- [components/redesign/Sidebar.tsx](components/redesign/Sidebar.tsx): real profile, unread count, and streak data
- [components/redesign/home/PostComposer.tsx](components/redesign/home/PostComposer.tsx): inline book picker and post form

## Gotchas

- `book_posts.book_id` is not null, so every post must reference a book
- `reading_sessions` has a unique constraint on `(user_id, session_date, book_id)`, so same-day same-book logs upsert
- `streaks` is one row per user, and `touchStreak(supabase, userId)` in `lib/db.ts` handles increment and reset logic
- Supabase nested joins need FK hints when there are multiple foreign keys between two tables
- `roadmap_features.has_voted` is hydrated per request from `roadmap_votes`; it is not a stored column
- Async page params in Next 15 should use `use()` in client components or `await params` in server components
- `notifications` RLS requires `auth.uid() = actor_id`. Any notification inserted from the client must pass the current user as actor. `insertNotification` skips self-notifications (when recipient === actor).
- `components/redesign/home/ReviewCard.tsx` is legacy — it still imports from `lib/redesign-data` but isn't mounted anywhere. Safe to delete whenever.

## Commit Style

Lowercase imperative, short, no ticket prefix. Recent examples:
- `wire review likes, share actions, settings, expanded search, event notifications`
- `finish codex handoff features`
- `fix cloudflare supabase build config`
