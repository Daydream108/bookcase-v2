-- ============================================================
-- Bookcase — Complete Database Setup
-- Paste this entire file into the Supabase SQL Editor and run it.
-- Order: Extensions → Schema → RLS Policies → Seed Data
-- ============================================================

-- NOTE:
-- This is the single canonical SQL file for Bookcase.
-- It is designed to be safe to rerun in Supabase SQL Editor:
-- - schema uses create table/index if not exists
-- - policies are recreated with drop policy if exists
-- - seed inserts use on conflict do nothing


-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";


-- ============================================================
-- SCHEMA
-- ============================================================

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  display_name text,
  avatar_url   text,
  bio          text,
  website      text,
  location     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint username_length check (char_length(username) between 2 and 30),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

create index if not exists profiles_username_idx      on profiles (username);
create index if not exists profiles_username_trgm_idx on profiles using gin (username gin_trgm_ops);

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------

create table if not exists authors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  bio        text,
  photo_url  text,
  created_at timestamptz not null default now()
);

create index if not exists authors_name_idx      on authors (name);
create index if not exists authors_name_trgm_idx on authors using gin (name gin_trgm_ops);

-- ------------------------------------------------------------

create table if not exists genres (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- ------------------------------------------------------------

create table if not exists books (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  subtitle       text,
  isbn           text unique,
  cover_url      text,
  description    text,
  published_year int,
  page_count     int,
  language       text not null default 'en',
  created_at     timestamptz not null default now()
);

create index if not exists books_title_idx      on books (title);
create index if not exists books_title_trgm_idx on books using gin (title gin_trgm_ops);
create index if not exists books_isbn_idx       on books (isbn);

-- ------------------------------------------------------------

create table if not exists book_authors (
  book_id   uuid not null references books(id)   on delete cascade,
  author_id uuid not null references authors(id) on delete cascade,
  role      text not null default 'author',
  primary key (book_id, author_id)
);

create index if not exists book_authors_book_idx   on book_authors (book_id);
create index if not exists book_authors_author_idx on book_authors (author_id);

-- ------------------------------------------------------------

create table if not exists book_genres (
  book_id  uuid not null references books(id)  on delete cascade,
  genre_id uuid not null references genres(id) on delete cascade,
  primary key (book_id, genre_id)
);

-- ------------------------------------------------------------

create table if not exists user_books (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  book_id     uuid not null references books(id)    on delete cascade,
  status      text not null check (status in ('to_read', 'reading', 'read', 'dnf')),
  rating      numeric(3, 1) check (rating is null or (rating >= 0.5 and rating <= 5.0)),
  started_at  date,
  finished_at date,
  is_reread   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, book_id)
);

create index if not exists user_books_user_idx   on user_books (user_id);
create index if not exists user_books_book_idx   on user_books (book_id);
create index if not exists user_books_status_idx on user_books (status);

create or replace trigger user_books_updated_at
  before update on user_books
  for each row execute function update_updated_at();

-- ------------------------------------------------------------

create table if not exists reviews (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id)   on delete cascade,
  book_id          uuid not null references books(id)      on delete cascade,
  user_book_id     uuid references user_books(id)          on delete set null,
  body             text not null,
  rating           numeric(3, 1) check (rating is null or (rating >= 0.5 and rating <= 5.0)),
  contains_spoiler boolean not null default false,
  liked_count      int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (user_id, book_id)
);

alter table reviews
  add column if not exists contains_spoiler boolean not null default false;

create index if not exists reviews_user_idx    on reviews (user_id);
create index if not exists reviews_book_idx    on reviews (book_id);
create index if not exists reviews_created_idx on reviews (created_at desc);
create index if not exists reviews_liked_idx   on reviews (liked_count desc);

create or replace trigger reviews_updated_at
  before update on reviews
  for each row execute function update_updated_at();

-- ------------------------------------------------------------

create table if not exists lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  description text,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists lists_user_idx   on lists (user_id);
create index if not exists lists_public_idx on lists (is_public, created_at desc);

create or replace trigger lists_updated_at
  before update on lists
  for each row execute function update_updated_at();

-- ------------------------------------------------------------

create table if not exists list_items (
  id       uuid primary key default gen_random_uuid(),
  list_id  uuid not null references lists(id) on delete cascade,
  book_id  uuid not null references books(id) on delete cascade,
  position int not null default 1,
  note     text,
  added_at timestamptz not null default now(),

  unique (list_id, book_id)
);

create index if not exists list_items_list_idx on list_items (list_id, position);

-- ------------------------------------------------------------

create table if not exists follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),

  constraint no_self_follow check (follower_id <> following_id)
);

create index if not exists follows_follower_idx  on follows (follower_id);
create index if not exists follows_following_idx on follows (following_id);

-- ------------------------------------------------------------

create table if not exists likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  review_id  uuid not null references reviews(id)  on delete cascade,
  created_at timestamptz not null default now(),

  unique (user_id, review_id)
);

create index if not exists likes_review_idx on likes (review_id);
create index if not exists likes_user_idx   on likes (user_id);

create or replace function update_review_liked_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update reviews set liked_count = liked_count + 1 where id = new.review_id;
  elsif TG_OP = 'DELETE' then
    update reviews set liked_count = greatest(0, liked_count - 1) where id = old.review_id;
  end if;
  return null;
end;
$$;

create or replace trigger likes_count_update
  after insert or delete on likes
  for each row execute function update_review_liked_count();

-- ------------------------------------------------------------

create table if not exists activity_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id)   on delete cascade,
  event_type   text not null check (event_type in (
    'book_logged', 'book_reviewed', 'list_created', 'list_book_added',
    'started_reading', 'finished_reading', 'followed_user', 'badge_unlocked'
  )),
  book_id      uuid references books(id)      on delete cascade,
  review_id    uuid references reviews(id)    on delete cascade,
  list_id      uuid references lists(id)      on delete cascade,
  user_book_id uuid references user_books(id) on delete cascade,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists activity_user_idx    on activity_events (user_id, created_at desc);
create index if not exists activity_created_idx on activity_events (created_at desc);
create index if not exists activity_book_idx    on activity_events (book_id);

-- ------------------------------------------------------------
-- VIEWS
-- ------------------------------------------------------------

create or replace view book_stats as
select
  b.id as book_id,
  round(avg(ub.rating), 2) as avg_rating,
  count(ub.rating) as rating_count,
  count(case when ub.status = 'read' then 1 end) as read_count,
  count(distinct r.id) as review_count
from books b
left join user_books ub on ub.book_id = b.id
left join reviews r on r.book_id = b.id
group by b.id;

create or replace view profile_stats as
select
  p.id,
  p.username,
  count(distinct f1.follower_id) as follower_count,
  count(distinct f2.following_id) as following_count,
  count(distinct case when ub.status = 'read' then ub.id end) as books_read
from profiles p
left join follows f1 on f1.following_id = p.id
left join follows f2 on f2.follower_id = p.id
left join user_books ub on ub.user_id = p.id
group by p.id, p.username;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles        enable row level security;
alter table books           enable row level security;
alter table authors         enable row level security;
alter table book_authors    enable row level security;
alter table genres          enable row level security;
alter table book_genres     enable row level security;
alter table user_books      enable row level security;
alter table reviews         enable row level security;
alter table lists           enable row level security;
alter table list_items      enable row level security;
alter table follows         enable row level security;
alter table likes           enable row level security;
alter table activity_events enable row level security;

-- profiles
drop policy if exists "Profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
create policy "Profiles are viewable by everyone"  on profiles for select using (true);
create policy "Users can insert their own profile"  on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"  on profiles for update using (auth.uid() = id);

-- books
drop policy if exists "Books are viewable by everyone" on books;
drop policy if exists "Authenticated users can insert books" on books;
create policy "Books are viewable by everyone"         on books for select using (true);
create policy "Authenticated users can insert books"   on books for insert with check (auth.role() = 'authenticated');

-- authors
drop policy if exists "Authors are viewable by everyone" on authors;
drop policy if exists "Authenticated users can insert authors" on authors;
create policy "Authors are viewable by everyone"       on authors for select using (true);
create policy "Authenticated users can insert authors" on authors for insert with check (auth.role() = 'authenticated');

-- book_authors
drop policy if exists "Book-author links are viewable by everyone" on book_authors;
drop policy if exists "Authenticated users can insert book-author links" on book_authors;
create policy "Book-author links are viewable by everyone"        on book_authors for select using (true);
create policy "Authenticated users can insert book-author links"  on book_authors for insert with check (auth.role() = 'authenticated');

-- genres / book_genres
drop policy if exists "Genres are viewable by everyone" on genres;
drop policy if exists "Book genres are viewable by everyone" on book_genres;
drop policy if exists "Authenticated users can insert book genres" on book_genres;
create policy "Genres are viewable by everyone"              on genres     for select using (true);
create policy "Book genres are viewable by everyone"         on book_genres for select using (true);
create policy "Authenticated users can insert book genres"   on book_genres for insert with check (auth.role() = 'authenticated');

-- user_books
drop policy if exists "User books are viewable by everyone" on user_books;
drop policy if exists "Users can insert their own book logs" on user_books;
drop policy if exists "Users can update their own book logs" on user_books;
drop policy if exists "Users can delete their own book logs" on user_books;
create policy "User books are viewable by everyone"    on user_books for select using (true);
create policy "Users can insert their own book logs"   on user_books for insert with check (auth.uid() = user_id);
create policy "Users can update their own book logs"   on user_books for update using (auth.uid() = user_id);
create policy "Users can delete their own book logs"   on user_books for delete using (auth.uid() = user_id);

-- reviews
drop policy if exists "Reviews are viewable by everyone" on reviews;
drop policy if exists "Users can insert their own reviews" on reviews;
drop policy if exists "Users can update their own reviews" on reviews;
drop policy if exists "Users can delete their own reviews" on reviews;
create policy "Reviews are viewable by everyone"     on reviews for select using (true);
create policy "Users can insert their own reviews"   on reviews for insert with check (auth.uid() = user_id);
create policy "Users can update their own reviews"   on reviews for update using (auth.uid() = user_id);
create policy "Users can delete their own reviews"   on reviews for delete using (auth.uid() = user_id);

-- lists
drop policy if exists "Public lists are viewable by everyone" on lists;
drop policy if exists "Users can insert their own lists" on lists;
drop policy if exists "Users can update their own lists" on lists;
drop policy if exists "Users can delete their own lists" on lists;
create policy "Public lists are viewable by everyone" on lists for select using (is_public = true or auth.uid() = user_id);
create policy "Users can insert their own lists"      on lists for insert with check (auth.uid() = user_id);
create policy "Users can update their own lists"      on lists for update using (auth.uid() = user_id);
create policy "Users can delete their own lists"      on lists for delete using (auth.uid() = user_id);

-- list_items
drop policy if exists "List items are viewable when list is viewable" on list_items;
drop policy if exists "List owners can manage list items" on list_items;
drop policy if exists "List owners can update list items" on list_items;
drop policy if exists "List owners can delete list items" on list_items;
create policy "List items are viewable when list is viewable" on list_items for select
  using (exists (select 1 from lists where lists.id = list_items.list_id and (lists.is_public = true or lists.user_id = auth.uid())));
create policy "List owners can manage list items"   on list_items for insert
  with check (exists (select 1 from lists where lists.id = list_items.list_id and lists.user_id = auth.uid()));
create policy "List owners can update list items"   on list_items for update
  using (exists (select 1 from lists where lists.id = list_items.list_id and lists.user_id = auth.uid()));
create policy "List owners can delete list items"   on list_items for delete
  using (exists (select 1 from lists where lists.id = list_items.list_id and lists.user_id = auth.uid()));

-- follows
drop policy if exists "Follows are viewable by everyone" on follows;
drop policy if exists "Users can follow others" on follows;
drop policy if exists "Users can unfollow" on follows;
create policy "Follows are viewable by everyone" on follows for select using (true);
create policy "Users can follow others"          on follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow"               on follows for delete using (auth.uid() = follower_id);

-- likes
drop policy if exists "Likes are viewable by everyone" on likes;
drop policy if exists "Users can like reviews" on likes;
drop policy if exists "Users can unlike reviews" on likes;
create policy "Likes are viewable by everyone" on likes for select using (true);
create policy "Users can like reviews"          on likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike reviews"        on likes for delete using (auth.uid() = user_id);

-- activity_events
drop policy if exists "Activity events are viewable by everyone" on activity_events;
drop policy if exists "Users can insert their own activity" on activity_events;
create policy "Activity events are viewable by everyone" on activity_events for select using (true);
create policy "Users can insert their own activity"      on activity_events for insert with check (auth.uid() = user_id);


-- ============================================================
-- SEED DATA
-- ============================================================

insert into genres (name, slug) values
  ('Fiction', 'fiction'),
  ('Literary Fiction', 'literary-fiction'),
  ('Science Fiction', 'science-fiction'),
  ('Fantasy', 'fantasy'),
  ('Mystery', 'mystery'),
  ('Thriller', 'thriller'),
  ('Historical Fiction', 'historical-fiction'),
  ('Non-Fiction', 'non-fiction'),
  ('Biography', 'biography'),
  ('Philosophy', 'philosophy'),
  ('Psychology', 'psychology'),
  ('Essays', 'essays'),
  ('Classics', 'classics'),
  ('Horror', 'horror'),
  ('Romance', 'romance')
on conflict (slug) do nothing;

insert into authors (id, name, bio) values
  ('a1000000-0000-0000-0000-000000000001', 'Cormac McCarthy',        'American novelist and playwright known for dark, unflinching prose.'),
  ('a1000000-0000-0000-0000-000000000002', 'Toni Morrison',          'Nobel Prize-winning American author celebrated for novels exploring African American experience.'),
  ('a1000000-0000-0000-0000-000000000003', 'Ursula K. Le Guin',      'Influential American author of science fiction and fantasy, known for The Earthsea Cycle.'),
  ('a1000000-0000-0000-0000-000000000004', 'Kazuo Ishiguro',         'Nobel Prize-winning British novelist, author of Never Let Me Go and The Remains of the Day.'),
  ('a1000000-0000-0000-0000-000000000005', 'Joan Didion',            'American author and journalist known for her sharp essays and novels.'),
  ('a1000000-0000-0000-0000-000000000006', 'George Orwell',          'English author and critic, famous for his opposition to totalitarianism.'),
  ('a1000000-0000-0000-0000-000000000007', 'Donna Tartt',            'American novelist best known for The Secret History and The Goldfinch.'),
  ('a1000000-0000-0000-0000-000000000008', 'Haruki Murakami',        'Japanese author whose works blend magical realism with contemporary life.'),
  ('a1000000-0000-0000-0000-000000000009', 'Gabriel García Márquez', 'Colombian novelist and Nobel laureate, master of magical realism.'),
  ('a1000000-0000-0000-0000-000000000010', 'Elena Ferrante',         'Pseudonymous Italian novelist known for the Neapolitan Novels.'),
  ('a1000000-0000-0000-0000-000000000011', 'Fyodor Dostoevsky',     'Russian novelist and philosopher, author of The Brothers Karamazov.'),
  ('a1000000-0000-0000-0000-000000000012', 'Virginia Woolf',        'English modernist author, pioneer of stream-of-consciousness narrative.'),
  ('a1000000-0000-0000-0000-000000000013', 'Franz Kafka',           'Bohemian novelist known for surreal, existential fiction.'),
  ('a1000000-0000-0000-0000-000000000014', 'Sylvia Plath',          'American poet and novelist, author of The Bell Jar.'),
  ('a1000000-0000-0000-0000-000000000015', 'Albert Camus',          'French-Algerian author and Nobel laureate, key figure in absurdism.'),
  ('a1000000-0000-0000-0000-000000000016', 'Chimamanda Ngozi Adichie', 'Nigerian author celebrated for Americanah and Half of a Yellow Sun.'),
  ('a1000000-0000-0000-0000-000000000017', 'Jorge Luis Borges',     'Argentine writer known for labyrinthine short fiction.'),
  ('a1000000-0000-0000-0000-000000000018', 'Octavia Butler',        'American science fiction author, first sci-fi writer to win a MacArthur.'),
  ('a1000000-0000-0000-0000-000000000019', 'Roberto Bolano',        'Chilean novelist, author of 2666 and The Savage Detectives.'),
  ('a1000000-0000-0000-0000-000000000020', 'Zadie Smith',           'British novelist known for White Teeth and On Beauty.'),
  ('a1000000-0000-0000-0000-000000000021', 'Yukio Mishima',         'Japanese author and playwright, one of the most important post-war writers.'),
  ('a1000000-0000-0000-0000-000000000022', 'Margaret Atwood',       'Canadian author of The Handmaid''s Tale, speculative fiction pioneer.'),
  ('a1000000-0000-0000-0000-000000000023', 'James Baldwin',         'American essayist and novelist who explored race, sexuality, and class.'),
  ('a1000000-0000-0000-0000-000000000024', 'Italo Calvino',         'Italian journalist and writer of imaginative, playful fiction.'),
  ('a1000000-0000-0000-0000-000000000025', 'Clarice Lispector',     'Brazilian novelist known for introspective, philosophical fiction.'),
  ('a1000000-0000-0000-0000-000000000026', 'Ocean Vuong',           'Vietnamese-American poet and novelist, author of On Earth We''re Briefly Gorgeous.'),
  ('a1000000-0000-0000-0000-000000000027', 'Sally Rooney',          'Irish author known for Normal People and Beautiful World, Where Are You.'),
  ('a1000000-0000-0000-0000-000000000028', 'Hanya Yanagihara',      'American novelist, author of A Little Life.'),
  ('a1000000-0000-0000-0000-000000000029', 'N.K. Jemisin',          'American speculative fiction author, three-time Hugo Award winner.'),
  ('a1000000-0000-0000-0000-000000000030', 'Colson Whitehead',      'American novelist, two-time Pulitzer Prize winner.'),
  ('a1000000-0000-0000-0000-000000000031', 'Andy Weir',             'American novelist known for hard science fiction, author of The Martian and Project Hail Mary.'),
  ('a1000000-0000-0000-0000-000000000032', 'Madeline Miller',       'American novelist known for retellings of Greek mythology.'),
  ('a1000000-0000-0000-0000-000000000033', 'Emily St. John Mandel', 'Canadian novelist, author of Station Eleven.'),
  ('a1000000-0000-0000-0000-000000000034', 'Brandon Sanderson',     'American fantasy author known for intricate magic systems and the Cosmere universe.'),
  ('a1000000-0000-0000-0000-000000000035', 'Celeste Ng',            'American novelist and essayist, author of Everything I Never Told You.'),
  ('a1000000-0000-0000-0000-000000000036', 'Brit Bennett',          'American novelist, author of The Vanishing Half.'),
  ('a1000000-0000-0000-0000-000000000037', 'Ted Chiang',            'American science fiction author, known for cerebral, philosophical short stories.'),
  ('a1000000-0000-0000-0000-000000000038', 'Min Jin Lee',           'Korean-American novelist, author of Pachinko.'),
  ('a1000000-0000-0000-0000-000000000039', 'R.F. Kuang',            'American fantasy and speculative fiction author, author of Babel and The Poppy War.'),
  ('a1000000-0000-0000-0000-000000000040', 'Amor Towles',           'American novelist, author of A Gentleman in Moscow.')
on conflict do nothing;

insert into books (id, title, subtitle, isbn, cover_url, description, published_year, page_count) values
  ('b1000000-0000-0000-0000-000000000001', 'The Road',                     null,                            '9780307387899', 'https://covers.openlibrary.org/b/isbn/9780307387899-L.jpg', 'A father and his son walk alone through burned America. Nothing moves in the ravaged landscape save the ash on the wind. It is cold enough to crack stones, and when the snow falls it is gray. The sky is dark. Their destination is the coast, although they don''t know what, if anything, awaits them there.', 2006, 287),
  ('b1000000-0000-0000-0000-000000000002', 'Beloved',                      null,                            '9781400033416', 'https://covers.openlibrary.org/b/isbn/9781400033416-L.jpg', 'Sethe, an escaped slave living in post-Civil War Ohio, is haunted by the violent ghost of her deceased daughter, Beloved. A devastating and haunting masterpiece.',                                                                                                                                          1987, 321),
  ('b1000000-0000-0000-0000-000000000003', 'The Left Hand of Darkness',    null,                            '9780441478125', 'https://covers.openlibrary.org/b/isbn/9780441478125-L.jpg', 'A groundbreaking work of science fiction that explores gender and society on a distant planet where the inhabitants are ambisexual.',                                                                                                                                                                           1969, 304),
  ('b1000000-0000-0000-0000-000000000004', 'Never Let Me Go',              null,                            '9781400078776', 'https://covers.openlibrary.org/b/isbn/9781400078776-L.jpg', 'A heartbreaking story of three friends — Kathy, Ruth, and Tommy — who grew up together at Hailsham, a seemingly idyllic English boarding school.',                                                                                                                                                              2005, 288),
  ('b1000000-0000-0000-0000-000000000005', 'The Year of Magical Thinking', null,                            '9781400043149', 'https://covers.openlibrary.org/b/isbn/9781400043149-L.jpg', 'Joan Didion''s shattering account of the year following the death of her husband, writer John Gregory Dunne.',                                                                                                                                                                                                  2005, 227),
  ('b1000000-0000-0000-0000-000000000006', 'Nineteen Eighty-Four',         null,                            '9780451524935', 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg', 'A dystopian novel set in Airstrip One, a province of the superstate Oceania in a world of perpetual war, omnipresent government surveillance and public manipulation.',                                                                                                                                            1949, 328),
  ('b1000000-0000-0000-0000-000000000007', 'The Secret History',           null,                            '9781400031702', 'https://covers.openlibrary.org/b/isbn/9781400031702-L.jpg', 'Under the influence of their charismatic classics professor, a group of aesthetes at a Vermont college examines the role of evil in the creation of beauty — and they re-enact an ancient ritual murder.',                                                                                                          1992, 559),
  ('b1000000-0000-0000-0000-000000000008', 'Norwegian Wood',               null,                            '9780375704024', 'https://covers.openlibrary.org/b/isbn/9780375704024-L.jpg', 'A nostalgic story of loss and sexuality. Toru, a quiet and preternaturally serious young college student in Tokyo, is devoted to Naoko, a beautiful and introspective young woman.',                                                                                                                               1987, 293),
  ('b1000000-0000-0000-0000-000000000009', 'One Hundred Years of Solitude',null,                            '9780060883287', 'https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg', 'The story of the Buendía family over seven generations in the fictional town of Macondo — a landmark of magical realism and world literature.',                                                                                                                                                                   1967, 417),
  ('b1000000-0000-0000-0000-000000000010', 'My Brilliant Friend',          'Neapolitan Novels, Book 1',     '9781609450786', 'https://covers.openlibrary.org/b/isbn/9781609450786-L.jpg', 'The story of two girls born in the 1950s in a poor neighborhood on the outskirts of Naples who become best friends — a sprawling epic of friendship, identity, and ambition.',                                                                                                                                      2011, 331),
  ('b1000000-0000-0000-0000-000000000011', 'Blood Meridian',               'Or the Evening Redness in the West', '9780679728757', 'https://covers.openlibrary.org/b/isbn/9780679728757-L.jpg', 'Set in the 1850s, the novel follows a teenage runaway called "the Kid" and his experiences with the Glanton gang, a historical group of scalp hunters who massacred Indians and Mexicans.',                                                                                                                  1985, 351),
  ('b1000000-0000-0000-0000-000000000012', 'The Dispossessed',             'An Ambiguous Utopia',           '9780061054884', 'https://covers.openlibrary.org/b/isbn/9780061054884-L.jpg', 'Shevek, a brilliant physicist, decides to make the dangerous voyage to Urras, the lush sister-planet of his own arid world, Anarres.',                                                                                                                                                                              1974, 387),
  ('b1000000-0000-0000-0000-000000000013', 'The Brothers Karamazov', null, '9780374528379', 'https://covers.openlibrary.org/b/isbn/9780374528379-L.jpg', 'Dostoevsky''s final novel — a passionate philosophical exploration of God, free will, and morality through the story of the Karamazov family.', 1880, 796),
  ('b1000000-0000-0000-0000-000000000014', 'Mrs Dalloway', null, '9780156628709', 'https://covers.openlibrary.org/b/isbn/9780156628709-L.jpg', 'A day in the life of Clarissa Dalloway as she prepares for a party, weaving through memory and consciousness in post-war London.', 1925, 194),
  ('b1000000-0000-0000-0000-000000000015', 'The Trial', null, '9780805209990', 'https://covers.openlibrary.org/b/isbn/9780805209990-L.jpg', 'Josef K. is arrested one morning and must navigate a nightmarish, opaque legal system in this masterpiece of existential fiction.', 1925, 255),
  ('b1000000-0000-0000-0000-000000000016', 'The Bell Jar', null, '9780060837020', 'https://covers.openlibrary.org/b/isbn/9780060837020-L.jpg', 'Esther Greenwood''s descent into mental illness during a summer internship in 1950s New York — raw, darkly funny, heartbreaking.', 1963, 244),
  ('b1000000-0000-0000-0000-000000000017', 'The Stranger', null, '9780679720201', 'https://covers.openlibrary.org/b/isbn/9780679720201-L.jpg', 'Meursault, an indifferent French Algerian, commits a senseless murder and faces trial in this foundational existentialist novel.', 1942, 123),
  ('b1000000-0000-0000-0000-000000000018', 'Americanah', null, '9780307455925', 'https://covers.openlibrary.org/b/isbn/9780307455925-L.jpg', 'Ifemelu and Obinze, young lovers in Nigeria, face divergent paths in America and London in this sweeping novel about race, identity, and immigration.', 2013, 477),
  ('b1000000-0000-0000-0000-000000000019', 'Ficciones', null, '9780802130303', 'https://covers.openlibrary.org/b/isbn/9780802130303-L.jpg', 'A collection of labyrinthine short stories that play with infinity, mirrors, and the nature of reality itself.', 1944, 174),
  ('b1000000-0000-0000-0000-000000000020', 'Kindred', null, '9780807083697', 'https://covers.openlibrary.org/b/isbn/9780807083697-L.jpg', 'A modern Black woman is pulled back in time to the antebellum South, where she must ensure the survival of a white slaveholder who is her ancestor.', 1979, 264),
  ('b1000000-0000-0000-0000-000000000021', '2666', null, '9780312429218', 'https://covers.openlibrary.org/b/isbn/9780312429218-L.jpg', 'Five loosely connected narratives converge around a fictional city on the US-Mexico border where hundreds of women have been murdered.', 2004, 898),
  ('b1000000-0000-0000-0000-000000000022', 'White Teeth', null, '9780375703867', 'https://covers.openlibrary.org/b/isbn/9780375703867-L.jpg', 'A sprawling comic novel about two North London families — one Bangladeshi, one English — navigating identity, history, and belonging.', 2000, 448),
  ('b1000000-0000-0000-0000-000000000023', 'The Sailor Who Fell from Grace with the Sea', null, '9780679750154', 'https://covers.openlibrary.org/b/isbn/9780679750154-L.jpg', 'A disturbing tale of a band of savage thirteen-year-old boys who reject the adult world as illusory and corrupt.', 1963, 181),
  ('b1000000-0000-0000-0000-000000000024', 'The Handmaid''s Tale', null, '9780385490818', 'https://covers.openlibrary.org/b/isbn/9780385490818-L.jpg', 'In the Republic of Gilead, women are property of the state. Offred navigates this theocratic nightmare while clinging to hope and memory.', 1985, 311),
  ('b1000000-0000-0000-0000-000000000025', 'Giovanni''s Room', null, '9780345806567', 'https://covers.openlibrary.org/b/isbn/9780345806567-L.jpg', 'An American man in Paris grapples with his desire for another man while his fiancee travels in Spain — a landmark novel of queer literature.', 1956, 169),
  ('b1000000-0000-0000-0000-000000000026', 'If on a winter''s night a traveler', null, '9780156439619', 'https://covers.openlibrary.org/b/isbn/9780156439619-L.jpg', 'A postmodern novel about a reader trying to read a novel, spiraling through ten different story beginnings. Playful, dizzying, brilliant.', 1979, 260),
  ('b1000000-0000-0000-0000-000000000027', 'The Hour of the Star', null, '9780811219495', 'https://covers.openlibrary.org/b/isbn/9780811219495-L.jpg', 'The story of Macabea, a poor, unattractive typist in Rio de Janeiro — told by a narrator obsessed with the act of writing itself.', 1977, 96),
  ('b1000000-0000-0000-0000-000000000028', 'On Earth We''re Briefly Gorgeous', null, '9780525562023', 'https://covers.openlibrary.org/b/isbn/9780525562023-L.jpg', 'A letter from a Vietnamese-American son to his illiterate mother, exploring family, trauma, desire, and the power of language.', 2019, 256),
  ('b1000000-0000-0000-0000-000000000029', 'Normal People', null, '9781984822178', 'https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg', 'Connell and Marianne orbit each other from small-town Ireland to Trinity College Dublin, navigating class, intimacy, and miscommunication.', 2018, 273),
  ('b1000000-0000-0000-0000-000000000030', 'A Little Life', null, '9780385539258', 'https://covers.openlibrary.org/b/isbn/9780385539258-L.jpg', 'Four college friends navigate New York City, ambition, and art — but at its core, this is the devastating story of Jude and his hidden past.', 2015, 720),
  ('b1000000-0000-0000-0000-000000000031', 'The Fifth Season', null, '9780316229296', 'https://covers.openlibrary.org/b/isbn/9780316229296-L.jpg', 'On a planet wracked by catastrophic seismic events, a woman with the power to control earthquakes searches for her kidnapped daughter.', 2015, 468),
  ('b1000000-0000-0000-0000-000000000032', 'The Underground Railroad', null, '9780385542364', 'https://covers.openlibrary.org/b/isbn/9780385542364-L.jpg', 'Cora, an enslaved woman in Georgia, escapes via a literal underground railroad — each state she passes through represents a different era of American racism.', 2016, 306),
  ('b1000000-0000-0000-0000-000000000033', 'Crime and Punishment', null, '9780486415871', 'https://covers.openlibrary.org/b/isbn/9780486415871-L.jpg', 'Raskolnikov, a destitute student, murders a pawnbroker and struggles with guilt, paranoia, and redemption in this psychological masterpiece.', 1866, 430),
  ('b1000000-0000-0000-0000-000000000034', 'To the Lighthouse', null, '9780156907392', 'https://covers.openlibrary.org/b/isbn/9780156907392-L.jpg', 'The Ramsay family visits their summer home on the Isle of Skye. Ten years pass. Art, loss, and the passage of time unfold in luminous prose.', 1927, 209),
  ('b1000000-0000-0000-0000-000000000035', 'The Plague', null, '9780679720218', 'https://covers.openlibrary.org/b/isbn/9780679720218-L.jpg', 'A plague descends on the Algerian city of Oran. Dr. Rieux bears witness as the town is quarantined and solidarity emerges from suffering.', 1947, 308),
  ('b1000000-0000-0000-0000-000000000036', 'Half of a Yellow Sun', null, '9781400095209', 'https://covers.openlibrary.org/b/isbn/9781400095209-L.jpg', 'Three characters navigate love and betrayal during the Biafran War in 1960s Nigeria — epic, sweeping, and deeply human.', 2006, 435),
  ('b1000000-0000-0000-0000-000000000037', 'Parable of the Sower', null, '9781538732182', 'https://covers.openlibrary.org/b/isbn/9781538732182-L.jpg', 'In 2024 America, walled communities crumble and a young woman with hyper-empathy syndrome leads survivors north, founding a new belief system.', 1993, 345),
  ('b1000000-0000-0000-0000-000000000038', 'Project Hail Mary', null, '9780593135204', 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg', 'Ryland Grace is the sole survivor on a desperate, last-chance mission — and if he can''t figure out what he''s doing there, humanity is doomed.', 2021, 476),
  ('b1000000-0000-0000-0000-000000000039', 'The Song of Achilles', null, '9780062060624', 'https://covers.openlibrary.org/b/isbn/9780062060624-L.jpg', 'A retelling of the Iliad through the eyes of Patroclus, Achilles'' companion — a story of gods, war, and devastating love.', 2012, 378),
  ('b1000000-0000-0000-0000-000000000040', 'Circe', null, '9780316556347', 'https://covers.openlibrary.org/b/isbn/9780316556347-L.jpg', 'The witch of Greek mythology tells her own story — from neglected daughter of the sun god to a powerful sorceress finding her own path.', 2018, 393),
  ('b1000000-0000-0000-0000-000000000041', 'Station Eleven', null, '9780385353304', 'https://covers.openlibrary.org/b/isbn/9780385353304-L.jpg', 'A pandemic collapses civilization. In its aftermath, a traveling troupe performs Shakespeare and music for scattered settlements.', 2014, 333),
  ('b1000000-0000-0000-0000-000000000042', 'The Way of Kings', 'The Stormlight Archive, Book 1', '9780765365279', 'https://covers.openlibrary.org/b/isbn/9780765365279-L.jpg', 'War rages on the Shattered Plains as Kaladin, a soldier turned slave, discovers powers that could change the course of history.', 2010, 1007),
  ('b1000000-0000-0000-0000-000000000043', 'Everything I Never Told You', null, '9780143127550', 'https://covers.openlibrary.org/b/isbn/9780143127550-L.jpg', 'Lydia is dead. But they don''t know this yet. A mixed-race family in 1970s Ohio unravels after the death of their golden child.', 2014, 297),
  ('b1000000-0000-0000-0000-000000000044', 'The Vanishing Half', null, '9780525536291', 'https://covers.openlibrary.org/b/isbn/9780525536291-L.jpg', 'Twin sisters from a small Black community — one lives as a white woman, the other returns to the town they fled. A multigenerational epic about identity.', 2020, 343),
  ('b1000000-0000-0000-0000-000000000045', 'Exhalation: Stories', null, '9781101947883', 'https://covers.openlibrary.org/b/isbn/9781101947883-L.jpg', 'Nine stories that explore free will, time, the nature of the universe, and what it means to be human — from the mind of Ted Chiang.', 2019, 352),
  ('b1000000-0000-0000-0000-000000000046', 'Pachinko', null, '9781455563920', 'https://covers.openlibrary.org/b/isbn/9781455563920-L.jpg', 'Four generations of a Korean family in Japan, from the early 1900s to the 1980s — a sweeping saga of exile, identity, and endurance.', 2017, 490),
  ('b1000000-0000-0000-0000-000000000047', 'Babel', 'Or the Necessity of Violence', '9780063021426', 'https://covers.openlibrary.org/b/isbn/9780063021426-L.jpg', 'An orphan from Canton enrolls at Oxford''s Royal Institute of Translation, where silver bars power the British Empire — until he must choose a side.', 2022, 545),
  ('b1000000-0000-0000-0000-000000000048', 'A Gentleman in Moscow', null, '9780143110439', 'https://covers.openlibrary.org/b/isbn/9780143110439-L.jpg', 'Count Rostov is sentenced to house arrest in Moscow''s Metropol Hotel for the rest of his life. What follows is an elegant, witty study of a man making meaning within confinement.', 2016, 462),
  ('b1000000-0000-0000-0000-000000000049', 'The Martian', null, '9780553418026', 'https://covers.openlibrary.org/b/isbn/9780553418026-L.jpg', 'Stranded on Mars with no way to signal Earth, astronaut Mark Watney must science the hell out of his situation to survive.', 2014, 369)
on conflict do nothing;

insert into book_authors (book_id, author_id) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005'),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006'),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000007'),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000008'),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000009'),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000010'),
  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000003'),
  ('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000011'),
  ('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000012'),
  ('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000013'),
  ('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000014'),
  ('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000015'),
  ('b1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000016'),
  ('b1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000017'),
  ('b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000018'),
  ('b1000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000019'),
  ('b1000000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000020'),
  ('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000021'),
  ('b1000000-0000-0000-0000-000000000024', 'a1000000-0000-0000-0000-000000000022'),
  ('b1000000-0000-0000-0000-000000000025', 'a1000000-0000-0000-0000-000000000023'),
  ('b1000000-0000-0000-0000-000000000026', 'a1000000-0000-0000-0000-000000000024'),
  ('b1000000-0000-0000-0000-000000000027', 'a1000000-0000-0000-0000-000000000025'),
  ('b1000000-0000-0000-0000-000000000028', 'a1000000-0000-0000-0000-000000000026'),
  ('b1000000-0000-0000-0000-000000000029', 'a1000000-0000-0000-0000-000000000027'),
  ('b1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000028'),
  ('b1000000-0000-0000-0000-000000000031', 'a1000000-0000-0000-0000-000000000029'),
  ('b1000000-0000-0000-0000-000000000032', 'a1000000-0000-0000-0000-000000000030'),
  ('b1000000-0000-0000-0000-000000000033', 'a1000000-0000-0000-0000-000000000011'),
  ('b1000000-0000-0000-0000-000000000034', 'a1000000-0000-0000-0000-000000000012'),
  ('b1000000-0000-0000-0000-000000000035', 'a1000000-0000-0000-0000-000000000015'),
  ('b1000000-0000-0000-0000-000000000036', 'a1000000-0000-0000-0000-000000000016'),
  ('b1000000-0000-0000-0000-000000000037', 'a1000000-0000-0000-0000-000000000018'),
  ('b1000000-0000-0000-0000-000000000038', 'a1000000-0000-0000-0000-000000000031'),
  ('b1000000-0000-0000-0000-000000000039', 'a1000000-0000-0000-0000-000000000032'),
  ('b1000000-0000-0000-0000-000000000040', 'a1000000-0000-0000-0000-000000000032'),
  ('b1000000-0000-0000-0000-000000000041', 'a1000000-0000-0000-0000-000000000033'),
  ('b1000000-0000-0000-0000-000000000042', 'a1000000-0000-0000-0000-000000000034'),
  ('b1000000-0000-0000-0000-000000000043', 'a1000000-0000-0000-0000-000000000035'),
  ('b1000000-0000-0000-0000-000000000044', 'a1000000-0000-0000-0000-000000000036'),
  ('b1000000-0000-0000-0000-000000000045', 'a1000000-0000-0000-0000-000000000037'),
  ('b1000000-0000-0000-0000-000000000046', 'a1000000-0000-0000-0000-000000000038'),
  ('b1000000-0000-0000-0000-000000000047', 'a1000000-0000-0000-0000-000000000039'),
  ('b1000000-0000-0000-0000-000000000048', 'a1000000-0000-0000-0000-000000000040'),
  ('b1000000-0000-0000-0000-000000000049', 'a1000000-0000-0000-0000-000000000031')
