-- ============================================================
-- Bookcase - Complete Database Setup
-- Paste this entire file into the Supabase SQL Editor and run it.
-- Order: Extensions -> Schema -> RLS Policies -> Seed Data
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

-- Books a club has read or is reading
create table if not exists club_books (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  book_id    uuid not null references books(id) on delete cascade,
  status     text not null default 'past' check (status in ('current', 'past')),
  position   int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  added_at   timestamptz not null default now(),
  unique (club_id, book_id)
);

create index if not exists club_books_club_idx on club_books (club_id, status, position);

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
  add column if not exists post_type text not null default 'discussion';

alter table book_posts
  add column if not exists contains_spoiler boolean not null default false;

alter table book_posts
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
  add column if not exists parent_id uuid references book_post_comments(id) on delete cascade;

alter table book_post_comments
  add column if not exists contains_spoiler boolean not null default false;

alter table book_post_comments
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

alter table book_post_upvotes
  add column if not exists vote_value int not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'book_post_upvotes_vote_value_check'
  ) then
    alter table book_post_upvotes
      add constraint book_post_upvotes_vote_value_check
      check (vote_value in (1, -1));
  end if;
end $$;

create index if not exists book_post_upvotes_post_idx on book_post_upvotes (post_id);

create or replace function update_book_post_upvote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post_id uuid;
begin
  target_post_id := coalesce(new.post_id, old.post_id);

  update book_posts
  set upvotes = coalesce(
    (
      select sum(vote_value)::int
      from book_post_upvotes
      where post_id = target_post_id
    ),
    0
  )
  where id = target_post_id;

  return null;
end;
$$;

drop trigger if exists book_post_upvotes_count on book_post_upvotes;
create trigger book_post_upvotes_count
  after insert or update or delete on book_post_upvotes
  for each row execute function update_book_post_upvote_count();

update book_posts
set upvotes = coalesce(
  (
    select sum(vote_value)::int
    from book_post_upvotes
    where book_post_upvotes.post_id = book_posts.id
  ),
  0
);

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
alter table club_books         enable row level security;
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

-- club_books
drop policy if exists "Club books viewable by everyone" on club_books;
drop policy if exists "Club owners can manage books" on club_books;
drop policy if exists "Club owners can update books" on club_books;
drop policy if exists "Club owners can delete books" on club_books;
create policy "Club books viewable by everyone" on club_books for select using (true);
create policy "Club owners can manage books"     on club_books for insert
  with check (exists (select 1 from clubs where clubs.id = club_books.club_id and clubs.owner_id = auth.uid()));
create policy "Club owners can update books"     on club_books for update
  using (exists (select 1 from clubs where clubs.id = club_books.club_id and clubs.owner_id = auth.uid()));
create policy "Club owners can delete books"     on club_books for delete
  using (exists (select 1 from clubs where clubs.id = club_books.club_id and clubs.owner_id = auth.uid()));

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
-- COMMUNITY TOURNAMENTS
-- ============================================================

create table if not exists community_tournament_choices (
  id             uuid primary key default gen_random_uuid(),
  tournament_key text not null,
  book_key       text not null,
  title          text not null,
  author         text not null,
  cover_url      text,
  position       int not null default 1,
  created_at     timestamptz not null default now(),
  unique (tournament_key, book_key)
);

create table if not exists community_tournament_votes (
  tournament_key text not null,
  user_id        uuid not null references profiles(id) on delete cascade,
  choice_id      uuid not null references community_tournament_choices(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (tournament_key, user_id)
);

create index if not exists community_tournament_choices_key_idx on community_tournament_choices (tournament_key, position);
create index if not exists community_tournament_votes_choice_idx on community_tournament_votes (choice_id);

create or replace trigger community_tournament_votes_updated_at
  before update on community_tournament_votes
  for each row execute function update_updated_at();

insert into community_tournament_choices (tournament_key, book_key, title, author, cover_url, position)
values
  ('2026-05-community-read', 'project-hail-mary', 'Project Hail Mary', 'Andy Weir', 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg', 1),
  ('2026-05-community-read', 'sunrise-on-the-reaping', 'Sunrise on the Reaping', 'Suzanne Collins', 'https://covers.openlibrary.org/b/isbn/9781546171461-L.jpg', 2)
on conflict (tournament_key, book_key) do update
set
  title = excluded.title,
  author = excluded.author,
  cover_url = excluded.cover_url,
  position = excluded.position;

alter table community_tournament_choices enable row level security;
alter table community_tournament_votes   enable row level security;

drop policy if exists "Community tournament choices viewable by everyone" on community_tournament_choices;
drop policy if exists "Community tournament votes viewable by everyone" on community_tournament_votes;
drop policy if exists "Users can vote in community tournaments" on community_tournament_votes;
drop policy if exists "Users can update own community tournament vote" on community_tournament_votes;
drop policy if exists "Users can remove own community tournament vote" on community_tournament_votes;

create policy "Community tournament choices viewable by everyone" on community_tournament_choices for select using (true);
create policy "Community tournament votes viewable by everyone"   on community_tournament_votes for select using (true);
create policy "Users can vote in community tournaments"           on community_tournament_votes for insert with check (auth.uid() = user_id);
create policy "Users can update own community tournament vote"    on community_tournament_votes for update using (auth.uid() = user_id);
create policy "Users can remove own community tournament vote"    on community_tournament_votes for delete using (auth.uid() = user_id);

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
-- NOTE: The large Open Library bulk seed dump was intentionally removed.
-- Bookcase now imports missing books through the app's Open Library search/import flow,
-- which keeps this canonical SQL file small enough to paste and rerun safely in Supabase.

notify pgrst, 'reload schema';

select 'bookcase schema ready' as status;
