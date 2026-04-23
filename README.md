# Bookcase

Current beta status only.

## Shipped In Code

- [x] Goodreads onboarding path from sign up to import, Open Library search, bookcase setup, and first session logging.
- [x] Bookcase row 2 and row 3 customization with saved shelf choices, custom row names, and add/remove controls.
- [x] Non-prose catalog wiring for comics, manga, graphic novels, and similar formats across search, import, shelves, reviews, bookcase, and tags.
- [x] Empty and sparse states across the core product so new or low-data accounts do not look broken.
- [x] Stronger account, privacy, and data controls: profile identity editing, avatar image support, notification settings, blocked-reader visibility, public/private data copy, data export, and clearer account messaging.
- [x] Comment editing for the first 24 hours.
- [x] Open Library-first search with in-memory caching for broader catalog lookups.
- [x] Real landing-page legal pages and footer links.
- [x] Landing footer polish.
- [x] Mentions in threads, comments, and clubs, with notifications.
- [x] Better notification inbox polish, including filtering and bulk actions.
- [x] Avatar support across the app plus profile/settings header polish.
- [x] Draft autosave for book reviews and thread composition, plus saved drafts in the home composer and club composer.
- [x] Review sorting on book pages.
- [x] Club owner posting tools: edit, delete, pin/unpin, and pinned reading-schedule style posts.

## Live Beta Checks

- [ ] Run the full live smoke test on the deployed Cloudflare Worker.
- [ ] Create the first production moderator row and verify moderator tools end to end.
- [ ] Verify search quality in production with real title, author, series, ISBN, comic, manga, and graphic-novel queries.
- [ ] Verify onboarding with a truly new account from sign up through first session logged.
- [ ] Verify non-prose content in the live app so it never feels like an edge case.
- [ ] Do one final sparse-state and failure-state pass on search, home, profile, clubs, notifications, safety, streak, and explore.

## Product Decisions Still Open

- [ ] Decide whether bookcase rows should eventually support custom list-backed rows instead of only the main shelves.
- [ ] Decide whether self-serve permanent account deletion is required before wider beta. The settings page now makes it clear this is not live yet.

## Later Ideas

- [ ] Series support and reading order.
- [ ] Personalized recommendations from shelves, ratings, follows, and clubs.
- [ ] Book data quality tools like duplicate merge and cover backfill.
- [ ] Reader compatibility and "people like you" discovery.

## Notes

- `supabase/bookcase.sql` is the single canonical schema file.
- Missing books should come through the in-app Open Library import flow, not a giant seed dump.
- Club reading schedules currently use pinned owner posts rather than a separate calendar system.
- `npm.cmd run build` is green on this pass.