on conflict do nothing;

insert into book_genres (book_id, genre_id)
select distinct b.id, g.id from books b, genres g
where (
  (b.id = 'b1000000-0000-0000-0000-000000000001' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000002' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000003' and g.slug in ('science-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000004' and g.slug in ('fiction', 'literary-fiction', 'science-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000005' and g.slug in ('non-fiction', 'essays', 'biography')) or
  (b.id = 'b1000000-0000-0000-0000-000000000006' and g.slug in ('fiction', 'science-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000007' and g.slug in ('fiction', 'mystery', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000008' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000009' and g.slug in ('fiction', 'literary-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000010' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000011' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000012' and g.slug in ('science-fiction', 'fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000013' and g.slug in ('fiction', 'literary-fiction', 'classics', 'philosophy')) or
  (b.id = 'b1000000-0000-0000-0000-000000000014' and g.slug in ('fiction', 'literary-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000015' and g.slug in ('fiction', 'literary-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000016' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000017' and g.slug in ('fiction', 'literary-fiction', 'classics', 'philosophy')) or
  (b.id = 'b1000000-0000-0000-0000-000000000018' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000019' and g.slug in ('fiction', 'literary-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000020' and g.slug in ('fiction', 'science-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000021' and g.slug in ('fiction', 'literary-fiction', 'mystery')) or
  (b.id = 'b1000000-0000-0000-0000-000000000022' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000023' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000024' and g.slug in ('fiction', 'science-fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000025' and g.slug in ('fiction', 'literary-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000026' and g.slug in ('fiction', 'literary-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000027' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000028' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000029' and g.slug in ('fiction', 'literary-fiction', 'romance')) or
  (b.id = 'b1000000-0000-0000-0000-000000000030' and g.slug in ('fiction', 'literary-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000031' and g.slug in ('fiction', 'science-fiction', 'fantasy')) or
  (b.id = 'b1000000-0000-0000-0000-000000000032' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000033' and g.slug in ('fiction', 'literary-fiction', 'classics', 'psychology')) or
  (b.id = 'b1000000-0000-0000-0000-000000000034' and g.slug in ('fiction', 'literary-fiction', 'classics')) or
  (b.id = 'b1000000-0000-0000-0000-000000000035' and g.slug in ('fiction', 'literary-fiction', 'classics', 'philosophy')) or
  (b.id = 'b1000000-0000-0000-0000-000000000036' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000037' and g.slug in ('fiction', 'science-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000038' and g.slug in ('fiction', 'science-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000039' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000040' and g.slug in ('fiction', 'literary-fiction', 'fantasy')) or
  (b.id = 'b1000000-0000-0000-0000-000000000041' and g.slug in ('fiction', 'literary-fiction', 'science-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000042' and g.slug in ('fiction', 'fantasy')) or
  (b.id = 'b1000000-0000-0000-0000-000000000043' and g.slug in ('fiction', 'literary-fiction', 'mystery')) or
  (b.id = 'b1000000-0000-0000-0000-000000000044' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000045' and g.slug in ('fiction', 'science-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000046' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000047' and g.slug in ('fiction', 'fantasy', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000048' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction')) or
  (b.id = 'b1000000-0000-0000-0000-000000000049' and g.slug in ('fiction', 'science-fiction'))
)
and not exists (
  select 1
  from book_genres existing
  where existing.book_id = b.id
    and existing.genre_id = g.id
)
on conflict (book_id, genre_id) do nothing;

-- ============================================================
-- CLUBS
-- ============================================================

create table if not exists clubs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text,
  cover_url   text,
  is_public   boolean not null default true,
  current_book_id uuid references books(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists clubs_owner_idx  on clubs (owner_id);
create index if not exists clubs_public_idx on clubs (is_public, created_at desc);

create or replace trigger clubs_updated_at
  before update on clubs
  for each row execute function update_updated_at();

create table if not exists club_members (
  club_id    uuid not null references clubs(id)    on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index if not exists club_members_club_idx on club_members (club_id);
create index if not exists club_members_user_idx on club_members (user_id);

-- Club discussion posts
create table if not exists club_posts (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id)    on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  book_id    uuid references books(id) on delete set null,
  title      text not null,
  body       text not null,
  is_pinned  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_posts_club_idx on club_posts (club_id, created_at desc);

create or replace trigger club_posts_updated_at
  before update on club_posts
  for each row execute function update_updated_at();

-- Club post comments
create table if not exists club_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references club_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id)   on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists club_comments_post_idx on club_comments (post_id, created_at);

-- ============================================================
-- READING STREAKS
-- ============================================================

create table if not exists reading_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  book_id     uuid references books(id) on delete set null,
  pages_read  int,
  minutes_read int,
  session_date date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now(),

  unique (user_id, session_date, book_id)
);

create index if not exists reading_sessions_user_idx on reading_sessions (user_id, session_date desc);
create index if not exists reading_sessions_date_idx on reading_sessions (session_date);

-- ============================================================
-- BOOK DISCUSSIONS (Reddit-style, per book)
-- ============================================================

create table if not exists book_posts (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references books(id)    on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  body       text,
  post_type  text not null default 'discussion' check (post_type in ('discussion', 'question', 'recommendation', 'spoiler')),
  contains_spoiler boolean not null default false,
  upvotes    int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table book_posts
  add column if not exists post_type text not null default 'discussion',
  add column if not exists contains_spoiler boolean not null default false,
  add column if not exists upvotes int not null default 0;

create index if not exists book_posts_book_idx on book_posts (book_id, created_at desc);
create index if not exists book_posts_user_idx on book_posts (user_id);

create or replace trigger book_posts_updated_at
  before update on book_posts
  for each row execute function update_updated_at();

create table if not exists book_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references book_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id)   on delete cascade,
  parent_id  uuid references book_post_comments(id) on delete cascade,
  body       text not null,
  contains_spoiler boolean not null default false,
  upvotes    int not null default 0,
  created_at timestamptz not null default now()
);

alter table book_post_comments
  add column if not exists parent_id uuid references book_post_comments(id) on delete cascade,
  add column if not exists contains_spoiler boolean not null default false,
  add column if not exists upvotes int not null default 0;

create index if not exists book_post_comments_post_idx on book_post_comments (post_id, created_at);

-- ============================================================
-- BOOK POST UPVOTES (one per user per post)
-- ============================================================

create table if not exists book_post_upvotes (
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references book_posts(id) on delete cascade,
  vote_value int not null default 1 check (vote_value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists book_post_upvotes_post_idx on book_post_upvotes (post_id);

create or replace function update_book_post_upvote_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update book_posts set upvotes = upvotes + new.vote_value where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update book_posts set upvotes = upvotes - old.vote_value where id = old.post_id;
  elsif TG_OP = 'UPDATE' then
    update book_posts set upvotes = upvotes - old.vote_value + new.vote_value where id = new.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists book_post_upvotes_count on book_post_upvotes;
create trigger book_post_upvotes_count
  after insert or update or delete on book_post_upvotes
  for each row execute function update_book_post_upvote_count();

-- ============================================================
-- FAVORITE BOOKS (pinned to profile, max 4)
-- ============================================================

create table if not exists favorite_books (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references profiles(id) on delete cascade,
  book_id  uuid not null references books(id) on delete cascade,
  position int not null default 1 check (position between 1 and 4),
  added_at timestamptz not null default now(),

  unique (user_id, book_id),
  unique (user_id, position)
);

create index if not exists favorite_books_user_idx on favorite_books (user_id, position);

create table if not exists blocked_users (
  user_id uuid not null references profiles(id) on delete cascade,
  blocked_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  constraint blocked_users_no_self check (user_id <> blocked_user_id)
);

create index if not exists blocked_users_user_idx on blocked_users (user_id);
create index if not exists blocked_users_blocked_idx on blocked_users (blocked_user_id);

create table if not exists blocked_authors (
  user_id uuid not null references profiles(id) on delete cascade,
  author_id uuid not null references authors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

create index if not exists blocked_authors_user_idx on blocked_authors (user_id);
create index if not exists blocked_authors_author_idx on blocked_authors (author_id);

create table if not exists blocked_tags (
  user_id uuid not null references profiles(id) on delete cascade,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create index if not exists blocked_tags_user_idx on blocked_tags (user_id);
create index if not exists blocked_tags_tag_idx on blocked_tags (tag_id);

create table if not exists review_saves (
  user_id uuid not null references profiles(id) on delete cascade,
  review_id uuid not null references reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

create index if not exists review_saves_user_idx on review_saves (user_id, created_at desc);
create index if not exists review_saves_review_idx on review_saves (review_id);

create table if not exists reading_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  total_pages_read int not null default 0,
  total_minutes_read int not null default 0,
  total_sessions int not null default 0,
  active_days int not null default 0,
  pages_this_week int not null default 0,
  minutes_this_week int not null default 0,
  pages_this_month int not null default 0,
  minutes_this_month int not null default 0,
  books_completed_this_year int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_activity_date date,
  current_milestone text,
  updated_at timestamptz not null default now()
);

create table if not exists reading_goals (
  user_id uuid not null references profiles(id) on delete cascade,
  year int not null,
  book_goal int not null default 24,
  page_goal int not null default 5000,
  minute_goal int not null default 3000,
  books_completed int not null default 0,
  pages_completed int not null default 0,
  minutes_completed int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);

create index if not exists reading_goals_year_idx on reading_goals (year, completed_at);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  badge_key text not null,
  title text not null,
  description text,
  icon text not null default 'sparkles',
  metadata jsonb not null default '{}'::jsonb,
  unlocked_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

create index if not exists badges_user_idx on badges (user_id, unlocked_at desc);

-- ============================================================
-- RLS for new tables
-- ============================================================

alter table clubs              enable row level security;
alter table club_members       enable row level security;
alter table club_posts         enable row level security;
alter table club_comments      enable row level security;
alter table reading_sessions   enable row level security;
alter table reading_stats      enable row level security;
alter table streaks           enable row level security;
alter table reading_goals     enable row level security;
alter table badges            enable row level security;
alter table book_posts         enable row level security;
alter table book_post_comments enable row level security;
alter table book_post_upvotes  enable row level security;
alter table favorite_books     enable row level security;
alter table blocked_users      enable row level security;
alter table blocked_authors    enable row level security;
alter table blocked_tags       enable row level security;
alter table review_saves       enable row level security;

-- clubs
drop policy if exists "Public clubs are viewable by everyone" on clubs;
drop policy if exists "Authenticated users can create clubs" on clubs;
drop policy if exists "Club owners can update their clubs" on clubs;
drop policy if exists "Club owners can delete their clubs" on clubs;
create policy "Public clubs are viewable by everyone" on clubs for select using (is_public = true or owner_id = auth.uid());
create policy "Authenticated users can create clubs"  on clubs for insert with check (auth.uid() = owner_id);
create policy "Club owners can update their clubs"    on clubs for update using (auth.uid() = owner_id);
create policy "Club owners can delete their clubs"    on clubs for delete using (auth.uid() = owner_id);

-- club_members
drop policy if exists "Club members are viewable by everyone" on club_members;
drop policy if exists "Users can join clubs" on club_members;
drop policy if exists "Users can leave clubs" on club_members;
create policy "Club members are viewable by everyone"  on club_members for select using (true);
create policy "Users can join clubs"                   on club_members for insert with check (auth.uid() = user_id);
create policy "Users can leave clubs"                  on club_members for delete using (auth.uid() = user_id);

-- club_posts
drop policy if exists "Club posts viewable by club members" on club_posts;
drop policy if exists "Club members can post" on club_posts;
drop policy if exists "Post authors can update posts" on club_posts;
drop policy if exists "Post authors can delete posts" on club_posts;
create policy "Club posts viewable by club members"   on club_posts for select
  using (exists (select 1 from clubs where clubs.id = club_posts.club_id and (clubs.is_public = true or clubs.owner_id = auth.uid())));
create policy "Club members can post"                  on club_posts for insert
  with check (auth.uid() = user_id and exists (select 1 from club_members where club_id = club_posts.club_id and user_id = auth.uid()));
create policy "Post authors can update posts"          on club_posts for update using (auth.uid() = user_id);
create policy "Post authors can delete posts"          on club_posts for delete using (auth.uid() = user_id);

-- club_comments
drop policy if exists "Club comments viewable by everyone" on club_comments;
drop policy if exists "Authenticated users can comment" on club_comments;
drop policy if exists "Comment authors can delete" on club_comments;
create policy "Club comments viewable by everyone"    on club_comments for select using (true);
create policy "Authenticated users can comment"       on club_comments for insert with check (auth.uid() = user_id);
create policy "Comment authors can delete"            on club_comments for delete using (auth.uid() = user_id);

-- reading_sessions
drop policy if exists "Reading sessions viewable by owner" on reading_sessions;
drop policy if exists "Users can log their own sessions" on reading_sessions;
drop policy if exists "Users can update their own sessions" on reading_sessions;
drop policy if exists "Users can delete their own sessions" on reading_sessions;
create policy "Reading sessions viewable by owner"    on reading_sessions for select using (auth.uid() = user_id);
create policy "Users can log their own sessions"      on reading_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their own sessions"   on reading_sessions for update using (auth.uid() = user_id);
create policy "Users can delete their own sessions"   on reading_sessions for delete using (auth.uid() = user_id);

-- book_posts
drop policy if exists "Book posts are viewable by everyone" on book_posts;
drop policy if exists "Authenticated users can post" on book_posts;
drop policy if exists "Post authors can update" on book_posts;
drop policy if exists "Post authors can delete" on book_posts;
create policy "Book posts are viewable by everyone"   on book_posts for select using (true);
create policy "Authenticated users can post"          on book_posts for insert with check (auth.uid() = user_id);
create policy "Post authors can update"               on book_posts for update using (auth.uid() = user_id);
create policy "Post authors can delete"               on book_posts for delete using (auth.uid() = user_id);

-- book_post_comments
drop policy if exists "Book post comments viewable by everyone" on book_post_comments;
drop policy if exists "Authenticated users can comment on books" on book_post_comments;
drop policy if exists "Comment authors can update their comments" on book_post_comments;
drop policy if exists "Comment authors can delete their comments" on book_post_comments;
create policy "Book post comments viewable by everyone" on book_post_comments for select using (true);
create policy "Authenticated users can comment on books" on book_post_comments for insert with check (auth.uid() = user_id);
create policy "Comment authors can update their comments" on book_post_comments for update using (auth.uid() = user_id);
create policy "Comment authors can delete their comments" on book_post_comments for delete using (auth.uid() = user_id);

-- book_post_upvotes
drop policy if exists "Upvotes are viewable by everyone" on book_post_upvotes;
drop policy if exists "Users can insert own upvotes" on book_post_upvotes;
drop policy if exists "Users can update own upvotes" on book_post_upvotes;
drop policy if exists "Users can delete own upvotes" on book_post_upvotes;
create policy "Upvotes are viewable by everyone"  on book_post_upvotes for select using (true);
create policy "Users can insert own upvotes"      on book_post_upvotes for insert with check (auth.uid() = user_id);
create policy "Users can update own upvotes"      on book_post_upvotes for update using (auth.uid() = user_id);
create policy "Users can delete own upvotes"      on book_post_upvotes for delete using (auth.uid() = user_id);

-- favorite_books
drop policy if exists "Favorite books are viewable by everyone" on favorite_books;
drop policy if exists "Users can insert own favorites" on favorite_books;
drop policy if exists "Users can update own favorites" on favorite_books;
drop policy if exists "Users can delete own favorites" on favorite_books;
create policy "Favorite books are viewable by everyone" on favorite_books for select using (true);
create policy "Users can insert own favorites"          on favorite_books for insert with check (auth.uid() = user_id);
create policy "Users can update own favorites"          on favorite_books for update using (auth.uid() = user_id);
create policy "Users can delete own favorites"          on favorite_books for delete using (auth.uid() = user_id);

-- blocked_users
drop policy if exists "Users can view own blocked users" on blocked_users;
drop policy if exists "Users can insert own blocked users" on blocked_users;
drop policy if exists "Users can delete own blocked users" on blocked_users;
create policy "Users can view own blocked users" on blocked_users for select using (auth.uid() = user_id or auth.uid() = blocked_user_id);
create policy "Users can insert own blocked users" on blocked_users for insert with check (auth.uid() = user_id);
create policy "Users can delete own blocked users" on blocked_users for delete using (auth.uid() = user_id);

-- blocked_authors
drop policy if exists "Users can view own blocked authors" on blocked_authors;
drop policy if exists "Users can insert own blocked authors" on blocked_authors;
drop policy if exists "Users can delete own blocked authors" on blocked_authors;
create policy "Users can view own blocked authors" on blocked_authors for select using (auth.uid() = user_id);
create policy "Users can insert own blocked authors" on blocked_authors for insert with check (auth.uid() = user_id);
create policy "Users can delete own blocked authors" on blocked_authors for delete using (auth.uid() = user_id);

-- blocked_tags
drop policy if exists "Users can view own blocked tags" on blocked_tags;
drop policy if exists "Users can insert own blocked tags" on blocked_tags;
drop policy if exists "Users can delete own blocked tags" on blocked_tags;
create policy "Users can view own blocked tags" on blocked_tags for select using (auth.uid() = user_id);
create policy "Users can insert own blocked tags" on blocked_tags for insert with check (auth.uid() = user_id);
create policy "Users can delete own blocked tags" on blocked_tags for delete using (auth.uid() = user_id);

-- review_saves
drop policy if exists "Users can view own saved reviews" on review_saves;
drop policy if exists "Users can save reviews" on review_saves;
drop policy if exists "Users can unsave reviews" on review_saves;
create policy "Users can view own saved reviews" on review_saves for select using (auth.uid() = user_id);
create policy "Users can save reviews" on review_saves for insert with check (auth.uid() = user_id);
create policy "Users can unsave reviews" on review_saves for delete using (auth.uid() = user_id);

-- reading_stats
drop policy if exists "Users can view own reading stats" on reading_stats;
drop policy if exists "Users can manage own reading stats" on reading_stats;
create policy "Users can view own reading stats" on reading_stats for select using (auth.uid() = user_id);
create policy "Users can manage own reading stats" on reading_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- streaks
drop policy if exists "Users can view own streaks" on streaks;
drop policy if exists "Users can manage own streaks" on streaks;
create policy "Users can view own streaks" on streaks for select using (auth.uid() = user_id);
create policy "Users can manage own streaks" on streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- reading_goals
drop policy if exists "Users can view own reading goals" on reading_goals;
drop policy if exists "Users can manage own reading goals" on reading_goals;
create policy "Users can view own reading goals" on reading_goals for select using (auth.uid() = user_id);
create policy "Users can manage own reading goals" on reading_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- badges
drop policy if exists "Badges are viewable by everyone" on badges;
drop policy if exists "Users can manage own badges" on badges;
create policy "Badges are viewable by everyone" on badges for select using (true);
create policy "Users can manage own badges" on badges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TAGS (thematic metadata for discovery)
-- ============================================================

create table if not exists tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  category   text not null default 'theme' check (category in ('theme', 'mood', 'setting', 'style', 'topic')),
  created_at timestamptz not null default now()
);

create index if not exists tags_slug_idx     on tags (slug);
create index if not exists tags_category_idx on tags (category);
create index if not exists tags_name_trgm_idx on tags using gin (name gin_trgm_ops);

create table if not exists book_tags (
  book_id uuid not null references books(id) on delete cascade,
  tag_id  uuid not null references tags(id)  on delete cascade,
  primary key (book_id, tag_id)
);

create index if not exists book_tags_book_idx on book_tags (book_id);
create index if not exists book_tags_tag_idx  on book_tags (tag_id);

alter table blocked_tags
  drop constraint if exists blocked_tags_tag_id_fkey;

alter table blocked_tags
  add constraint blocked_tags_tag_id_fkey
  foreign key (tag_id) references tags(id) on delete cascade;

-- RLS for tags
alter table tags      enable row level security;
alter table book_tags enable row level security;

drop policy if exists "Tags are viewable by everyone" on tags;
drop policy if exists "Authenticated users can insert tags" on tags;
create policy "Tags are viewable by everyone"       on tags for select using (true);
create policy "Authenticated users can insert tags" on tags for insert with check (auth.role() = 'authenticated');

drop policy if exists "Book tags are viewable by everyone" on book_tags;
drop policy if exists "Authenticated users can insert book tags" on book_tags;
drop policy if exists "Authenticated users can delete book tags" on book_tags;
create policy "Book tags are viewable by everyone"         on book_tags for select using (true);
create policy "Authenticated users can insert book tags"   on book_tags for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can delete book tags"   on book_tags for delete using (auth.role() = 'authenticated');

-- Seed thematic tags
insert into tags (name, slug, category) values
  -- Themes
  ('Grief & Loss',        'grief-loss',        'theme'),
  ('Identity',            'identity',          'theme'),
  ('Loneliness',          'loneliness',        'theme'),
  ('Power & Corruption',  'power-corruption',  'theme'),
  ('Obsession',           'obsession',         'theme'),
  ('Coming of Age',       'coming-of-age',     'theme'),
  ('Existentialism',      'existentialism',    'theme'),
  ('Memory & Nostalgia',  'memory-nostalgia',  'theme'),
  ('Freedom & Oppression','freedom-oppression','theme'),
  ('Love & Desire',       'love-desire',       'theme'),
  ('Survival',            'survival',          'theme'),
  ('Class & Society',     'class-society',     'theme'),
  ('Friendship',          'friendship',        'theme'),
  ('Race & Justice',      'race-justice',      'theme'),
  ('Gender & Sexuality',  'gender-sexuality',  'theme'),
  ('Family',              'family',            'theme'),
  ('Morality',            'morality',          'theme'),
  ('Trauma',              'trauma',            'theme'),
  -- Moods
  ('Dark',                'dark',              'mood'),
  ('Haunting',            'haunting',          'mood'),
  ('Melancholic',         'melancholic',       'mood'),
  ('Suspenseful',         'suspenseful',       'mood'),
  ('Dreamy',              'dreamy',            'mood'),
  ('Bleak',               'bleak',             'mood'),
  ('Lyrical',             'lyrical',           'mood'),
  ('Cerebral',            'cerebral',          'mood'),
  -- Settings
  ('Post-Apocalyptic',    'post-apocalyptic',  'setting'),
  ('Small Town',          'small-town',        'setting'),
  ('Campus',              'campus',            'setting'),
  ('Dystopian',           'dystopian',         'setting'),
  ('Latin America',       'latin-america',     'setting'),
  ('Japan',               'japan',             'setting'),
  ('Italy',               'italy',             'setting'),
  ('American South',      'american-south',    'setting'),
  -- Styles
  ('Magical Realism',     'magical-realism',   'style'),
  ('Unreliable Narrator', 'unreliable-narrator','style'),
  ('Stream of Consciousness','stream-of-consciousness','style'),
  ('Sparse Prose',        'sparse-prose',      'style'),
  ('Epic',                'epic',              'style'),
  ('Philosophical',       'philosophical',     'style')
on conflict (slug) do nothing;

-- Tag the 12 seed books
insert into book_tags (book_id, tag_id)
select b.id, t.id from books b, tags t
where
  -- The Road (McCarthy) — survival, grief, post-apocalyptic, bleak, sparse prose
  (b.id = 'b1000000-0000-0000-0000-000000000001' and t.slug in ('survival', 'grief-loss', 'post-apocalyptic', 'bleak', 'sparse-prose', 'dark', 'morality', 'family')) or
  -- Beloved (Morrison) — trauma, race, haunting, magical realism, American South
  (b.id = 'b1000000-0000-0000-0000-000000000002' and t.slug in ('trauma', 'race-justice', 'haunting', 'magical-realism', 'american-south', 'memory-nostalgia', 'freedom-oppression', 'family')) or
  -- The Left Hand of Darkness (Le Guin) — gender, identity, philosophical, cerebral
  (b.id = 'b1000000-0000-0000-0000-000000000003' and t.slug in ('gender-sexuality', 'identity', 'philosophical', 'cerebral', 'freedom-oppression')) or
  -- Never Let Me Go (Ishiguro) — existentialism, memory, haunting, melancholic, identity
  (b.id = 'b1000000-0000-0000-0000-000000000004' and t.slug in ('existentialism', 'memory-nostalgia', 'haunting', 'melancholic', 'identity', 'friendship', 'love-desire', 'morality')) or
  -- The Year of Magical Thinking (Didion) — grief, memory, lyrical, loneliness
  (b.id = 'b1000000-0000-0000-0000-000000000005' and t.slug in ('grief-loss', 'memory-nostalgia', 'lyrical', 'loneliness', 'love-desire')) or
  -- 1984 (Orwell) — power, dystopian, freedom, dark, suspenseful
  (b.id = 'b1000000-0000-0000-0000-000000000006' and t.slug in ('power-corruption', 'dystopian', 'freedom-oppression', 'dark', 'suspenseful', 'class-society')) or
  -- The Secret History (Tartt) — obsession, morality, campus, dark, suspenseful
  (b.id = 'b1000000-0000-0000-0000-000000000007' and t.slug in ('obsession', 'morality', 'campus', 'dark', 'suspenseful', 'class-society', 'friendship')) or
  -- Norwegian Wood (Murakami) — love, grief, melancholic, coming-of-age, Japan, dreamy
  (b.id = 'b1000000-0000-0000-0000-000000000008' and t.slug in ('love-desire', 'grief-loss', 'melancholic', 'coming-of-age', 'japan', 'dreamy', 'loneliness', 'memory-nostalgia')) or
  -- One Hundred Years of Solitude (Márquez) — family, magical realism, epic, Latin America, loneliness
  (b.id = 'b1000000-0000-0000-0000-000000000009' and t.slug in ('family', 'magical-realism', 'epic', 'latin-america', 'loneliness', 'love-desire', 'memory-nostalgia', 'power-corruption')) or
  -- My Brilliant Friend (Ferrante) — friendship, identity, coming-of-age, class, Italy
  (b.id = 'b1000000-0000-0000-0000-000000000010' and t.slug in ('friendship', 'identity', 'coming-of-age', 'class-society', 'italy', 'family', 'gender-sexuality')) or
  -- Blood Meridian (McCarthy) — dark, morality, survival, bleak, epic
  (b.id = 'b1000000-0000-0000-0000-000000000011' and t.slug in ('dark', 'morality', 'survival', 'bleak', 'epic', 'power-corruption', 'philosophical')) or
  -- The Dispossessed (Le Guin) — freedom, class, philosophical, cerebral, identity
  (b.id = 'b1000000-0000-0000-0000-000000000012' and t.slug in ('freedom-oppression', 'class-society', 'philosophical', 'cerebral', 'identity')) or
  -- The Brothers Karamazov
  (b.id = 'b1000000-0000-0000-0000-000000000013' and t.slug in ('morality', 'family', 'philosophical', 'existentialism', 'dark', 'epic')) or
  -- Mrs Dalloway
  (b.id = 'b1000000-0000-0000-0000-000000000014' and t.slug in ('memory-nostalgia', 'stream-of-consciousness', 'lyrical', 'loneliness', 'class-society')) or
  -- The Trial
  (b.id = 'b1000000-0000-0000-0000-000000000015' and t.slug in ('existentialism', 'power-corruption', 'dark', 'cerebral', 'dystopian')) or
  -- The Bell Jar
  (b.id = 'b1000000-0000-0000-0000-000000000016' and t.slug in ('identity', 'loneliness', 'coming-of-age', 'melancholic', 'trauma')) or
  -- The Stranger
  (b.id = 'b1000000-0000-0000-0000-000000000017' and t.slug in ('existentialism', 'morality', 'cerebral', 'sparse-prose')) or
  -- Americanah
  (b.id = 'b1000000-0000-0000-0000-000000000018' and t.slug in ('identity', 'race-justice', 'love-desire', 'coming-of-age', 'class-society')) or
  -- Ficciones
  (b.id = 'b1000000-0000-0000-0000-000000000019' and t.slug in ('cerebral', 'philosophical', 'dreamy', 'latin-america')) or
  -- Kindred
  (b.id = 'b1000000-0000-0000-0000-000000000020' and t.slug in ('race-justice', 'survival', 'trauma', 'family', 'american-south', 'identity')) or
  -- 2666
  (b.id = 'b1000000-0000-0000-0000-000000000021' and t.slug in ('dark', 'epic', 'latin-america', 'obsession', 'bleak')) or
  -- White Teeth
  (b.id = 'b1000000-0000-0000-0000-000000000022' and t.slug in ('identity', 'family', 'coming-of-age', 'class-society', 'friendship')) or
  -- The Sailor Who Fell from Grace with the Sea
  (b.id = 'b1000000-0000-0000-0000-000000000023' and t.slug in ('dark', 'obsession', 'japan', 'morality', 'coming-of-age')) or
  -- The Handmaid's Tale
  (b.id = 'b1000000-0000-0000-0000-000000000024' and t.slug in ('dystopian', 'power-corruption', 'gender-sexuality', 'dark', 'freedom-oppression', 'survival')) or
  -- Giovanni's Room
  (b.id = 'b1000000-0000-0000-0000-000000000025' and t.slug in ('identity', 'gender-sexuality', 'love-desire', 'loneliness', 'existentialism')) or
  -- If on a winter's night a traveler
  (b.id = 'b1000000-0000-0000-0000-000000000026' and t.slug in ('cerebral', 'philosophical', 'dreamy', 'italy')) or
  -- The Hour of the Star
  (b.id = 'b1000000-0000-0000-0000-000000000027' and t.slug in ('identity', 'class-society', 'existentialism', 'lyrical', 'latin-america')) or
  -- On Earth We're Briefly Gorgeous
  (b.id = 'b1000000-0000-0000-0000-000000000028' and t.slug in ('family', 'identity', 'trauma', 'lyrical', 'love-desire', 'coming-of-age')) or
  -- Normal People
  (b.id = 'b1000000-0000-0000-0000-000000000029' and t.slug in ('love-desire', 'class-society', 'coming-of-age', 'melancholic', 'friendship', 'small-town')) or
  -- A Little Life
  (b.id = 'b1000000-0000-0000-0000-000000000030' and t.slug in ('trauma', 'friendship', 'dark', 'identity', 'love-desire', 'melancholic')) or
  -- The Fifth Season
  (b.id = 'b1000000-0000-0000-0000-000000000031' and t.slug in ('survival', 'power-corruption', 'epic', 'dark', 'identity', 'freedom-oppression')) or
  -- The Underground Railroad
  (b.id = 'b1000000-0000-0000-0000-000000000032' and t.slug in ('race-justice', 'freedom-oppression', 'survival', 'american-south', 'magical-realism')) or
  -- Crime and Punishment
  (b.id = 'b1000000-0000-0000-0000-000000000033' and t.slug in ('morality', 'existentialism', 'dark', 'cerebral', 'identity', 'class-society')) or
  -- To the Lighthouse
  (b.id = 'b1000000-0000-0000-0000-000000000034' and t.slug in ('memory-nostalgia', 'grief-loss', 'lyrical', 'stream-of-consciousness', 'family')) or
  -- The Plague
  (b.id = 'b1000000-0000-0000-0000-000000000035' and t.slug in ('existentialism', 'survival', 'morality', 'philosophical', 'bleak')) or
  -- Half of a Yellow Sun
  (b.id = 'b1000000-0000-0000-0000-000000000036' and t.slug in ('race-justice', 'love-desire', 'family', 'trauma', 'identity')) or
  -- Parable of the Sower
  (b.id = 'b1000000-0000-0000-0000-000000000037' and t.slug in ('survival', 'dystopian', 'race-justice', 'identity', 'coming-of-age', 'dark')) or
  -- Project Hail Mary
  (b.id = 'b1000000-0000-0000-0000-000000000038' and t.slug in ('survival', 'friendship', 'cerebral', 'philosophical')) or
  -- The Song of Achilles
  (b.id = 'b1000000-0000-0000-0000-000000000039' and t.slug in ('love-desire', 'grief-loss', 'lyrical', 'friendship', 'identity', 'epic')) or
  -- Circe
  (b.id = 'b1000000-0000-0000-0000-000000000040' and t.slug in ('identity', 'power-corruption', 'gender-sexuality', 'survival', 'loneliness', 'lyrical')) or
  -- Station Eleven
  (b.id = 'b1000000-0000-0000-0000-000000000041' and t.slug in ('survival', 'memory-nostalgia', 'post-apocalyptic', 'haunting', 'friendship')) or
  -- The Way of Kings
  (b.id = 'b1000000-0000-0000-0000-000000000042' and t.slug in ('survival', 'epic', 'power-corruption', 'identity', 'morality')) or
  -- Everything I Never Told You
  (b.id = 'b1000000-0000-0000-0000-000000000043' and t.slug in ('family', 'identity', 'race-justice', 'grief-loss', 'loneliness', 'small-town')) or
  -- The Vanishing Half
  (b.id = 'b1000000-0000-0000-0000-000000000044' and t.slug in ('identity', 'race-justice', 'family', 'class-society', 'coming-of-age', 'american-south')) or
  -- Exhalation
  (b.id = 'b1000000-0000-0000-0000-000000000045' and t.slug in ('cerebral', 'philosophical', 'existentialism', 'identity')) or
  -- Pachinko
  (b.id = 'b1000000-0000-0000-0000-000000000046' and t.slug in ('family', 'identity', 'class-society', 'survival', 'epic', 'japan')) or
  -- Babel
  (b.id = 'b1000000-0000-0000-0000-000000000047' and t.slug in ('power-corruption', 'identity', 'race-justice', 'class-society', 'cerebral', 'dark')) or
  -- A Gentleman in Moscow
  (b.id = 'b1000000-0000-0000-0000-000000000048' and t.slug in ('class-society', 'friendship', 'lyrical', 'memory-nostalgia', 'freedom-oppression')) or
  -- The Martian
  (b.id = 'b1000000-0000-0000-0000-000000000049' and t.slug in ('survival', 'cerebral'))
on conflict do nothing;

-- ============================================================
-- PUBLIC ROADMAP (feature voting)
-- ============================================================

create table if not exists roadmap_features (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'considering')),
  category    text not null default 'feature' check (category in ('feature', 'improvement', 'bug_fix', 'design')),
  vote_count  int not null default 0,
  created_by  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists roadmap_features_status_idx on roadmap_features (status);
create index if not exists roadmap_features_votes_idx  on roadmap_features (vote_count desc);

create or replace trigger roadmap_features_updated_at
  before update on roadmap_features
  for each row execute function update_updated_at();

create table if not exists roadmap_votes (
  user_id    uuid not null references profiles(id) on delete cascade,
  feature_id uuid not null references roadmap_features(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, feature_id)
);

create index if not exists roadmap_votes_feature_idx on roadmap_votes (feature_id);

create or replace function update_roadmap_vote_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update roadmap_features set vote_count = vote_count + 1 where id = new.feature_id;
  elsif TG_OP = 'DELETE' then
    update roadmap_features set vote_count = greatest(0, vote_count - 1) where id = old.feature_id;
  end if;
  return null;
end;
$$;

drop trigger if exists roadmap_votes_count on roadmap_votes;
create trigger roadmap_votes_count
  after insert or delete on roadmap_votes
  for each row execute function update_roadmap_vote_count();

create table if not exists roadmap_comments (
  id         uuid primary key default gen_random_uuid(),
  feature_id uuid not null references roadmap_features(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists roadmap_comments_feature_idx on roadmap_comments (feature_id, created_at);

-- RLS for roadmap
alter table roadmap_features enable row level security;
alter table roadmap_votes    enable row level security;
alter table roadmap_comments enable row level security;

drop policy if exists "Roadmap features viewable by everyone" on roadmap_features;
drop policy if exists "Admins can insert roadmap features" on roadmap_features;
drop policy if exists "Admins can update roadmap features" on roadmap_features;
drop policy if exists "Admins can delete roadmap features" on roadmap_features;
create policy "Roadmap features viewable by everyone" on roadmap_features for select using (true);
create policy "Admins can insert roadmap features"    on roadmap_features for insert with check (auth.uid() = created_by);
create policy "Admins can update roadmap features"    on roadmap_features for update using (auth.uid() = created_by);
create policy "Admins can delete roadmap features"    on roadmap_features for delete using (auth.uid() = created_by);

drop policy if exists "Roadmap votes viewable by everyone" on roadmap_votes;
drop policy if exists "Users can vote on features" on roadmap_votes;
drop policy if exists "Users can remove their vote" on roadmap_votes;
create policy "Roadmap votes viewable by everyone" on roadmap_votes for select using (true);
create policy "Users can vote on features"         on roadmap_votes for insert with check (auth.uid() = user_id);
create policy "Users can remove their vote"        on roadmap_votes for delete using (auth.uid() = user_id);

drop policy if exists "Roadmap comments viewable by everyone" on roadmap_comments;
drop policy if exists "Users can comment on features" on roadmap_comments;
drop policy if exists "Users can delete own comments" on roadmap_comments;
create policy "Roadmap comments viewable by everyone" on roadmap_comments for select using (true);
create policy "Users can comment on features"         on roadmap_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments"         on roadmap_comments for delete using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete cascade,
  type        text not null check (type in (
    'follow', 'like', 'comment', 'review_on_book', 'list_mention',
    'club_invite', 'roadmap_status', 'upvote'
  )),
  entity_type text,  -- 'review', 'book_post', 'list', 'club', 'roadmap_feature'
  entity_id   uuid,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx   on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id, is_read) where is_read = false;

create table if not exists notification_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  notify_follows boolean not null default true,
  notify_comments boolean not null default true,
  notify_upvotes boolean not null default true,
  notify_likes boolean not null default true,
  notify_club_activity boolean not null default true,
  notify_roadmap_updates boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_user_id uuid references profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('review', 'book_post', 'book_post_comment', 'club')),
  entity_id uuid not null,
  reason_category text not null check (reason_category in (
    'spam',
    'harassment',
    'hate',
    'spoilers',
    'self_harm',
    'sexual_content',
    'other'
  )),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists bookcase_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  row2_shelf text not null default 'reading' check (row2_shelf in ('reading', 'to_read', 'read', 'dnf')),
  row3_shelf text not null default 'to_read' check (row3_shelf in ('reading', 'to_read', 'read', 'dnf')),
  row2_custom_name text,
  row3_custom_name text,
  updated_at timestamptz not null default now(),
  constraint bookcase_preferences_unique_rows check (row2_shelf <> row3_shelf)
);

create table if not exists moderator_users (
  user_id uuid primary key references profiles(id) on delete cascade,
  added_at timestamptz not null default now()
);

create or replace function public.is_moderator_user(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from moderator_users
    where user_id = check_user_id
  );
$$;

grant execute on function public.is_moderator_user(uuid) to authenticated;

create index if not exists notification_preferences_updated_idx on notification_preferences (updated_at desc);
create index if not exists content_reports_reporter_idx on content_reports (reporter_id, created_at desc);
create index if not exists content_reports_entity_idx on content_reports (entity_type, entity_id);
create index if not exists content_reports_status_idx on content_reports (status, created_at desc);
create index if not exists bookcase_preferences_updated_idx on bookcase_preferences (updated_at desc);

alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table content_reports enable row level security;
alter table bookcase_preferences enable row level security;
alter table moderator_users enable row level security;

drop policy if exists "Users can view own notifications" on notifications;
drop policy if exists "System can insert notifications" on notifications;
drop policy if exists "Users can update own notifications" on notifications;
drop policy if exists "Users can delete own notifications" on notifications;
create policy "Users can view own notifications"   on notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications"    on notifications for insert with check (auth.uid() = actor_id);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);
create policy "Users can delete own notifications" on notifications for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own notification preferences" on notification_preferences;
drop policy if exists "Users can upsert own notification preferences" on notification_preferences;
create policy "Users can view own notification preferences" on notification_preferences for select using (auth.uid() = user_id);
create policy "Users can upsert own notification preferences" on notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Bookcase preferences are viewable by everyone" on bookcase_preferences;
drop policy if exists "Users can manage own bookcase preferences" on bookcase_preferences;
create policy "Bookcase preferences are viewable by everyone" on bookcase_preferences for select using (true);
create policy "Users can manage own bookcase preferences" on bookcase_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own moderator role" on moderator_users;
drop policy if exists "Moderators can view moderator roles" on moderator_users;
drop policy if exists "Moderators can manage moderator roles" on moderator_users;
create policy "Users can view own moderator role" on moderator_users for select using (auth.uid() = user_id);
create policy "Moderators can view moderator roles" on moderator_users for select using (
  public.is_moderator_user(auth.uid())
);
create policy "Moderators can manage moderator roles" on moderator_users for all
  using (public.is_moderator_user(auth.uid()))
  with check (public.is_moderator_user(auth.uid()));

drop policy if exists "Users can view own reports" on content_reports;
drop policy if exists "Users can create own reports" on content_reports;
drop policy if exists "Moderators can review reports" on content_reports;
drop policy if exists "Moderators can update reports" on content_reports;
create policy "Users can view own reports" on content_reports for select using (auth.uid() = reporter_id);
create policy "Users can create own reports" on content_reports for insert with check (auth.uid() = reporter_id);
create policy "Moderators can review reports" on content_reports for select
  using (
    exists (
      select 1
      from moderator_users
      where moderator_users.user_id = auth.uid()
    )
  );
create policy "Moderators can update reports" on content_reports for update
  using (
    exists (
      select 1
      from moderator_users
      where moderator_users.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from moderator_users
      where moderator_users.user_id = auth.uid()
    )
  );

-- ============================================================
-- Done. Sign up at your app URL to create your first account.
-- ============================================================
-- ============================================================
-- Additional books fetched from Open Library
-- Generated: 2026-04-08T16:02:14.853Z
-- Total: 324 books
-- ============================================================

-- Authors
insert into authors (id, name) values
  ('a1000000-0000-0000-0000-000000000050', 'Rick Riordan'),
  ('a1000000-0000-0000-0000-000000000051', 'J. K. Rowling'),
  ('a1000000-0000-0000-0000-000000000052', 'Suzanne Collins'),
  ('a1000000-0000-0000-0000-000000000053', 'Veronica Roth'),
  ('a1000000-0000-0000-0000-000000000054', 'William Blake'),
  ('a1000000-0000-0000-0000-000000000055', 'James Dashner'),
  ('a1000000-0000-0000-0000-000000000056', 'J.R.R. Tolkien'),
  ('a1000000-0000-0000-0000-000000000057', 'George R. R. Martin'),
  ('a1000000-0000-0000-0000-000000000058', 'Book Of Thrones'),
  ('a1000000-0000-0000-0000-000000000059', 'Frank Herbert'),
  ('a1000000-0000-0000-0000-000000000060', 'Douglas Adams'),
  ('a1000000-0000-0000-0000-000000000061', 'Orson Scott Card'),
  ('a1000000-0000-0000-0000-000000000062', 'Brandon Sanderson'),
  ('a1000000-0000-0000-0000-000000000063', 'Robert Jordan'),
  ('a1000000-0000-0000-0000-000000000064', 'Stephenie Meyer'),
  ('a1000000-0000-0000-0000-000000000065', 'C. S. Lewis'),
  ('a1000000-0000-0000-0000-000000000066', 'Philip Pullman'),
  ('a1000000-0000-0000-0000-000000000067', 'Christopher Paolini'),
  ('a1000000-0000-0000-0000-000000000068', 'Diana Gabaldon'),
  ('a1000000-0000-0000-0000-000000000069', 'Gillian Flynn'),
  ('a1000000-0000-0000-0000-000000000070', 'SuperSummary'),
  ('a1000000-0000-0000-0000-000000000071', 'Paula Hawkins'),
  ('a1000000-0000-0000-0000-000000000072', 'Edith Nesbit'),
  ('a1000000-0000-0000-0000-000000000073', 'Stephen King'),
  ('a1000000-0000-0000-0000-000000000074', 'Bram Stoker'),
  ('a1000000-0000-0000-0000-000000000075', 'Mary Shelley'),
  ('a1000000-0000-0000-0000-000000000076', 'Jane Austen'),
  ('a1000000-0000-0000-0000-000000000077', 'Seth Grahame-Smith'),
  ('a1000000-0000-0000-0000-000000000078', 'Charlotte Brontë'),
  ('a1000000-0000-0000-0000-000000000079', 'Emily Brontë'),
  ('a1000000-0000-0000-0000-000000000080', 'F. Scott Fitzgerald'),
  ('a1000000-0000-0000-0000-000000000081', 'Harper Lee'),
  ('a1000000-0000-0000-0000-000000000082', 'Tamara Castleman'),
  ('a1000000-0000-0000-0000-000000000083', 'Joseph Heller'),
  ('a1000000-0000-0000-0000-000000000084', 'Kurt Vonnegut'),
  ('a1000000-0000-0000-0000-000000000085', 'Harold Bloom'),
  ('a1000000-0000-0000-0000-000000000086', 'Aldous Huxley'),
  ('a1000000-0000-0000-0000-000000000087', 'Ray Bradbury'),
  ('a1000000-0000-0000-0000-000000000088', 'William Golding'),
  ('a1000000-0000-0000-0000-000000000089', 'F. William Nelson'),
  ('a1000000-0000-0000-0000-000000000090', 'George Orwell'),
  ('a1000000-0000-0000-0000-000000000091', 'John Steinbeck'),
  ('a1000000-0000-0000-0000-000000000092', 'J. D. Salinger'),
  ('a1000000-0000-0000-0000-000000000093', 'Mary B. Collins'),
  ('a1000000-0000-0000-0000-000000000094', 'Paulo Coelho'),
  ('a1000000-0000-0000-0000-000000000095', 'Anthony Arroyo'),
  ('a1000000-0000-0000-0000-000000000096', 'Yann Martel'),
  ('a1000000-0000-0000-0000-000000000097', 'Mark Twain'),
  ('a1000000-0000-0000-0000-000000000098', 'Tsʻao, Hsüeh-chʻin.'),
  ('a1000000-0000-0000-0000-000000000099', 'Khaled Hosseini'),
  ('a1000000-0000-0000-0000-000000000100', 'Spark Publishing'),
  ('a1000000-0000-0000-0000-000000000101', 'Ursula Rani Sarma'),
  ('a1000000-0000-0000-0000-000000000102', 'Markus Zusak'),
  ('a1000000-0000-0000-0000-000000000103', 'Anthony Doerr'),
  ('a1000000-0000-0000-0000-000000000104', 'Delia Owens'),
  ('a1000000-0000-0000-0000-000000000105', 'Omen King'),
  ('a1000000-0000-0000-0000-000000000106', 'Tara Westover'),
  ('a1000000-0000-0000-0000-000000000107', 'Sarah Fields'),
  ('a1000000-0000-0000-0000-000000000108', 'Bookhabits'),
  ('a1000000-0000-0000-0000-000000000109', 'Vincent Verret'),
  ('a1000000-0000-0000-0000-000000000110', 'Tamil Thiyan'),
  ('a1000000-0000-0000-0000-000000000111', 'Tamil Mithra'),
  ('a1000000-0000-0000-0000-000000000112', 'Yuval Noah Harari'),
  ('a1000000-0000-0000-0000-000000000113', 'FlashBooks Book Summaries'),
  ('a1000000-0000-0000-0000-000000000114', 'James Clear'),
  ('a1000000-0000-0000-0000-000000000115', 'Julie Ann Price'),
  ('a1000000-0000-0000-0000-000000000116', 'Rondyy Rondyy Roo'),
  ('a1000000-0000-0000-0000-000000000117', 'Hanno Sauer'),
  ('a1000000-0000-0000-0000-000000000118', 'Gloria J. Russell'),
  ('a1000000-0000-0000-0000-000000000119', 'Daniel Kahneman'),
  ('a1000000-0000-0000-0000-000000000120', 'Mark Manson'),
  ('a1000000-0000-0000-0000-000000000121', 'Mason Madison'),
  ('a1000000-0000-0000-0000-000000000122', 'Fredrik Backman'),
  ('a1000000-0000-0000-0000-000000000123', 'Antoine McCallan'),
  ('a1000000-0000-0000-0000-000000000124', 'Book Tigers'),
  ('a1000000-0000-0000-0000-000000000125', 'Matt Haig'),
  ('a1000000-0000-0000-0000-000000000126', 'Moscow Press'),
  ('a1000000-0000-0000-0000-000000000127', 'Bonnie Garmus'),
  ('a1000000-0000-0000-0000-000000000128', 'Irb Media'),
  ('a1000000-0000-0000-0000-000000000129', 'Gabrielle Zevin'),
  ('a1000000-0000-0000-0000-000000000130', 'Open University.'),
  ('a1000000-0000-0000-0000-000000000131', 'Rebecca Yarros'),
  ('a1000000-0000-0000-0000-000000000132', 'Erin A. Craig'),
  ('a1000000-0000-0000-0000-000000000133', 'Sarah J. Maas'),
  ('a1000000-0000-0000-0000-000000000134', 'H. M Maker'),
  ('a1000000-0000-0000-0000-000000000135', 'Leigh Bardugo'),
  ('a1000000-0000-0000-0000-000000000136', 'R. F. Kuang'),
  ('a1000000-0000-0000-0000-000000000137', 'Pierce Brown'),
  ('a1000000-0000-0000-0000-000000000138', 'Patrick Rothfuss'),
  ('a1000000-0000-0000-0000-000000000139', 'Scott Lynch'),
  ('a1000000-0000-0000-0000-000000000140', 'Lin, Qi'),
  ('a1000000-0000-0000-0000-000000000141', 'Neil Gaiman'),
  ('a1000000-0000-0000-0000-000000000142', 'Mike Carey'),
  ('a1000000-0000-0000-0000-000000000143', 'Matt Whyman'),
  ('a1000000-0000-0000-0000-000000000144', 'Erin Morgenstern'),
  ('a1000000-0000-0000-0000-000000000145', 'V. E. Schwab'),
  ('a1000000-0000-0000-0000-000000000146', 'Susanna Clarke'),
  ('a1000000-0000-0000-0000-000000000147', 'Edward Gibbon'),
  ('a1000000-0000-0000-0000-000000000148', 'Arthur Conan Doyle'),
  ('a1000000-0000-0000-0000-000000000149', 'Silvia Moreno-Garcia'),
  ('a1000000-0000-0000-0000-000000000150', 'Taylor Jenkins Reid'),
  ('a1000000-0000-0000-0000-000000000151', 'John Walter'),
  ('a1000000-0000-0000-0000-000000000152', 'Frances Cha'),
  ('a1000000-0000-0000-0000-000000000153', 'Summary HUB'),
  ('a1000000-0000-0000-0000-000000000154', 'Emily Henry'),
  ('a1000000-0000-0000-0000-000000000155', 'Robert Louis Stevenson'),
  ('a1000000-0000-0000-0000-000000000156', 'Ali Hazelwood'),
  ('a1000000-0000-0000-0000-000000000157', 'Richard Turner'),
  ('a1000000-0000-0000-0000-000000000158', 'Colleen Hoover'),
  ('a1000000-0000-0000-0000-000000000159', 'Fizzy Diamond'),
  ('a1000000-0000-0000-0000-000000000160', 'Alex Michaelides'),
  ('a1000000-0000-0000-0000-000000000161', 'Nita Prose'),
  ('a1000000-0000-0000-0000-000000000162', 'Andy Weir'),
  ('a1000000-0000-0000-0000-000000000163', 'Unique Summary'),
  ('a1000000-0000-0000-0000-000000000164', 'Charles Dickens'),
  ('a1000000-0000-0000-0000-000000000165', 'Jonathan Swift'),
  ('a1000000-0000-0000-0000-000000000166', 'Roald Dahl'),
  ('a1000000-0000-0000-0000-000000000167', 'Laura Lee Hope'),
  ('a1000000-0000-0000-0000-000000000168', 'Gary Paulsen'),
  ('a1000000-0000-0000-0000-000000000169', 'Lewis Carroll'),
  ('a1000000-0000-0000-0000-000000000170', 'L. Frank Baum'),
  ('a1000000-0000-0000-0000-000000000171', 'William Shakespeare'),
  ('a1000000-0000-0000-0000-000000000172', 'Niccolò Machiavelli'),
  ('a1000000-0000-0000-0000-000000000173', 'Kenneth Grahame'),
  ('a1000000-0000-0000-0000-000000000174', 'George MacDonald'),
  ('a1000000-0000-0000-0000-000000000175', 'H. G. Wells'),
  ('a1000000-0000-0000-0000-000000000176', 'Jack London'),
  ('a1000000-0000-0000-0000-000000000177', 'Edwin Abbott Abbott'),
  ('a1000000-0000-0000-0000-000000000178', 'Agatha Christie'),
  ('a1000000-0000-0000-0000-000000000179', 'John Buchan'),
  ('a1000000-0000-0000-0000-000000000180', 'Stephen Crane'),
  ('a1000000-0000-0000-0000-000000000181', 'Anthony Hope'),
  ('a1000000-0000-0000-0000-000000000182', 'Erskine Childers'),
  ('a1000000-0000-0000-0000-000000000183', 'James Fenimore Cooper'),
  ('a1000000-0000-0000-0000-000000000184', 'Louisa May Alcott'),
  ('a1000000-0000-0000-0000-000000000185', 'Лев Толстой'),
  ('a1000000-0000-0000-0000-000000000186', 'Edith Wharton'),
  ('a1000000-0000-0000-0000-000000000187', 'Wilkie Collins'),
  ('a1000000-0000-0000-0000-000000000188', 'Alexandre Dumas'),
  ('a1000000-0000-0000-0000-000000000189', 'Oscar Wilde'),
  ('a1000000-0000-0000-0000-000000000190', 'Thomas Hardy'),
  ('a1000000-0000-0000-0000-000000000191', 'Sheridan Le Fanu'),
  ('a1000000-0000-0000-0000-000000000192', 'Henry James'),
  ('a1000000-0000-0000-0000-000000000193', 'Charlotte Perkins Gilman'),
  ('a1000000-0000-0000-0000-000000000194', 'Arthur Machen'),
  ('a1000000-0000-0000-0000-000000000195', 'Daniel Defoe'),
  ('a1000000-0000-0000-0000-000000000196', 'Nathaniel Hawthorne'),
  ('a1000000-0000-0000-0000-000000000197', 'Фёдор Михайлович Достоевский'),
  ('a1000000-0000-0000-0000-000000000198', 'Gilbert Keith Chesterton'),
  ('a1000000-0000-0000-0000-000000000199', 'Joseph Conrad'),
  ('a1000000-0000-0000-0000-000000000200', 'Chinua Achebe'),
  ('a1000000-0000-0000-0000-000000000201', 'John Irving'),
  ('a1000000-0000-0000-0000-000000000202', 'Nora Roberts'),
  ('a1000000-0000-0000-0000-000000000203', 'Julie Campbell'),
  ('a1000000-0000-0000-0000-000000000204', 'Mitch Albom'),
  ('a1000000-0000-0000-0000-000000000205', 'Phil Knight'),
  ('a1000000-0000-0000-0000-000000000206', 'Jack Black'),
  ('a1000000-0000-0000-0000-000000000207', 'Herman Wouk'),
  ('a1000000-0000-0000-0000-000000000208', 'Lillian Beckwith'),
  ('a1000000-0000-0000-0000-000000000209', 'Claire Hoy'),
  ('a1000000-0000-0000-0000-000000000210', '村上春樹'),
  ('a1000000-0000-0000-0000-000000000211', 'Fitz Hugh Ludlow'),
  ('a1000000-0000-0000-0000-000000000212', 'Robin S. Sharma'),
  ('a1000000-0000-0000-0000-000000000213', 'Edward de Bono'),
  ('a1000000-0000-0000-0000-000000000214', 'Rhonda Byrne'),
  ('a1000000-0000-0000-0000-000000000215', 'Allan Pease'),
  ('a1000000-0000-0000-0000-000000000216', 'James Redfield'),
  ('a1000000-0000-0000-0000-000000000217', 'Russ Harris'),
  ('a1000000-0000-0000-0000-000000000218', 'Anthea Paul'),
  ('a1000000-0000-0000-0000-000000000219', 'Fred Orr'),
  ('a1000000-0000-0000-0000-000000000220', 'Iyanla Vanzant'),
  ('a1000000-0000-0000-0000-000000000221', 'Truman Capote'),
  ('a1000000-0000-0000-0000-000000000222', 'John Grisham'),
  ('a1000000-0000-0000-0000-000000000223', 'John Berendt'),
  ('a1000000-0000-0000-0000-000000000224', 'John E. Douglas'),
  ('a1000000-0000-0000-0000-000000000225', 'Jon Krakauer'),
  ('a1000000-0000-0000-0000-000000000226', 'David Grann'),
  ('a1000000-0000-0000-0000-000000000227', 'David Simon'),
  ('a1000000-0000-0000-0000-000000000228', 'Magdalen Nabb'),
  ('a1000000-0000-0000-0000-000000000229', 'James Patterson'),
  ('a1000000-0000-0000-0000-000000000230', 'Scott B. MacDonald'),
  ('a1000000-0000-0000-0000-000000000231', 'Dante Alighieri'),
  ('a1000000-0000-0000-0000-000000000232', 'Όμηρος'),
  ('a1000000-0000-0000-0000-000000000233', 'Walt Whitman'),
  ('a1000000-0000-0000-0000-000000000234', 'Geoffrey Chaucer'),
  ('a1000000-0000-0000-0000-000000000235', 'Johann Wolfgang von Goethe'),
  ('a1000000-0000-0000-0000-000000000236', 'Kahlil Gibran'),
  ('a1000000-0000-0000-0000-000000000237', 'Miguel de Cervantes Saavedra'),
  ('a1000000-0000-0000-0000-000000000238', 'Voltaire'),
  ('a1000000-0000-0000-0000-000000000239', 'Washington Irving'),
  ('a1000000-0000-0000-0000-000000000240', 'Henry Fielding'),
  ('a1000000-0000-0000-0000-000000000241', 'Jerome Klapka Jérôme'),
  ('a1000000-0000-0000-0000-000000000242', 'Antoine de Saint-Exupéry'),
  ('a1000000-0000-0000-0000-000000000243', 'Emma Orczy'),
  ('a1000000-0000-0000-0000-000000000244', 'H. Rider Haggard'),
  ('a1000000-0000-0000-0000-000000000245', 'Robert Michael Ballantyne'),
  ('a1000000-0000-0000-0000-000000000246', 'Lois Lowry'),
  ('a1000000-0000-0000-0000-000000000247', 'Isabel Allende'),
  ('a1000000-0000-0000-0000-000000000248', 'Laura Esquivel'),
  ('a1000000-0000-0000-0000-000000000249', 'Salman Rushdie'),
  ('a1000000-0000-0000-0000-000000000250', 'Gabriel García Márquez'),
  ('a1000000-0000-0000-0000-000000000251', '川口俊和'),
  ('a1000000-0000-0000-0000-000000000252', 'John Crowley'),
  ('a1000000-0000-0000-0000-000000000253', 'Maggie Stiefvater'),
  ('a1000000-0000-0000-0000-000000000254', '孙武'),
  ('a1000000-0000-0000-0000-000000000255', 'Henry David Thoreau'),
  ('a1000000-0000-0000-0000-000000000256', 'Πλάτων')
on conflict do nothing;

-- Books
insert into books (id, title, subtitle, isbn, cover_url, description, published_year, page_count) values
  ('b1000000-0000-0000-0000-000000000050', 'The Lightning Thief', null, '9788498382365', 'https://covers.openlibrary.org/b/id/7239831-L.jpg', null, 2005, 384),
  ('b1000000-0000-0000-0000-000000000051', 'The Sea of Monsters', null, '9783646920017', 'https://covers.openlibrary.org/b/id/108909-L.jpg', null, 2006, 282),
  ('b1000000-0000-0000-0000-000000000052', 'Percy Jackson''s Greek Gods', null, '9781539025894', 'https://covers.openlibrary.org/b/id/7396660-L.jpg', '"A publisher in New York asked me to write down what I know about the Greek gods, and I was like, ''Can we do this anonymously?'' Because I don''t need the Olympians mad at me again. But if it helps you to know your Greek gods, and survive an encounter with them if they ever show up in your face, then I guess writing all this down will be my good deed for the week."

So begins Percy Jackson''s Greek Gods, in which the son of Poseidon adds his own magic - and sarcastic asides - to the classics. He ', 2006, 406),
  ('b1000000-0000-0000-0000-000000000053', 'Harry Potter and the Philosopher''s Stone', null, '9781439520031', 'https://covers.openlibrary.org/b/id/15155833-L.jpg', 'Turning the envelope over, his hand trembling, Harry saw a purple wax seal bearing a coat of arms; a lion, an eagle, a badger and a snake surrounding a large letter ''H''.

HARRY POTTER has never even heard of Hogwarts when the LETTERS start dropping on the doormat at number four, Privet Drive. Addressed in GREEN INK on yellowish parchment with a PURPLE SEAL, they are swiftly confiscated by his GRISLY aunt and uncle. Then, on Harry''s eleventh birthday, a great beetle-eyed giant of a man called R', 1997, 302),
  ('b1000000-0000-0000-0000-000000000054', 'Harry Potter and the Deathly Hallows', null, '9788498387001', 'https://covers.openlibrary.org/b/id/15158660-L.jpg', 'Harry Potter is leaving Privet Drive for the last time. But as he climbs into the sidecar of Hagrid’s motorbike and they take to the skies, he knows Lord Voldemort and the Death Eaters will not be far behind.

The protective charm that has kept him safe until now is broken. But the Dark Lord is breathing fear into everything he loves. And he knows he can’t keep hiding.

To stop Voldemort, Harry knows he must find the remaining Horcruxes and destroy them.

He will have to face his enemy in ', 2007, 701),
  ('b1000000-0000-0000-0000-000000000055', 'Harry Potter and the Prisoner of Azkaban', null, '9781526606167', 'https://covers.openlibrary.org/b/id/10580435-L.jpg', null, 1999, 416),
  ('b1000000-0000-0000-0000-000000000056', 'The Hunger Games', null, '9788498675399', 'https://covers.openlibrary.org/b/id/12646537-L.jpg', 'The Hunger Games is a 2008 dystopian novel by the American writer Suzanne Collins. It is written in the perspective of 16-year-old Katniss Everdeen, who lives in the future, post-apocalyptic nation of Panem in North America. The Capitol, a highly advanced metropolis, exercises political control over the rest of the nation. The Hunger Games is an annual event in which one boy and one girl aged 12–18 from each of the twelve districts surrounding the Capitol are selected by lottery to compete in a ', 2008, 399),
  ('b1000000-0000-0000-0000-000000000057', 'Mockingjay', null, '9780702333002', 'https://covers.openlibrary.org/b/id/12646459-L.jpg', null, 2010, 424),
  ('b1000000-0000-0000-0000-000000000058', 'Catching Fire', null, '9788372783950', 'https://covers.openlibrary.org/b/id/12646539-L.jpg', 'Against all odds, Katniss Everdeen has won the Hunger Games. She and fellow District 12 tribute Peeta Mellark are miraculously still alive. Katniss should be relieved, happy even. After all, she has returned to her family and her longtime friend, Gale. Yet nothing is the way Katniss wishes it to be. Gale holds her at an icy distance. Peeta has turned his back on her completely. And there are whispers of a rebellion against the Capitol—a rebellion that Katniss and Peeta may have helped create. 
', 2009, 400),
  ('b1000000-0000-0000-0000-000000000059', 'Divergent', null, '9780062387240', 'https://covers.openlibrary.org/b/id/13274634-L.jpg', '‘Divergent’ is the first in a trilogy of dystopian, YA novels by Veronica Roth. The book is written from Beatrice Prior’s (Tris), point of view and is written in short chapters making it easy to put down and pick up again.

The story is fast paced with full on action throughout. It contains elements of humour and romance, alongside some seriously brutal scenes, especially during Tris’s initiation. There is also quite a few though provoking moments.

This was one of the first YA novels that I', 2010, 487),
  ('b1000000-0000-0000-0000-000000000060', 'Allegiant', null, '9788324153091', 'https://covers.openlibrary.org/b/id/7276393-L.jpg', 'The faction-based society that Tris Prior once believed in is shattered -- fractured by violence and power struggles and scarred by loss and betrayal. So when offered a chance to explore the world past the limits she''s known, Tris is ready. Perhaps beyond the fence, she and Tobias will find a simple new life together, free from complicated lies, tangled loyalties, and painful memories. But Tris''s new reality is even more alarming than the one she left behind. Old discoveries are quickly rendered', 2001, 516),
  ('b1000000-0000-0000-0000-000000000061', 'Poems', null, '9788476645383', 'https://covers.openlibrary.org/b/id/8236962-L.jpg', 'William Blake is one of England’s most fascinating writers; he was not only a groundbreaking poet, but also a painter, engraver, radical, and mystic. Although Blake was dismissed as an eccentric by his contemporaries, his powerful and richly symbolic poetry has been a fertile source of inspiration to the many writers and artists who have followed in his footsteps. In this collection Patti Smith brings together her personal favorites of Blake’s poems, including the complete Songs of Innocence and', 1783, 224),
  ('b1000000-0000-0000-0000-000000000062', 'The Maze Runner', null, '9780553511536', 'https://covers.openlibrary.org/b/id/10464801-L.jpg', 'When Thomas wakes up in the lift, the only thing he can remember is his first name.  His memory is blank.  But he''s not alone.  When the lift''s doors open, Thomas finds himself surrounded by kids who welcome him to the Glade--a large, open expanse surrounded by stone walls.  Just like Thomas, the Gladers don''t know why or how they got to the Glade.  All they know is that every morning the stone doors to the maze that surrounds them have opened.  Every night they''ve closed tight.  And every 30 da', 2009, 375),
  ('b1000000-0000-0000-0000-000000000063', 'The Scorch Trials', null, '9780553538410', 'https://covers.openlibrary.org/b/id/6636110-L.jpg', 'Thomas was sure that escape from the Maze would mean freedom for him and the Gladers. But WICKED isn’t done yet. Phase Two has just begun. The Scorch. The Gladers have two weeks to cross through the Scorch—the most burned-out section of the world. And WICKED has made sure to adjust the variables and stack the odds against them. There are others now. Their survival depends on the Gladers’ destruction—and they’re determined to survive. 

Friendships will be tested. Loyalties will be broken. 

', 2010, 384),
  ('b1000000-0000-0000-0000-000000000064', 'The Lord of the Rings', null, '9785768402099', 'https://covers.openlibrary.org/b/id/14625765-L.jpg', null, 1954, 1193),
  ('b1000000-0000-0000-0000-000000000065', 'The Fellowship of the Ring', null, '9782070515790', 'https://covers.openlibrary.org/b/id/14627060-L.jpg', null, 1954, 496),
  ('b1000000-0000-0000-0000-000000000066', 'The Two Towers', null, '9780008487317', 'https://covers.openlibrary.org/b/id/14627564-L.jpg', 'The Lord of the Rings, J.R.R. Tolkien''s three-volume epic, is set in the imaginary world of Middle-earth -- home to many strange beings, and most notably hobbits, a peace-loving "little people," cheerful and shy. Since its original British publication in 1954-55, the saga has entranced readers of all ages. It is at once a classic myth and a modern fairy tale. Critic Michael Straight has hailed it as one of the "very few works of genius in recent literature." Middle-earth is a world receptive to ', 1954, 436),
  ('b1000000-0000-0000-0000-000000000067', 'A Game of Thrones', null, '9788401032424', 'https://covers.openlibrary.org/b/id/9269962-L.jpg', '***A Game of Thrones*** is the inaugural novel in ***A Song of Ice and Fire***, an epic series of fantasy novels crafted by the American author **George R. R. Martin**. Published on August 1, 1996, this novel introduces readers to the richly detailed world of Westeros and Essos, where political intrigue, power struggles, and magical elements intertwine.

The story unfolds through multiple perspectives, each chapter focusing on a different character, allowing readers to experience the narrative', 1996, 801),
  ('b1000000-0000-0000-0000-000000000068', 'Game of Thrones', null, '9781365850240', 'https://covers.openlibrary.org/b/id/14349154-L.jpg', null, 2017, null),
  ('b1000000-0000-0000-0000-000000000069', 'Dune', null, '9789877254112', 'https://covers.openlibrary.org/b/id/11481354-L.jpg', 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange, a drug capable of extending life and enhancing consciousness. Coveted across the known universe, melange is a prize worth killing for...

When House Atreides is betrayed, the destruction of Paul''s family will set the boy on a journey toward a destiny greater than he could ever have imagined. And as he', 1965, 592),
  ('b1000000-0000-0000-0000-000000000070', 'Dune Messiah', null, '9780450050886', 'https://covers.openlibrary.org/b/id/2421405-L.jpg', null, 1969, 278),
  ('b1000000-0000-0000-0000-000000000071', 'Children of Dune', null, '9788401469336', 'https://covers.openlibrary.org/b/id/6976407-L.jpg', null, 1976, 479),
  ('b1000000-0000-0000-0000-000000000072', 'The Hitch Hiker''s Guide to the Galaxy', null, '9789757380719', 'https://covers.openlibrary.org/b/id/12986869-L.jpg', 'The Hitchhiker''s Guide to the Galaxy is the first of six books in the Hitchhiker''s Guide to the Galaxy comedy science fiction "hexalogy" by Douglas Adams. The novel is an adaptation of the first four parts of Adams''s radio series of the same name. The novel was first published in London on 12 October 1979. It sold 250,000 copies in the first three months.

The namesake of the novel is The Hitchhiker''s Guide to the Galaxy, a fictional guide book for hitchhikers (inspired by the Hitch-hiker''s Gu', 1979, 216),
  ('b1000000-0000-0000-0000-000000000073', 'Works (Hitch Hiker''s Guide to the Galaxy / Restaurant at the End of the Universe / Life, the Universe and Everything / So Long, and Thanks for All the Fish / Mostly Harmless / Young Zaphod Plays it Safe)', null, '9780307291813', 'https://covers.openlibrary.org/b/id/12065834-L.jpg', 'This is the collection of all five of the books in Douglas Adams'' famous galaxy exploring trilogy.  It follows Arthur Dent and his friends as they travel around the Milky Way meeting strange new cultures and having many entertaining adventures in the search for the meaning of life.


----------
Contains:
[The Hitch Hiker''s Guide to the Galaxy](https://openlibrary.org/works/OL2163649W/The_Hitch_Hiker''s_Guide_to_the_Galaxy)
[The Restaurant at the End of the Universe](https://openlibrary.org/', 1996, 815),
  ('b1000000-0000-0000-0000-000000000074', 'Works (The Hitch Hiker''s Guide to the Galaxy / The Restaurant at the End of the Universe / Life, the Universe and Everything / So Long, and Thanks for All the Fish / Young Zaphod Plays it Safe)', null, '9780681403222', 'https://covers.openlibrary.org/b/id/8595140-L.jpg', null, 1986, 624),
  ('b1000000-0000-0000-0000-000000000075', 'Ender''s Game', null, '9780812532531', 'https://covers.openlibrary.org/b/id/12996033-L.jpg', 'Ender''s Game is a 1985 military science fiction novel by American author Orson Scott Card. Set at an unspecified date in Earth''s future, the novel presents an imperiled humankind after two conflicts with the Formics, an insectoid alien species they dub the "buggers". In preparation for an anticipated third invasion, children, including the novel''s protagonist, Andrew "Ender" Wiggin, are trained from a very young age by putting them through increasingly difficult games, including some in zero gra', 1985, 330),
  ('b1000000-0000-0000-0000-000000000076', 'Ender''s Shadow', null, '9781857239751', 'https://covers.openlibrary.org/b/id/12009325-L.jpg', 'This is Bean''s installment of Orson Scott Card''s Ender''s saga. It is a great character building book for those who have read Ender''s Game and want to know more about Bean and his background. 

Here is the description from the back of the book:

> Welcome to Battleschool.
> 
> Growing up is never easy. But try living on the mean streets as a child begging for food and fighting like a dog with ruthless gangs of starving kids who wouldn''t hesitate to pound your skull into pulp for a scrap of ', 1999, 454),
  ('b1000000-0000-0000-0000-000000000077', 'Ender''s Game Boxed Set', null, '9781466854802', 'https://covers.openlibrary.org/b/isbn/9781466854802-L.jpg', null, 2013, null),
  ('b1000000-0000-0000-0000-000000000078', 'The Final Empire', null, '9781484428627', 'https://covers.openlibrary.org/b/id/14658160-L.jpg', 'For a thousand years ashes have fallen from the sky.  For a thousand years nothing has flourished.  For a thousand years the skaa have been enslaved and live in misery, mired in inevitable fear.  For a thousand years the Lord Ruler has reigned with absolute power, ruling thanks to terror, his powers and his immortality, aided by "benders" and "inquisitors", along with the powerful magic of Allomancy.', 2001, 669),
  ('b1000000-0000-0000-0000-000000000079', 'The Well of Ascension', null, '9781938570186', 'https://covers.openlibrary.org/b/id/14658341-L.jpg', 'The impossible has been accomplished. The Lord Ruler -- the man who claimed to be god incarnate and brutally ruled the world for a thousand years -- has been vanquished. But Kelsier, the hero who masterminded that triumph, is dead too, and now the awesome task of building a new world has been left to his young protégé, Vin, the former street urchin who is now the most powerful Mistborn in the land, and to the idealistic young nobleman she loves.

As Kelsier''s protégé and slayer of the Lord Rul', 2007, 784),
  ('b1000000-0000-0000-0000-000000000080', 'Mistborn', null, '9781250267177', 'https://covers.openlibrary.org/b/id/11329782-L.jpg', 'This discounted ebundle includes: Mistborn: The Final Empire, The Well of Ascension, The Hero of Ages

From #1 New York Times bestselling author Brandon Sanderson, the Mistborn trilogy is a heist story of political intrigue and magical, martial-arts action.

For a thousand years the ash fell and no flowers bloomed. For a thousand years the Skaa slaved in misery and lived in fear. For a thousand years the Lord Ruler, the "Sliver of Infinity," reigned with absolute power and ultimate terror, d', 2001, 1712),
  ('b1000000-0000-0000-0000-000000000081', 'The Eye of the World', null, '9781250832375', 'https://covers.openlibrary.org/b/id/980232-L.jpg', 'The Wheel of Time turns and Ages come and go, leaving memories that become legend. Legend fades to myth, and even myth is long forgotten when the Age that gave it birth returns again. In the Third Age, an Age of Prophecy, the World and Time themselves hang in the balance. What was, what will be, and what is, may yet fall under the Shadow.', 1990, 782),
  ('b1000000-0000-0000-0000-000000000082', 'The Great Hunt (The Wheel of Time Book 2)', null, '9780812517729', 'https://covers.openlibrary.org/b/id/182352-L.jpg', 'Now in development for TV!

Since its debut in 1990, The Wheel of Time® by Robert Jordan has captivated millions of readers around the globe with its scope, originality, and compelling characters.

The Wheel of Time turns and Ages come and go, leaving memories that become legend. Legend fades to myth, and even myth is long forgotten when the Age that gave it birth returns again. In the Third Age, an Age of Prophecy, the World and Time themselves hang in the balance. What was, what will be, a', 1990, 672),
  ('b1000000-0000-0000-0000-000000000083', 'The Fires of Heaven', null, '9781593976064', 'https://covers.openlibrary.org/b/id/603821-L.jpg', 'The bonds and wards that hold the Great Lord of the Dark are slowly failing, but still his fragile prison holds. The Forsaken, immortal servants of the shadow, weave their snares and tighten their grip upon the realms of men, sure in the knowledge that their master will soon break free...
Rand al'' Thor, the Dragon Reborn, knows that he must strike at the Enemy, but his forces are divided by treachery and by ambition. Even the Aes Sedai, ancient guardians of the Light, are riven by civil war. Be', 1993, 894),
  ('b1000000-0000-0000-0000-000000000084', 'Twilight', null, '9788467222296', 'https://covers.openlibrary.org/b/id/12641977-L.jpg', 'About three things I was absolutely positive. First, Edward was a vampire. Second, there was a part of him -- and I didn''t know how dominant that part might be -- that thirsted for my blood. And third, I was unconditionally and irrevocably in love with him. When Isabella Swan moves to the gloomy town of Forks and meets the mysterious, alluring Edward Cullen, her life takes a thrilling and terrifying turn. With his porcelain skin, golden eyes, mesmerizing voice, and supernatural gifts, Edward is ', 2005, 498),
  ('b1000000-0000-0000-0000-000000000085', 'Eclipse', null, '9780316160209', 'https://covers.openlibrary.org/b/id/12643410-L.jpg', 'Edward''s soft voice came from behind me. I turned to see him spring lightly up the porch steps, his hair windblown from running. He pulled me into his arms at once, just like he had in the parking lot, and kissed me again. This kiss frightened me. There was too much tension, too strong an edge to the way his lips crushed mine -- like he was afraid we had only so much time left to us. As Seattle is ravaged by a string of mysterious killings and a malicious vampire continues her quest for revenge,', 2006, 629),
  ('b1000000-0000-0000-0000-000000000086', 'Breaking Dawn', null, '9780356251929', 'https://covers.openlibrary.org/b/id/12643419-L.jpg', 'To be irrevocably in love with a vampire is both fantasy and nightmare woven into a dangerously heightened reality for Bella Swan. Pulled in one direction by her intense passion for Edward Cullen, and in another by her profound connection to werewolf Jacob Black, she has endured a tumultuous year of temptation, loss, and strife to reach the ultimate turning point. Her imminent choice to either join the dark but seductive world of immortals or pursue a fully human life has become the threat from ', 2000, 756),
  ('b1000000-0000-0000-0000-000000000087', 'The Hobbit', null, '9780061756269', 'https://covers.openlibrary.org/b/id/14627509-L.jpg', 'The Hobbit is a tale of high adventure, undertaken by a company of dwarves in search of dragon-guarded gold. A reluctant partner in this perilous quest is Bilbo Baggins, a comfort-loving unambitious hobbit, who surprises even himself by his resourcefulness and skill as a burglar.

Encounters with trolls, goblins, dwarves, elves, and giant spiders, conversations with the dragon, Smaug, and a rather unwilling presence at the Battle of Five Armies are just some of the adventures that befall Bilbo', 1937, 310),
  ('b1000000-0000-0000-0000-000000000088', 'Prince Caspian', null, '9780060234843', 'https://covers.openlibrary.org/b/id/45897-L.jpg', 'In his effort to bring peace to troubled Narnia, Prince Caspian blows his magic horn to summon Peter, Susan, Lucy, and Edmond to help him with this difficult task.', 1951, 216),
  ('b1000000-0000-0000-0000-000000000089', 'The Silver Chair', null, '9780060793364', 'https://covers.openlibrary.org/b/id/6950992-L.jpg', 'Jill and Eustace must rescue the Prince from the evil Witch.', 1953, 217),
  ('b1000000-0000-0000-0000-000000000090', 'The Last Battle', null, '9780060234935', 'https://covers.openlibrary.org/b/id/6529226-L.jpg', 'For the first time, an edition of Lewis''s classic fantasy fiction packaged specifically for adults. Complementing the look of the author''s non-fiction books, and anticipating the forthcoming Narnia feature films, this edition contains an exclusive "P.S." section about the history of the book, plus a round-up of the first six titles. The last days of Narnia, and all hope seems lost as lies and treachery interweave to threaten the destruction of everything. As the battle lines are drawn, old frien', 1956, 192),
  ('b1000000-0000-0000-0000-000000000091', 'Northern Lights', null, '9781405663489', 'https://covers.openlibrary.org/b/id/8747028-L.jpg', null, 1995, 410),
  ('b1000000-0000-0000-0000-000000000092', 'The Subtle Knife', null, '9788422690238', 'https://covers.openlibrary.org/b/id/12614549-L.jpg', 'As the boundaries between worlds begin to dissolve, Lyra and her daemon help Will Parry in his search for his father and for a powerful, magical knife.

She had asked: What is he? A friend or an enemy?

The alethiometer answered: He is a murderer.

When she saw the answer, she relaxed at once.

Lyra finds herself in a shimmering, haunted otherworld – Cittàgazze, where soul-eating Spectres stalk the streets and wingbeats of distant angels sound against the sky.

But she is not without a', 1997, 350),
  ('b1000000-0000-0000-0000-000000000093', 'The Amber Spyglass', null, '9788466636254', 'https://covers.openlibrary.org/b/id/12613246-L.jpg', 'In the astonishing finale to the His Dark Materials trilogy, Lyra and Will are in unspeakable danger. With help from Iorek Byrnison the armored bear and two tiny Gallivespian spies, they must journey to a dank and gray-lit world where no living soul has ever gone. All the while, Dr. Mary Malone builds a magnificent Amber Spyglass. An assassin hunts her down, and Lord Asriel, with a troop of shining angels, fights his mighty rebellion, in a battle of strange allies—and shocking sacrifice.

As w', 1999, 536),
  ('b1000000-0000-0000-0000-000000000094', 'Eragon', null, '9780385607889', 'https://covers.openlibrary.org/b/id/13921600-L.jpg', null, 1998, 561),
  ('b1000000-0000-0000-0000-000000000095', 'Eldest', null, '9780552216647', 'https://covers.openlibrary.org/b/id/12848701-L.jpg', 'Darkness falls…despair abounds…evil reigns…Eragon and his dragon, Saphira, have just saved the rebel state from destruction by the mighty forces of King Galbatorix, cruel ruler of the Empire. Now Eragon must travel to Ellesmera, land of the elves, for further training in the skills of the Dragon Rider. Ages 12+.

Darkness falls…despair abounds…evil reigns…

Eragon and his dragon, Saphira, have just saved the rebel state from destruction by the mighty forces of King Galbatorix, cruel ruler of', 1998, 704),
  ('b1000000-0000-0000-0000-000000000096', 'Brisingr', null, '9781407044781', 'https://covers.openlibrary.org/b/id/2411585-L.jpg', null, 1998, 763),
  ('b1000000-0000-0000-0000-000000000097', 'Outlander', null, '9781419359682', 'https://covers.openlibrary.org/b/id/14428230-L.jpg', null, 1991, 745),
  ('b1000000-0000-0000-0000-000000000098', 'Dragonfly in Amber', null, '9780770428778', 'https://covers.openlibrary.org/b/id/6920490-L.jpg', 'From the author of Outlander... a magnificent epic that once again sweeps us back in time to the drama and passion of 18th-century Scotland...For twenty years Claire Randall has kept her secrets.  But now she is returning with her grown daughter to Scotland''s majestic mist-shrouded hills.  Here Claire plans to reveal a truth as stunning as the events that gave it birth: about the mystery of an ancient circle of standing stones...about a love that transcends the boundaries of time...and about Jam', 1992, 864),
  ('b1000000-0000-0000-0000-000000000099', 'A Breath of Snow and Ashes', null, '9785558826739', 'https://covers.openlibrary.org/b/id/239469-L.jpg', 'Eagerly anticipated by her legions of fans, this sixth novel in Diana Gabaldon''s bestselling Outlander saga is a masterpiece of historical fiction from one of the most popular authors of our time.Since the initial publication of Outlander fifteen years ago, Diana Gabaldon''s New York Times bestselling saga has won the hearts of readers the world over -- and sold more than twelve million books. Now, A Breath of Snow and Ashes continues the extraordinary story of 18th-century Scotsman Jamie Fraser ', 1992, 1200),
  ('b1000000-0000-0000-0000-000000000100', 'Gone Girl', null, '9780297859390', 'https://covers.openlibrary.org/b/id/8368314-L.jpg', 'Gone Girl is a 2012 crime thriller novel by American writer Gillian Flynn. It was published by Crown Publishing Group in June 2012. The novel became popular and made the New York Times Best Seller list. The sense of suspense in the novel comes from whether or not Nick Dunne is involved in the disappearance of his wife Amy.


----------
Also contained in:
[Les apparences suvi de la novella Nous allons mourir ce soir](https://openlibrary.org/works/OL24801746W)', 2011, 475),
  ('b1000000-0000-0000-0000-000000000101', 'Study Guide', null, '9798404017427', 'https://covers.openlibrary.org/b/id/12366237-L.jpg', 'nice', 2017, 53),
  ('b1000000-0000-0000-0000-000000000102', 'The Girl on the Train', null, '9781594633669', 'https://covers.openlibrary.org/b/id/7350360-L.jpg', 'A debut psychological thriller that will forever change the way you look at other people''s lives.

Rachel takes the same commuter train every morning. Every day she rattles down the track, flashes past a stretch of cozy suburban homes, and stops at the signal that allows her to daily watch the same couple breakfasting on their deck. She’s even started to feel like she knows them. “Jess and Jason,” she calls them. Their life—as she sees it—is perfect. Not unlike the life she recently lost.

A', 2014, 360),
  ('b1000000-0000-0000-0000-000000000103', 'The Railway Children', null, '9781973110446', 'https://covers.openlibrary.org/b/id/13241123-L.jpg', 'When Father mysteriously goes away, the children and their mother leave their happy life in London to go and live in a small cottage in the country. ''The Three Chimneys'' lies beside a railway track - a constant source of enjoyment to all three. They make friends with the Station Master and Perks the Porter, as well as the jovial ''Old Gentleman'' who waves to them everyday from the train. But the mystery remains: where is Father, and will he ever return?', 1900, 176),
  ('b1000000-0000-0000-0000-000000000104', 'The Shining', null, '9780816156856', 'https://covers.openlibrary.org/b/id/12376585-L.jpg', 'The Shining is a 1977 horror novel by American author Stephen King. It is King''s third published novel and first hardback bestseller; its success firmly established King as a preeminent author in the horror genre. The setting and characters are influenced by King''s personal experiences, including both his visit to The Stanley Hotel in 1974 and his struggle with alcoholism. The book was followed by a sequel, Doctor Sleep, published in 2013.

The Shining centers on the life of Jack Torrance, a s', 1977, 506),
  ('b1000000-0000-0000-0000-000000000105', 'Works (Carrie / Night Shift / ''Salem''s Lot / Shining)', null, '9780905712604', 'https://covers.openlibrary.org/b/id/12015639-L.jpg', null, 1981, 992),
  ('b1000000-0000-0000-0000-000000000106', 'The dark tower', null, '9780340827222', 'https://covers.openlibrary.org/b/id/14656148-L.jpg', '"Roland''s ka-tet remains intact, though scattered over wheres and whens. Susannah-Mia has been carried from the Dixie Pig (in the summer of 1999) to a birthing room - really a chamber of horrors - in Thunderclap''s Fedic; Jake and Father Callahan, with Oy between them, have entered the restaurant on Lex and Sixty-first with weapons drawn, little knowing how numerous and noxious are their foes. Roland and Eddie are with John Cullum in Maine, in 1977, looking for the site on Turtleback Lane where "', 1990, 818),
  ('b1000000-0000-0000-0000-000000000107', 'It', null, '9781473666948', 'https://covers.openlibrary.org/b/id/8569284-L.jpg', null, 1986, 1168),
  ('b1000000-0000-0000-0000-000000000108', 'Carrie', null, '9781984898104', 'https://covers.openlibrary.org/b/id/9256043-L.jpg', 'The story of misfit high-school girl, Carrie White, who gradually discovers that she has telekinetic powers. Repressed by a domineering, ultra-religious mother and tormented by her peers at school, her efforts to fit in lead to a dramatic confrontation during the senior prom. 
([source][1])


----------
Also contained in:

 - [The Shining / ''Salem''s Lot / Night Shift / Carrie][2]


----------
See also:

 - [Selected from Carrie][3]


  [1]: https://stephenking.com/library/novel/c', 1974, 255),
  ('b1000000-0000-0000-0000-000000000109', 'Skeleton crew', null, '9781444723205', 'https://covers.openlibrary.org/b/id/14657166-L.jpg', null, 1985, 573),
  ('b1000000-0000-0000-0000-000000000110', 'Dracula', null, '9780593095898', 'https://covers.openlibrary.org/b/id/12216503-L.jpg', 'Na história, um casal e seus amigos são atormentados por Conde Drácula, uma entidade sobrenatural e hematófoga que, presa em uma maldição contagiosa, pretende se mudar de seu recluso castelo na Transilvânia para a efervescente Londres do século XIX. Com a ajuda do professor Van Helsing, o grupo de amigos pretende enfrentar o morto-vivo, mesmo com todos os perigos que a ofensiva trará.', 1897, 408),
  ('b1000000-0000-0000-0000-000000000111', 'The Jewel of Seven Stars', null, '9798481877518', 'https://covers.openlibrary.org/b/id/2760301-L.jpg', 'This dark fantasy Bram Stoker book is full of suspense.  Set in ancient Egypt, it will keep you on the edge of your seat with a twist Please Note:  This book is easy to read in true text, not scanned images that can sometimes be difficult to decipher.  This eBook has bookmarks at chapter headings and is printable up to two full copies per year.at the end.  A must for Bram Stoker fans.', 1902, 228),
  ('b1000000-0000-0000-0000-000000000112', 'Drácula', null, '9781718138100', 'https://covers.openlibrary.org/b/id/13167087-L.jpg', 'Na história, um casal e seus amigos são atormentados por Conde Drácula, uma entidade sobrenatural e hematófoga que, presa em uma maldição contagiosa, pretende se mudar de seu recluso castelo na Transilvânia para a efervescente Londres do século XIX. Com a ajuda do professor Van Helsing, o grupo de amigos pretende enfrentar o morto-vivo, mesmo com todos os perigos que a ofensiva trará.', 2017, null),
  ('b1000000-0000-0000-0000-000000000113', 'Frankenstein or The Modern Prometheus', null, '9781584723875', 'https://covers.openlibrary.org/b/id/12356249-L.jpg', '*Frankenstein; or, The Modern Prometheus* is an 1818 novel written by English author Mary Shelley. Frankenstein tells the story of Victor Frankenstein, a young scientist who creates a sapient creature in an unorthodox scientific experiment. Shelley started writing the story when she was 18, and the first edition was published anonymously in London on 1 January 1818, when she was 20. Her name first appeared in the second edition, which was published in Paris in 1821.', 1818, 240),
  ('b1000000-0000-0000-0000-000000000114', 'Mary Shelley''s Frankenstein; or, the Modern Prometheus (1818 text)', null, '9781945644290', 'https://covers.openlibrary.org/b/id/7267770-L.jpg', 'This is the original edition which was published in 3 volumes.  The cover photograph is of Volume 1.
Published anonymously. By Mary Wollstonecraft Shelley.
First edition.
With half-titles.
Title page with quote from Milton''s Paradise Lost: "Did I request thee, maker, from my clay / To mould me man? Did I solicit thee / From darkness to promote me?"
Printer statement from title page verso of volume 1; place of printing follows printer.
Pagination: volume 1: xii, 181, [3] pages; volume 2: [4', 1818, 261),
  ('b1000000-0000-0000-0000-000000000115', 'The Last Man', null, '9781072467502', 'https://covers.openlibrary.org/b/id/882662-L.jpg', 'Mary Shelley, the author of [*Frankenstein*][1], wrote the apocalyptic novel The Last Man in 1826. Its first person narrative tells the story of our world standing at the end of the twenty-first century and - after the devastating effects of a plague - at the end of humanity. In the book Shelley writes of weaving this story from a discovery of prophetic writings uncovered in a cave near Naples. The Last Man was made into a 2008 film.


  [1]: http://openlibrary.org/works/OL450125W/Frankenstei', 1826, 411),
  ('b1000000-0000-0000-0000-000000000116', 'Pride and Prejudice', null, '9781958321645', 'https://covers.openlibrary.org/b/id/13148521-L.jpg', 'The first edition of the novel (1813).

Introductory materials and revised and expanded footnotes by Donald Gray and Mary A. Favret.

Biographical portraits of Austen by family members and— new to this edition— by Jon Spence (from Becoming Jane Austen) and Paula Byrne (from The Real Jane Austen: A Life in Small Things).

Fourteen critical essays—eleven of them new to this edition. "Writers on Austen"—a new section of brief comments by Mark Twain, Virginia Woolf, Henry James, and others.
', 1813, 358),
  ('b1000000-0000-0000-0000-000000000117', 'Pride and Prejudice and Zombies', null, '9781594744518', 'https://covers.openlibrary.org/b/id/6260257-L.jpg', '“It is a truth universally acknowledged that a zombie in possession of brains must be in want of more brains.”

So begins Pride and Prejudice and Zombies, an expanded edition of the beloved Jane Austen novel featuring all-new scenes of bone-crunching zombie mayhem. As our story opens, a mysterious plague has fallen upon the quiet English village of Meryton—and the dead are returning to life! Feisty heroine Elizabeth Bennet is determined to wipe out the zombie menace, but she’s soon distracted ', 2009, 319),
  ('b1000000-0000-0000-0000-000000000118', 'Jane Eyre', null, '9781980541714', 'https://covers.openlibrary.org/b/id/8235363-L.jpg', 'The novel is set somewhere in the north of England. Jane''s childhood at Gateshead Hall, where she is emotionally and physically abused by her aunt and cousins; her education at Lowood School, where she acquires friends and role models but also suffers privations and oppression; her time as the governess of Thornfield Hall, where she falls in love with her Byronic employer, Edward Rochester; her time with the Rivers family, during which her earnest but cold clergyman cousin, St John Rivers, propo', 1847, 480),
  ('b1000000-0000-0000-0000-000000000119', 'Wuthering Heights', null, '9788449403774', 'https://covers.openlibrary.org/b/id/12818862-L.jpg', 'Wuthering Heights is an 1847 novel by Emily Brontë, initially published under the pseudonym Ellis Bell. It concerns two families of the landed gentry living on the West Yorkshire moors, the Earnshaws and the Lintons, and their turbulent relationships with Earnshaw''s adopted son, Heathcliff. The novel was influenced by Romanticism and Gothic fiction.', 1846, 318),
  ('b1000000-0000-0000-0000-000000000120', 'The Great Gatsby', null, '9798420023068', 'https://covers.openlibrary.org/b/id/10590366-L.jpg', null, 1920, 186),
  ('b1000000-0000-0000-0000-000000000121', 'Great Gatsby', null, '9781784045203', 'https://covers.openlibrary.org/b/id/14314120-L.jpg', 'Poignantly and with subtle finesse, Fitzgerald tells the story of the dazzling upstart Jay Gatsby, who celebrates lavish parties on his estate in order to win back his lost love – a story about the power of great feelings and the painful failure of a romantic dream.', 1951, 159),
  ('b1000000-0000-0000-0000-000000000122', 'To Kill a Mockingbird', null, '9789992262443', 'https://covers.openlibrary.org/b/id/14351077-L.jpg', 'One of the best-loved stories of all time, To Kill a Mockingbird has been translated into more than 40 languages, sold more than 30 million copies worldwide, served as the basis for an enormously popular motion picture, and voted one of the best novels of the 20th century by librarians across the United States. A gripping, heart-wrenching, and wholly remarkable tale of coming-of-age in a South poisoned by virulent prejudice, it views a world of great beauty and savage inequities through the eyes', 1960, 320),
  ('b1000000-0000-0000-0000-000000000123', 'Cliffsnotes to kill a mockingbird', null, '9780764586002', 'https://covers.openlibrary.org/b/id/7145849-L.jpg', null, 2000, 99),
  ('b1000000-0000-0000-0000-000000000124', 'Catch-22', null, '9780099468677', 'https://covers.openlibrary.org/b/id/6468653-L.jpg', '*Catch-22* is like no other novel. It has its own rationale, its own extraordinary character. It moves back and forth from hilarity to horror. It is outrageously funny and strangely affecting. It is totally original. Set in the closing months of World War II in an American bomber squadron off Italy, *Catch-22* is the story of a bombardier named Yossarian, who is frantic and furious because thousands of people he hasn''t even met keep trying to kill him. *Catch-22* is a microcosm of the twentieth-', 1961, 463),
  ('b1000000-0000-0000-0000-000000000125', 'Catch 22', null, '9781784876029', 'https://covers.openlibrary.org/b/id/13961422-L.jpg', null, 1966, 519),
  ('b1000000-0000-0000-0000-000000000126', 'Slaughterhouse-Five', null, '9780440080299', 'https://covers.openlibrary.org/b/id/12727001-L.jpg', 'Slaughterhouse-Five is one of the world''s great anti-war books. Centering on the infamous fire-bombing of Dresden, Billy Pilgrim''s odyssey through time reflects the mythic journey of our own fractured lives as we search for meaning in what we are afraid to know.', 1968, 205),
  ('b1000000-0000-0000-0000-000000000127', 'Kurt Vonnegut''s Slaughterhouse-five', null, '9780791092958', 'https://covers.openlibrary.org/b/id/12323127-L.jpg', null, 2007, 114),
  ('b1000000-0000-0000-0000-000000000128', 'Brave New World', null, '9789575517373', 'https://covers.openlibrary.org/b/id/8231823-L.jpg', null, 1932, 241),
  ('b1000000-0000-0000-0000-000000000129', 'Brave New World and Brave New World Revisited', null, '9780060776091', 'https://covers.openlibrary.org/b/id/35568-L.jpg', 'In *Brave New World*, Aldous Huxley prophesied a capitalist civilization, which had been reconstituted through scientific and psychological engineering, a world in which people are genetically designed to be passive and useful to the ruling class. Huxley opens the book by allowing the reader to eavesdrop on the tour of the fertilizing Room of the Central London Hatchery and Conditioning center, where the high tech reproduction takes place. One of the characters, Bernard Marx, seems alone, harbor', 1942, 340),
  ('b1000000-0000-0000-0000-000000000130', 'Brave New World Revisited', null, '9781407020914', 'https://covers.openlibrary.org/b/id/41918-L.jpg', 'In 1958, Aldous Huxley wrote what might be called a sequel to his novel Brave New World, published in 1932, but it was a sequel that did not revisit the story or the characters, or re-enter the world of the novel.  Instead, he revisited that world in a set of 12 essays.  Taking a second look at specific aspects of the future Huxley imagined in Brave New World, Huxley meditated on how his fantasy seemed to be turning into reality, frighteningly and much more quickly than he had ever dreamed.That ', 1958, 155),
  ('b1000000-0000-0000-0000-000000000131', 'Fahrenheit 451', null, '9780345274311', 'https://covers.openlibrary.org/b/id/12993656-L.jpg', 'Fahrenheit 451 is a 1953 dystopian novel by American writer Ray Bradbury. Often regarded as one of his best works, the novel presents a future American society where books are outlawed and "firemen" burn any that are found. The book''s tagline explains the title as "''the temperature at which book paper catches fire, and burns": the autoignition temperature of paper. The lead character, Guy Montag, is a fireman who becomes disillusioned with his role of censoring literature and destroying knowledg', 1953, 190),
  ('b1000000-0000-0000-0000-000000000132', 'Fahrenheit 451 (Fahrenheit 451 / Playground / Rock Cried Out)', null, '9780671239770', 'https://covers.openlibrary.org/b/id/12818806-L.jpg', 'Contains:
[Fahrenheit 451](https://openlibrary.org/works/OL103123W)
The Playground	
And the Rock Cried Out', 1967, 192),
  ('b1000000-0000-0000-0000-000000000133', 'Lord of the Flies', null, '9788435010832', 'https://covers.openlibrary.org/b/id/8684447-L.jpg', 'Lord of the Flies is a 1954 novel by Nobel Prize–winning British author William Golding. The book focuses on a group of British boys stranded on an uninhabited island and their disastrous attempt to govern themselves. Themes include the tension between groupthink and individuality, between rational and emotional reactions, and between morality and immorality.

The novel has been generally well received. It was named in the Modern Library 100 Best Novels, reaching number 41 on the editor''s list', 1954, 243),
  ('b1000000-0000-0000-0000-000000000134', 'William Golding''s Lord of the flies', null, null, 'https://covers.openlibrary.org/b/id/8257958-L.jpg', null, 1963, 291),
  ('b1000000-0000-0000-0000-000000000135', 'Animal Farm', null, '9798731060592', 'https://covers.openlibrary.org/b/id/11261770-L.jpg', null, 1945, 128),
  ('b1000000-0000-0000-0000-000000000136', 'Animal Farm / Nineteen Eighty-Four', null, '9789390997022', 'https://covers.openlibrary.org/b/id/10524365-L.jpg', null, 1978, 372),
  ('b1000000-0000-0000-0000-000000000137', 'Animal Farm with Connections', null, '9780030554346', 'https://covers.openlibrary.org/b/id/4937526-L.jpg', null, 1999, null),
  ('b1000000-0000-0000-0000-000000000138', 'Of Mice and Men', null, '9780749318673', 'https://covers.openlibrary.org/b/id/14319003-L.jpg', null, 1937, 119),
  ('b1000000-0000-0000-0000-000000000139', 'Of Mice and Men & Cannery Row', null, '9780140048919', 'https://covers.openlibrary.org/b/id/9158342-L.jpg', '[Of Mice and Men](https://openlibrary.org/works/OL23204W/Of_Mice_and_Men)
They are an unlikely pair: George is "small and quick and dark of face"; Lennie, a man of tremendous size, has the mind of a young child. Yet they have formed a "family," clinging together in the face of loneliness and alienation. Laborers in California''s dusty vegetable fields, they hustle work when they can, living a hand-to-mouth existence. For George and Lennie have a plan: to own an acre of land and a shack they can ', 1947, 264),
  ('b1000000-0000-0000-0000-000000000140', 'The Catcher in the Rye', null, '9788417016791', 'https://covers.openlibrary.org/b/id/9273490-L.jpg', null, 1945, 240),
  ('b1000000-0000-0000-0000-000000000141', 'The Catcher in the rye.', null, null, null, null, 1990, 41),
  ('b1000000-0000-0000-0000-000000000142', 'O Alquimista', null, '9780061351341', 'https://covers.openlibrary.org/b/id/7414780-L.jpg', 'The Alchemist details the journey of a young Andalusian shepherd boy named Santiago. Santiago, believing a recurring dream to be prophetic, decides to travel to the pyramids of Egypt to find treasure. On the way, he encounters love, danger, opportunity and disaster. One of the significant characters that he meets is an old king named Melchizedek who tells him that "When you want something, all the universe conspires in helping you to achieve it." This is the core philosophy and motif of the book', 1988, 197),
  ('b1000000-0000-0000-0000-000000000143', 'The Alchemist Graphic Novel', null, '9780007423200', 'https://covers.openlibrary.org/b/id/11556106-L.jpg', null, 2010, null),
  ('b1000000-0000-0000-0000-000000000144', 'ClassicNotes GradeSaver on The Alchemist by Paulo Coelho', null, '9781602591660', 'https://covers.openlibrary.org/b/id/12630082-L.jpg', null, 2009, 80),
  ('b1000000-0000-0000-0000-000000000145', 'Life of Pi', null, '9785699369348', 'https://covers.openlibrary.org/b/id/12840573-L.jpg', 'After the tragic sinking of a cargo ship, one solitary lifeboat remains bobbing on the wild, blue Pacific. The only survivors from the wreck are a sixteen-year-old boy named Pi, a hyena, a zebra (with a broken leg), a female orang-utan… and a 450-pound Royal Bengal tiger. The scene is set for one of the most extraordinary works of fiction in recent years.', 2000, 347),
  ('b1000000-0000-0000-0000-000000000146', 'Life on the Mississippi', null, '9786074111736', 'https://covers.openlibrary.org/b/id/9164717-L.jpg', 'At once a romantic history of a mighty river, an autobiographical account of Twains early steamboat days, and a storehouse of humorous anecdotes and sketches, here is the raw material from which Mark Twain wrote his finest novel, Adventures of Huckleberry Finn.', 1883, 452),
  ('b1000000-0000-0000-0000-000000000147', 'Hong lou meng', null, '9787534619359', 'https://covers.openlibrary.org/b/id/6655966-L.jpg', null, 1900, 965),
  ('b1000000-0000-0000-0000-000000000148', 'The Kite Runner', null, '9780385660075', 'https://covers.openlibrary.org/b/id/14846827-L.jpg', 'The unforgettable, heartbreaking story of the unlikely friendship between a wealthy boy and the son of his father’s servant, The Kite Runner is a beautifully crafted novel set in a country that is in the process of being destroyed. It is about the power of reading, the price of betrayal, and the possibility of redemption; and an exploration of the power of fathers over sons—their love, their sacrifices, their lies.

A sweeping story of family, love, and friendship told against the devastating ', 2003, 371),
  ('b1000000-0000-0000-0000-000000000149', 'The Kite Runner--the graphic novel', null, '9789992178973', 'https://covers.openlibrary.org/b/id/8063795-L.jpg', null, 2011, 134),
  ('b1000000-0000-0000-0000-000000000150', 'The Kite Runner, Khaled Hosseini', null, '9781411470996', 'https://covers.openlibrary.org/b/id/9020665-L.jpg', null, 2014, 96),
  ('b1000000-0000-0000-0000-000000000151', 'A Thousand Splendid Suns', null, '9780743554435', 'https://covers.openlibrary.org/b/id/8579790-L.jpg', 'After 103 weeks on the New York Times bestseller list and with four million copies of The Kite Runner shipped, Khaled Hosseini returns with a beautiful, riveting, and haunting novel that confirms his place as one of the most important literary writers today.

Propelled by the same superb instinct for storytelling that made The Kite Runner a beloved classic, A Thousand Splendid Suns is at once an incredible chronicle of thirty years of Afghan history and a deeply moving story of family, friends', 2007, 406),
  ('b1000000-0000-0000-0000-000000000152', 'A Thousand Splendid Suns Play Script', null, '9780735218246', 'https://covers.openlibrary.org/b/id/8841806-L.jpg', null, 2018, 128),
  ('b1000000-0000-0000-0000-000000000153', 'The Book Thief', null, '9780330423304', 'https://covers.openlibrary.org/b/id/8153054-L.jpg', 'The extraordinary, beloved novel about the ability of books to feed the soul even in the darkest of times.

When Death has a story to tell, you listen.

It is 1939. Nazi Germany. The country is holding its breath. Death has never been busier, and will become busier still.

Liesel Meminger is a foster girl living outside of Munich, who scratches out a meager existence for herself by stealing when she encounters something she can’t resist–books. With the help of her accordion-playing foster ', 1998, 559),
  ('b1000000-0000-0000-0000-000000000154', 'All the Light We Cannot See', null, '9780008485191', 'https://covers.openlibrary.org/b/id/14559680-L.jpg', null, 2014, 544),
  ('b1000000-0000-0000-0000-000000000155', 'Where the Crawdads Sing', null, '9788417743390', 'https://covers.openlibrary.org/b/id/8362947-L.jpg', null, 2018, 416),
  ('b1000000-0000-0000-0000-000000000156', 'Paperback - Where the Crawdads Sing', null, '9798553829032', 'https://covers.openlibrary.org/b/isbn/9798553829032-L.jpg', null, 2020, null),
  ('b1000000-0000-0000-0000-000000000157', 'Educated', null, '9781473538641', 'https://covers.openlibrary.org/b/id/8314077-L.jpg', '*Educated* is a 2018 memoir by the American author Tara Westover. Westover recounts overcoming her survivalist Mormon family in order to go to college, and emphasizes the importance of education in enlarging her world. She details her journey from her isolated life in the mountains of Idaho to completing a PhD program in history at Cambridge University. She started college at the age of 17 having had no formal education. She explores her struggle to reconcile her desire to learn with the world s', 2018, 388),
  ('b1000000-0000-0000-0000-000000000158', 'Summary', null, '9780399590504', 'https://covers.openlibrary.org/b/id/14832082-L.jpg', null, 2019, null),
  ('b1000000-0000-0000-0000-000000000159', 'Summary of Educated by Tara Westover', null, '9781388674120', 'https://covers.openlibrary.org/b/isbn/9781388674120-L.jpg', null, 2018, null),
  ('b1000000-0000-0000-0000-000000000160', 'Becoming Michelle Obama', null, '9781790610938', 'https://covers.openlibrary.org/b/isbn/9781790610938-L.jpg', null, 2018, null),
  ('b1000000-0000-0000-0000-000000000161', '100 Becoming Michelle Obama Quotes', null, '9781686826283', 'https://covers.openlibrary.org/b/isbn/9781686826283-L.jpg', null, 2019, null),
  ('b1000000-0000-0000-0000-000000000162', '185 Becoming Michelle Obama Quotes', null, '9798620256723', 'https://covers.openlibrary.org/b/isbn/9798620256723-L.jpg', null, 2020, null),
  ('b1000000-0000-0000-0000-000000000163', 'Sapiens', null, '9788429775174', 'https://covers.openlibrary.org/b/id/8634250-L.jpg', 'From a renowned historian comes a groundbreaking narrative of humanity’s creation and evolution—a #1 international bestseller—that explores the ways in which biology and history have defined us and enhanced our understanding of what it means to be “human.”

One hundred thousand years ago, at least six different species of humans inhabited Earth. Yet today there is only one—homo sapiens. What happened to the others? And what may happen to us?

Most books about the history of humanity pursue e', 2011, 456),
  ('b1000000-0000-0000-0000-000000000164', 'ההיסטוריה של המחר', null, '9780062955630', 'https://covers.openlibrary.org/b/id/7914168-L.jpg', 'Tras el éxito de Sapiens, Yuval Noah Harari vuelve su mirada al futuro para ver hacia dónde nos dirigimos. Bestseller del New York Times con 1 millón de ejemplares vendidos Yuval Noah Harari, autor de Sapiens, un fenómeno internacional unánimemente aclamado por la crítica, regresa con una secuela igualmente original, convincente y provocadora, centrando su atención en el futuro de la humanidad y en nuestra obsesión por convertirnos en dioses. A lo largo del último siglo, la humanidad ha logrado ', 2015, 461),
  ('b1000000-0000-0000-0000-000000000165', 'Summary of Sapiens by Yuval Noah Harari', null, '9781973303893', 'https://covers.openlibrary.org/b/isbn/9781973303893-L.jpg', null, 2017, null),
  ('b1000000-0000-0000-0000-000000000166', 'Atomic Habits', null, '9798545118748', 'https://covers.openlibrary.org/b/id/12539702-L.jpg', null, 2016, 322),
  ('b1000000-0000-0000-0000-000000000167', 'Companion Workbook : Atomic Habits', null, '9781092706568', 'https://covers.openlibrary.org/b/id/15095106-L.jpg', null, 2019, null),
  ('b1000000-0000-0000-0000-000000000168', 'Atomic Habits Daily Journal', null, '9798549776272', 'https://covers.openlibrary.org/b/isbn/9798549776272-L.jpg', null, 2021, null),
  ('b1000000-0000-0000-0000-000000000169', 'Moral Thinking Fast and Slow', null, '9780367733469', 'https://covers.openlibrary.org/b/isbn/9780367733469-L.jpg', 'In recent research, dual-process theories of cognition have been the primary model for explaining moral judgment and reasoning. These theories understand moral thinking in terms of two separate domains: one deliberate and analytic, the other quick and instinctive. This book presents a new theory of the philosophy and cognitive science of moral judgment. Hanno Sauer develops and defends an account of "triple-process" moral psychology, arguing that moral thinking and reasoning are only insufficien', 2018, 108),
  ('b1000000-0000-0000-0000-000000000170', 'Thinking Fast and Slow by Daniel Kahneman', null, '9798809159685', 'https://covers.openlibrary.org/b/id/15174454-L.jpg', null, 2022, null),
  ('b1000000-0000-0000-0000-000000000171', 'Thinking, fast and slow', null, '9788372786777', 'https://covers.openlibrary.org/b/id/13290711-L.jpg', null, 2011, 528),
  ('b1000000-0000-0000-0000-000000000172', 'The Subtle Art of Not Giving a F*ck', null, '9783868828115', 'https://covers.openlibrary.org/b/id/8231990-L.jpg', 'In this book, blogger and former internet entrepreneur Mark Manson explains in simple, no expletives barred terms how to achieve happiness by caring more about fewer things and not caring at all about more.
     He explains how the metrics we use to define ourselves may be the very things holding us back. By redefining our metrics, questioning ourselves and doubting everything, we may be able to find that we''re better off than we think, and thereby become happier people.', 2016, 224),
  ('b1000000-0000-0000-0000-000000000173', 'The Subtle Art of Not Giving a F*ck Philosophical Summary', null, '9781387485369', 'https://covers.openlibrary.org/b/isbn/9781387485369-L.jpg', null, 2022, null),
  ('b1000000-0000-0000-0000-000000000174', 'Anxious People', null, '9780718186616', 'https://covers.openlibrary.org/b/id/10087939-L.jpg', null, 2020, 352),
  ('b1000000-0000-0000-0000-000000000175', 'Summary of Anxious People by Fredrik Backman', null, '9798770275117', 'https://covers.openlibrary.org/b/isbn/9798770275117-L.jpg', null, 2021, null),
  ('b1000000-0000-0000-0000-000000000176', 'Summary and Analysis of Anxious People by Fredrik Backman', null, '9781471667367', 'https://covers.openlibrary.org/b/isbn/9781471667367-L.jpg', null, 2022, null),
  ('b1000000-0000-0000-0000-000000000177', 'The Midnight Library', null, '9781786892737', 'https://covers.openlibrary.org/b/id/10313767-L.jpg', null, 2020, 304),
  ('b1000000-0000-0000-0000-000000000178', 'Summary of the Midnight Library by Matt Haig', null, '9798473994148', 'https://covers.openlibrary.org/b/isbn/9798473994148-L.jpg', null, 2021, null),
  ('b1000000-0000-0000-0000-000000000179', 'Lessons in Chemistry', null, '9781804990926', 'https://covers.openlibrary.org/b/id/12725772-L.jpg', null, 2022, 464),
  ('b1000000-0000-0000-0000-000000000180', 'Summary of Bonnie Garmus''s Lessons in Chemistry', null, '9798350075649', 'https://covers.openlibrary.org/b/isbn/9798350075649-L.jpg', null, 2024, null),
  ('b1000000-0000-0000-0000-000000000181', 'The Concise Lessons in Chemistry', null, '9798210878588', 'https://covers.openlibrary.org/b/id/15179922-L.jpg', 'Life becomes busy. Does Lessons in Chemistry have a cluttered shelf? Instead, focus on essential ideas presented in this updated overview and analysis. If you haven''t already, buy Lessons in Chemistry RIGHT NOW to learn all the juicy facts. 45 fundamental techniques are explored in Lessons in Chemistry to help students understand how to use restraint and power control. These basic "rules" are a collection of attitudes, actions, and tactics you could employ to "play the power game." Learn more ab', 2023, null),
  ('b1000000-0000-0000-0000-000000000182', 'Tomorrow, and Tomorrow, and Tomorrow', null, '9780593466490', 'https://covers.openlibrary.org/b/id/12859975-L.jpg', 'On a bitter-cold day, in the December of his junior year at Harvard, Sam Masur exits a subway car and sees, amid the hordes of people waiting on the platform, Sadie Green. He calls her name. For a moment, she pretends she hasn''t heard him, but then, she turns, and a game begins: a legendary collaboration that will launch them to stardom. These friends, intimates since childhood, borrow money, beg favors, and, before even graduating college, they have created their first blockbuster, Ichigo. Over', 2022, 460),
  ('b1000000-0000-0000-0000-000000000183', 'Tomorrow and tomorrow and tomorrow', null, null, null, null, 1977, null),
  ('b1000000-0000-0000-0000-000000000184', 'Fourth Wing', null, '9780349436999', 'https://covers.openlibrary.org/b/id/14407898-L.jpg', 'Twenty-year-old Violet Sorrengail was supposed to enter the Scribe Quadrant, living a quiet life among books and history. Now, the commanding general—also known as her tough-as-talons mother—has ordered Violet to join the hundreds of candidates striving to become the elite of Navarre: dragon riders.

But when you’re smaller than everyone else and your body is brittle, death is only a heartbeat away...because dragons don’t bond to “fragile” humans. They incinerate them.

With fewer dragons wi', 2023, 518),
  ('b1000000-0000-0000-0000-000000000185', 'Onyx Storm', null, '9786073925044', 'https://covers.openlibrary.org/b/id/14826089-L.jpg', 'After nearly eighteen months at Basgiath War College, Violet Sorrengail knows there’s no more time for lessons. No more time for uncertainty. Because the battle has truly begun, and with enemies closing in from outside their walls and within their ranks, it’s impossible to know who to trust.

Now Violet must journey beyond the failing Aretian wards to seek allies from unfamiliar lands to stand with Navarre. The trip will test every bit of her wit, luck, and strength, but she will do anything t', 2025, 544),
  ('b1000000-0000-0000-0000-000000000186', 'Iron Flame', null, '9781649377579', 'https://covers.openlibrary.org/b/id/14405746-L.jpg', '“The first year is when some of us lose our lives. The second year is when the rest of us lose our humanity.” —Xaden Riorson

Everyone expected Violet Sorrengail to die during her first year at Basgiath War College—Violet included. But Threshing was only the first impossible test meant to weed out the weak-willed, the unworthy, and the unlucky.

Now the real training begins, and Violet’s already wondering how she’ll get through. It’s not just that it’s grueling and maliciously brutal, or eve', 2023, 640),
  ('b1000000-0000-0000-0000-000000000187', 'House of Salt and Sorrows', null, '9781984831927', 'https://covers.openlibrary.org/b/id/8773048-L.jpg', 'In a manor by the sea, twelve sisters are cursed.

Annaleigh lives a sheltered life at Highmoor with her sisters and their father and stepmother. Once there were twelve, but loneliness fills the grand halls now that four of the girls'' lives have been cut short. Each death was more tragic than the last--the plague, a plummeting fall, a drowning, a slippery plunge--and there are whispers throughout the surrounding villages that the family is cursed by the gods.

Disturbed by a series of ghostl', 2019, 416),
  ('b1000000-0000-0000-0000-000000000188', 'A Court of Thorns and Roses', null, '9788408268192', 'https://covers.openlibrary.org/b/id/8738585-L.jpg', 'When nineteen-year-old huntress Feyre kills a wolf in the woods, a terrifying creature arrives to demand retribution. Dragged to a treacherous magical land she knows about only from legends, Feyre discovers that her captor is not truly a beast, but one of the lethal, immortal faeries who once ruled her world.

At least, he''s not a beast all the time.

As she adapts to her new home, her feelings for the faerie, Tamlin, transform from icy hostility into a fiery passion that burns through every', 2013, 452),
  ('b1000000-0000-0000-0000-000000000189', 'Court of Thorns and Roses Coloring Book', null, '9798554544279', 'https://covers.openlibrary.org/b/isbn/9798554544279-L.jpg', null, 2020, null),
  ('b1000000-0000-0000-0000-000000000190', 'Throne of Glass', null, '9782732456034', 'https://covers.openlibrary.org/b/id/13312488-L.jpg', 'Lethal. Loyal. Legendary.

Enter the world of Throne of Glass with the first book in the #1 bestselling series by Sarah J. Maas.

In a land without magic, an assassin is summoned to the castle. She has no love for the vicious king who rules from his throne of glass, but she has not come to kill him. She has come to win her freedom. If she defeats twenty-three murderers, thieves, and warriors in a competition, she will be released from prison to serve as the King’s Champion.

Her name is Ce', 2012, 432),
  ('b1000000-0000-0000-0000-000000000191', 'The Assassin''s Blade / Throne of Glass / Crown of Midnight / Heir of Fire / Queen of Shadows / Empire of Storms / Tower of Dawn / Kingdom of Ash', null, '9781639731763', 'https://covers.openlibrary.org/b/id/8738841-L.jpg', null, 2018, 4960),
  ('b1000000-0000-0000-0000-000000000192', 'The Assassin’s Blade', null, '9781639731084', 'https://covers.openlibrary.org/b/id/7794980-L.jpg', 'Celaena Sardothien owes her reputation to Arobynn Hamel. He gave her a home at the Assassins'' Guild and taught her the skills she needed to survive.

Arobynn''s enemies stretch far and wide - from Adarlan''s rooftops and its filthy dens, to remote islands and hostile deserts. Celaena is duty-bound to hunt them down. But behind her assignments lies a dark truth that will seal her fate - and cut her heart in two forever...

Explore the dark underworld of this kick-ass heroine and find out how th', 2014, 462),
  ('b1000000-0000-0000-0000-000000000193', 'Six of Crows', null, '9781780622279', 'https://covers.openlibrary.org/b/id/12667417-L.jpg', null, 2015, 512),
  ('b1000000-0000-0000-0000-000000000194', 'Crooked Kingdom', null, '9788374807333', 'https://covers.openlibrary.org/b/id/12667428-L.jpg', 'Preceeded by [Six of Crows](https://openlibrary.org/works/OL17332479W/Six_of_Crows)

BOOK TWO of the [Six of Crows Duology](https://openlibrary.org/works/OL19758128W/Six_of_Crows_Crooked_Kingdom)

Crooked Kingdom is a fantasy novel by American author Leigh Bardugo, published by Henry Holt and Co. in 2016. Set in a world loosely inspired by 19th-century Europe, it takes place days after the events of the duology''s first book, [Six of Crows](https://openlibrary.org/works/OL17332479W/Six_of_Cro', 2016, 584),
  ('b1000000-0000-0000-0000-000000000195', 'The Poppy War', null, '9781538519097', 'https://covers.openlibrary.org/b/id/8463552-L.jpg', 'A brilliantly imaginative talent makes her exciting debut with this epic historical military fantasy, inspired by the bloody history of China’s twentieth century and filled with treachery and magic, in the tradition of Ken Liu’s Grace of Kings and N.K. Jemisin’s Inheritance Trilogy.

When Rin aced the Keju—the Empire-wide test to find the most talented youth to learn at the Academies—it was a shock to everyone: to the test officials, who couldn’t believe a war orphan from Rooster Province coul', 2018, 522),
  ('b1000000-0000-0000-0000-000000000196', 'The Poppy War / The Dragon Republic / The Burning God', null, '9780063371781', 'https://covers.openlibrary.org/b/id/15177893-L.jpg', null, 2023, null),
  ('b1000000-0000-0000-0000-000000000197', 'The Dragon Republic', null, '9781982661823', 'https://covers.openlibrary.org/b/id/8539487-L.jpg', 'Rin’s story continues in this acclaimed sequel to The Poppy War—an epic fantasy combining the history of twentieth-century China with a gripping world of gods and monsters.

The war is over.

The war has just begun.

Three times throughout its history, Nikan has fought for its survival in the bloody Poppy Wars. Though the third battle has just ended, shaman and warrior Rin cannot forget the atrocity she committed to save her people. Now she is on the run from her guilt, the opium addiction', 2019, 512),
  ('b1000000-0000-0000-0000-000000000198', 'Red Rising', null, '9788427208384', 'https://covers.openlibrary.org/b/id/7316188-L.jpg', null, 2014, 416),
  ('b1000000-0000-0000-0000-000000000199', 'Golden Son', null, '9781713568551', 'https://covers.openlibrary.org/b/id/8454351-L.jpg', null, 2015, 464),
  ('b1000000-0000-0000-0000-000000000200', 'Iron Gold', null, '9781473646551', 'https://covers.openlibrary.org/b/id/14511722-L.jpg', null, 2018, 672),
  ('b1000000-0000-0000-0000-000000000201', 'The Name of the Wind', null, '9782352942832', 'https://covers.openlibrary.org/b/id/11480483-L.jpg', '***The Name of the Wind***, also called ***The Kingkiller Chronicle: Day One***, is a heroic fantasy novel written by American author Patrick Rothfuss. It is the first book in the ongoing fantasy trilogy ***The Kingkiller Chronicle***. It was published on March 27, 2007, by DAW Books, the novel has been hailed as a masterpiece of high fantasy.

The story begins the tale of Kvothe (pronounced "quothe"), a young man who becomes the most notorious magician his world has ever known. Kvothe narrate', 2007, 736),
  ('b1000000-0000-0000-0000-000000000202', 'A Slow Regard of Silent Things', null, '9781473209329', 'https://covers.openlibrary.org/b/id/7309640-L.jpg', 'Deep below the University, there is a dark place. Few people know of it: a broken web of ancient passageways and abandoned rooms. A young woman lives there, tucked among the sprawling tunnels of the Underthing, snug in the heart of this forgotten place.

Her name is Auri, and she is full of mysteries.

The Slow Regard of Silent Things is a brief, bittersweet glimpse of Auri’s life, a small adventure all her own. At once joyous and haunting, this story offers a chance to see the world through', 2013, 160),
  ('b1000000-0000-0000-0000-000000000203', 'The Lies of Locke Lamora', null, '9780553902716', 'https://covers.openlibrary.org/b/id/6307636-L.jpg', 'Best book ever', 2001, 544),
  ('b1000000-0000-0000-0000-000000000204', 'Shen shi dao zei', null, '9787229099510', 'https://covers.openlibrary.org/b/id/12525389-L.jpg', null, 2015, 568),
  ('b1000000-0000-0000-0000-000000000205', 'Neverwhere', null, '9780062476371', 'https://covers.openlibrary.org/b/id/1008998-L.jpg', '"Richard Mayhew is an ordinary young man with an ordinary life and a good heart. His world is changed forever when he stops to help a girl he finds bleeding on a London sidewalk. This small kindness propels him into a dark world he never dreamed existed. He must learn to survive in London Below, in a world of perpetual shadows and darkness, filled with monsters and saints, murderers and angels. He must survive if he is ever to return to the London that he knew."', 1996, 388),
  ('b1000000-0000-0000-0000-000000000206', 'Neil Gaiman''s Neverwhere', null, '9788416660902', 'https://covers.openlibrary.org/b/id/15205224-L.jpg', null, 2007, 224),
  ('b1000000-0000-0000-0000-000000000207', 'American Gods', null, '9780747274179', 'https://covers.openlibrary.org/b/id/8494659-L.jpg', 'American Gods (2001) is a fantasy novel by British author Neil Gaiman. The novel is a blend of Americana, fantasy, and various strands of ancient and modern mythology, all centering on the mysterious and taciturn Shadow.', 2001, 576),
  ('b1000000-0000-0000-0000-000000000208', 'Novels (American Gods / Anansi Boys)', null, '9780062561473', 'https://covers.openlibrary.org/b/id/8904272-L.jpg', null, 2006, 736),
  ('b1000000-0000-0000-0000-000000000209', 'Good Omens', null, '9780062934918', 'https://covers.openlibrary.org/b/id/10482258-L.jpg', 'Armageddon only happens once, you know. They don''t let you go around again until you get it right.

According to the Nice and Accurate Prophecies of Agnes Nutter, Witch - the world''s only totally reliable guide to the future, written in 1655, before she exploded - the world will end on a Saturday.

Next Saturday, in fact. Just after tea...

People have been predicting the end of the world almost from its very beginning, so it''s only natural to be sceptical when a new date is set for Judgem', 1990, 400),
  ('b1000000-0000-0000-0000-000000000210', 'The Nice and Accurate Good Omens TV Companion: Your guide to Armageddon and the series based on the bestselling novel by Terry Pratchett and Neil Gaiman', null, '9781472258298', 'https://covers.openlibrary.org/b/id/8782225-L.jpg', null, 2019, 320),
  ('b1000000-0000-0000-0000-000000000211', 'The Night Circus', null, '9781784872557', 'https://covers.openlibrary.org/b/id/8773134-L.jpg', 'The circus arrives without warning. No announcements precede it. It is simply there, when yesterday it was not. Within the black-and-white striped canvas tents is an utterly unique experience full of breathtaking amazements. It is called Le Cirque des Rêves, and it is only open at night. But behind the scenes, a fierce competition is underway—a duel between two young magicians, Celia and Marco, who have been trained since childhood expressly for this purpose by their mercurial instructors. Unbek', 2011, 512),
  ('b1000000-0000-0000-0000-000000000212', 'The Invisible Life of Addie LaRue', null, '9789022591932', 'https://covers.openlibrary.org/b/id/10092261-L.jpg', 'France, 1714: in a moment of desperation, a young woman makes a Faustian bargain to live forever and is cursed to be forgotten by everyone she meets.

Thus begins the extraordinary life of Addie LaRue, and a dazzling adventure that will play out across centuries and continents, across history and art, as a young woman learns how far she will go to leave her mark on the world.

But everything changes when, after nearly 300 years, Addie stumbles across a young man in a hidden bookstore and he ', 2015, 504),
  ('b1000000-0000-0000-0000-000000000213', 'Summary of the Invisible Life of Addie Larue', null, '9798770323566', 'https://covers.openlibrary.org/b/isbn/9798770323566-L.jpg', null, 2021, null),
  ('b1000000-0000-0000-0000-000000000214', 'Piranesi', null, '9781432886578', 'https://covers.openlibrary.org/b/id/10226290-L.jpg', null, 2020, 272),
  ('b1000000-0000-0000-0000-000000000215', 'History of the Decline and Fall of the Roman Empire Complete and Unabridged', null, '9780831739065', 'https://covers.openlibrary.org/b/id/5978577-L.jpg', 'Gibbon''s masterpiece, which narrates the history of the Roman Empire from the second century a.d. to its collapse in the west in the fifth century and in the east in the fifteenth century, is widely considered the greatest work of history ever written. This abridgment retains the full scope of the original, but in a compass equivalent to a long novel. Casual readers now have access to the full sweep of Gibbon''s narrative, while instructors and students have a volume that can be read in a single ', 1776, 636),
  ('b1000000-0000-0000-0000-000000000216', 'The Adventures of Sherlock Holmes [12 stories]', null, '9798502373944', 'https://covers.openlibrary.org/b/id/6717853-L.jpg', 'The Adventures of Sherlock Holmes is a collection of twelve short stories by Arthur Conan Doyle, first published on 14 October 1892. It contains the earliest short stories featuring the consulting detective Sherlock Holmes, which had been published in twelve monthly issues of The Strand Magazine from July 1891 to June 1892. The stories are collected in the same sequence, which is not supported by any fictional chronology. The only characters common to all twelve are Holmes and Dr. Watson and all', 1892, 309),
  ('b1000000-0000-0000-0000-000000000217', 'Mexican Gothic', null, '9780525620808', 'https://covers.openlibrary.org/b/id/10239163-L.jpg', 'An isolated mansion. A chillingly charismatic aristocrat. And a brave socialite drawn to expose their treacherous secrets. . . . From the author of Gods of Jade and Shadow comes “a terrifying twist on classic gothic horror” (Kirkus Reviews) set in glamorous 1950s Mexico.

After receiving a frantic letter from her newly-wed cousin begging for someone to save her from a mysterious doom, Noemí Taboada heads to High Place, a distant house in the Mexican countryside. She’s not sure what she will fi', 2020, 352),
  ('b1000000-0000-0000-0000-000000000218', 'Seventh Veil of Salome', null, '9781529431025', 'https://covers.openlibrary.org/b/isbn/9781529431025-L.jpg', null, 2025, 336),
  ('b1000000-0000-0000-0000-000000000219', 'The Seven Husbands of Evelyn Hugo', null, '9788652145218', 'https://covers.openlibrary.org/b/id/8354226-L.jpg', null, 2017, 400),
  ('b1000000-0000-0000-0000-000000000220', 'Summary of the Seven Husbands of Evelyn Hugo by Taylor Jenkins Raid', null, '9798798031474', 'https://covers.openlibrary.org/b/isbn/9798798031474-L.jpg', null, 2022, null),
  ('b1000000-0000-0000-0000-000000000221', 'Daisy Jones & The Six', null, '9781787462144', 'https://covers.openlibrary.org/b/id/8742674-L.jpg', 'A gripping novel about the whirlwind rise of an iconic 1970s rock group and their beautiful lead singer, revealing the mystery behind their infamous break up.

Everyone knows Daisy Jones & The Six, but nobody knows the real reason why they split at the absolute height of their popularity…until now.

Daisy is a girl coming of age in L.A. in the late sixties, sneaking into clubs on the Sunset Strip, sleeping with rock stars, and dreaming of singing at the Whisky a Go-Go. The sex and drugs are ', 2019, 400),
  ('b1000000-0000-0000-0000-000000000222', 'Malibu Rising', null, '9788367054447', 'https://covers.openlibrary.org/b/id/10447065-L.jpg', 'August,1983, it is the day of Nina Riva''s annual end-of-summer party, and anticipation is at a fever pitch. Everyone who is anyone wants to be around the famous Rivas: surfer and supermodel Nina, brothers Jay and Hud, and their adored baby sister Kit. Together, the siblings are a source of fascination in Malibu and the world over - especially as the children of the legendary singer Mick Riva.

By midnight the party will be completely out of control.

By morning, the Riva mansion will have go', 2021, 384),
  ('b1000000-0000-0000-0000-000000000223', 'If I had your face', null, '9780241986363', 'https://covers.openlibrary.org/b/id/9366899-L.jpg', null, 2020, 288),
  ('b1000000-0000-0000-0000-000000000224', 'Summary of Malibu Rising by Taylor Jenkins Reid', null, '9798421182641', 'https://covers.openlibrary.org/b/isbn/9798421182641-L.jpg', null, 2022, null),
  ('b1000000-0000-0000-0000-000000000225', 'Beach Read', null, '9781984806734', 'https://covers.openlibrary.org/b/id/9426296-L.jpg', 'A romance writer who no longer believes in love and a literary writer stuck in a rut engage in a summer-long challenge that may just upend everything they believe about happily ever afters.

Augustus Everett is an acclaimed author of literary fiction. January Andrews writes bestselling romance. When she pens a happily ever after, he kills off his entire cast.

They’re polar opposites.

In fact, the only thing they have in common is that for the next three months, they''re living in neighbor', 2020, 376),
  ('b1000000-0000-0000-0000-000000000226', 'The Strange Case of Dr. Jekyll and Mr. Hyde', null, '9781453600740', 'https://covers.openlibrary.org/b/id/295773-L.jpg', 'Mr. Gabriel Utterson is a serious, austere lawyer living a humdrum life in Victorian London. Yet there is a strange clause in his friend, Dr. Henry Jekyll''s will: should he disappear for more than 3 months, everything will be inherited by Hyde. But after Edward Hyde''s darker nature is revealed one dark winters night, Mr. Utterson begins to investigate the connection between the two men, and finds the dark secret binding them closer then he could have ever thought imaginable.

Adapted countless', 1875, 130),
  ('b1000000-0000-0000-0000-000000000227', 'The Love Hypothesis', null, '9789899096486', 'https://covers.openlibrary.org/b/id/10601402-L.jpg', 'The Instant New York Times Best Seller and TikTok Sensation!

As seen on The View!

A BuzzFeed Best Summer Read of 2021

When a fake relationship between scientists meets the irresistible force of attraction, it throws one woman''s carefully calculated theories on love into chaos.

As a third-year PhD candidate, Olive Smith doesn''t believe in lasting romantic relationships—but her best friend does, and that''s what got her into this situation. Convincing Anh that Olive is dating and well o', 2021, 403),
  ('b1000000-0000-0000-0000-000000000228', 'Love Theoretically', null, '9780593641293', 'https://covers.openlibrary.org/b/id/13264824-L.jpg', 'The many lives of theoretical physicist Elsie Hannaway have finally caught up with her. By day, she’s an adjunct professor, toiling away at grading labs and teaching thermodynamics in the hopes of landing tenure. By other day, Elsie makes up for her non-existent paycheck by offering her services as a fake girlfriend, tapping into her expertly honed people pleasing skills to embody whichever version of herself the client needs.

Honestly, it’s a pretty sweet gig—until her carefully constructed ', 2023, 400),
  ('b1000000-0000-0000-0000-000000000229', 'Check & Mate', null, '9780593619919', 'https://covers.openlibrary.org/b/id/13818883-L.jpg', null, 2023, 368),
  ('b1000000-0000-0000-0000-000000000230', 'People We Meet on Vacation', null, '9798701736496', 'https://covers.openlibrary.org/b/isbn/9798701736496-L.jpg', null, 2021, null),
  ('b1000000-0000-0000-0000-000000000231', 'It Ends With Us', null, '9786070788147', 'https://covers.openlibrary.org/b/id/10473609-L.jpg', 'Lily hasn’t always had it easy, but that’s never stopped her from working hard for the life she wants. She’s come a long way from the small town where she grew up—she graduated from college, moved to Boston, and started her own business. And when she feels a spark with a gorgeous neurosurgeon named Ryle Kincaid, everything in Lily’s life seems too good to be true.

Ryle is assertive, stubborn, maybe even a little arrogant. He’s also sensitive, brilliant, and has a total soft spot for Lily. And', 2012, 384),
  ('b1000000-0000-0000-0000-000000000232', 'It Starts with Us', null, '9788408267195', 'https://covers.openlibrary.org/b/id/12749873-L.jpg', '**Before It Ends with Us, it started with Atlas. Colleen Hoover tells fan favorite Atlas’s side of the story and shares what comes next in this long-anticipated sequel to the “glorious and touching” (USA TODAY) #1 New York Times bestseller It Ends with Us.**

Lily and her ex-husband, Ryle, have just settled into a civil coparenting rhythm when she suddenly bumps into her first love, Atlas, again. After nearly two years separated, she is elated that for once, time is on their side, and she imme', 2022, 352),
  ('b1000000-0000-0000-0000-000000000233', 'It Ends With Us / Ugly Love / November 9', null, '9789124136536', 'https://covers.openlibrary.org/b/id/12372384-L.jpg', null, 2021, null),
  ('b1000000-0000-0000-0000-000000000234', 'Verity', null, '9781408727034', 'https://covers.openlibrary.org/b/id/8747160-L.jpg', 'Lowen Ashleigh is a struggling writer on the brink of financial ruin when she accepts the job offer of a lifetime. Jeremy Crawford, husband of bestselling author Verity Crawford, has hired Lowen to complete the remaining books in a successful series his injured wife is unable to finish.
 
Lowen arrives at the Crawford home, ready to sort through years of Verity’s notes and outlines, hoping to find enough material to get her started. What Lowen doesn’t expect to uncover in the chaotic office is', 2018, 343),
  ('b1000000-0000-0000-0000-000000000235', 'Summary of Verity by Colleen Hoover', null, '9798421929819', 'https://covers.openlibrary.org/b/isbn/9798421929819-L.jpg', null, 2022, null),
  ('b1000000-0000-0000-0000-000000000236', 'Ugly Love', null, '9788501105738', 'https://covers.openlibrary.org/b/id/12856728-L.jpg', 'ATTRACTION AT FIRST SIGHT CAN BE MESSY… When Tate Collins finds airline pilot Miles Archer passed out in front of her apartment door, it is definitely not love at first sight. They wouldn’t even go so far as to consider themselves friends. But what they do have is an undeniable mutual attraction. He doesn’t want love and she doesn’t have time for a relationship, but their chemistry cannot be ignored. Once their desires are out in the open, they realize they have the perfect set-up, as long as Ta', 2014, 344),
  ('b1000000-0000-0000-0000-000000000237', 'Ugly Love, Maybe Someday, and Maybe Not', null, '9781501118678', 'https://covers.openlibrary.org/b/id/12920901-L.jpg', 'Ugly Love: When Tate Collins meets airline pilot Miles Archer, it isn’t exactly love at first sight. But there is an undeniable mutual attraction. Once their desires are out in the open, they realize they have the perfect set-up: he doesn’t want love, she doesn’t have time for a relationship, so that just leaves the mind-blowing sex. The arrangement could be seamless, as long as Tate never asks about the past and doesn’t expect a future.

Maybe Someday: Sydney’s perfect life is thrown into dis', 2015, 832),
  ('b1000000-0000-0000-0000-000000000238', 'The Silent Patient', null, '9781250301697', 'https://covers.openlibrary.org/b/id/9407338-L.jpg', 'Alicia Berenson’s life is seemingly perfect. One evening her husband Gabriel returns home late from a fashion shoot, and Alicia shoots him five times in the face, and then never speaks another word. Alicia’s refusal to talk, or give any kind of explanation, turns a domestic tragedy into something far grander, a mystery that captures the public imagination and casts Alicia into notoriety. The price of her art skyrockets, and she, the silent patient, is hidden away from the tabloids and spotlight ', 2018, 352),
  ('b1000000-0000-0000-0000-000000000239', 'The Maidens', null, '9781250262349', 'https://covers.openlibrary.org/b/id/11252354-L.jpg', null, 2021, 337),
  ('b1000000-0000-0000-0000-000000000240', 'The Maid', null, '9780008435769', 'https://covers.openlibrary.org/b/id/11199954-L.jpg', 'Molly Gray is not like everyone else. She struggles with social skills and misreads the intentions of others. Her gran used to interpret the world for her, codifying it into simple rules that Molly could live by.

Since Gran died a few months ago, twenty-five-year-old Molly has been navigating life''s complexities all by herself. No matter—she throws herself with gusto into her work as a hotel maid. Her unique character, along with her obsessive love of cleaning and proper etiquette, make her a', 2019, 336),
  ('b1000000-0000-0000-0000-000000000241', 'The Maid''s Secret', null, '9780593875414', 'https://covers.openlibrary.org/b/id/15126335-L.jpg', 'Molly Gray’s life is about to change in ways she could never have imagined. As the esteemed Head Maid and Special Events Manager of the Regency Grand Hotel, two good things are just around the corner—a taping of the hit antiquities TV show *Hidden Treasures* and, even more exciting, her wedding to Juan Manuel.

When Molly brings in some old trinkets to be appraised on the show, one item is revealed to be a rare and coveted artifact worth millions. Molly becomes a rags-to-riches sensation, and ', 2025, 411),
  ('b1000000-0000-0000-0000-000000000242', 'The Mystery Guest', null, '9780593356180', 'https://covers.openlibrary.org/b/id/15126331-L.jpg', 'Molly Gray wears her Head Maid badge proudly for every shift at the Regency Grand Hotel, plumping pillows, sweeping up the guests’ secrets, silently restoring rooms to a state of perfection.

But when a renowned guest – a famous mystery writer – drops very dead in the grand tea room, Molly has an unusual clean-up on her hands.

As rumours and suspicion swirl in the hotel corridors, it’s clear there’s grime lurking beneath the gilt. And Molly knows that she alone holds the key to the mystery.', 2023, 336),
  ('b1000000-0000-0000-0000-000000000243', 'The Martian / Artemis / Project Hail Mary', null, '9781637990520', 'https://covers.openlibrary.org/b/id/15206847-L.jpg', '***Project Hail Mary***
Ryland Grace is the sole survivor on a desperate, last-chance mission – and if he fails, humanity and the earth itself will perish. Except that right now, he doesn''t know that. He can''t even remember his own name, let alone the nature of his assignment or how to complete it.

***Artemis***
Jazz Bashara is one of the criminals. She lives in a poor area of Artemis and subsidises her work as a porter with smuggling contraband onto the moon. But it''s not enough. So when s', 2022, 1344),
  ('b1000000-0000-0000-0000-000000000244', 'SUMMARY and REVIEW : PROJECT HAIL MARY', null, '9798538766871', 'https://covers.openlibrary.org/b/isbn/9798538766871-L.jpg', null, 2021, null),
  ('b1000000-0000-0000-0000-000000000245', 'Oliver Twist', null, null, 'https://covers.openlibrary.org/b/id/13300802-L.jpg', 'Oliver Twist; or, The Parish Boy''s Progress, is the second novel by English author Charles Dickens. It was originally published as a serial from 1837 to 1839, and as a three-volume book in 1838. The story follows the titular orphan, who, after being raised in a workhouse, escapes to London, where he meets a gang of juvenile pickpockets led by the elderly criminal Fagin, discovers the secrets of his parentage, and reconnects with his remaining family.

Oliver Twist unromantically portrays the s', 1822, null),
  ('b1000000-0000-0000-0000-000000000246', 'Gulliver''s Travels', null, null, 'https://covers.openlibrary.org/b/id/12717083-L.jpg', 'A parody of traveler’s tales and a satire of human nature, “Gulliver’s Travels” is Jonathan Swift’s most famous work which was first published in 1726. An immensely popular tale ever since its original publication, “Gulliver’s Travels” is the story of its titular character, Lemuel Gulliver, a man who loves to travel. A series of four journeys are detailed in which Gulliver finds himself in a number of amusing and precarious situations. In the first voyage, Gulliver is imprisoned by a race of tin', 1726, null),
  ('b1000000-0000-0000-0000-000000000247', 'The Adventures of Tom Sawyer', null, null, 'https://covers.openlibrary.org/b/id/12043351-L.jpg', 'Mark Twain created the memorable characters Tom Sawyer and Huckleberry Finn drawing from the experiences of boys he grew up with in Missouri. Set by the Mississippi River in the 1840''s, it follows these boys as they get into predicament after predicament. Tom''s classic whitewashing of the fence has become part of American legend, and the book paints a nostalgic picture of life in the middle of the nineteenth century. Tom runs away from home to an island in the river, chases Injun Joe and his tre', 1817, null),
  ('b1000000-0000-0000-0000-000000000248', 'The BFG', null, null, 'https://covers.openlibrary.org/b/id/9176033-L.jpg', 'This book is a great book for all ages. It is a fantasy/adventure book.The BFG stands for ''Big Friendly Giant''. He isn''t like other giants, instead of going out to different countries to eat children he catches dreams. When he find''s a little orphan girl watching him, he kidnaps her because he doesn''t want anyone to find out that he was there, but when they arrive at giant''s land they become friends and set off into the world to save all the children from the hungry giants.', 1980, null),
  ('b1000000-0000-0000-0000-000000000249', 'The Bobbsey Twins', null, null, 'https://covers.openlibrary.org/b/id/9330264-L.jpg', '***"The Bobbsey Twins or Merry Days Indoors and Out"*** introduces the delightful and inquisitive Bobbsey children-Bert and Nan, eight years old and dark and thin; and Freddie and Flossie, four years old and blonde and plump-two sets of high-spirited twins living in Lakeport, USA.

***The first of more than eighty books in a series,*** The Bobbsey Twins sets up a winning formula, allowing us to share the days and nights of the four lovable Bobbsey children, times filled with sledding and boati', 1904, null),
  ('b1000000-0000-0000-0000-000000000250', 'Hatchet', null, null, 'https://covers.openlibrary.org/b/id/11240448-L.jpg', 'Brian Robison, a teenage boy struggling through his parents divorce, is flying up north to stay with his dad for the summer. However, his plane crashes and he is forced to survive the Canadian wilderness. Now living in a world completely opposite of his own, he is now able to discover himself in this forsaken and misunderstood beautiful world.

The story is continued in "The River" "Brian''s Winter" "Brian''s Return" and "The Hunt"', 1986, null),
  ('b1000000-0000-0000-0000-000000000251', 'Alice''s Adventures in Wonderland', null, null, 'https://covers.openlibrary.org/b/id/10527843-L.jpg', null, 1865, null),
  ('b1000000-0000-0000-0000-000000000252', 'The Wonderful Wizard of Oz', null, null, 'https://covers.openlibrary.org/b/id/552443-L.jpg', 'Over a century after its initial publication, The Wonderful Wizard of Oz is still captivating the hearts of countless readers. Come adventure with Dorothy and her three friends: the Scarecrow, the Tin Woodman, and the Cowardly Lion, as they follow the Yellow Brick Road to the Emerald City for an audience with the Great Oz, the mightiest Wizard in the land, and the only one that can return Dorothy to her home in Kansas.', 1899, null),
  ('b1000000-0000-0000-0000-000000000253', 'Treasure Island', null, null, 'https://covers.openlibrary.org/b/id/13859660-L.jpg', null, 1880, null),
  ('b1000000-0000-0000-0000-000000000254', 'A Midsummer Night''s Dream', null, null, 'https://covers.openlibrary.org/b/id/7205924-L.jpg', 'One night two young couples run into an enchanted forest in an attempt to escape their problems. But these four humans do not realize that the forest is filled with fairies and hobgoblins who love making mischief. When Oberon, the Fairy King, and his loyal hobgoblin servant, Puck, intervene in human affairs, the fate of these young couples is magically and hilariously transformed. Like a classic fairy tale, this retelling of William Shakespeare''s most beloved comedy is perfect for older readers ', 1600, null),
  ('b1000000-0000-0000-0000-000000000255', 'The Prince', null, null, 'https://covers.openlibrary.org/b/id/12726168-L.jpg', null, 1515, null),
  ('b1000000-0000-0000-0000-000000000256', 'Through the Looking-Glass', null, null, 'https://covers.openlibrary.org/b/id/11272464-L.jpg', null, 1865, null),
  ('b1000000-0000-0000-0000-000000000257', 'The Wind in the Willows', null, null, 'https://covers.openlibrary.org/b/id/13335427-L.jpg', 'The adventures of four amiable animals, Rat, Toad, Mole and Badger, along a river in the English countryside.', 1908, null),
  ('b1000000-0000-0000-0000-000000000258', 'Five Children and It', null, null, 'https://covers.openlibrary.org/b/id/28174-L.jpg', null, 1905, null),
  ('b1000000-0000-0000-0000-000000000259', 'The Princess and the Goblin', null, null, 'https://covers.openlibrary.org/b/id/14363454-L.jpg', 'There was once a little princess whose father was king over a great country full of mountains and valleys. His palace was built upon one of the mountains, and was very grand and beautiful. The princess, whose name was Irene, was born there, but she was sent soon after her birth, because her mother was not very strong, to be brought up by country people in a large house, half castle, half farmhouse, on the side of another mountain, about half-way between its base and its peak.', 1872, null),
  ('b1000000-0000-0000-0000-000000000260', 'The Time Machine', null, null, 'https://covers.openlibrary.org/b/id/9009316-L.jpg', 'The Time Traveller, a dreamer obsessed with traveling through time, builds himself a time machine and, much to his surprise, travels over 800,000 years into the future. He lands in the year 802701: the world has been transformed by a society living in apparent harmony and bliss, but as the Traveler stays in the future he discovers a hidden barbaric and depraved subterranean class. Wells''s transparent commentary on the capitalist society was an instant bestseller and launched the time-travel genr', 1895, null),
  ('b1000000-0000-0000-0000-000000000261', 'The Lost World', null, null, 'https://covers.openlibrary.org/b/id/8231444-L.jpg', null, 1900, null),
  ('b1000000-0000-0000-0000-000000000262', 'The Iron Heel', null, null, 'https://covers.openlibrary.org/b/id/8243314-L.jpg', null, 1907, null),
  ('b1000000-0000-0000-0000-000000000263', 'Flatland', null, null, 'https://covers.openlibrary.org/b/id/10069547-L.jpg', 'Flatland: A Romance of Many Dimensions, though written in 1884, is still considered useful in thinking about multiple dimensions. It is also seen as a satirical depiction of Victorian society and its hierarchies. A square, who is a resident of the two-dimensional Flatland, dreams of the one-dimensional Lineland. He attempts to convince the monarch of Lineland of the possibility of another dimension, but the monarch cannot see outside the line. The square is then visited himself by a Sphere from ', 1884, null),
  ('b1000000-0000-0000-0000-000000000264', 'The Mysterious Affair at Styles', null, null, 'https://covers.openlibrary.org/b/id/13699667-L.jpg', null, 1920, null),
  ('b1000000-0000-0000-0000-000000000265', 'The Thirty-Nine Steps', null, null, 'https://covers.openlibrary.org/b/id/93020-L.jpg', null, 1915, null),
  ('b1000000-0000-0000-0000-000000000266', 'The Red Badge of Courage', null, null, 'https://covers.openlibrary.org/b/id/8236915-L.jpg', 'The Red Badge of Courage is a war novel by American author Stephen Crane (1871–1900). Taking place during the American Civil War, the story is about a young private of the Union Army, Henry Fleming, who flees from the field of battle. Overcome with shame, he longs for a wound, a "red badge of courage," to counteract his cowardice. When his regiment once again faces the enemy, Henry acts as standard-bearer.

Although Crane was born after the war, and had not at the time experienced battle first', 1855, null),
  ('b1000000-0000-0000-0000-000000000267', 'The Prisoner of Zenda', null, null, 'https://covers.openlibrary.org/b/id/105814-L.jpg', 'An adventure novel, originally published in 1894, set in the fictitious European Kingdom of Ruritania. An English tourist is persuaded to impersonate the new king after he is abducted before he can be crowned. This act draws upon him the wrath of the Prince who has had the king abducted and his partner in crime the villainous Rupert of Hentzau.', 1800, null),
  ('b1000000-0000-0000-0000-000000000268', 'The Riddle of the Sands', null, null, 'https://covers.openlibrary.org/b/id/2293974-L.jpg', 'Childers''s lone masterpiece, THE RIDDLE OF THE SANDS, considered the first modern spy thriller, is recognisable as the brilliant forerunner of the realism of Graham Greene and John le Carre. Its unique flavour comes from its fine characterization,richly authentic background of inshore sailing and vivid evocation of the late 1890s - an atmosphere of mutual suspicion and intrigue that was soon to lead to war.', 1903, null),
  ('b1000000-0000-0000-0000-000000000269', 'The deerslayer', null, null, 'https://covers.openlibrary.org/b/id/8237593-L.jpg', 'The Deerslayer is the last book in Cooper''s Leatherstocking Tales pentalogy, but acts as a prequel to the other novels. It begins with the rapid civilizing of New York, in which surrounds the following books take place. It introduces the hero of the Tales, Natty Bumppo, and his philosophy that every living thing should follow its own nature. He is contrasted to other, less conscientious, frontiersmen.', 1841, null),
  ('b1000000-0000-0000-0000-000000000270', 'Mr. Standfast', null, null, 'https://covers.openlibrary.org/b/id/6962564-L.jpg', '<p>Published in 1919, <i><abbr>Mr.</abbr> Standfast</i> is a thriller set in the latter half of the First World War, and the third of <a href="https://standardebooks.org/ebooks/john-buchan">John Buchan’s</a> books to feature Richard Hannay.</p>
			<p>Richard Hannay is called back from serving in France to take part in a secret mission: searching for a German agent. Hannay disguises himself as a pacifist and travels through England and Scotland to track down the spy at the center of a web of Germ', 1918, null),
  ('b1000000-0000-0000-0000-000000000271', 'Emma', null, null, 'https://covers.openlibrary.org/b/id/9278312-L.jpg', null, 1815, null),
  ('b1000000-0000-0000-0000-000000000272', 'Sense and Sensibility', null, null, 'https://covers.openlibrary.org/b/id/9278292-L.jpg', null, 1811, null),
  ('b1000000-0000-0000-0000-000000000273', 'Little Women', null, null, 'https://covers.openlibrary.org/b/id/8775559-L.jpg', null, 1848, null),
  ('b1000000-0000-0000-0000-000000000274', 'Анна Каренина', null, null, 'https://covers.openlibrary.org/b/id/2560652-L.jpg', 'Described by William Faulkner as the best novel ever written and by Fyodor Dostoevsky as “flawless,” Anna Karenina tells of the doomed love affair between the sensuous and rebellious Anna and the dashing officer, Count Vronsky. Tragedy unfolds as Anna rejects her passionless marriage and thereby exposes herself to the hypocrisies of society. Set against a vast and richly textured canvas of nineteenth-century Russia, the novel''s seven major characters create a dynamic imbalance, playing out the c', 1876, null),
  ('b1000000-0000-0000-0000-000000000275', 'Northanger Abbey', null, null, 'https://covers.openlibrary.org/b/id/12567961-L.jpg', 'Northanger Abbey is both a perfectly aimed literary parody and a withering satire of the commercial aspects of marriage among the English gentry at the turn of the nineteenth century. But most of all, it is the story of the initiation into life of its naïve but sweetly appealing heroine, Catherine Morland, a willing victim of the contemporary craze for Gothic literature who is determined to see herself as the heroine of a dark and thrilling romance.

When Catherine is invited to Northanger Abb', 1818, null),
  ('b1000000-0000-0000-0000-000000000276', 'Ethan Frome', null, null, 'https://covers.openlibrary.org/b/id/8303480-L.jpg', '*Edith Wharton wrote Ethan Frome as a frame story — meaning that the prologue and epilogue constitute a "frame" around the main story*

**How It All Goes Down**
It''s winter. A nameless engineer is in Starkfield, Massachusetts on business and he first sees Ethan Frome at the post office. Ethan is a man in his early fifties who is obviously strong, and obviously crippled. The man becomes fascinated with Ethan and wants to know his story. When Ethan begins giving him occasional rides to the trai', 1910, null),
  ('b1000000-0000-0000-0000-000000000277', 'The Moonstone', null, null, 'https://covers.openlibrary.org/b/id/8237041-L.jpg', 'One of the first English detective novels, this mystery involves the disappearance of a valuable diamond, originally stolen from a Hindu idol, given to a young woman on her eighteenth birthday, and then stolen again. A classic of 19th-century literature.', 1800, null),
  ('b1000000-0000-0000-0000-000000000278', 'Le Comte de Monte Cristo', null, null, 'https://covers.openlibrary.org/b/id/14566393-L.jpg', 'Thrown in prison for a crime he has not committed, Edmond Dantes is confined to the grim fortress of If. There he learns of a great hoard of treasure hidden on the Isle of Monte Cristo and becomes determined not only to escape but to unearth the treasure and use it to plot the destruction of the three men responsible for his incarceration. A huge popular success when it was first serialized in the 1840s, Dumas was inspired by a real-life case of wrongful imprisonment when writing his epic tale o', 1830, null),
  ('b1000000-0000-0000-0000-000000000279', 'The Picture of Dorian Gray', null, null, 'https://covers.openlibrary.org/b/id/14314858-L.jpg', '**The Picture of Dorian Gray** is a philosophical novel by Irish writer Oscar Wilde. A shorter novella-length version was published in the July 1890 issue of the American periodical *Lippincott’s Monthly Magazine*. The novel-length version was published in April 1891.

(Source: [Wikipedia](https://en.wikipedia.org/wiki/The_Picture_of_Dorian_Gray))', 1890, null),
  ('b1000000-0000-0000-0000-000000000280', 'The Mayor of Casterbridge', null, null, 'https://covers.openlibrary.org/b/id/1260617-L.jpg', '<p>Like many of <a href="https://standardebooks.org/ebooks/thomas-hardy">Hardy’s</a> novels, <i>The Mayor of Casterbridge</i> is set in the fictional county of Wessex in the mid 1800s. It begins with Michael Henchard, a young hay-trusser, drunk on rum, auctioning off his wife and baby daughter at a village fair. The next day, overcome with remorse, Henchard resolves to turn his life around. When we meet Henchard eighteen years later, temperance and hard work have made him wealthy and respectable', 1800, null),
  ('b1000000-0000-0000-0000-000000000281', 'Carmilla', null, null, 'https://covers.openlibrary.org/b/id/973851-L.jpg', null, 1871, null),
  ('b1000000-0000-0000-0000-000000000282', 'The Turn of the Screw', null, null, 'https://covers.openlibrary.org/b/id/181493-L.jpg', 'The governess of two enigmatic children fears their souls are in danger from the ghosts of the previous governess and her sinister lover.', 1898, null),
  ('b1000000-0000-0000-0000-000000000283', 'Herland', null, null, 'https://covers.openlibrary.org/b/id/448130-L.jpg', null, 1915, null),
  ('b1000000-0000-0000-0000-000000000284', 'The Great God Pan', null, null, 'https://covers.openlibrary.org/b/id/921610-L.jpg', null, 1894, null),
  ('b1000000-0000-0000-0000-000000000285', 'A Christmas Carol', null, null, 'https://covers.openlibrary.org/b/id/12875748-L.jpg', 'A retelling of the story about a miser whose life is changed by Christmas.', 1843, null),
  ('b1000000-0000-0000-0000-000000000286', 'Robinson Crusoe', null, null, 'https://covers.openlibrary.org/b/id/368541-L.jpg', 'During one of his several adventurous voyages in the 1600''s, an Englishman becomes the sole survivor of a shipwreck and lives for nearly thirty years on a deserted island.', 1686, null),
  ('b1000000-0000-0000-0000-000000000287', 'The Scarlet Letter', null, null, 'https://covers.openlibrary.org/b/id/5654516-L.jpg', 'A stark and allegorical tale of adultery, guilt, and social repression in Puritan New England, The Scarlet Letter is a foundational work of American literature. Nathaniel Hawthorne''s exploration of the dichotomy between the public and private self, internal passion and external convention, gives us the unforgettable Hester Prynne, who discovers strength in the face of ostracism and emerges as a heroine ahead of her time.', 1800, null),
  ('b1000000-0000-0000-0000-000000000288', 'A Tale of Two Cities', null, null, 'https://covers.openlibrary.org/b/id/13301713-L.jpg', 'A Tale of Two Cities is a historical novel published in 1859 by Charles Dickens, set in London and Paris before and during the French Revolution. The novel tells the story of the French Doctor Manette, his 18-year-long imprisonment in the Bastille in Paris, and his release to live in London with his daughter Lucie whom he had never met. The story is set against the conditions that led up to the French Revolution and the Reign of Terror. In the Introduction to the Encyclopedia of Adventure Fictio', 1800, null),
  ('b1000000-0000-0000-0000-000000000289', 'The Hound of the Baskervilles', null, null, 'https://covers.openlibrary.org/b/id/8063264-L.jpg', null, 1900, null),
  ('b1000000-0000-0000-0000-000000000290', 'Преступление и наказание', null, null, 'https://covers.openlibrary.org/b/id/9411873-L.jpg', 'From [wikipedia][1]:

Crime and Punishment (Russian: Преступлéние и наказáние, tr. Prestupleniye i nakazaniye; IPA: [prʲɪstʊˈplʲenʲə ɪ nəkɐˈzanʲə]) is a novel by the Russian author Fyodor Dostoyevsky. It was first published in the literary journal The Russian Messenger in twelve monthly installments during 1866.[1] It was later published in a single volume. It is the second of Dostoyevsky''s full-length novels following his return from ten years of exile in Siberia. Crime and Punishment is cons', 1866, null),
  ('b1000000-0000-0000-0000-000000000291', 'The Man Who Was Thursday', null, null, 'https://covers.openlibrary.org/b/id/8242857-L.jpg', 'Can you trust yourself when you don''t know who you are? In a park in London, secret policeman Gabriel Syme strikes up a conversation with an anarchist. Sworn to do his duty, Syme uses his new acquaintance to go undercover in Europe''s Central Anarchist Council and infiltrate their deadly mission, even managing to have himself voted to the position of ''Thursday''. When Syme discovers another undercover policeman on the Council, however, he starts to question his role in their operations. And as a d', 1908, null),
  ('b1000000-0000-0000-0000-000000000292', 'The Secret Adversary', null, null, 'https://covers.openlibrary.org/b/id/14590159-L.jpg', 'Tommy Beresford and Prudence ''Tuppence'' Cowley are young, in love… and flat broke. Just after Great War, there are few jobs available and the couple are desperately short of money. Restless for excitement, they decide to embark on a daring business scheme: Young Adventurers Ltd.—"willing to do anything, go anywhere." Hiring themselves out proves to be a smart move for the couple. In their first assignment for the mysterious Mr. Whittingtont, all Tuppence has to do in their first job is take an a', 1922, null),
  ('b1000000-0000-0000-0000-000000000293', 'The mystery of Edwin Drood', null, null, 'https://covers.openlibrary.org/b/id/8243336-L.jpg', 'The Mystery of Edwin Drood is the final, uncompleted novel by Charles Dickens. John Jasper is a choirmaster who is in love with one of his pupils, Rosa Bud. She is the fiancee of his nephew, Edwin Drood. A hot-tempered man from Ceylon also becomes interested in her and he and Drood take an instant dislike to one another. Later, Drood disappears, and as Dickens never finished the novel, Drood''s fate remains a mystery indeed.', 1870, null),
  ('b1000000-0000-0000-0000-000000000294', 'His Last Bow [8 stories]', null, null, 'https://covers.openlibrary.org/b/id/8243267-L.jpg', 'The adventure of Wisteria lodge.--The adventure of the cardboard box.--The adventure of the red circle.--The adventure of the Bruce-Partington plans.--The adventure of the dying detective.--The disappearance of Lady Frances Carfax.--The adventure of the devil''s foot.--His last bow.', 1917, null),
  ('b1000000-0000-0000-0000-000000000295', 'Heart of Darkness', null, null, 'https://covers.openlibrary.org/b/id/12307847-L.jpg', 'Heart of Darkness (1899) is a novella by Polish-English novelist Joseph Conrad, about a voyage up the Congo River into the Congo Free State, in the heart of Africa, by the story''s narrator Charles Marlow. Marlow tells his story to friends aboard a boat anchored on the River Thames. Joseph Conrad is one of the greatest English writers, and Heart of Darkness is considered his best.  His readers are brought to face our psychological selves to answer, ‘Who is the true savage?’. Originally published ', 1899, null),
  ('b1000000-0000-0000-0000-000000000296', 'Things Fall Apart', null, null, 'https://covers.openlibrary.org/b/id/12816943-L.jpg', null, 1958, null),
  ('b1000000-0000-0000-0000-000000000297', 'A Widow for One Year', null, null, 'https://covers.openlibrary.org/b/id/9275640-L.jpg', '“One night when she was four and sleeping in the bottom bunk of her bunk bed, Ruth Cole woke to the sound of lovemaking—it was coming from her parents’ bedroom.”

This sentence opens John Irving’s ninth novel, A Widow for One Year, a story of a family marked by tragedy. Ruth Cole is a complex, often self-contradictory character—a “difficult” woman. By no means is she conventionally “nice,” but she will never be forgotten.

Ruth’s story is told in three parts, each focusing on a critical time', 1998, null),
  ('b1000000-0000-0000-0000-000000000298', 'Remember When', null, null, 'https://covers.openlibrary.org/b/id/871996-L.jpg', null, 2003, null),
  ('b1000000-0000-0000-0000-000000000299', 'The Gatehouse Mystery', null, null, 'https://covers.openlibrary.org/b/id/6965847-L.jpg', null, 1951, null),
  ('b1000000-0000-0000-0000-000000000300', 'Trixie Belden and the secret of the mansion', null, null, 'https://covers.openlibrary.org/b/id/6964503-L.jpg', 'The life of thirteen year old Trixie Belden changes when Honey Wheeler moves into Manor House and they discover Jim Frayne hiding in the old Mansion.  Trixie and Honey try to help Jim find the fortune rumoured to be  hidden in his Uncle''s house before his evil step-father finds him.', 1948, null),
  ('b1000000-0000-0000-0000-000000000301', 'Trixie Belden and the mysterious visitor', null, null, 'https://covers.openlibrary.org/b/id/6969898-L.jpg', 'Trixie Belden and Diana Lynch were friends for years before Di''s family became fabulously rich. So when Di''s long-lost uncle starts ruining her social life, Di turns to her old friend for help. But Trixie thinks Uncle Monty isn''t just an annoying relative-she thinks he''s an impostor!', 1954, null),
  ('b1000000-0000-0000-0000-000000000302', 'Adventures of Huckleberry Finn', null, null, 'https://covers.openlibrary.org/b/id/8157718-L.jpg', null, 1876, null),
  ('b1000000-0000-0000-0000-000000000303', 'Hamlet', null, null, 'https://covers.openlibrary.org/b/id/8281954-L.jpg', 'In this quintessential Shakespeare tragedy, a young prince''s halting pursuit of revenge for the murder of his father unfolds in a series of highly charged confrontations that have held audiences spellbound for nearly four centuries. Those fateful exchanges, and the anguished soliloquies that precede and follow them, probe depths of human feeling rarely sounded in any art. 

The title role of Hamlet, perhaps the most demanding in all of Western drama, has provided generations of leading actors ', 1603, null),
  ('b1000000-0000-0000-0000-000000000304', 'Macbeth', null, null, 'https://covers.openlibrary.org/b/id/872432-L.jpg', null, 1508, null),
  ('b1000000-0000-0000-0000-000000000305', 'The Last of the Mohicans', null, null, 'https://covers.openlibrary.org/b/id/8236937-L.jpg', null, 1826, null),
  ('b1000000-0000-0000-0000-000000000306', 'The Marvelous Land of Oz', null, null, 'https://covers.openlibrary.org/b/id/12648656-L.jpg', 'Tip and his creation, Jack Pumpkin, run away to Oz, where they save the city after it is captured by girls.', 1904, null),
  ('b1000000-0000-0000-0000-000000000307', 'Tuesdays with Morrie', null, null, 'https://covers.openlibrary.org/b/id/12560417-L.jpg', null, 1994, null),
  ('b1000000-0000-0000-0000-000000000308', 'On Writing', null, null, 'https://covers.openlibrary.org/b/id/9255939-L.jpg', null, 1999, null),
  ('b1000000-0000-0000-0000-000000000309', 'Come, tell me how you live', null, null, 'https://covers.openlibrary.org/b/id/12824423-L.jpg', 'Agatha Christie was already a celebrated writer of mysteries in 1930 when she married archaeologist Max Mallowan. She enthusiastically joined him on archaeological expeditions in the Middle East, providing backgrounds for novels and "everyday doings and happenings". Pre-war Syria years are remembered here, not chronologically, but in a cluster of vignettes about servants and aristocrats who peppered their lives with annoyances and pleasures.', 1946, null),
  ('b1000000-0000-0000-0000-000000000310', 'Shoe Dog', null, null, 'https://covers.openlibrary.org/b/id/8858487-L.jpg', '"In this candid and riveting memoir, for the first time ever, Nike founder and CEO Phil Knight shares the inside story of the company''s early days as an intrepid start-up and its evolution into one of the world''s most iconic, game-changing, and profitable brands. In 1962, fresh out of business school, Phil Knight borrowed $50 from his father and created a company with a simple mission: import high-quality, low-cost athletic shoes from Japan. Selling the shoes from the trunk of his lime green Ply', 2014, null),
  ('b1000000-0000-0000-0000-000000000311', 'You Can''t Win', null, null, 'https://covers.openlibrary.org/b/id/948047-L.jpg', 'William Burroughs, at the age of 13, was inspired by this book, as he mentions in a preface to Naked Lunch. You Can''t Win is a memoir that explodes our ideas about the supposedly lawful past; Jack was a drifter, robber, junkie, and hustler that survived from the frontier times til the depression era...apparently. He became a librarian of sorts, wrote his memoir, and then vanished...', 1926, null),
  ('b1000000-0000-0000-0000-000000000312', 'The city boy', null, null, 'https://covers.openlibrary.org/b/id/191145-L.jpg', '''City Boy'' spins a hilarious and often touching tale of an urban kid''s adventures and misadventures on the street, in school, in the countryside, always in pursuit of Lucille, a heartless redhead personifying all the girls who torment and fascinate pubescent lads of eleven.', 1948, null),
  ('b1000000-0000-0000-0000-000000000313', 'The Sea For Breakfast', null, null, 'https://covers.openlibrary.org/b/id/12179260-L.jpg', '***Lillian Beckwith''s settling in on the island of Bruach*** and having a croft of her own, is the basis of these comic adventures. Adapting to a totally different way of life provides many excuses for humour and the eccentric cast of characters guarantees there is never a dull moment on Bruach. ***In one story, beachcombing yields a strange find. In another a Christmas party results in a riotous night''s celebration.***

**I haven''t laughed so much since Whisky Galore''''*--EVENING NEWS (fr. Cvr', 1961, null),
  ('b1000000-0000-0000-0000-000000000314', 'By way of deception', null, null, 'https://covers.openlibrary.org/b/id/9559423-L.jpg', 'The first time the Mossad came calling, they wanted Victor Ostrovsky for their assassination unit, the kidon. He turned them down. The next time, he agreed to enter the grueling three-year training program to become a katsa, or intelligence case officer, for the legendary Israeli spy organization. *By Way of Deception* is the explosive chronicle of his experiences in the Mossad, and of two decades of their frightening and often ruthless covert activities around the world. Penetrating far deeper ', 1990, null),
  ('b1000000-0000-0000-0000-000000000315', '走ることについて語るときに僕の語ること', null, null, 'https://covers.openlibrary.org/b/id/7167416-L.jpg', 'In 1982, having sold his jazz bar to devote himself to writing, Murakami began running to keep fit. A year later, he''d completed a solo course from Athens to Marathon, and now, after dozens of such races, not to mention triathlons and a dozen critically acclaimed books, he reflects upon the influence the sport has had on his life and--even more important--on his writing.Equal parts training log, travelogue, and reminiscence, this revealing memoir covers his four-month preparation for the 2005 Ne', 2006, null),
  ('b1000000-0000-0000-0000-000000000316', 'The hasheesh eater: being passages from the life of a Pythagorean ..', null, null, 'https://covers.openlibrary.org/b/id/9940637-L.jpg', '<p>When <a href="https://standardebooks.org/ebooks/fitz-hugh-ludlow">Fitz Hugh Ludlow</a> was in college, he found a jar of cannabis extract at his pharmacy, deduced that this was the fabled “hashish” described in <i>The Arabian Nights</i> and <a href="https://standardebooks.org/ebooks/alexandre-dumas/the-count-of-monte-cristo/chapman-and-hall"><i>The Count of Monte Cristo</i></a>, and gave in to his curiosity by swallowing a spoonful. His life would never be the same.</p> <p><i>The Hashish Eate', 1857, null),
  ('b1000000-0000-0000-0000-000000000317', 'The Monk Who Sold His Ferrari', null, null, 'https://covers.openlibrary.org/b/id/48817-L.jpg', 'Includes a bonus excerpt of Robin Sharma''s upcoming The Secret Letters of the Monk Who Sold His Ferrari.

With more than four million copies sold in fifty-one languages, The Monk Who Sold His Ferrari launched a bestselling series and continues to help people from every walk of life live with far greater success, happiness and meaning in these times of dramatic uncertainty.

The Monk Who Sold His Ferrari celebrates the story of Julian Mantle, a successful but misguided lawyer whose physical a', 1996, null),
  ('b1000000-0000-0000-0000-000000000318', 'The Power of Focused Thinking', null, null, 'https://covers.openlibrary.org/b/id/188625-L.jpg', null, 1981, null),
  ('b1000000-0000-0000-0000-000000000319', 'The Secret', null, null, 'https://covers.openlibrary.org/b/id/845815-L.jpg', 'Fragments of a Great Secret have been found in the oral traditions, in literature, in religions and philosophies throughout the centuries. For the first time, all the pieces of The Secret come together in an incredible revelation that will be life-transforming for all who experience it. In this book, you''ll learn how to use The Secret in every aspect of your life - money, health, relationships, happiness, and in every interaction you have in the world. You''ll begin to understand the hidden, unta', 2000, null),
  ('b1000000-0000-0000-0000-000000000320', 'The Definitive Book of Body Language', null, null, 'https://covers.openlibrary.org/b/id/499488-L.jpg', 'This book isolates and examines each component of body language and gesture and makes you more aware of your own non-verbal cues and signals and demonstrates how people communicate with each other using them.', 2004, null),
  ('b1000000-0000-0000-0000-000000000321', 'God and the evolving universe', null, null, 'https://covers.openlibrary.org/b/id/9318458-L.jpg', null, 2002, null),
  ('b1000000-0000-0000-0000-000000000322', 'The Happiness Trap', null, null, 'https://covers.openlibrary.org/b/id/7916587-L.jpg', null, 2007, null),
  ('b1000000-0000-0000-0000-000000000323', 'Girlosophy', null, null, 'https://covers.openlibrary.org/b/id/6806247-L.jpg', '“Girlosophy” is a new way of thinking about life that captures the spirit of being a woman in the 21st century. This book is a blueprint for young women seeking to find their own individual truth. It explains all a person needs to know to become a “girlosopher”: an open heart and an open mind, a direct and honest approach, the courage to fail, and an understanding of the spirit within. Yoga, meditation, and karma are all noted as essential to re-centering one’s mind and giving young women a spir', 2000, null),
  ('b1000000-0000-0000-0000-000000000324', 'How to pass exams', null, null, 'https://covers.openlibrary.org/b/id/2012032-L.jpg', 'A bestselling guide for students at high school, TAFE and university.Does the thought of exams and tests make you feel panicky?. Do you know how to make the most of those last days before an exam ortest?. Do you worry you''ll forget everything you''ve studied?This bestselling guide explains how to control your anxiety and get goodmarks. Learn how to:. avoid panic attacks. improve your memory. manage your time. cope with different kinds of exams and testsas well as many other essential techniques.W', 1985, null),
  ('b1000000-0000-0000-0000-000000000325', 'Yesterday I Cried', null, null, 'https://covers.openlibrary.org/b/id/428571-L.jpg', null, 1999, null),
  ('b1000000-0000-0000-0000-000000000326', 'The Twelfth Insight', null, null, 'https://covers.openlibrary.org/b/id/9318455-L.jpg', 'The story of a new wave of religious tolerance and integrity that is now silently arriving, in reaction to watching years of religious warfare and political corruption. The year 2012 is not about the end of the world; it is about the unifying life of everyday miracles.', 2011, null),
  ('b1000000-0000-0000-0000-000000000327', 'In Cold Blood', null, null, 'https://covers.openlibrary.org/b/id/228066-L.jpg', 'On November 15, 1959, in the small town of Holcomb, Kansas, four members of the Clutter family were savagely murdered by blasts from a shotgun held a few inches from their faces. There was no apparent motive for the crime, and there were almost no clues.', 1965, null),
  ('b1000000-0000-0000-0000-000000000328', 'The Innocent Man', null, null, 'https://covers.openlibrary.org/b/id/9322895-L.jpg', 'Murder and injustice in a small townJohn Grisham''s first work of non-fiction, an exploration of small town justice gone terribly awry, is his most extraordinary legal thriller yet. In the major league draft of 1971, the first player chosen from the State of Oklahoma was Ron Williamson. When he signed with the Oakland A''s, he said goodbye to his hometown of Ada and left to pursue his dreams of big league glory. Six years later he was back, his dreams broken by a bad arm and bad habits - drinking,', 2006, null),
  ('b1000000-0000-0000-0000-000000000329', 'Midnight in the Garden of Good and Evil', null, null, 'https://covers.openlibrary.org/b/id/8231883-L.jpg', 'Read John Berendt''s Midnight in the Garden of Good and Evil in Large Print. All Random House Large Print editions are published in a 16-point typefaceShots rang out in Savannah''s grandest mansion in the misty,early morning hours of May 2, 1981.  Was it murder or self-defense?  For nearly a decade, the shooting and its aftermath reverberated throughout this hauntingly beautiful city of moss-hung oaks and shaded squares.  John Berendt''s sharply observed, suspenseful, and witty narrative reads like', 1994, null),
  ('b1000000-0000-0000-0000-000000000330', 'Mindhunter', null, null, 'https://covers.openlibrary.org/b/id/490333-L.jpg', 'Discover the classic, behind-the-scenes chronicle of John E. Douglas’ twenty-five-year career in the FBI Investigative Support Unit, where he used psychological profiling to delve into the minds of the country’s most notorious serial killers and criminals—the basis for the upcoming Netflix original series.

In chilling detail, the legendary Mindhunter takes us behind the scenes of some of his most gruesome, fascinating, and challenging cases—and into the darkest recesses of our worst nightmare', 1995, null),
  ('b1000000-0000-0000-0000-000000000331', 'Under the Banner of Heaven', null, null, 'https://covers.openlibrary.org/b/id/744923-L.jpg', 'Jon Krakauer''s literary reputation rests on insightful chronicles of lives conducted at the outer limits. In UNDER THE BANNER OF HEAVEN, he shifts his focus from extremes of physical adventure to extremes of religious belief within our own borders.

At the core of his book is an appalling double murder committed by two Mormon fundamentalist brothers, Ron and Dan Lafferty, who insist they received a revelation from God commanding them to kill their blameless victims. Beginning with a meticulous', 2003, null),
  ('b1000000-0000-0000-0000-000000000332', 'Killers of the Flower Moon', null, null, 'https://covers.openlibrary.org/b/id/8055064-L.jpg', 'In the 1920s, the richest people per capita in the world were members of the Osage Nation in Oklahoma. After oil was discovered beneath their land, the Osage rode in chauffeured automobiles, built mansions, and sent their children to study in Europe.

Then, one by one, the Osage began to be killed off. The family of an Osage woman, Mollie Burkhart, became a prime target. One of her relatives was shot. Another was poisoned. And it was just the beginning, as more and more Osage were dying under ', 2017, null),
  ('b1000000-0000-0000-0000-000000000333', 'Homicide', null, null, 'https://covers.openlibrary.org/b/id/6989176-L.jpg', 'The scene is Baltimore. Twice every three days another citizen is shot, stabbed or bludgeoned to death. At the centre of this hurricane of crime is the city''s homicide unit, a small brotherhood of hard men who fight for whatever justice is possible in a deadly world. David Simon was the first reporter ever to gain unlimited access to a homicide unit, and his remarkable book is both a compelling account of casework and an investigation into out culture of violence.', 1991, null),
  ('b1000000-0000-0000-0000-000000000334', 'The Monster of Florence', null, null, 'https://covers.openlibrary.org/b/id/5579-L.jpg', 'Marshal Guarnaccia feels out of his league when he is assigned to help track down a serial killer, especially when he assigned to work under Simonetti, a man so dedicated to achieving a conviction that he is blinded to the consequences.', 1996, null),
  ('b1000000-0000-0000-0000-000000000335', 'The murder of King Tut', null, null, 'https://covers.openlibrary.org/b/id/6306495-L.jpg', null, 2009, null),
  ('b1000000-0000-0000-0000-000000000336', 'Separating fools from their money', null, null, 'https://covers.openlibrary.org/b/id/7889440-L.jpg', null, 2006, null),
  ('b1000000-0000-0000-0000-000000000337', 'La Divina Commedia', null, null, 'https://covers.openlibrary.org/b/id/11621024-L.jpg', 'De goddelijke komedie is de beschrijving van een denkbeeldige tocht door het hiernamaals. Zij heeft drie delen: de hel, het vagevuur en het paradijs en ieder van deze delen heeft drieëndertig zangen van niet geheel gelijke lengte, terwijl aan het eerste deel nog een inleidende zang voorafgaat, waardoor het totale aantal van de zang honderd bedraagt. Dit aantal is geen toevalligheid. Het getal honderd gold in de middeleeuwse getallensymboliek, waarvan ook Dante een naarstig beoefenaar was, als he', 1472, null),
  ('b1000000-0000-0000-0000-000000000338', 'Ἰλιάς', null, null, 'https://covers.openlibrary.org/b/id/7083790-L.jpg', 'This long-awaited new edition of Lattimore''s Iliad is designed to bring the book into the twenty-first century—while leaving the poem as firmly rooted in ancient Greece as ever. Lattimore''s elegant, fluent verses—with their memorably phrased heroic epithets and remarkable fidelity to the Greek—remain unchanged, but classicist Richard Martin has added a wealth of supplementary materials designed to aid new generations of readers. A new introduction sets the poem in the wider context of Greek life', 1505, null),
  ('b1000000-0000-0000-0000-000000000339', 'Ὀδύσσεια', null, null, 'https://covers.openlibrary.org/b/id/9045853-L.jpg', 'The Odyssey (/ˈɒdəsi/; Greek: Ὀδύσσεια, Odýsseia) is one of two major ancient Greek epic poems attributed to Homer. It is, in part, a sequel to the Iliad, the other work ascribed to Homer. The poem is fundamental to the modern Western canon, and is the second oldest extant work of Western literature, the Iliad being the oldest. Scholars believe it was composed near the end of the 8th century BC, somewhere in Ionia, the Greek coastal region of Anatolia. - [Wikipedia][1]

  [1]: https://en.wikip', 1488, null),
  ('b1000000-0000-0000-0000-000000000340', 'Leaves of Grass', null, null, 'https://covers.openlibrary.org/b/id/9000447-L.jpg', null, 1855, null),
  ('b1000000-0000-0000-0000-000000000341', 'The Canterbury Tales', null, null, 'https://covers.openlibrary.org/b/id/5767180-L.jpg', 'A collection of stories written in Middle English by Geoffrey Chaucer at the end of the 14th century. The tales (mostly in verse, although some are in prose) are told as part of a story-telling contest by a group of pilgrims as they travel together on a journey from Southwark to the shrine of Saint Thomas Becket at Canterbury Cathedral. In a long list of works, including Troilus and Criseyde, House of Fame, and Parliament of Fowls, The Canterbury Tales was Chaucer''s magnum opus. He uses the tale', 1478, null),
  ('b1000000-0000-0000-0000-000000000342', 'Sonnets', null, null, 'https://covers.openlibrary.org/b/id/8222090-L.jpg', '"I feel that I have spent half my career with one or another Pelican Shakespeare in my back pocket. Convenience, however, is the least important aspect of the new Pelican Shakespeare series. Here is an elegant and clear text for either the study or the rehearsal room, notes where you need them and the distinguished scholarship of the general editors, Stephen Orgel and A. R. Braunmuller who understand that these are plays for performance as well as great texts for contemplation." (Patrick Stewart', 1609, null),
  ('b1000000-0000-0000-0000-000000000343', 'Faust', null, null, 'https://covers.openlibrary.org/b/id/6499459-L.jpg', null, 1800, null),
  ('b1000000-0000-0000-0000-000000000344', 'The Prophet', null, null, 'https://covers.openlibrary.org/b/id/418324-L.jpg', 'Reflections by the Lebanese-American poet, mystic, and painter on such subjects as love, marriage, joy and sorrow, crime and punishment, pain, and self-knowlege.', 1900, null),
  ('b1000000-0000-0000-0000-000000000345', 'Don Quijote de la Mancha', null, null, 'https://covers.openlibrary.org/b/id/14428305-L.jpg', '*Don Quijote de la Mancha* es una novela escrita por el español Miguel de Cervantes Saavedra. Publicada su primera parte con el título de *El ingenioso hidalgo don Quijote de la Mancha* a comienzos de 1605, es la obra más destacada de la literatura española y una de las principales de la literatura universal. En 1615 apareció su continuación con el título de *Segunda parte del ingenioso caballero don Quijote de la Mancha.* Es la primera obra genuinamente desmitificadora de la tradición caballere', 1600, null),
  ('b1000000-0000-0000-0000-000000000346', 'Candide', null, null, 'https://covers.openlibrary.org/b/id/12736044-L.jpg', 'Brought up in the household of a powerful Baron, Candide is an open-minded young man, whose tutor, Pangloss, has instilled in him the belief that ''all is for the best''. But when his love for the Baron''s rosy-cheeked daughter is discovered, Candide is cast out to make his own way in the world. 

And so he and his various companions begin a breathless tour of Europe, South America and Asia, as an outrageous series of disasters befall them - earthquakes, syphilis, a brush with the Inquisition, mu', 1746, null),
  ('b1000000-0000-0000-0000-000000000347', 'Alice''s Adventures in Wonderland / Through the Looking Glass', null, null, 'https://covers.openlibrary.org/b/id/8595966-L.jpg', null, 1889, null),
  ('b1000000-0000-0000-0000-000000000348', 'A history of New York', null, null, 'https://covers.openlibrary.org/b/id/1991009-L.jpg', 'A history of New York : from the beginning of the world to the end of the Dutch dynasty ; containing, among many surprising and curious matters, the unutterable ponderings of Walter the Doubter, the disastrous projects of William the Testy, and the chivalric achievements of Peter the Headstrong ; the three Dutch governors of New Amsterdam ; being the only authentic history of the times that ever hath been or ever will be published.', 1800, null),
  ('b1000000-0000-0000-0000-000000000349', 'The Importance of Being Earnest', null, null, 'https://covers.openlibrary.org/b/id/1260453-L.jpg', null, 1893, null),
  ('b1000000-0000-0000-0000-000000000350', 'The History of Tom Jones', null, null, 'https://covers.openlibrary.org/b/id/12968864-L.jpg', 'The foundling Tom Jones is found on the property of a benevolent, wealthy landowner. Tom grows up to be a vigorous, kind-hearted young man, whose love of his neighbor''s well-born daughter brings class friction to the fore. The presence of prostitution and promiscuity in Tom Jones caused a sensation at the time it was published, as such themes were uncommon. It is divided into 18 shorter books, and is considered one of the first English-language novels.', 1749, null),
  ('b1000000-0000-0000-0000-000000000351', 'Idle Thoughts of an Idle Fellow', null, null, 'https://covers.openlibrary.org/b/id/8243128-L.jpg', 'Idle Thoughts of an Idle Fellow is a collection of humorous essays by Jerome K. Jerome. The essays cover a range of topics from "On Being in Love" to "On Furnished Apartments" to "On Getting on in the World". Jerome established himself as one of England''s favorite wits with his comic novel Three Men in a Boat.', 1880, null),
  ('b1000000-0000-0000-0000-000000000352', 'Le petit prince', null, null, 'https://covers.openlibrary.org/b/id/10708272-L.jpg', null, 1943, null),
  ('b1000000-0000-0000-0000-000000000353', 'The Scarlet Pimpernel', null, null, 'https://covers.openlibrary.org/b/id/479102-L.jpg', 'The Scarlet Pimpernel (1905) is a play and adventure novel by Baroness Emmuska Orczy set during the Reign of Terror following the start of the French Revolution.', 1900, null),
  ('b1000000-0000-0000-0000-000000000354', 'She', null, null, 'https://covers.openlibrary.org/b/id/295537-L.jpg', 'An enduring adventure yarn set in pre colonial Africa, culminating in the discovery of a lost civilization ruled by a beautiful eternally youthful queen. "She is generally considered to be one of the classics of imaginative literature and with 83 million copies sold by 1965, it is one of the best-selling books of all time." See more at: http://en.wikipedia.org/wiki/She_(novel)', 1886, null),
  ('b1000000-0000-0000-0000-000000000355', 'The Coral Island', null, null, 'https://covers.openlibrary.org/b/id/8242206-L.jpg', 'A nineteenth century adventure story of three teenaged boys shipwrecked on a Pacific island. At first they lead an idyllic life but this is soon interrupted by the arrival on the island of rival Polynesian war parties and then pirates. After various adventures the boys find themselves in possession of the pirate’s ship and can sail for home.', 1858, null),
  ('b1000000-0000-0000-0000-000000000356', 'When the Sleeper Awakes', null, null, 'https://covers.openlibrary.org/b/id/574886-L.jpg', 'A troubled insomniac in 1890s England falls suddenly into a sleep-like trance, from which he does not awake for over two hundred years. During his centuries of slumber, however, investments are made that make him the richest and most powerful man on Earth. But when he comes out of his trance he is horrified to discover that the money accumulated in his name is being used to maintain a hierarchal society in which most are poor, and more than a third of all people are enslaved. Oppressed and unedu', 1899, null),
  ('b1000000-0000-0000-0000-000000000357', 'The Giver', null, null, 'https://covers.openlibrary.org/b/id/8352502-L.jpg', 'At the age of twelve, Jonas, a young boy from a seemingly utopian, futuristic world, is singled out to receive special training from The Giver, who alone holds the memories of the true joys and pain of life.', 1993, null),
  ('b1000000-0000-0000-0000-000000000358', 'A Clash of Kings', null, null, 'https://covers.openlibrary.org/b/id/8231751-L.jpg', 'In this thrilling sequel to *A Game of Thrones*, George R. R. Martin has created a work of unsurpassed vision, power, and imagination. *A Clash of Kings* transports us to a world of revelry and revenge, wizardry and warfare unlike any we have ever experienced.

***A Clash of Kings***

A comet the color of blood and flame cuts across the sky. Two great leaders—Lord Eddard Stark and Robert Baratheon—who hold sway over an age of enforced peace are dead, victims of royal treachery. Now, from the', 1998, null),
  ('b1000000-0000-0000-0000-000000000359', 'Four', null, null, 'https://covers.openlibrary.org/b/id/7314248-L.jpg', 'This collection of stories follows Four, also known as Tobias Eaton. If you enjoyed the Divergent series, you will love reading the story you know and love in Tobias'' view.', 2001, null),
  ('b1000000-0000-0000-0000-000000000360', 'La casa de los espíritus', null, null, 'https://covers.openlibrary.org/b/id/3205226-L.jpg', 'Primera novela de Isabel Allende. *La casa de los espíritus* narra la saga de una poderosa familia de terratenientes latinoamericanos. El despótico patriarca Esteban Trueba ha construido, con mano de hierro, un imperio privado que empieza a tambalearse a raíz del paso del tiempo y de un entorno social explosivo. Finalmente, la decadencia personal del patriarca arrastrará a los Trueba a una dolorosa desintegración. Atrapados en unas dramáticas relaciones familiares, los personajes de esta portent', 1982, null),
  ('b1000000-0000-0000-0000-000000000361', 'Como agua para chocolate', null, null, 'https://covers.openlibrary.org/b/id/8372632-L.jpg', 'Like Water for Chocolate (Spanish: Como agua para chocolate) is a novel by Mexican novelist and screenwriter Laura Esquivel.

The novel follows the story of a young girl named Tita, who longs for her lover, Pedro, but can never have him because of her mother''s upholding of the family tradition: the youngest daughter cannot marry, but instead must take care of her mother until she dies. Tita is only able to express herself when she cooks.

Esquivel employs magical realism to combine the super', 1989, null),
  ('b1000000-0000-0000-0000-000000000362', 'Midnight''s Children', null, null, 'https://covers.openlibrary.org/b/id/8346713-L.jpg', 'Midnight''s Children is a 1981 novel by author Salman Rushdie. It portrays India''s transition from British colonial rule to independence and the partition of India. It is considered an example of postcolonial, postmodern, and magical realist literature. The story is told by its chief protagonist, Saleem Sinai, and is set in the context of actual historical events. The style of preserving history with fictional accounts is self-reflexive.

Midnight''s Children won both the Booker Prize and the Ja', 1981, null),
  ('b1000000-0000-0000-0000-000000000363', 'La hojarasca', null, null, 'https://covers.openlibrary.org/b/id/10096897-L.jpg', null, 1954, null),
  ('b1000000-0000-0000-0000-000000000364', 'La isla bajo el mar', null, null, 'https://covers.openlibrary.org/b/id/9985801-L.jpg', 'Born a slave on the island of Saint-Domingue, Zarité -- known as Tété -- is the daughter of an African mother she never knew and one of the white sailors who brought her into bondage. Though her childhood is one of brutality and fear, Tété finds solace in the traditional rhythms of African drums and in the voodoo loas she discovers through her fellow slaves.

When twenty-year-old Toulouse Valmorain arrives on the island in 1770, it’s with powdered wigs in his baggage and dreams of financial su', 2009, null),
  ('b1000000-0000-0000-0000-000000000365', '1Q84', null, null, 'https://covers.openlibrary.org/b/id/11153243-L.jpg', 'The novel is a sub-melodramatic sentimental metafictional love story in a ficticious world with two moons in the sky, a thriller packed with cults, assassinations and grotesque sex (newyorkobserver).  The title is a play on the Japanese pronunciation of the year 1984 of George Orwell. The novel was longlisted for the 2011 Man Asian Literary Prize and placed No. 2 in Amazon.com''s top books of the year.', 2009, null),
  ('b1000000-0000-0000-0000-000000000366', 'ダンス・ダンス・ダンス', null, null, 'https://covers.openlibrary.org/b/id/7886358-L.jpg', 'He burst upon the international scene with the wildly acclaimed *A Wild Sheep Chase*. He quickly came to represent the quirky voice of a new generation of Japanese writers. Now Haruki Murakami gives us his wittiest, boldest, most daring work to date. *Dance dance dance* continues the extraordinary adventure of an ordinary man. At thirty something, Murakami''s nameless hero lives in a hi-tech, high-rise world where old virtues die fast and success is all that matters. He has shared in the glitteri', 1988, null),
  ('b1000000-0000-0000-0000-000000000367', 'Before the Coffee Gets Cold', null, null, 'https://covers.openlibrary.org/b/id/10138333-L.jpg', 'If you could go back in time, who would you want to meet?

In a small back alley of Tokyo, there is a café that has been serving carefully brewed coffee for more than one hundred years. Local legend says that this shop offers something else besides coffee—the chance to travel back in time.

Over the course of one summer, four customers visit the café in the hopes of making that journey. But time travel isn’t so simple, and there are rules that must be followed. Most important, the trip can l', 2019, null),
  ('b1000000-0000-0000-0000-000000000368', 'Little, Big', null, null, 'https://covers.openlibrary.org/b/id/9366932-L.jpg', 'Winner of the 1982 World Fantasy Award for best novel.', 1981, null),
  ('b1000000-0000-0000-0000-000000000369', 'All the Crooked Saints', null, null, 'https://covers.openlibrary.org/b/id/8770063-L.jpg', '*Here is a thing everyone wants:
A miracle.*
 
*Here is a thing everyone fears:
What it takes to get one.*
 
Any visitor to Bicho Raro, Colorado is likely to find a landscape of dark saints, forbidden love, scientific dreams, miracle-mad owls, estranged affections, one or two orphans, and a sky full of watchful desert stars.
 
At the heart of this place you will find the Soria family, who all have the ability to perform unusual miracles. And at the heart of this family are three cousins ', 2017, null),
  ('b1000000-0000-0000-0000-000000000370', 'The Art of War', null, null, 'https://covers.openlibrary.org/b/id/4849549-L.jpg', 'The Art of War is an ancient Chinese military treatise dating from the Late Spring and Autumn Period. The work, which is attributed to the ancient Chinese military strategist Sun Tzu', 1900, null),
  ('b1000000-0000-0000-0000-000000000371', 'Walden', null, null, 'https://covers.openlibrary.org/b/id/11248037-L.jpg', null, 1854, null),
  ('b1000000-0000-0000-0000-000000000372', 'Записки изъ подполья', null, null, 'https://covers.openlibrary.org/b/id/10445973-L.jpg', 'Its nameless hero is a profoundly alienated individual in whose brooding self-analysis there is a search for the true and the good in a world of relative values and few absolutes. Moreover, the novel introduces themes — moral, religious, political and social — that dominated Dostoyevsky''s later works.', 1864, null),
  ('b1000000-0000-0000-0000-000000000373', 'πολιτεία', null, null, 'https://covers.openlibrary.org/b/id/14418448-L.jpg', 'The Republic is Plato''s most famous work and one of the seminal texts of Western philosophy and politics. The characters in this Socratic dialogue - including Socrates himself - discuss whether the just or unjust man is happier. They are the philosopher-kings of imagined cities and they also discuss the nature of philosophy and the soul among other things.', 1554, null)
on conflict do nothing;

-- Book-Author links
insert into book_authors (book_id, author_id) values
  ('b1000000-0000-0000-0000-000000000050', 'a1000000-0000-0000-0000-000000000050'),
  ('b1000000-0000-0000-0000-000000000051', 'a1000000-0000-0000-0000-000000000050'),
  ('b1000000-0000-0000-0000-000000000052', 'a1000000-0000-0000-0000-000000000050'),
  ('b1000000-0000-0000-0000-000000000053', 'a1000000-0000-0000-0000-000000000051'),
  ('b1000000-0000-0000-0000-000000000054', 'a1000000-0000-0000-0000-000000000051'),
  ('b1000000-0000-0000-0000-000000000055', 'a1000000-0000-0000-0000-000000000051'),
  ('b1000000-0000-0000-0000-000000000056', 'a1000000-0000-0000-0000-000000000052'),
  ('b1000000-0000-0000-0000-000000000057', 'a1000000-0000-0000-0000-000000000052'),
  ('b1000000-0000-0000-0000-000000000058', 'a1000000-0000-0000-0000-000000000052'),
  ('b1000000-0000-0000-0000-000000000059', 'a1000000-0000-0000-0000-000000000053'),
  ('b1000000-0000-0000-0000-000000000060', 'a1000000-0000-0000-0000-000000000053'),
  ('b1000000-0000-0000-0000-000000000061', 'a1000000-0000-0000-0000-000000000054'),
  ('b1000000-0000-0000-0000-000000000062', 'a1000000-0000-0000-0000-000000000055'),
  ('b1000000-0000-0000-0000-000000000063', 'a1000000-0000-0000-0000-000000000055'),
  ('b1000000-0000-0000-0000-000000000064', 'a1000000-0000-0000-0000-000000000056'),
  ('b1000000-0000-0000-0000-000000000065', 'a1000000-0000-0000-0000-000000000056'),
  ('b1000000-0000-0000-0000-000000000066', 'a1000000-0000-0000-0000-000000000056'),
  ('b1000000-0000-0000-0000-000000000067', 'a1000000-0000-0000-0000-000000000057'),
  ('b1000000-0000-0000-0000-000000000068', 'a1000000-0000-0000-0000-000000000058'),
  ('b1000000-0000-0000-0000-000000000069', 'a1000000-0000-0000-0000-000000000059'),
  ('b1000000-0000-0000-0000-000000000070', 'a1000000-0000-0000-0000-000000000059'),
  ('b1000000-0000-0000-0000-000000000071', 'a1000000-0000-0000-0000-000000000059'),
  ('b1000000-0000-0000-0000-000000000072', 'a1000000-0000-0000-0000-000000000060'),
  ('b1000000-0000-0000-0000-000000000073', 'a1000000-0000-0000-0000-000000000060'),
  ('b1000000-0000-0000-0000-000000000074', 'a1000000-0000-0000-0000-000000000060'),
  ('b1000000-0000-0000-0000-000000000075', 'a1000000-0000-0000-0000-000000000061'),
  ('b1000000-0000-0000-0000-000000000076', 'a1000000-0000-0000-0000-000000000061'),
  ('b1000000-0000-0000-0000-000000000077', 'a1000000-0000-0000-0000-000000000061'),
  ('b1000000-0000-0000-0000-000000000078', 'a1000000-0000-0000-0000-000000000062'),
  ('b1000000-0000-0000-0000-000000000079', 'a1000000-0000-0000-0000-000000000062'),
  ('b1000000-0000-0000-0000-000000000080', 'a1000000-0000-0000-0000-000000000062'),
  ('b1000000-0000-0000-0000-000000000081', 'a1000000-0000-0000-0000-000000000063'),
  ('b1000000-0000-0000-0000-000000000082', 'a1000000-0000-0000-0000-000000000063'),
  ('b1000000-0000-0000-0000-000000000083', 'a1000000-0000-0000-0000-000000000063'),
  ('b1000000-0000-0000-0000-000000000084', 'a1000000-0000-0000-0000-000000000064'),
  ('b1000000-0000-0000-0000-000000000085', 'a1000000-0000-0000-0000-000000000064'),
  ('b1000000-0000-0000-0000-000000000086', 'a1000000-0000-0000-0000-000000000064'),
  ('b1000000-0000-0000-0000-000000000087', 'a1000000-0000-0000-0000-000000000056'),
  ('b1000000-0000-0000-0000-000000000088', 'a1000000-0000-0000-0000-000000000065'),
  ('b1000000-0000-0000-0000-000000000089', 'a1000000-0000-0000-0000-000000000065'),
  ('b1000000-0000-0000-0000-000000000090', 'a1000000-0000-0000-0000-000000000065'),
  ('b1000000-0000-0000-0000-000000000091', 'a1000000-0000-0000-0000-000000000066'),
  ('b1000000-0000-0000-0000-000000000092', 'a1000000-0000-0000-0000-000000000066'),
  ('b1000000-0000-0000-0000-000000000093', 'a1000000-0000-0000-0000-000000000066'),
  ('b1000000-0000-0000-0000-000000000094', 'a1000000-0000-0000-0000-000000000067'),
  ('b1000000-0000-0000-0000-000000000095', 'a1000000-0000-0000-0000-000000000067'),
  ('b1000000-0000-0000-0000-000000000096', 'a1000000-0000-0000-0000-000000000067'),
  ('b1000000-0000-0000-0000-000000000097', 'a1000000-0000-0000-0000-000000000068'),
  ('b1000000-0000-0000-0000-000000000098', 'a1000000-0000-0000-0000-000000000068'),
  ('b1000000-0000-0000-0000-000000000099', 'a1000000-0000-0000-0000-000000000068'),
  ('b1000000-0000-0000-0000-000000000100', 'a1000000-0000-0000-0000-000000000069'),
  ('b1000000-0000-0000-0000-000000000101', 'a1000000-0000-0000-0000-000000000070'),
  ('b1000000-0000-0000-0000-000000000102', 'a1000000-0000-0000-0000-000000000071'),
  ('b1000000-0000-0000-0000-000000000103', 'a1000000-0000-0000-0000-000000000072'),
  ('b1000000-0000-0000-0000-000000000104', 'a1000000-0000-0000-0000-000000000073'),
  ('b1000000-0000-0000-0000-000000000105', 'a1000000-0000-0000-0000-000000000073'),
  ('b1000000-0000-0000-0000-000000000106', 'a1000000-0000-0000-0000-000000000073'),
  ('b1000000-0000-0000-0000-000000000107', 'a1000000-0000-0000-0000-000000000073'),
  ('b1000000-0000-0000-0000-000000000108', 'a1000000-0000-0000-0000-000000000073'),
  ('b1000000-0000-0000-0000-000000000109', 'a1000000-0000-0000-0000-000000000073'),
  ('b1000000-0000-0000-0000-000000000110', 'a1000000-0000-0000-0000-000000000074'),
  ('b1000000-0000-0000-0000-000000000111', 'a1000000-0000-0000-0000-000000000074'),
  ('b1000000-0000-0000-0000-000000000112', 'a1000000-0000-0000-0000-000000000074'),
  ('b1000000-0000-0000-0000-000000000113', 'a1000000-0000-0000-0000-000000000075'),
  ('b1000000-0000-0000-0000-000000000114', 'a1000000-0000-0000-0000-000000000075'),
  ('b1000000-0000-0000-0000-000000000115', 'a1000000-0000-0000-0000-000000000075'),
  ('b1000000-0000-0000-0000-000000000116', 'a1000000-0000-0000-0000-000000000076'),
  ('b1000000-0000-0000-0000-000000000117', 'a1000000-0000-0000-0000-000000000077'),
  ('b1000000-0000-0000-0000-000000000118', 'a1000000-0000-0000-0000-000000000078'),
  ('b1000000-0000-0000-0000-000000000119', 'a1000000-0000-0000-0000-000000000079'),
  ('b1000000-0000-0000-0000-000000000120', 'a1000000-0000-0000-0000-000000000080'),
  ('b1000000-0000-0000-0000-000000000121', 'a1000000-0000-0000-0000-000000000080'),
  ('b1000000-0000-0000-0000-000000000122', 'a1000000-0000-0000-0000-000000000081'),
  ('b1000000-0000-0000-0000-000000000123', 'a1000000-0000-0000-0000-000000000082'),
  ('b1000000-0000-0000-0000-000000000124', 'a1000000-0000-0000-0000-000000000083'),
  ('b1000000-0000-0000-0000-000000000125', 'a1000000-0000-0000-0000-000000000083'),
  ('b1000000-0000-0000-0000-000000000126', 'a1000000-0000-0000-0000-000000000084'),
  ('b1000000-0000-0000-0000-000000000127', 'a1000000-0000-0000-0000-000000000085'),
  ('b1000000-0000-0000-0000-000000000128', 'a1000000-0000-0000-0000-000000000086'),
  ('b1000000-0000-0000-0000-000000000129', 'a1000000-0000-0000-0000-000000000086'),
  ('b1000000-0000-0000-0000-000000000130', 'a1000000-0000-0000-0000-000000000086'),
  ('b1000000-0000-0000-0000-000000000131', 'a1000000-0000-0000-0000-000000000087'),
  ('b1000000-0000-0000-0000-000000000132', 'a1000000-0000-0000-0000-000000000087'),
  ('b1000000-0000-0000-0000-000000000133', 'a1000000-0000-0000-0000-000000000088'),
  ('b1000000-0000-0000-0000-000000000134', 'a1000000-0000-0000-0000-000000000089'),
  ('b1000000-0000-0000-0000-000000000135', 'a1000000-0000-0000-0000-000000000090'),
  ('b1000000-0000-0000-0000-000000000136', 'a1000000-0000-0000-0000-000000000090'),
  ('b1000000-0000-0000-0000-000000000137', 'a1000000-0000-0000-0000-000000000090'),
  ('b1000000-0000-0000-0000-000000000138', 'a1000000-0000-0000-0000-000000000091'),
  ('b1000000-0000-0000-0000-000000000139', 'a1000000-0000-0000-0000-000000000091'),
  ('b1000000-0000-0000-0000-000000000140', 'a1000000-0000-0000-0000-000000000092'),
  ('b1000000-0000-0000-0000-000000000141', 'a1000000-0000-0000-0000-000000000093'),
  ('b1000000-0000-0000-0000-000000000142', 'a1000000-0000-0000-0000-000000000094'),
  ('b1000000-0000-0000-0000-000000000143', 'a1000000-0000-0000-0000-000000000094'),
  ('b1000000-0000-0000-0000-000000000144', 'a1000000-0000-0000-0000-000000000095'),
  ('b1000000-0000-0000-0000-000000000145', 'a1000000-0000-0000-0000-000000000096'),
  ('b1000000-0000-0000-0000-000000000146', 'a1000000-0000-0000-0000-000000000097'),
  ('b1000000-0000-0000-0000-000000000147', 'a1000000-0000-0000-0000-000000000098'),
  ('b1000000-0000-0000-0000-000000000148', 'a1000000-0000-0000-0000-000000000099'),
  ('b1000000-0000-0000-0000-000000000149', 'a1000000-0000-0000-0000-000000000099'),
  ('b1000000-0000-0000-0000-000000000150', 'a1000000-0000-0000-0000-000000000100'),
  ('b1000000-0000-0000-0000-000000000151', 'a1000000-0000-0000-0000-000000000099'),
  ('b1000000-0000-0000-0000-000000000152', 'a1000000-0000-0000-0000-000000000101'),
  ('b1000000-0000-0000-0000-000000000153', 'a1000000-0000-0000-0000-000000000102'),
  ('b1000000-0000-0000-0000-000000000154', 'a1000000-0000-0000-0000-000000000103'),
  ('b1000000-0000-0000-0000-000000000155', 'a1000000-0000-0000-0000-000000000104'),
  ('b1000000-0000-0000-0000-000000000156', 'a1000000-0000-0000-0000-000000000105'),
  ('b1000000-0000-0000-0000-000000000157', 'a1000000-0000-0000-0000-000000000106'),
  ('b1000000-0000-0000-0000-000000000158', 'a1000000-0000-0000-0000-000000000107'),
  ('b1000000-0000-0000-0000-000000000159', 'a1000000-0000-0000-0000-000000000108'),
  ('b1000000-0000-0000-0000-000000000160', 'a1000000-0000-0000-0000-000000000109'),
  ('b1000000-0000-0000-0000-000000000161', 'a1000000-0000-0000-0000-000000000110'),
  ('b1000000-0000-0000-0000-000000000162', 'a1000000-0000-0000-0000-000000000111'),
  ('b1000000-0000-0000-0000-000000000163', 'a1000000-0000-0000-0000-000000000112'),
  ('b1000000-0000-0000-0000-000000000164', 'a1000000-0000-0000-0000-000000000112'),
  ('b1000000-0000-0000-0000-000000000165', 'a1000000-0000-0000-0000-000000000113'),
  ('b1000000-0000-0000-0000-000000000166', 'a1000000-0000-0000-0000-000000000114'),
  ('b1000000-0000-0000-0000-000000000167', 'a1000000-0000-0000-0000-000000000115'),
  ('b1000000-0000-0000-0000-000000000168', 'a1000000-0000-0000-0000-000000000116'),
  ('b1000000-0000-0000-0000-000000000169', 'a1000000-0000-0000-0000-000000000117'),
  ('b1000000-0000-0000-0000-000000000170', 'a1000000-0000-0000-0000-000000000118'),
  ('b1000000-0000-0000-0000-000000000171', 'a1000000-0000-0000-0000-000000000119'),
  ('b1000000-0000-0000-0000-000000000172', 'a1000000-0000-0000-0000-000000000120'),
  ('b1000000-0000-0000-0000-000000000173', 'a1000000-0000-0000-0000-000000000121'),
  ('b1000000-0000-0000-0000-000000000174', 'a1000000-0000-0000-0000-000000000122'),
  ('b1000000-0000-0000-0000-000000000175', 'a1000000-0000-0000-0000-000000000123'),
  ('b1000000-0000-0000-0000-000000000176', 'a1000000-0000-0000-0000-000000000124'),
  ('b1000000-0000-0000-0000-000000000177', 'a1000000-0000-0000-0000-000000000125'),
  ('b1000000-0000-0000-0000-000000000178', 'a1000000-0000-0000-0000-000000000126'),
  ('b1000000-0000-0000-0000-000000000179', 'a1000000-0000-0000-0000-000000000127'),
  ('b1000000-0000-0000-0000-000000000180', 'a1000000-0000-0000-0000-000000000128'),
  ('b1000000-0000-0000-0000-000000000181', 'a1000000-0000-0000-0000-000000000127'),
  ('b1000000-0000-0000-0000-000000000182', 'a1000000-0000-0000-0000-000000000129'),
  ('b1000000-0000-0000-0000-000000000183', 'a1000000-0000-0000-0000-000000000130'),
  ('b1000000-0000-0000-0000-000000000184', 'a1000000-0000-0000-0000-000000000131'),
  ('b1000000-0000-0000-0000-000000000185', 'a1000000-0000-0000-0000-000000000131'),
  ('b1000000-0000-0000-0000-000000000186', 'a1000000-0000-0000-0000-000000000131'),
  ('b1000000-0000-0000-0000-000000000187', 'a1000000-0000-0000-0000-000000000132'),
  ('b1000000-0000-0000-0000-000000000188', 'a1000000-0000-0000-0000-000000000133'),
  ('b1000000-0000-0000-0000-000000000189', 'a1000000-0000-0000-0000-000000000134'),
  ('b1000000-0000-0000-0000-000000000190', 'a1000000-0000-0000-0000-000000000133'),
  ('b1000000-0000-0000-0000-000000000191', 'a1000000-0000-0000-0000-000000000133'),
  ('b1000000-0000-0000-0000-000000000192', 'a1000000-0000-0000-0000-000000000133'),
  ('b1000000-0000-0000-0000-000000000193', 'a1000000-0000-0000-0000-000000000135'),
  ('b1000000-0000-0000-0000-000000000194', 'a1000000-0000-0000-0000-000000000135'),
  ('b1000000-0000-0000-0000-000000000195', 'a1000000-0000-0000-0000-000000000136'),
  ('b1000000-0000-0000-0000-000000000196', 'a1000000-0000-0000-0000-000000000136'),
  ('b1000000-0000-0000-0000-000000000197', 'a1000000-0000-0000-0000-000000000136'),
  ('b1000000-0000-0000-0000-000000000198', 'a1000000-0000-0000-0000-000000000137'),
  ('b1000000-0000-0000-0000-000000000199', 'a1000000-0000-0000-0000-000000000137'),
  ('b1000000-0000-0000-0000-000000000200', 'a1000000-0000-0000-0000-000000000137'),
  ('b1000000-0000-0000-0000-000000000201', 'a1000000-0000-0000-0000-000000000138'),
  ('b1000000-0000-0000-0000-000000000202', 'a1000000-0000-0000-0000-000000000138'),
  ('b1000000-0000-0000-0000-000000000203', 'a1000000-0000-0000-0000-000000000139'),
  ('b1000000-0000-0000-0000-000000000204', 'a1000000-0000-0000-0000-000000000140'),
  ('b1000000-0000-0000-0000-000000000205', 'a1000000-0000-0000-0000-000000000141'),
  ('b1000000-0000-0000-0000-000000000206', 'a1000000-0000-0000-0000-000000000142'),
  ('b1000000-0000-0000-0000-000000000207', 'a1000000-0000-0000-0000-000000000141'),
  ('b1000000-0000-0000-0000-000000000208', 'a1000000-0000-0000-0000-000000000141'),
  ('b1000000-0000-0000-0000-000000000209', 'a1000000-0000-0000-0000-000000000141'),
  ('b1000000-0000-0000-0000-000000000210', 'a1000000-0000-0000-0000-000000000143'),
  ('b1000000-0000-0000-0000-000000000211', 'a1000000-0000-0000-0000-000000000144'),
  ('b1000000-0000-0000-0000-000000000212', 'a1000000-0000-0000-0000-000000000145'),
  ('b1000000-0000-0000-0000-000000000213', 'a1000000-0000-0000-0000-000000000123'),
  ('b1000000-0000-0000-0000-000000000214', 'a1000000-0000-0000-0000-000000000146'),
  ('b1000000-0000-0000-0000-000000000215', 'a1000000-0000-0000-0000-000000000147'),
  ('b1000000-0000-0000-0000-000000000216', 'a1000000-0000-0000-0000-000000000148'),
  ('b1000000-0000-0000-0000-000000000217', 'a1000000-0000-0000-0000-000000000149'),
  ('b1000000-0000-0000-0000-000000000218', 'a1000000-0000-0000-0000-000000000149'),
  ('b1000000-0000-0000-0000-000000000219', 'a1000000-0000-0000-0000-000000000150'),
  ('b1000000-0000-0000-0000-000000000220', 'a1000000-0000-0000-0000-000000000151'),
  ('b1000000-0000-0000-0000-000000000221', 'a1000000-0000-0000-0000-000000000150'),
  ('b1000000-0000-0000-0000-000000000222', 'a1000000-0000-0000-0000-000000000150'),
  ('b1000000-0000-0000-0000-000000000223', 'a1000000-0000-0000-0000-000000000152'),
  ('b1000000-0000-0000-0000-000000000224', 'a1000000-0000-0000-0000-000000000153'),
  ('b1000000-0000-0000-0000-000000000225', 'a1000000-0000-0000-0000-000000000154'),
  ('b1000000-0000-0000-0000-000000000226', 'a1000000-0000-0000-0000-000000000155'),
  ('b1000000-0000-0000-0000-000000000227', 'a1000000-0000-0000-0000-000000000156'),
  ('b1000000-0000-0000-0000-000000000228', 'a1000000-0000-0000-0000-000000000156'),
  ('b1000000-0000-0000-0000-000000000229', 'a1000000-0000-0000-0000-000000000156'),
  ('b1000000-0000-0000-0000-000000000230', 'a1000000-0000-0000-0000-000000000157'),
  ('b1000000-0000-0000-0000-000000000231', 'a1000000-0000-0000-0000-000000000158'),
  ('b1000000-0000-0000-0000-000000000232', 'a1000000-0000-0000-0000-000000000158'),
  ('b1000000-0000-0000-0000-000000000233', 'a1000000-0000-0000-0000-000000000158'),
  ('b1000000-0000-0000-0000-000000000234', 'a1000000-0000-0000-0000-000000000158'),
  ('b1000000-0000-0000-0000-000000000235', 'a1000000-0000-0000-0000-000000000159'),
  ('b1000000-0000-0000-0000-000000000236', 'a1000000-0000-0000-0000-000000000158'),
  ('b1000000-0000-0000-0000-000000000237', 'a1000000-0000-0000-0000-000000000158'),
  ('b1000000-0000-0000-0000-000000000238', 'a1000000-0000-0000-0000-000000000160'),
  ('b1000000-0000-0000-0000-000000000239', 'a1000000-0000-0000-0000-000000000160'),
  ('b1000000-0000-0000-0000-000000000240', 'a1000000-0000-0000-0000-000000000161'),
  ('b1000000-0000-0000-0000-000000000241', 'a1000000-0000-0000-0000-000000000161'),
  ('b1000000-0000-0000-0000-000000000242', 'a1000000-0000-0000-0000-000000000161'),
  ('b1000000-0000-0000-0000-000000000243', 'a1000000-0000-0000-0000-000000000162'),
  ('b1000000-0000-0000-0000-000000000244', 'a1000000-0000-0000-0000-000000000163'),
  ('b1000000-0000-0000-0000-000000000245', 'a1000000-0000-0000-0000-000000000164'),
  ('b1000000-0000-0000-0000-000000000246', 'a1000000-0000-0000-0000-000000000165'),
  ('b1000000-0000-0000-0000-000000000247', 'a1000000-0000-0000-0000-000000000097'),
  ('b1000000-0000-0000-0000-000000000248', 'a1000000-0000-0000-0000-000000000166'),
  ('b1000000-0000-0000-0000-000000000249', 'a1000000-0000-0000-0000-000000000167'),
  ('b1000000-0000-0000-0000-000000000250', 'a1000000-0000-0000-0000-000000000168'),
  ('b1000000-0000-0000-0000-000000000251', 'a1000000-0000-0000-0000-000000000169'),
  ('b1000000-0000-0000-0000-000000000252', 'a1000000-0000-0000-0000-000000000170'),
  ('b1000000-0000-0000-0000-000000000253', 'a1000000-0000-0000-0000-000000000155'),
  ('b1000000-0000-0000-0000-000000000254', 'a1000000-0000-0000-0000-000000000171'),
  ('b1000000-0000-0000-0000-000000000255', 'a1000000-0000-0000-0000-000000000172'),
  ('b1000000-0000-0000-0000-000000000256', 'a1000000-0000-0000-0000-000000000169'),
  ('b1000000-0000-0000-0000-000000000257', 'a1000000-0000-0000-0000-000000000173'),
  ('b1000000-0000-0000-0000-000000000258', 'a1000000-0000-0000-0000-000000000072'),
  ('b1000000-0000-0000-0000-000000000259', 'a1000000-0000-0000-0000-000000000174'),
  ('b1000000-0000-0000-0000-000000000260', 'a1000000-0000-0000-0000-000000000175'),
  ('b1000000-0000-0000-0000-000000000261', 'a1000000-0000-0000-0000-000000000148'),
  ('b1000000-0000-0000-0000-000000000262', 'a1000000-0000-0000-0000-000000000176'),
  ('b1000000-0000-0000-0000-000000000263', 'a1000000-0000-0000-0000-000000000177'),
  ('b1000000-0000-0000-0000-000000000264', 'a1000000-0000-0000-0000-000000000178'),
  ('b1000000-0000-0000-0000-000000000265', 'a1000000-0000-0000-0000-000000000179'),
  ('b1000000-0000-0000-0000-000000000266', 'a1000000-0000-0000-0000-000000000180'),
  ('b1000000-0000-0000-0000-000000000267', 'a1000000-0000-0000-0000-000000000181'),
  ('b1000000-0000-0000-0000-000000000268', 'a1000000-0000-0000-0000-000000000182'),
  ('b1000000-0000-0000-0000-000000000269', 'a1000000-0000-0000-0000-000000000183'),
  ('b1000000-0000-0000-0000-000000000270', 'a1000000-0000-0000-0000-000000000179'),
  ('b1000000-0000-0000-0000-000000000271', 'a1000000-0000-0000-0000-000000000076'),
  ('b1000000-0000-0000-0000-000000000272', 'a1000000-0000-0000-0000-000000000076'),
  ('b1000000-0000-0000-0000-000000000273', 'a1000000-0000-0000-0000-000000000184'),
  ('b1000000-0000-0000-0000-000000000274', 'a1000000-0000-0000-0000-000000000185'),
  ('b1000000-0000-0000-0000-000000000275', 'a1000000-0000-0000-0000-000000000076'),
  ('b1000000-0000-0000-0000-000000000276', 'a1000000-0000-0000-0000-000000000186'),
  ('b1000000-0000-0000-0000-000000000277', 'a1000000-0000-0000-0000-000000000187'),
  ('b1000000-0000-0000-0000-000000000278', 'a1000000-0000-0000-0000-000000000188'),
  ('b1000000-0000-0000-0000-000000000279', 'a1000000-0000-0000-0000-000000000189'),
  ('b1000000-0000-0000-0000-000000000280', 'a1000000-0000-0000-0000-000000000190'),
  ('b1000000-0000-0000-0000-000000000281', 'a1000000-0000-0000-0000-000000000191'),
  ('b1000000-0000-0000-0000-000000000282', 'a1000000-0000-0000-0000-000000000192'),
  ('b1000000-0000-0000-0000-000000000283', 'a1000000-0000-0000-0000-000000000193'),
  ('b1000000-0000-0000-0000-000000000284', 'a1000000-0000-0000-0000-000000000194'),
  ('b1000000-0000-0000-0000-000000000285', 'a1000000-0000-0000-0000-000000000164'),
  ('b1000000-0000-0000-0000-000000000286', 'a1000000-0000-0000-0000-000000000195'),
  ('b1000000-0000-0000-0000-000000000287', 'a1000000-0000-0000-0000-000000000196'),
  ('b1000000-0000-0000-0000-000000000288', 'a1000000-0000-0000-0000-000000000164'),
  ('b1000000-0000-0000-0000-000000000289', 'a1000000-0000-0000-0000-000000000148'),
  ('b1000000-0000-0000-0000-000000000290', 'a1000000-0000-0000-0000-000000000197'),
  ('b1000000-0000-0000-0000-000000000291', 'a1000000-0000-0000-0000-000000000198'),
  ('b1000000-0000-0000-0000-000000000292', 'a1000000-0000-0000-0000-000000000178'),
  ('b1000000-0000-0000-0000-000000000293', 'a1000000-0000-0000-0000-000000000164'),
  ('b1000000-0000-0000-0000-000000000294', 'a1000000-0000-0000-0000-000000000148'),
  ('b1000000-0000-0000-0000-000000000295', 'a1000000-0000-0000-0000-000000000199'),
  ('b1000000-0000-0000-0000-000000000296', 'a1000000-0000-0000-0000-000000000200'),
  ('b1000000-0000-0000-0000-000000000297', 'a1000000-0000-0000-0000-000000000201'),
  ('b1000000-0000-0000-0000-000000000298', 'a1000000-0000-0000-0000-000000000202'),
  ('b1000000-0000-0000-0000-000000000299', 'a1000000-0000-0000-0000-000000000203'),
  ('b1000000-0000-0000-0000-000000000300', 'a1000000-0000-0000-0000-000000000203'),
  ('b1000000-0000-0000-0000-000000000301', 'a1000000-0000-0000-0000-000000000203'),
  ('b1000000-0000-0000-0000-000000000302', 'a1000000-0000-0000-0000-000000000097'),
  ('b1000000-0000-0000-0000-000000000303', 'a1000000-0000-0000-0000-000000000171'),
  ('b1000000-0000-0000-0000-000000000304', 'a1000000-0000-0000-0000-000000000171'),
  ('b1000000-0000-0000-0000-000000000305', 'a1000000-0000-0000-0000-000000000183'),
  ('b1000000-0000-0000-0000-000000000306', 'a1000000-0000-0000-0000-000000000170'),
  ('b1000000-0000-0000-0000-000000000307', 'a1000000-0000-0000-0000-000000000204'),
  ('b1000000-0000-0000-0000-000000000308', 'a1000000-0000-0000-0000-000000000073'),
  ('b1000000-0000-0000-0000-000000000309', 'a1000000-0000-0000-0000-000000000178'),
  ('b1000000-0000-0000-0000-000000000310', 'a1000000-0000-0000-0000-000000000205'),
  ('b1000000-0000-0000-0000-000000000311', 'a1000000-0000-0000-0000-000000000206'),
  ('b1000000-0000-0000-0000-000000000312', 'a1000000-0000-0000-0000-000000000207'),
  ('b1000000-0000-0000-0000-000000000313', 'a1000000-0000-0000-0000-000000000208'),
  ('b1000000-0000-0000-0000-000000000314', 'a1000000-0000-0000-0000-000000000209'),
  ('b1000000-0000-0000-0000-000000000315', 'a1000000-0000-0000-0000-000000000210'),
  ('b1000000-0000-0000-0000-000000000316', 'a1000000-0000-0000-0000-000000000211'),
  ('b1000000-0000-0000-0000-000000000317', 'a1000000-0000-0000-0000-000000000212'),
  ('b1000000-0000-0000-0000-000000000318', 'a1000000-0000-0000-0000-000000000213'),
  ('b1000000-0000-0000-0000-000000000319', 'a1000000-0000-0000-0000-000000000214'),
  ('b1000000-0000-0000-0000-000000000320', 'a1000000-0000-0000-0000-000000000215'),
  ('b1000000-0000-0000-0000-000000000321', 'a1000000-0000-0000-0000-000000000216'),
  ('b1000000-0000-0000-0000-000000000322', 'a1000000-0000-0000-0000-000000000217'),
  ('b1000000-0000-0000-0000-000000000323', 'a1000000-0000-0000-0000-000000000218'),
  ('b1000000-0000-0000-0000-000000000324', 'a1000000-0000-0000-0000-000000000219'),
  ('b1000000-0000-0000-0000-000000000325', 'a1000000-0000-0000-0000-000000000220'),
  ('b1000000-0000-0000-0000-000000000326', 'a1000000-0000-0000-0000-000000000216'),
  ('b1000000-0000-0000-0000-000000000327', 'a1000000-0000-0000-0000-000000000221'),
  ('b1000000-0000-0000-0000-000000000328', 'a1000000-0000-0000-0000-000000000222'),
  ('b1000000-0000-0000-0000-000000000329', 'a1000000-0000-0000-0000-000000000223'),
  ('b1000000-0000-0000-0000-000000000330', 'a1000000-0000-0000-0000-000000000224'),
  ('b1000000-0000-0000-0000-000000000331', 'a1000000-0000-0000-0000-000000000225'),
  ('b1000000-0000-0000-0000-000000000332', 'a1000000-0000-0000-0000-000000000226'),
  ('b1000000-0000-0000-0000-000000000333', 'a1000000-0000-0000-0000-000000000227'),
  ('b1000000-0000-0000-0000-000000000334', 'a1000000-0000-0000-0000-000000000228'),
  ('b1000000-0000-0000-0000-000000000335', 'a1000000-0000-0000-0000-000000000229'),
  ('b1000000-0000-0000-0000-000000000336', 'a1000000-0000-0000-0000-000000000230'),
  ('b1000000-0000-0000-0000-000000000337', 'a1000000-0000-0000-0000-000000000231'),
  ('b1000000-0000-0000-0000-000000000338', 'a1000000-0000-0000-0000-000000000232'),
  ('b1000000-0000-0000-0000-000000000339', 'a1000000-0000-0000-0000-000000000232'),
  ('b1000000-0000-0000-0000-000000000340', 'a1000000-0000-0000-0000-000000000233'),
  ('b1000000-0000-0000-0000-000000000341', 'a1000000-0000-0000-0000-000000000234'),
  ('b1000000-0000-0000-0000-000000000342', 'a1000000-0000-0000-0000-000000000171'),
  ('b1000000-0000-0000-0000-000000000343', 'a1000000-0000-0000-0000-000000000235'),
  ('b1000000-0000-0000-0000-000000000344', 'a1000000-0000-0000-0000-000000000236'),
  ('b1000000-0000-0000-0000-000000000345', 'a1000000-0000-0000-0000-000000000237'),
  ('b1000000-0000-0000-0000-000000000346', 'a1000000-0000-0000-0000-000000000238'),
  ('b1000000-0000-0000-0000-000000000347', 'a1000000-0000-0000-0000-000000000169'),
  ('b1000000-0000-0000-0000-000000000348', 'a1000000-0000-0000-0000-000000000239'),
  ('b1000000-0000-0000-0000-000000000349', 'a1000000-0000-0000-0000-000000000189'),
  ('b1000000-0000-0000-0000-000000000350', 'a1000000-0000-0000-0000-000000000240'),
  ('b1000000-0000-0000-0000-000000000351', 'a1000000-0000-0000-0000-000000000241'),
  ('b1000000-0000-0000-0000-000000000352', 'a1000000-0000-0000-0000-000000000242'),
  ('b1000000-0000-0000-0000-000000000353', 'a1000000-0000-0000-0000-000000000243'),
  ('b1000000-0000-0000-0000-000000000354', 'a1000000-0000-0000-0000-000000000244'),
  ('b1000000-0000-0000-0000-000000000355', 'a1000000-0000-0000-0000-000000000245'),
  ('b1000000-0000-0000-0000-000000000356', 'a1000000-0000-0000-0000-000000000175'),
  ('b1000000-0000-0000-0000-000000000357', 'a1000000-0000-0000-0000-000000000246'),
  ('b1000000-0000-0000-0000-000000000358', 'a1000000-0000-0000-0000-000000000057'),
  ('b1000000-0000-0000-0000-000000000359', 'a1000000-0000-0000-0000-000000000053'),
  ('b1000000-0000-0000-0000-000000000360', 'a1000000-0000-0000-0000-000000000247'),
  ('b1000000-0000-0000-0000-000000000361', 'a1000000-0000-0000-0000-000000000248'),
  ('b1000000-0000-0000-0000-000000000362', 'a1000000-0000-0000-0000-000000000249'),
  ('b1000000-0000-0000-0000-000000000363', 'a1000000-0000-0000-0000-000000000250'),
  ('b1000000-0000-0000-0000-000000000364', 'a1000000-0000-0000-0000-000000000247'),
  ('b1000000-0000-0000-0000-000000000365', 'a1000000-0000-0000-0000-000000000210'),
  ('b1000000-0000-0000-0000-000000000366', 'a1000000-0000-0000-0000-000000000210'),
  ('b1000000-0000-0000-0000-000000000367', 'a1000000-0000-0000-0000-000000000251'),
  ('b1000000-0000-0000-0000-000000000368', 'a1000000-0000-0000-0000-000000000252'),
  ('b1000000-0000-0000-0000-000000000369', 'a1000000-0000-0000-0000-000000000253'),
  ('b1000000-0000-0000-0000-000000000370', 'a1000000-0000-0000-0000-000000000254'),
  ('b1000000-0000-0000-0000-000000000371', 'a1000000-0000-0000-0000-000000000255'),
  ('b1000000-0000-0000-0000-000000000372', 'a1000000-0000-0000-0000-000000000197'),
  ('b1000000-0000-0000-0000-000000000373', 'a1000000-0000-0000-0000-000000000256')
on conflict do nothing;

-- Book-Genre links
insert into book_genres (book_id, genre_id)
select distinct b.id, g.id from books b, genres g
where (
  (b.id = 'b1000000-0000-0000-0000-000000000050' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000051' and g.slug in ('fiction', 'fantasy', 'thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000052' and g.slug in ('fiction', 'fantasy', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000053' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'fantasy', 'mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000054' and g.slug in ('fiction', 'fantasy', 'mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000055' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000056' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000057' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000058' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000059' and g.slug in ('fiction', 'science-fiction', 'non-fiction', 'philosophy', 'psychology', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000060' and g.slug in ('fiction', 'science-fiction', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000061' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000062' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000063' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000064' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000065' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000066' and g.slug in ('fiction', 'fantasy', 'non-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000067' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000068' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000069' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000070' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000071' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000072' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000073' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000074' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000075' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000076' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000077' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000078' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000079' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000080' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000081' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000082' and g.slug in ('fiction', 'fantasy', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000083' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000084' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'horror', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000085' and g.slug in ('fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000086' and g.slug in ('fiction', 'fantasy', 'mystery', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000087' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'classics', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000088' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000089' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000090' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000091' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000092' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'classics', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000093' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000094' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000095' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000096' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000097' and g.slug in ('fiction', 'fantasy', 'historical-fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000098' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'historical-fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000099' and g.slug in ('fiction', 'fantasy', 'historical-fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000100' and g.slug in ('fiction', 'mystery', 'thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000101' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000102' and g.slug in ('fiction', 'mystery', 'thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000103' and g.slug in ('fiction', 'historical-fiction', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000104' and g.slug in ('fiction', 'thriller', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000105' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'mystery', 'thriller', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000106' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'mystery', 'thriller', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000107' and g.slug in ('fiction', 'literary-fiction', 'thriller', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000108' and g.slug in ('fiction', 'science-fiction', 'thriller', 'classics', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000109' and g.slug in ('fiction', 'fantasy', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000110' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'fantasy', 'thriller', 'historical-fiction', 'classics', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000111' and g.slug in ('fiction', 'science-fiction', 'thriller', 'classics', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000112' and g.slug in ('fiction', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000113' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'historical-fiction', 'psychology', 'classics', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000114' and g.slug in ('fiction', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000115' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000116' and g.slug in ('fiction', 'literary-fiction', 'classics', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000117' and g.slug in ('fiction', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000118' and g.slug in ('fiction', 'historical-fiction', 'classics', 'horror', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000119' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction', 'psychology', 'classics', 'horror', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000120' and g.slug in ('fiction', 'literary-fiction', 'fantasy', 'historical-fiction', 'classics', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000121' and g.slug in ('fiction', 'literary-fiction', 'classics', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000122' and g.slug in ('fiction', 'literary-fiction', 'classics', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000123' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000124' and g.slug in ('fiction', 'historical-fiction', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000125' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000126' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'fantasy', 'historical-fiction', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000127' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000128' and g.slug in ('fiction', 'science-fiction', 'psychology', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000129' and g.slug in ('fiction', 'science-fiction', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000130' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'fantasy', 'non-fiction', 'essays', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000131' and g.slug in ('fiction', 'science-fiction', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000132' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000133' and g.slug in ('fiction', 'thriller', 'psychology', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000134' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000135' and g.slug in ('fiction', 'literary-fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000136' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000137' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000138' and g.slug in ('fiction', 'literary-fiction', 'fantasy', 'historical-fiction', 'psychology', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000139' and g.slug in ('fiction', 'literary-fiction', 'psychology', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000140' and g.slug in ('fiction', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000141' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000142' and g.slug in ('fiction', 'literary-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000143' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000144' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000145' and g.slug in ('fiction', 'literary-fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000146' and g.slug in ('fiction', 'historical-fiction', 'non-fiction', 'biography', 'philosophy', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000147' and g.slug in ('fiction', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000148' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000149' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000150' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000151' and g.slug in ('fiction', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000152' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000153' and g.slug in ('fiction', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000154' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000155' and g.slug in ('fiction', 'literary-fiction', 'mystery', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000156' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000157' and g.slug in ('fiction', 'non-fiction', 'biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000158' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000159' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000160' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000161' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000162' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000163' and g.slug in ('fiction', 'historical-fiction', 'non-fiction', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000164' and g.slug in ('fiction', 'non-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000165' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000166' and g.slug in ('psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000167' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000168' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000169' and g.slug in ('philosophy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000170' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000171' and g.slug in ('science-fiction', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000172' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000173' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000174' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000175' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000176' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000177' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'fantasy', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000178' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000179' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000180' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000181' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000182' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000183' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000184' and g.slug in ('fiction', 'fantasy', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000185' and g.slug in ('fiction', 'fantasy', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000186' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000187' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000188' and g.slug in ('fiction', 'fantasy', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000189' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000190' and g.slug in ('fiction', 'fantasy', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000191' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000192' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000193' and g.slug in ('fiction', 'science-fiction', 'fantasy', 'mystery', 'thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000194' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000195' and g.slug in ('fiction', 'fantasy', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000196' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000197' and g.slug in ('fiction', 'fantasy', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000198' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000199' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000200' and g.slug in ('fiction', 'science-fiction', 'biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000201' and g.slug in ('fiction', 'fantasy', 'mystery', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000202' and g.slug in ('fiction', 'fantasy', 'psychology'))
  or (b.id = 'b1000000-0000-0000-0000-000000000203' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000204' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000205' and g.slug in ('fiction', 'literary-fiction', 'fantasy', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000206' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000207' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000208' and g.slug in ('fiction', 'science-fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000209' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000210' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000211' and g.slug in ('fiction', 'fantasy', 'historical-fiction', 'psychology', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000212' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'fantasy', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000213' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000214' and g.slug in ('fiction', 'fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000215' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000216' and g.slug in ('fiction', 'literary-fiction', 'mystery', 'thriller', 'historical-fiction', 'classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000217' and g.slug in ('fiction', 'fantasy', 'mystery', 'thriller', 'historical-fiction', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000218' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000219' and g.slug in ('fiction', 'biography', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000220' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000221' and g.slug in ('fiction', 'literary-fiction', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000222' and g.slug in ('fiction', 'historical-fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000223' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000224' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000225' and g.slug in ('fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000226' and g.slug in ('fiction', 'literary-fiction', 'science-fiction', 'fantasy', 'mystery', 'thriller', 'classics', 'horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000227' and g.slug in ('fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000228' and g.slug in ('fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000229' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000230' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000231' and g.slug in ('fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000232' and g.slug in ('fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000233' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000234' and g.slug in ('fiction', 'thriller', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000235' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000236' and g.slug in ('fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000237' and g.slug in ('fiction', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000238' and g.slug in ('fiction', 'thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000239' and g.slug in ('fiction', 'mystery', 'thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000240' and g.slug in ('fiction', 'mystery', 'thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000241' and g.slug in ('fiction', 'mystery', 'thriller', 'romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000242' and g.slug in ('fiction', 'mystery', 'thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000243' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000244' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000245' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000246' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000247' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000248' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000249' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000250' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000251' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000252' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000253' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000254' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000255' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000256' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000257' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000258' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000259' and g.slug in ('fantasy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000260' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000261' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000262' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000263' and g.slug in ('fiction', 'science-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000264' and g.slug in ('thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000265' and g.slug in ('thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000266' and g.slug in ('thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000267' and g.slug in ('thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000268' and g.slug in ('thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000269' and g.slug in ('thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000270' and g.slug in ('thriller'))
  or (b.id = 'b1000000-0000-0000-0000-000000000271' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000272' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000273' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000274' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000275' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000276' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000277' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000278' and g.slug in ('romance'))
  or (b.id = 'b1000000-0000-0000-0000-000000000279' and g.slug in ('horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000280' and g.slug in ('horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000281' and g.slug in ('horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000282' and g.slug in ('horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000283' and g.slug in ('horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000284' and g.slug in ('horror'))
  or (b.id = 'b1000000-0000-0000-0000-000000000285' and g.slug in ('classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000286' and g.slug in ('classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000287' and g.slug in ('classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000288' and g.slug in ('classics'))
  or (b.id = 'b1000000-0000-0000-0000-000000000289' and g.slug in ('mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000290' and g.slug in ('mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000291' and g.slug in ('mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000292' and g.slug in ('mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000293' and g.slug in ('mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000294' and g.slug in ('mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000295' and g.slug in ('mystery'))
  or (b.id = 'b1000000-0000-0000-0000-000000000296' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000297' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000298' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000299' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000300' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000301' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000302' and g.slug in ('fiction', 'historical-fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000303' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000304' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000305' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000306' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000307' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000308' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000309' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000310' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000311' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000312' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000313' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000314' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000315' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000316' and g.slug in ('biography'))
  or (b.id = 'b1000000-0000-0000-0000-000000000317' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000318' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000319' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000320' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000321' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000322' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000323' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000324' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000325' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000326' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000327' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000328' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000329' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000330' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000331' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000332' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000333' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000334' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000335' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000336' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000337' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000338' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000339' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000340' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000341' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000342' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000343' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000344' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000345' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000346' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000347' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000348' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000349' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000350' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000351' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000352' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000353' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000354' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000355' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000356' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000357' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000358' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000359' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000360' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000361' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000362' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000363' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000364' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000365' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000366' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000367' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000368' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000369' and g.slug in ('fiction'))
  or (b.id = 'b1000000-0000-0000-0000-000000000370' and g.slug in ('philosophy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000371' and g.slug in ('philosophy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000372' and g.slug in ('philosophy'))
  or (b.id = 'b1000000-0000-0000-0000-000000000373' and g.slug in ('philosophy'))
)
and not exists (
  select 1
  from book_genres existing
  where existing.book_id = b.id
    and existing.genre_id = g.id
)
on conflict (book_id, genre_id) do nothing;
