-- ============================================================
-- Wipe all clubs
-- One-time cleanup: paste into the Supabase SQL Editor and run.
-- This removes every club, its members, posts, comments, and book history.
-- ============================================================

delete from club_books;
delete from club_comments;
delete from club_posts;
delete from club_members;
delete from clubs;
