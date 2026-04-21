import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoodreadsImportEntry } from './goodreads'

type Client = SupabaseClient
type JsonMap = Record<string, unknown>

export type DbBook = {
  id: string
  title: string
  subtitle: string | null
  cover_url: string | null
  description: string | null
  published_year: number | null
  page_count: number | null
  isbn: string | null
}

export type DbBookWithAuthors = DbBook & {
  authors: { id: string; name: string }[]
  genres: { id: string; name: string }[]
}

export type DbBookStats = {
  book_id: string
  avg_rating: number | null
  rating_count: number
  read_count: number
  review_count: number
}

export type DbBookCard = DbBookWithAuthors & {
  stats: DbBookStats
}

export type DbProfile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  created_at: string
}

export type DbProfileStats = {
  user_id: string
  follower_count: number
  following_count: number
  books_read: number
}

export type DbUserBook = {
  id: string
  user_id: string
  book_id: string
  status: 'to_read' | 'reading' | 'read' | 'dnf'
  rating: number | null
  started_at: string | null
  finished_at: string | null
  is_reread: boolean
}

export type DbReview = {
  id: string
  user_id: string
  book_id: string
  rating: number
  body: string | null
  contains_spoiler: boolean
  liked_count: number
  created_at: string
  profile?: DbProfile | null
  book?: DbBookWithAuthors | null
}

export type DbBookPost = {
  id: string
  book_id: string
  user_id: string
  title: string
  body: string | null
  post_type: 'discussion' | 'question' | 'recommendation' | 'spoiler'
  contains_spoiler: boolean
  upvotes: number
  comment_count?: number
  created_at: string
  profile?: DbProfile | null
  book?: DbBookWithAuthors | null
}

export type DbBookPostComment = {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  body: string
  contains_spoiler: boolean
  upvotes: number
  created_at: string
  profile?: DbProfile | null
}

export type DbReadingSession = {
  id: string
  user_id: string
  book_id: string | null
  pages_read: number | null
  minutes_read: number | null
  session_date: string
  notes: string | null
  created_at: string
}

export type DbNotification = {
  id: string
  user_id: string
  actor_id: string | null
  type: string
  entity_type: string | null
  entity_id: string | null
  message: string
  is_read: boolean
  created_at: string
  actor?: DbProfile | null
}

export type DbClub = {
  id: string
  owner_id: string
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  current_book_id: string | null
  current_book?: DbBookWithAuthors | null
  member_count?: number
  is_member?: boolean
}

export type DbClubPost = {
  id: string
  club_id: string
  user_id: string
  book_id: string | null
  title: string
  body: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  profile?: DbProfile | null
  book?: DbBookWithAuthors | null
}

export type DbRoadmapFeature = {
  id: string
  title: string
  description: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'considering'
  category: string
  vote_count: number
  created_by: string
  created_at: string
  has_voted?: boolean
}

export type DbActivityEvent = {
  id: string
  user_id: string
  event_type: string
  book_id: string | null
  list_id: string | null
  review_id: string | null
  user_book_id: string | null
  metadata: JsonMap | null
  created_at: string
  profile?: DbProfile | null
  book?: DbBookWithAuthors | null
}

export type DbFavoriteBook = {
  id: string
  user_id: string
  book_id: string
  position: number
  added_at: string
  book?: DbBookWithAuthors | null
}

export type DbReadingGoal = {
  user_id: string
  year: number
  book_goal: number
  page_goal: number
  minute_goal: number
  books_completed: number
  pages_completed: number
  minutes_completed: number
  completed_at: string | null
  updated_at: string
}

export type DbBadge = {
  id: string
  user_id: string
  badge_key: string
  title: string
  description: string | null
  icon: string
  metadata: JsonMap
  unlocked_at: string
}

export type DbTag = {
  id: string
  name: string
  slug: string
  category: 'theme' | 'mood' | 'setting' | 'style' | 'topic'
  created_at: string
}

type ImportedListRecord = {
  id: string
  title: string
}

export type CatalogBookImportInput = {
  title: string
  subtitle?: string | null
  authors: string[]
  isbns?: string[]
  coverUrl?: string | null
  description?: string | null
  publishedYear?: number | null
  pageCount?: number | null
  languageCode?: string | null
}

const BOOK_SELECT = `
  id, title, subtitle, cover_url, description, published_year, page_count, isbn,
  book_authors ( authors ( id, name ) ),
  book_genres ( genres ( id, name ) )
`

function mapBookWithAuthors(row: any): DbBookWithAuthors {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? null,
    cover_url: row.cover_url ?? null,
    description: row.description ?? null,
    published_year: row.published_year ?? null,
    page_count: row.page_count ?? null,
    isbn: row.isbn ?? null,
    authors: (row.book_authors ?? []).map((item: any) => item.authors).filter(Boolean),
    genres: (row.book_genres ?? []).map((item: any) => item.genres).filter(Boolean),
  }
}

function mapClub(row: any): DbClub {
  return {
    ...(row as DbClub),
    current_book: row.current_book ? mapBookWithAuthors(row.current_book) : null,
    member_count: row.member_count ?? 0,
    is_member: row.is_member ?? false,
  }
}

function mapClubPost(row: any): DbClubPost {
  return {
    ...(row as DbClubPost),
    book: row.book ? mapBookWithAuthors(row.book) : null,
  }
}

function mapFavorite(row: any): DbFavoriteBook {
  return {
    ...(row as DbFavoriteBook),
    book: row.book ? mapBookWithAuthors(row.book) : null,
  }
}

function toJsonMap(value: unknown): JsonMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as JsonMap
}

function currentYear() {
  return new Date().getFullYear()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function yearBounds(year: number) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleize(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeLookupValue(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeLikePattern(input: string) {
  return input.replace(/([%_\\])/g, '\\$1')
}

function normalizeImportedIsbn(input?: string | null) {
  return input?.replace(/[^0-9Xx]/g, '').toUpperCase() || null
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function formatImportedListTitle(name: string) {
  const titled = titleize(name.replace(/[-_]+/g, ' '))
  return normalizeLookupValue(titled) === 'dnf' ? 'DNF' : titled
}

function countByKey<T extends string>(rows: { [K in T]: string }[], key: T) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const value = row[key]
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

async function insertActivityEvent(
  supabase: Client,
  input: {
    userId: string
    eventType:
      | 'book_logged'
      | 'book_reviewed'
      | 'list_created'
      | 'list_book_added'
      | 'started_reading'
      | 'finished_reading'
      | 'followed_user'
      | 'badge_unlocked'
    bookId?: string | null
    reviewId?: string | null
    listId?: string | null
    userBookId?: string | null
    metadata?: JsonMap | null
  }
) {
  const { error } = await supabase.from('activity_events').insert({
    user_id: input.userId,
    event_type: input.eventType,
    book_id: input.bookId ?? null,
    review_id: input.reviewId ?? null,
    list_id: input.listId ?? null,
    user_book_id: input.userBookId ?? null,
    metadata: input.metadata ?? {},
  })

  if (error && process.env.NODE_ENV !== 'production') {
    console.warn('activity_events insert failed:', error.message)
  }
}

async function insertNotification(
  supabase: Client,
  input: {
    userId: string
    actorId: string
    type: 'follow' | 'like' | 'comment' | 'review_on_book' | 'list_mention' | 'club_invite' | 'roadmap_status' | 'upvote'
    entityType?: 'review' | 'book_post' | 'list' | 'club' | 'roadmap_feature' | 'comment' | null
    entityId?: string | null
    message: string
  }
) {
  if (input.userId === input.actorId) return
  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    actor_id: input.actorId,
    type: input.type,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    message: input.message,
  })
  if (error && process.env.NODE_ENV !== 'production') {
    console.warn('notifications insert failed:', error.message)
  }
}

async function syncReadingGoalProgress(
  supabase: Client,
  userId: string,
  year: number
): Promise<DbReadingGoal | null> {
  const { data: existing } = await supabase
    .from('reading_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .maybeSingle()

  if (!existing) return null

  const bounds = yearBounds(year)
  const [{ count: booksCompleted }, { data: sessions }] = await Promise.all([
    supabase
      .from('user_books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'read')
      .gte('finished_at', bounds.start)
      .lte('finished_at', bounds.end),
    supabase
      .from('reading_sessions')
      .select('pages_read, minutes_read')
      .eq('user_id', userId)
      .gte('session_date', bounds.start)
      .lte('session_date', bounds.end),
  ])

  const pagesCompleted = (sessions ?? []).reduce(
    (sum: number, row: any) => sum + (row.pages_read ?? 0),
    0
  )
  const minutesCompleted = (sessions ?? []).reduce(
    (sum: number, row: any) => sum + (row.minutes_read ?? 0),
    0
  )

  const completed =
    (booksCompleted ?? 0) >= (existing.book_goal ?? 0) &&
    pagesCompleted >= (existing.page_goal ?? 0) &&
    minutesCompleted >= (existing.minute_goal ?? 0)

  const { data, error } = await supabase
    .from('reading_goals')
    .update({
      books_completed: booksCompleted ?? 0,
      pages_completed: pagesCompleted,
      minutes_completed: minutesCompleted,
      completed_at: completed ? existing.completed_at ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('year', year)
    .select('*')
    .single()

  if (error) throw error
  return data as DbReadingGoal
}

async function hydrateBookPostCounts(
  supabase: Client,
  posts: DbBookPost[]
): Promise<DbBookPost[]> {
  const ids = posts.map((post) => post.id)
  if (!ids.length) return posts

  const { data: comments } = await supabase
    .from('book_post_comments')
    .select('post_id')
    .in('post_id', ids)

  const counts = countByKey((comments ?? []) as { post_id: string }[], 'post_id')
  return posts.map((post) => ({
    ...post,
    comment_count: counts.get(post.id) ?? 0,
  }))
}

export async function getCurrentUser(supabase: Client) {
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

export async function getCurrentProfile(supabase: Client): Promise<DbProfile | null> {
  const user = await getCurrentUser(supabase)
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return (data as DbProfile) ?? null
}

export async function getProfileByUsername(
  supabase: Client,
  username: string
): Promise<DbProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  return (data as DbProfile) ?? null
}

export async function getProfileStats(
  supabase: Client,
  userId: string
): Promise<DbProfileStats> {
  const { data } = await supabase.from('profile_stats').select('*').eq('id', userId).maybeSingle()

  return data
    ? {
        user_id: data.id,
        follower_count: data.follower_count ?? 0,
        following_count: data.following_count ?? 0,
        books_read: data.books_read ?? 0,
      }
    : {
        user_id: userId,
        follower_count: 0,
        following_count: 0,
        books_read: 0,
      }
}

export async function updateProfile(
  supabase: Client,
  patch: Partial<Pick<DbProfile, 'display_name' | 'username' | 'bio' | 'location' | 'avatar_url'>>
) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
  if (error) throw error
}

export async function searchBooks(
  supabase: Client,
  q: string,
  limit = 30
): Promise<DbBookWithAuthors[]> {
  const query = q.trim()

  if (!query) {
    const { data } = await supabase
      .from('books')
      .select(BOOK_SELECT)
      .order('published_year', { ascending: false, nullsFirst: false })
      .limit(limit)

    return (data ?? []).map(mapBookWithAuthors)
  }

  const like = `%${query.replace(/%/g, '\\%')}%`

  const [directMatches, authorMatches, genreMatches, tagMatches] = await Promise.all([
    supabase
      .from('books')
      .select(BOOK_SELECT)
      .or(`title.ilike.${like},subtitle.ilike.${like},description.ilike.${like}`)
      .limit(limit),
    supabase
      .from('authors')
      .select('id, book_authors ( book:books ( ' + BOOK_SELECT + ' ) )')
      .ilike('name', like)
      .limit(10),
    supabase
      .from('genres')
      .select('id, book_genres ( book:books ( ' + BOOK_SELECT + ' ) )')
      .ilike('name', like)
      .limit(10),
    supabase
      .from('tags')
      .select('id, book_tags ( book:books ( ' + BOOK_SELECT + ' ) )')
      .ilike('name', like)
      .limit(10),
  ])

  const byId = new Map<string, DbBookWithAuthors>()
  for (const row of directMatches.data ?? []) {
    const mapped = mapBookWithAuthors(row)
    byId.set(mapped.id, mapped)
  }
  for (const author of (authorMatches.data ?? []) as any[]) {
    for (const ba of author.book_authors ?? []) {
      if (ba.book && !byId.has(ba.book.id)) {
        byId.set(ba.book.id, mapBookWithAuthors(ba.book))
      }
    }
  }
  for (const genre of (genreMatches.data ?? []) as any[]) {
    for (const bg of genre.book_genres ?? []) {
      if (bg.book && !byId.has(bg.book.id)) {
        byId.set(bg.book.id, mapBookWithAuthors(bg.book))
      }
    }
  }
  for (const tag of (tagMatches.data ?? []) as any[]) {
    for (const bt of tag.book_tags ?? []) {
      if (bt.book && !byId.has(bt.book.id)) {
        byId.set(bt.book.id, mapBookWithAuthors(bt.book))
      }
    }
  }

  return [...byId.values()].slice(0, limit)
}

export async function searchProfiles(
  supabase: Client,
  q: string,
  limit = 12
): Promise<DbProfile[]> {
  const query = q.trim()
  if (!query) return []
  const like = `%${query.replace(/%/g, '\\%')}%`
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.${like},display_name.ilike.${like},bio.ilike.${like}`)
    .limit(limit)
  return (data ?? []) as DbProfile[]
}

export async function searchClubsByName(
  supabase: Client,
  q: string,
  limit = 12
): Promise<DbClub[]> {
  const query = q.trim()
  if (!query) return []
  const like = `%${query.replace(/%/g, '\\%')}%`
  const { data } = await supabase
    .from('clubs')
    .select(`*, current_book:books ( ${BOOK_SELECT} )`)
    .eq('is_public', true)
    .or(`name.ilike.${like},description.ilike.${like}`)
    .limit(limit)
  return (data ?? []).map(mapClub)
}

export async function searchBookPosts(
  supabase: Client,
  q: string,
  limit = 12
): Promise<DbBookPost[]> {
  const query = q.trim()
  if (!query) return []
  const like = `%${query.replace(/%/g, '\\%')}%`
  const { data } = await supabase
    .from('book_posts')
    .select(`*, profile:profiles!book_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .or(`title.ilike.${like},body.ilike.${like}`)
    .order('upvotes', { ascending: false, nullsFirst: false })
    .limit(limit)

  const mapped = (data ?? []).map((row: any) => ({
    ...(row as DbBookPost),
    book: row.book ? mapBookWithAuthors(row.book) : null,
  }))

  return hydrateBookPostCounts(supabase, mapped)
}

export async function getBook(supabase: Client, bookId: string): Promise<DbBookWithAuthors | null> {
  const { data } = await supabase.from('books').select(BOOK_SELECT).eq('id', bookId).maybeSingle()
  return data ? mapBookWithAuthors(data) : null
}

export async function getBookStats(supabase: Client, bookId: string): Promise<DbBookStats> {
  const { data } = await supabase
    .from('book_stats')
    .select('*')
    .eq('book_id', bookId)
    .maybeSingle()

  return (
    (data as DbBookStats) ?? {
      book_id: bookId,
      avg_rating: null,
      rating_count: 0,
      read_count: 0,
      review_count: 0,
    }
  )
}

export async function getBookWithStats(supabase: Client, bookId: string): Promise<DbBookCard | null> {
  const [book, stats] = await Promise.all([getBook(supabase, bookId), getBookStats(supabase, bookId)])
  return book ? { ...book, stats } : null
}

export async function listPopularBooks(supabase: Client, limit = 12): Promise<DbBookCard[]> {
  const { data: stats } = await supabase
    .from('book_stats')
    .select('*')
    .order('rating_count', { ascending: false, nullsFirst: false })
    .limit(limit)

  const ids = (stats ?? []).map((row: any) => row.book_id).filter(Boolean)
  if (!ids.length) return []

  const { data: books } = await supabase.from('books').select(BOOK_SELECT).in('id', ids)
  const byId = new Map((books ?? []).map((row: any) => [row.id, mapBookWithAuthors(row)]))

  return (stats ?? [])
    .map((row: any) => {
      const book = byId.get(row.book_id)
      return book ? { ...book, stats: row as DbBookStats } : null
    })
    .filter(Boolean) as DbBookCard[]
}

export async function listBookTags(supabase: Client, bookId: string): Promise<DbTag[]> {
  const { data } = await supabase
    .from('book_tags')
    .select('tags(*)')
    .eq('book_id', bookId)

  return (data ?? [])
    .map((row: any) => row.tags)
    .filter(Boolean)
    .sort((a: DbTag, b: DbTag) => a.name.localeCompare(b.name))
}

export async function searchTags(
  supabase: Client,
  q: string,
  limit = 8
): Promise<DbTag[]> {
  const query = q.trim()
  if (!query) return []

  const like = `%${query.replace(/%/g, '\\%')}%`
  const { data } = await supabase.from('tags').select('*').ilike('name', like).limit(limit)
  return (data ?? []) as DbTag[]
}

export async function addTag(
  supabase: Client,
  bookId: string,
  rawTagName: string
): Promise<DbTag> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const name = titleize(rawTagName)
  const slug = slugify(rawTagName)
  if (!name || !slug) throw new Error('Add a valid tag')

  let tag = await supabase.from('tags').select('*').eq('slug', slug).maybeSingle()
  if (!tag.data) {
    const inserted = await supabase
      .from('tags')
      .insert({
        name,
        slug,
        category: 'theme',
      })
      .select('*')
      .maybeSingle()

    if (inserted.error && inserted.error.code !== '23505') throw inserted.error
    tag = inserted.data
      ? inserted
      : await supabase.from('tags').select('*').eq('slug', slug).single()
  }

  const resolved = tag.data as DbTag | null
  if (!resolved) throw new Error('Could not create tag')

  const { error } = await supabase
    .from('book_tags')
    .upsert({ book_id: bookId, tag_id: resolved.id }, { onConflict: 'book_id,tag_id' })

  if (error) throw error
  return resolved
}

export async function removeTag(supabase: Client, bookId: string, tagId: string) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase.from('book_tags').delete().eq('book_id', bookId).eq('tag_id', tagId)
  if (error) throw error
}

export async function getUserBook(
  supabase: Client,
  userId: string,
  bookId: string
): Promise<DbUserBook | null> {
  const { data } = await supabase
    .from('user_books')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle()

  return (data as DbUserBook) ?? null
}

function cacheImportedBook(
  cache: Map<string, DbBookWithAuthors>,
  book: DbBookWithAuthors,
  titleKey: string,
  isbnCandidates: string[]
) {
  cache.set(titleKey, book)
  for (const isbn of isbnCandidates) cache.set(`isbn:${isbn}`, book)
}

function buildBookTitleAuthorKey(title: string, authors: string[]) {
  return `title:${normalizeLookupValue(title)}|authors:${authors
    .map(normalizeLookupValue)
    .sort()
    .join('|')}`
}

function pickPreferredCatalogIsbn(isbns: string[]) {
  return (
    isbns.find((isbn) => isbn.length === 13) ??
    isbns.find((isbn) => isbn.length === 10) ??
    isbns[0] ??
    null
  )
}

async function findCatalogBook(
  supabase: Client,
  input: CatalogBookImportInput,
  cache: Map<string, DbBookWithAuthors>
) {
  const isbnCandidates = (input.isbns ?? [])
    .map((isbn) => normalizeImportedIsbn(isbn))
    .filter(Boolean) as string[]

  for (const isbn of isbnCandidates) {
    const cached = cache.get(`isbn:${isbn}`)
    if (cached) return cached

    const { data } = await supabase.from('books').select(BOOK_SELECT).eq('isbn', isbn).maybeSingle()
    if (data) {
      const book = mapBookWithAuthors(data)
      cacheImportedBook(cache, book, buildBookTitleAuthorKey(input.title, input.authors), isbnCandidates)
      return book
    }
  }

  const titleKey = buildBookTitleAuthorKey(input.title, input.authors)
  const cached = cache.get(titleKey)
  if (cached) return cached

  const authorKeys = new Set(input.authors.map(normalizeLookupValue))
  const normalizedTitle = normalizeLookupValue(input.title)
  const fallbackTitle = `%${escapeLikePattern(input.title.trim())}%`
  const { data } = await supabase
    .from('books')
    .select(BOOK_SELECT)
    .ilike('title', fallbackTitle)
    .limit(12)

  const candidates = (data ?? []).map(mapBookWithAuthors)
  const match =
    candidates.find((book) => {
      if (normalizeLookupValue(book.title) !== normalizedTitle) return false
      if (!authorKeys.size) return true
      return book.authors.some((author) => authorKeys.has(normalizeLookupValue(author.name)))
    }) ??
    candidates.find((book) => {
      if (!authorKeys.size) return normalizeLookupValue(book.title) === normalizedTitle
      const bookTitle = normalizeLookupValue(book.title)
      const titleClose = bookTitle.includes(normalizedTitle) || normalizedTitle.includes(bookTitle)
      return titleClose && book.authors.some((author) => authorKeys.has(normalizeLookupValue(author.name)))
    })

  if (match) {
    cacheImportedBook(cache, match, titleKey, isbnCandidates)
    return match
  }

  return null
}

async function findImportedBook(
  supabase: Client,
  entry: GoodreadsImportEntry,
  cache: Map<string, DbBookWithAuthors>
) {
  const isbnCandidates = [normalizeImportedIsbn(entry.isbn13), normalizeImportedIsbn(entry.isbn)].filter(
    Boolean
  ) as string[]

  for (const isbn of isbnCandidates) {
    const cached = cache.get(`isbn:${isbn}`)
    if (cached) return cached

    const { data } = await supabase.from('books').select(BOOK_SELECT).eq('isbn', isbn).maybeSingle()
    if (data) {
      const book = mapBookWithAuthors(data)
      cacheImportedBook(cache, book, `title:${normalizeLookupValue(book.title)}`, isbnCandidates)
      return book
    }
  }

  const titleKey = `title:${normalizeLookupValue(entry.title)}|authors:${entry.authors
    .map(normalizeLookupValue)
    .sort()
    .join('|')}`
  const cached = cache.get(titleKey)
  if (cached) return cached

  const authorKeys = new Set(entry.authors.map(normalizeLookupValue))
  const normalizedTitle = normalizeLookupValue(entry.title)
  const fallbackTitle = `%${escapeLikePattern(entry.title.trim())}%`
  const { data } = await supabase
    .from('books')
    .select(BOOK_SELECT)
    .ilike('title', fallbackTitle)
    .limit(12)

  const candidates = (data ?? []).map(mapBookWithAuthors)
  const match =
    candidates.find((book) => {
      if (normalizeLookupValue(book.title) !== normalizedTitle) return false
      if (!authorKeys.size) return true
      return book.authors.some((author) => authorKeys.has(normalizeLookupValue(author.name)))
    }) ??
    candidates.find((book) => {
      if (!authorKeys.size) return normalizeLookupValue(book.title) === normalizedTitle
      const bookTitle = normalizeLookupValue(book.title)
      const titleClose = bookTitle.includes(normalizedTitle) || normalizedTitle.includes(bookTitle)
      return titleClose && book.authors.some((author) => authorKeys.has(normalizeLookupValue(author.name)))
    })

  if (match) {
    cacheImportedBook(cache, match, titleKey, isbnCandidates)
    return match
  }

  return null
}

async function findOrCreateCatalogBook(
  supabase: Client,
  input: CatalogBookImportInput,
  bookCache: Map<string, DbBookWithAuthors>,
  authorCache: Map<string, string>
) {
  const existing = await findCatalogBook(supabase, input, bookCache)
  if (existing) return { book: existing, created: false }

  const normalizedIsbns = (input.isbns ?? [])
    .map((isbn) => normalizeImportedIsbn(isbn))
    .filter(Boolean) as string[]
  const authorIds = input.authors.length
    ? await findOrCreateImportedAuthors(supabase, input.authors, authorCache)
    : []
  const canonicalIsbn = pickPreferredCatalogIsbn(normalizedIsbns)

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    isbn: canonicalIsbn,
    cover_url: input.coverUrl ?? null,
    description: input.description?.trim() || null,
    published_year: input.publishedYear ?? null,
    page_count: input.pageCount ?? null,
  }

  if (input.languageCode?.trim()) payload.language = input.languageCode.trim()

  const { data: inserted, error } = await supabase
    .from('books')
    .insert(payload)
    .select('id, title, subtitle, cover_url, description, published_year, page_count, isbn')
    .single()

  if (error) {
    const retry = await findCatalogBook(supabase, input, bookCache)
    if (retry) return { book: retry, created: false }
    throw error
  }

  if (authorIds.length) {
    const { error: linkError } = await supabase.from('book_authors').upsert(
      authorIds.map((authorId) => ({
        book_id: inserted.id,
        author_id: authorId,
      })),
      { onConflict: 'book_id,author_id' }
    )

    if (linkError) throw linkError
  }

  const { data: hydrated, error: hydrateError } = await supabase
    .from('books')
    .select(BOOK_SELECT)
    .eq('id', inserted.id)
    .single()

  if (hydrateError) throw hydrateError

  const book = mapBookWithAuthors(hydrated)
  cacheImportedBook(bookCache, book, buildBookTitleAuthorKey(input.title, input.authors), normalizedIsbns)
  return { book, created: true }
}

async function findOrCreateImportedAuthors(
  supabase: Client,
  authorNames: string[],
  cache: Map<string, string>
) {
  const ids: string[] = []

  for (const authorName of authorNames) {
    const normalized = normalizeLookupValue(authorName)
    if (!normalized) continue

    const cached = cache.get(normalized)
    if (cached) {
      ids.push(cached)
      continue
    }

    const { data: existing } = await supabase
      .from('authors')
      .select('id, name')
      .ilike('name', escapeLikePattern(authorName.trim()))
      .limit(5)

    const match =
      (existing ?? []).find((author: any) => normalizeLookupValue(author.name) === normalized) ?? null

    if (match) {
      cache.set(normalized, match.id)
      ids.push(match.id)
      continue
    }

    const { data: inserted, error } = await supabase
      .from('authors')
      .insert({ name: authorName.trim() })
      .select('id')
      .single()

    if (error) throw error
    cache.set(normalized, inserted.id)
    ids.push(inserted.id)
  }

  return Array.from(new Set(ids))
}

async function findOrCreateImportedBook(
  supabase: Client,
  entry: GoodreadsImportEntry,
  bookCache: Map<string, DbBookWithAuthors>,
  authorCache: Map<string, string>
) {
  const existing = await findImportedBook(supabase, entry, bookCache)
  if (existing) return { book: existing, created: false }

  const authorIds = await findOrCreateImportedAuthors(supabase, entry.authors, authorCache)
  const canonicalIsbn = normalizeImportedIsbn(entry.isbn13) ?? normalizeImportedIsbn(entry.isbn)

  const { data: inserted, error } = await supabase
    .from('books')
    .insert({
      title: entry.title.trim(),
      isbn: canonicalIsbn,
      page_count: entry.pageCount ?? null,
      published_year: entry.originalPublicationYear ?? entry.yearPublished ?? null,
    })
    .select('id, title, subtitle, cover_url, description, published_year, page_count, isbn')
    .single()

  if (error) {
    const retry = await findImportedBook(supabase, entry, bookCache)
    if (retry) return { book: retry, created: false }
    throw error
  }

  if (authorIds.length) {
    const { error: linkError } = await supabase.from('book_authors').upsert(
      authorIds.map((authorId) => ({
        book_id: inserted.id,
        author_id: authorId,
      })),
      { onConflict: 'book_id,author_id' }
    )

    if (linkError) throw linkError
  }

  const { data: hydrated, error: hydrateError } = await supabase
    .from('books')
    .select(BOOK_SELECT)
    .eq('id', inserted.id)
    .single()

  if (hydrateError) throw hydrateError

  const book = mapBookWithAuthors(hydrated)
  cacheImportedBook(
    bookCache,
    book,
    `title:${normalizeLookupValue(entry.title)}|authors:${entry.authors
      .map(normalizeLookupValue)
      .sort()
      .join('|')}`,
    [canonicalIsbn].filter(Boolean) as string[]
  )

  return { book, created: true }
}

async function upsertImportedUserBookRecord(
  supabase: Client,
  userId: string,
  bookId: string,
  entry: GoodreadsImportEntry
) {
  const fallbackStatus =
    entry.status ?? (entry.rating !== null || entry.review || entry.dateRead ? 'read' : null)
  const payload: Record<string, unknown> = {
    user_id: userId,
    book_id: bookId,
  }

  let shouldWrite = false

  if (fallbackStatus) {
    payload.status = fallbackStatus
    shouldWrite = true
  }

  if (entry.rating !== null) {
    payload.rating = entry.rating
    shouldWrite = true
  }

  if (entry.dateRead) {
    payload.finished_at = entry.dateRead
    shouldWrite = true
  }

  if (fallbackStatus === 'reading' && entry.dateAdded) {
    payload.started_at = entry.dateAdded
    shouldWrite = true
  }

  if (entry.readCount > 1) {
    payload.is_reread = true
    shouldWrite = true
  }

  if (!shouldWrite) return null

  const { data, error } = await supabase
    .from('user_books')
    .upsert(payload, { onConflict: 'user_id,book_id' })
    .select('*')
    .single()

  if (error) throw error
  return data as DbUserBook
}

export async function importCatalogBook(
  supabase: Client,
  input: CatalogBookImportInput
): Promise<{ book: DbBookWithAuthors; created: boolean }> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Sign in to import books')

  const title = input.title.trim()
  if (!title) throw new Error('Missing book title')

  const authorNames = Array.from(
    new Set(input.authors.map((author) => author.trim()).filter(Boolean))
  )

  const bookCache = new Map<string, DbBookWithAuthors>()
  const authorCache = new Map<string, string>()

  return findOrCreateCatalogBook(
    supabase,
    {
      ...input,
      title,
      authors: authorNames,
    },
    bookCache,
    authorCache
  )
}

async function upsertImportedReviewRecord(
  supabase: Client,
  userId: string,
  bookId: string,
  userBookId: string | null,
  entry: GoodreadsImportEntry
) {
  if (!entry.review) return false

  const payload: Record<string, unknown> = {
    user_id: userId,
    book_id: bookId,
    user_book_id: userBookId,
    body: entry.review,
    contains_spoiler: entry.spoiler,
  }

  if (entry.rating !== null) payload.rating = entry.rating

  const { error } = await supabase.from('reviews').upsert(payload, {
    onConflict: 'user_id,book_id',
  })

  if (error) throw error
  return true
}

async function loadImportedLists(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from('lists')
    .select('id, title')
    .eq('user_id', userId)

  if (error) throw error

  const cache = new Map<string, ImportedListRecord>()
  for (const row of (data ?? []) as ImportedListRecord[]) {
    const key = normalizeLookupValue(row.title)
    if (!cache.has(key)) cache.set(key, row)
  }

  return cache
}

async function ensureImportedList(
  supabase: Client,
  userId: string,
  cache: Map<string, ImportedListRecord>,
  shelfName: string
) {
  const title = formatImportedListTitle(shelfName)
  const key = normalizeLookupValue(title)
  const existing = cache.get(key)
  if (existing) return { id: existing.id, created: false }

  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      title,
      description: 'Imported from Goodreads',
      is_public: false,
    })
    .select('id, title')
    .single()

  if (error) throw error

  const record = data as ImportedListRecord
  cache.set(key, record)
  return { id: record.id, created: true }
}

async function upsertImportedListItems(
  supabase: Client,
  listId: string,
  assignments: { bookId: string; position: number | null; sequence: number }[]
) {
  const deduped = new Map<string, { bookId: string; position: number | null; sequence: number }>()

  for (const assignment of assignments) {
    deduped.set(assignment.bookId, assignment)
  }

  const ordered = Array.from(deduped.values()).sort((left, right) => {
    if (left.position !== null && right.position !== null) return left.position - right.position
    if (left.position !== null) return -1
    if (right.position !== null) return 1
    return left.sequence - right.sequence
  })

  const payload = ordered.map((assignment, index) => ({
    list_id: listId,
    book_id: assignment.bookId,
    position: assignment.position ?? index + 1,
  }))

  for (const chunk of chunkArray(payload, 200)) {
    const { error } = await supabase.from('list_items').upsert(chunk, {
      onConflict: 'list_id,book_id',
    })
    if (error) throw error
  }

  return payload.length
}

export async function upsertUserBook(
  supabase: Client,
  input: {
    bookId: string
    status?: DbUserBook['status']
    rating?: number | null
    started_at?: string | null
    finished_at?: string | null
  }
): Promise<DbUserBook> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const existing = await getUserBook(supabase, user.id, input.bookId)
  const today = new Date().toISOString().slice(0, 10)
  const payload: Record<string, unknown> = {
    user_id: user.id,
    book_id: input.bookId,
  }

  if (input.status !== undefined) payload.status = input.status
  if (input.rating !== undefined) payload.rating = input.rating
  if (input.started_at !== undefined) payload.started_at = input.started_at
  if (input.finished_at !== undefined) payload.finished_at = input.finished_at

  if (input.status === 'reading' && input.started_at === undefined && !existing?.started_at) {
    payload.started_at = today
  }

  if (input.status === 'read' && input.finished_at === undefined) {
    payload.finished_at = existing?.finished_at ?? today
  }

  const { data, error } = await supabase
    .from('user_books')
    .upsert(payload, { onConflict: 'user_id,book_id' })
    .select('*')
    .single()

  if (error) throw error

  const row = data as DbUserBook
  if (row.status === 'reading' && existing?.status !== 'reading') {
    await insertActivityEvent(supabase, {
      userId: user.id,
      eventType: 'started_reading',
      bookId: row.book_id,
      userBookId: row.id,
      metadata: { status: row.status },
    })
  }

  if (row.status === 'read' && existing?.status !== 'read') {
    await insertActivityEvent(supabase, {
      userId: user.id,
      eventType: 'finished_reading',
      bookId: row.book_id,
      userBookId: row.id,
      metadata: { status: row.status, rating: row.rating ?? null },
    })
  }

  const goalYears = new Set<number>()
  if (existing?.finished_at) goalYears.add(new Date(existing.finished_at).getFullYear())
  if (row.finished_at) goalYears.add(new Date(row.finished_at).getFullYear())
  for (const year of goalYears) {
    await syncReadingGoalProgress(supabase, user.id, year)
  }

  return row
}

export async function removeUserBook(supabase: Client, bookId: string): Promise<void> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase
    .from('user_books')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId)
  if (error) throw error
}

export async function importGoodreadsLibrary(
  supabase: Client,
  entries: GoodreadsImportEntry[],
  options: {
    includeReviews?: boolean
    includeCustomShelves?: boolean
    onProgress?: (progress: { current: number; total: number; title: string }) => void
  } = {}
) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const includeReviews = options.includeReviews ?? true
  const includeCustomShelves = options.includeCustomShelves ?? true
  const cleanedEntries = entries.filter((entry) => entry.title.trim() && entry.authors.length)
  const bookCache = new Map<string, DbBookWithAuthors>()
  const authorCache = new Map<string, string>()
  const yearsToSync = new Set<number>()
  const shelfAssignments = new Map<string, { bookId: string; position: number | null; sequence: number }[]>()
  const listCache = includeCustomShelves ? await loadImportedLists(supabase, user.id) : new Map()

  let imported = 0
  let matched = 0
  let created = 0
  let updatedShelves = 0
  let importedReviews = 0
  let createdLists = 0
  let addedToLists = 0
  let skipped = 0
  const errors: string[] = []

  for (let index = 0; index < cleanedEntries.length; index += 1) {
    const entry = cleanedEntries[index]

    try {
      const { book, created: createdBook } = await findOrCreateImportedBook(
        supabase,
        entry,
        bookCache,
        authorCache
      )

      if (createdBook) created += 1
      else matched += 1

      const userBook = await upsertImportedUserBookRecord(supabase, user.id, book.id, entry)
      if (userBook) {
        updatedShelves += 1
        if (userBook.finished_at) yearsToSync.add(new Date(userBook.finished_at).getFullYear())
      }

      if (includeReviews) {
        const wroteReview = await upsertImportedReviewRecord(
          supabase,
          user.id,
          book.id,
          userBook?.id ?? null,
          entry
        )
        if (wroteReview) importedReviews += 1
      }

      if (includeCustomShelves) {
        for (const shelf of entry.customShelves) {
          const assignments = shelfAssignments.get(shelf.name) ?? []
          assignments.push({
            bookId: book.id,
            position: shelf.position,
            sequence: index,
          })
          shelfAssignments.set(shelf.name, assignments)
        }
      }

      imported += 1
    } catch (error) {
      skipped += 1
      errors.push(`${entry.title} by ${entry.authors[0]}: ${(error as Error).message}`)
    } finally {
      options.onProgress?.({
        current: index + 1,
        total: cleanedEntries.length,
        title: entry.title,
      })
    }
  }

  if (includeCustomShelves) {
    for (const [shelfName, assignments] of shelfAssignments.entries()) {
      const list = await ensureImportedList(supabase, user.id, listCache, shelfName)
      if (list.created) createdLists += 1
      addedToLists += await upsertImportedListItems(supabase, list.id, assignments)
    }
  }

  for (const year of yearsToSync) {
    await syncReadingGoalProgress(supabase, user.id, year)
  }

  return {
    imported,
    matched,
    created,
    updatedShelves,
    importedReviews,
    createdLists,
    addedToLists,
    skipped,
    errors,
  }
}

export async function listShelf(
  supabase: Client,
  userId: string,
  status?: DbUserBook['status']
): Promise<(DbUserBook & { book: DbBookWithAuthors | null })[]> {
  let query = supabase
    .from('user_books')
    .select(`*, books ( ${BOOK_SELECT} )`)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (status) query = query.eq('status', status)
  const { data } = await query

  return (data ?? []).map((row: any) => ({
    ...(row as DbUserBook),
    book: row.books ? mapBookWithAuthors(row.books) : null,
  }))
}

export async function listReviewsForBook(
  supabase: Client,
  bookId: string,
  limit = 20
): Promise<DbReview[]> {
  const { data } = await supabase
    .from('reviews')
    .select(`*, profile:profiles!reviews_user_id_fkey ( * )`)
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as DbReview[]
}

export async function createReview(
  supabase: Client,
  input: { bookId: string; rating: number; body?: string; spoiler?: boolean }
): Promise<DbReview> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const body = input.body?.trim() ?? ''
  const { data, error } = await supabase
    .from('reviews')
    .upsert(
      {
        user_id: user.id,
        book_id: input.bookId,
        rating: input.rating,
        body,
        contains_spoiler: input.spoiler ?? false,
      },
      { onConflict: 'user_id,book_id' }
    )
    .select('*')
    .single()

  if (error) throw error

  await insertActivityEvent(supabase, {
    userId: user.id,
    eventType: 'book_reviewed',
    bookId: input.bookId,
    reviewId: data.id,
    metadata: { rating: input.rating },
  })

  return data as DbReview
}

export async function listSavedReviewIds(
  supabase: Client,
  reviewIds: string[]
): Promise<string[]> {
  const user = await getCurrentUser(supabase)
  if (!user || !reviewIds.length) return []

  const { data } = await supabase
    .from('review_saves')
    .select('review_id')
    .in('review_id', reviewIds)

  return (data ?? []).map((row: any) => row.review_id)
}

export async function toggleReviewSave(
  supabase: Client,
  reviewId: string
): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing } = await supabase
    .from('review_saves')
    .select('review_id')
    .eq('review_id', reviewId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('review_saves').delete().eq('review_id', reviewId)
    if (error) throw error
    return false
  }

  const { error } = await supabase.from('review_saves').insert({
    user_id: user.id,
    review_id: reviewId,
  })
  if (error) throw error
  return true
}

export async function listBookPosts(
  supabase: Client,
  bookId: string,
  limit = 20
): Promise<DbBookPost[]> {
  const { data } = await supabase
    .from('book_posts')
    .select(`*, profile:profiles!book_posts_user_id_fkey ( * )`)
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return hydrateBookPostCounts(supabase, (data ?? []) as DbBookPost[])
}

export async function createBookPost(
  supabase: Client,
  input: {
    bookId: string
    title: string
    body?: string
    post_type?: DbBookPost['post_type']
    spoiler?: boolean
  }
): Promise<DbBookPost> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('book_posts')
    .insert({
      user_id: user.id,
      book_id: input.bookId,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      post_type: input.post_type ?? 'discussion',
      contains_spoiler: input.spoiler ?? false,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as DbBookPost
}

export async function listRecentBookPosts(
  supabase: Client,
  limit = 30
): Promise<DbBookPost[]> {
  const { data } = await supabase
    .from('book_posts')
    .select(`*, profile:profiles!book_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .order('created_at', { ascending: false })
    .limit(limit)

  const mapped = (data ?? []).map((row: any) => ({
    ...(row as DbBookPost),
    book: row.book ? mapBookWithAuthors(row.book) : null,
  }))

  return hydrateBookPostCounts(supabase, mapped)
}

export async function listPostComments(
  supabase: Client,
  postId: string,
  limit = 50
): Promise<DbBookPostComment[]> {
  const { data } = await supabase
    .from('book_post_comments')
    .select(`*, profile:profiles!book_post_comments_user_id_fkey ( * )`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(limit)

  return (data ?? []) as DbBookPostComment[]
}

export async function createComment(
  supabase: Client,
  input: {
    postId: string
    body: string
    parentId?: string | null
    spoiler?: boolean
  }
): Promise<DbBookPostComment> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('book_post_comments')
    .insert({
      post_id: input.postId,
      user_id: user.id,
      parent_id: input.parentId ?? null,
      body: input.body.trim(),
      contains_spoiler: input.spoiler ?? false,
    })
    .select('*')
    .single()

  if (error) throw error

  const { data: post } = await supabase
    .from('book_posts')
    .select('user_id, title')
    .eq('id', input.postId)
    .maybeSingle()
  if (post?.user_id) {
    const actor = await supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle()
    const actorName = actor.data?.display_name ?? actor.data?.username ?? 'Someone'
    await insertNotification(supabase, {
      userId: post.user_id,
      actorId: user.id,
      type: 'comment',
      entityType: 'book_post',
      entityId: input.postId,
      message: `${actorName} commented on "${post.title}"`,
    })
  }

  return data as DbBookPostComment
}

export async function deleteComment(supabase: Client, commentId: string) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase.from('book_post_comments').delete().eq('id', commentId)
  if (error) throw error
}

export type PostVote = 1 | -1 | 0

export async function setPostVote(
  supabase: Client,
  postId: string,
  next: PostVote
): Promise<PostVote> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing } = await supabase
    .from('book_post_upvotes')
    .select('vote_value')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle()

  const currentVote = (existing?.vote_value ?? 0) as PostVote

  if (next === 0) {
    if (!existing) return 0
    const { error } = await supabase
      .from('book_post_upvotes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId)
    if (error) throw error
    return 0
  }

  if (currentVote === next) return currentVote

  if (existing) {
    const { error } = await supabase
      .from('book_post_upvotes')
      .update({ vote_value: next })
      .eq('user_id', user.id)
      .eq('post_id', postId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('book_post_upvotes').insert({
      user_id: user.id,
      post_id: postId,
      vote_value: next,
    })
    if (error) throw error
  }

  if (next === 1 && currentVote !== 1) {
    const { data: post } = await supabase
      .from('book_posts')
      .select('user_id, title')
      .eq('id', postId)
      .maybeSingle()
    if (post?.user_id && post.user_id !== user.id) {
      const actor = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .maybeSingle()
      const actorName = actor.data?.display_name ?? actor.data?.username ?? 'Someone'
      await insertNotification(supabase, {
        userId: post.user_id,
        actorId: user.id,
        type: 'upvote',
        entityType: 'book_post',
        entityId: postId,
        message: `${actorName} upvoted "${post.title}"`,
      })
    }
  }

  return next
}

export async function togglePostUpvote(
  supabase: Client,
  postId: string
): Promise<boolean> {
  const result = await setPostVote(supabase, postId, 1)
  return result === 1
}

export async function listRecentActivity(
  supabase: Client,
  limit = 30
): Promise<DbActivityEvent[]> {
  const { data } = await supabase
    .from('activity_events')
    .select(
      `*,
       profile:profiles!activity_events_user_id_fkey ( * ),
       book:books ( ${BOOK_SELECT} )`
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row: any) => ({
    ...(row as DbActivityEvent),
    metadata: toJsonMap(row.metadata),
    book: row.book ? mapBookWithAuthors(row.book) : null,
  }))
}

export async function logReadingSession(
  supabase: Client,
  input: {
    bookId?: string | null
    pages?: number
    minutes?: number
    notes?: string
    date?: string
  }
): Promise<DbReadingSession> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const sessionDate = input.date ?? new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('reading_sessions')
    .upsert(
      {
        user_id: user.id,
        book_id: input.bookId ?? null,
        pages_read: input.pages ?? null,
        minutes_read: input.minutes ?? null,
        notes: input.notes ?? null,
        session_date: sessionDate,
      },
      { onConflict: 'user_id,session_date,book_id' }
    )
    .select('*')
    .single()

  if (error) throw error

  await touchStreak(supabase, user.id)
  await syncReadingGoalProgress(supabase, user.id, new Date(sessionDate).getFullYear())
  await insertActivityEvent(supabase, {
    userId: user.id,
    eventType: 'book_logged',
    bookId: input.bookId ?? null,
    metadata: {
      pages: input.pages ?? 0,
      minutes: input.minutes ?? 0,
      session_date: sessionDate,
    },
  })

  return data as DbReadingSession
}

export async function listRecentSessions(
  supabase: Client,
  userId: string,
  days = 180
): Promise<DbReadingSession[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('session_date', since.toISOString().slice(0, 10))
    .order('session_date', { ascending: false })

  return (data ?? []) as DbReadingSession[]
}

export async function getStreak(
  supabase: Client,
  userId: string
): Promise<{ current_streak: number; longest_streak: number; last_activity_date: string | null }> {
  const { data } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', userId)
    .maybeSingle()

  return (
    (data as { current_streak: number; longest_streak: number; last_activity_date: string | null }) ?? {
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
    }
  )
}

async function touchStreak(supabase: Client, userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', userId)
    .maybeSingle()

  let current = 1
  let longest = 1

  if (existing) {
    const last = existing.last_activity_date as string | null
    if (last === today) return

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const y = yesterday.toISOString().slice(0, 10)
    current = last === y ? (existing.current_streak ?? 0) + 1 : 1
    longest = Math.max(existing.longest_streak ?? 0, current)
  }

  await supabase.from('streaks').upsert({
    user_id: userId,
    current_streak: current,
    longest_streak: longest,
    last_activity_date: today,
    updated_at: new Date().toISOString(),
  })
}

export async function getReadingGoal(
  supabase: Client,
  year = currentYear()
): Promise<DbReadingGoal | null> {
  const user = await getCurrentUser(supabase)
  if (!user) return null
  return syncReadingGoalProgress(supabase, user.id, year)
}

export async function upsertReadingGoal(
  supabase: Client,
  input: {
    year?: number
    book_goal: number
    page_goal: number
    minute_goal: number
  }
): Promise<DbReadingGoal> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const year = input.year ?? currentYear()
  const { error } = await supabase.from('reading_goals').upsert({
    user_id: user.id,
    year,
    book_goal: input.book_goal,
    page_goal: input.page_goal,
    minute_goal: input.minute_goal,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error

  const synced = await syncReadingGoalProgress(supabase, user.id, year)
  if (!synced) throw new Error('Could not save reading goal')
  return synced
}

async function persistFavoriteOrder(
  supabase: Client,
  userId: string,
  orderedBookIds: string[]
) {
  const { error: deleteError } = await supabase.from('favorite_books').delete().eq('user_id', userId)
  if (deleteError) throw deleteError

  if (!orderedBookIds.length) return

  const payload = orderedBookIds.map((bookId, index) => ({
    user_id: userId,
    book_id: bookId,
    position: index + 1,
  }))

  const { error: insertError } = await supabase.from('favorite_books').insert(payload)
  if (insertError) throw insertError
}

async function getClubCounts(
  supabase: Client,
  clubIds: string[],
  currentUserId?: string | null
) {
  if (!clubIds.length) {
    return {
      countMap: new Map<string, number>(),
      membershipSet: new Set<string>(),
    }
  }

  const [memberships, mine] = await Promise.all([
    supabase.from('club_members').select('club_id').in('club_id', clubIds),
    currentUserId
      ? supabase
          .from('club_members')
          .select('club_id')
          .in('club_id', clubIds)
          .eq('user_id', currentUserId)
      : Promise.resolve({ data: [] as { club_id: string }[] }),
  ])

  return {
    countMap: countByKey((memberships.data ?? []) as { club_id: string }[], 'club_id'),
    membershipSet: new Set((mine.data ?? []).map((row: any) => row.club_id)),
  }
}

export async function listNotifications(
  supabase: Client,
  limit = 50
): Promise<DbNotification[]> {
  const user = await getCurrentUser(supabase)
  if (!user) return []

  const { data } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey ( * )')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as DbNotification[]
}

export async function unreadNotificationCount(supabase: Client): Promise<number> {
  const user = await getCurrentUser(supabase)
  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count ?? 0
}

export async function markNotificationsRead(supabase: Client, ids?: string[]) {
  const user = await getCurrentUser(supabase)
  if (!user) return

  let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
  if (ids?.length) query = query.in('id', ids)
  await query
}

export async function toggleFollow(supabase: Client, targetUserId: string): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
    return false
  }

  await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: targetUserId,
  })

  const { data: target } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', targetUserId)
    .maybeSingle()

  await insertActivityEvent(supabase, {
    userId: user.id,
    eventType: 'followed_user',
    metadata: {
      target_user_id: targetUserId,
      target_name: target?.display_name ?? target?.username ?? 'someone',
    },
  })

  const actor = await supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle()
  const actorName = actor.data?.display_name ?? actor.data?.username ?? 'Someone'
  await insertNotification(supabase, {
    userId: targetUserId,
    actorId: user.id,
    type: 'follow',
    message: `${actorName} started following you`,
  })

  return true
}

export async function listLikedReviewIds(
  supabase: Client,
  reviewIds: string[]
): Promise<string[]> {
  const user = await getCurrentUser(supabase)
  if (!user || !reviewIds.length) return []
  const { data } = await supabase
    .from('likes')
    .select('review_id')
    .eq('user_id', user.id)
    .in('review_id', reviewIds)
  return (data ?? []).map((row: any) => row.review_id).filter(Boolean)
}

export async function listUpvotedPostIds(
  supabase: Client,
  postIds: string[]
): Promise<string[]> {
  const user = await getCurrentUser(supabase)
  if (!user || !postIds.length) return []
  const { data } = await supabase
    .from('book_post_upvotes')
    .select('post_id, vote_value')
    .eq('user_id', user.id)
    .eq('vote_value', 1)
    .in('post_id', postIds)
  return (data ?? []).map((row: any) => row.post_id).filter(Boolean)
}

export async function listPostVotes(
  supabase: Client,
  postIds: string[]
): Promise<Record<string, PostVote>> {
  const user = await getCurrentUser(supabase)
  if (!user || !postIds.length) return {}
  const { data } = await supabase
    .from('book_post_upvotes')
    .select('post_id, vote_value')
    .eq('user_id', user.id)
    .in('post_id', postIds)
  const result: Record<string, PostVote> = {}
  for (const row of (data ?? []) as Array<{ post_id: string; vote_value: number }>) {
    if (row.post_id) result[row.post_id] = row.vote_value === -1 ? -1 : 1
  }
  return result
}

export async function toggleLike(supabase: Client, reviewId: string): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing } = await supabase
    .from('likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('review_id', reviewId)
    .maybeSingle()

  if (existing) {
    await supabase.from('likes').delete().eq('user_id', user.id).eq('review_id', reviewId)
    return false
  }

  await supabase.from('likes').insert({
    user_id: user.id,
    review_id: reviewId,
  })

  const { data: review } = await supabase
    .from('reviews')
    .select('user_id, book:books ( title )')
    .eq('id', reviewId)
    .maybeSingle()
  if (review?.user_id) {
    const actor = await supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle()
    const actorName = actor.data?.display_name ?? actor.data?.username ?? 'Someone'
    const bookTitle = (review as any).book?.title ?? 'a book'
    await insertNotification(supabase, {
      userId: review.user_id,
      actorId: user.id,
      type: 'like',
      entityType: 'review',
      entityId: reviewId,
      message: `${actorName} liked your review of ${bookTitle}`,
    })
  }

  return true
}

export async function listFavorites(
  supabase: Client,
  userId: string
): Promise<DbFavoriteBook[]> {
  const { data } = await supabase
    .from('favorite_books')
    .select(`*, book:books ( ${BOOK_SELECT} )`)
    .eq('user_id', userId)
    .order('position', { ascending: true })

  return (data ?? []).map(mapFavorite)
}

export async function pinFavorite(
  supabase: Client,
  bookId: string,
  position?: number
): Promise<DbFavoriteBook[]> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const existing = await listFavorites(supabase, user.id)
  const withoutCurrent = existing.filter((item) => item.book_id !== bookId)
  if (!existing.some((item) => item.book_id === bookId) && withoutCurrent.length >= 4) {
    throw new Error('You can pin up to 4 favorites')
  }

  const nextIndex = clamp(position ?? withoutCurrent.length + 1, 1, withoutCurrent.length + 1)
  const ordered = [...withoutCurrent.map((item) => item.book_id)]
  ordered.splice(nextIndex - 1, 0, bookId)

  await persistFavoriteOrder(supabase, user.id, ordered)
  return listFavorites(supabase, user.id)
}

export async function unpinFavorite(
  supabase: Client,
  bookId: string
): Promise<DbFavoriteBook[]> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const existing = await listFavorites(supabase, user.id)
  const ordered = existing.filter((item) => item.book_id !== bookId).map((item) => item.book_id)
  await persistFavoriteOrder(supabase, user.id, ordered)
  return listFavorites(supabase, user.id)
}

export async function reorderFavorites(
  supabase: Client,
  orderedBookIds: string[]
): Promise<DbFavoriteBook[]> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  await persistFavoriteOrder(supabase, user.id, orderedBookIds.slice(0, 4))
  return listFavorites(supabase, user.id)
}

export async function listBadges(supabase: Client, userId: string): Promise<DbBadge[]> {
  const { data } = await supabase
    .from('badges')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  return (data ?? []).map((row: any) => ({
    ...(row as DbBadge),
    metadata: toJsonMap(row.metadata) ?? {},
  }))
}

export async function awardProgressBadges(supabase: Client): Promise<DbBadge[]> {
  const user = await getCurrentUser(supabase)
  if (!user) return []

  const [existing, reviews, sessions, completedBooks, streak] = await Promise.all([
    listBadges(supabase, user.id),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('reading_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('user_books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'read'),
    getStreak(supabase, user.id),
  ])

  const existingKeys = new Set(existing.map((badge) => badge.badge_key))
  const candidates = [
    {
      key: 'first-review',
      met: (reviews.count ?? 0) >= 1,
      title: 'First Review',
      description: 'Posted your first review.',
      icon: 'star',
      metadata: { review_count: reviews.count ?? 0 },
    },
    {
      key: 'shelf-starter',
      met: (completedBooks.count ?? 0) >= 1,
      title: 'Finished One',
      description: 'Marked your first book as read.',
      icon: 'book',
      metadata: { books_read: completedBooks.count ?? 0 },
    },
    {
      key: 'reading-ritual',
      met: (sessions.count ?? 0) >= 10,
      title: 'Reading Ritual',
      description: 'Logged ten reading sessions.',
      icon: 'sparkles',
      metadata: { session_count: sessions.count ?? 0 },
    },
    {
      key: 'seven-day-streak',
      met: (streak.longest_streak ?? 0) >= 7,
      title: 'Seven-Day Streak',
      description: 'Read seven days in a row.',
      icon: 'flame',
      metadata: { longest_streak: streak.longest_streak ?? 0 },
    },
    {
      key: 'five-books-finished',
      met: (completedBooks.count ?? 0) >= 5,
      title: 'Five Books Finished',
      description: 'Finished five books.',
      icon: 'trophy',
      metadata: { books_read: completedBooks.count ?? 0 },
    },
  ]

  const awarded: DbBadge[] = []
  for (const candidate of candidates) {
    if (!candidate.met || existingKeys.has(candidate.key)) continue

    const { data, error } = await supabase
      .from('badges')
      .insert({
        user_id: user.id,
        badge_key: candidate.key,
        title: candidate.title,
        description: candidate.description,
        icon: candidate.icon,
        metadata: candidate.metadata,
      })
      .select('*')
      .maybeSingle()

    if (error) {
      if (error.code === '23505') continue
      throw error
    }

    if (data) {
      const badge = {
        ...(data as DbBadge),
        metadata: toJsonMap(data.metadata) ?? {},
      }
      awarded.push(badge)
      await insertActivityEvent(supabase, {
        userId: user.id,
        eventType: 'badge_unlocked',
        metadata: {
          badge_key: badge.badge_key,
          title: badge.title,
        },
      })
    }
  }

  return awarded
}

export async function listClubs(supabase: Client, limit = 20): Promise<DbClub[]> {
  const currentUser = await getCurrentUser(supabase)
  const { data } = await supabase
    .from('clubs')
    .select(`*, current_book:books ( ${BOOK_SELECT} )`)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  const mapped = (data ?? []).map(mapClub)
  const ids = mapped.map((club) => club.id)
  const { countMap, membershipSet } = await getClubCounts(supabase, ids, currentUser?.id)

  return mapped.map((club) => ({
    ...club,
    member_count: countMap.get(club.id) ?? 0,
    is_member: membershipSet.has(club.id) || club.owner_id === currentUser?.id,
  }))
}

export async function getClub(supabase: Client, clubId: string): Promise<DbClub | null> {
  const currentUser = await getCurrentUser(supabase)
  const { data } = await supabase
    .from('clubs')
    .select(`*, current_book:books ( ${BOOK_SELECT} )`)
    .eq('id', clubId)
    .maybeSingle()

  if (!data) return null

  const { countMap, membershipSet } = await getClubCounts(supabase, [clubId], currentUser?.id)
  return {
    ...mapClub(data),
    member_count: countMap.get(clubId) ?? 0,
    is_member: membershipSet.has(clubId) || data.owner_id === currentUser?.id,
  }
}

export async function createClub(
  supabase: Client,
  input: {
    name: string
    description?: string
    isPublic?: boolean
    currentBookId?: string | null
  }
): Promise<DbClub> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('clubs')
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_public: input.isPublic ?? true,
      current_book_id: input.currentBookId ?? null,
    })
    .select(`*, current_book:books ( ${BOOK_SELECT} )`)
    .single()

  if (error) throw error

  await supabase.from('club_members').upsert(
    {
      club_id: data.id,
      user_id: user.id,
      role: 'owner',
    },
    { onConflict: 'club_id,user_id' }
  )

  return {
    ...mapClub(data),
    member_count: 1,
    is_member: true,
  }
}

export async function joinClub(supabase: Client, clubId: string) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase.from('club_members').upsert(
    {
      club_id: clubId,
      user_id: user.id,
      role: 'member',
    },
    { onConflict: 'club_id,user_id' }
  )

  if (error) throw error

  const { data: club } = await supabase
    .from('clubs')
    .select('owner_id, name')
    .eq('id', clubId)
    .maybeSingle()
  if (club?.owner_id) {
    const actor = await supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle()
    const actorName = actor.data?.display_name ?? actor.data?.username ?? 'Someone'
    await insertNotification(supabase, {
      userId: club.owner_id,
      actorId: user.id,
      type: 'club_invite',
      entityType: 'club',
      entityId: clubId,
      message: `${actorName} joined ${club.name}`,
    })
  }
}

export async function leaveClub(supabase: Client, clubId: string) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const club = await getClub(supabase, clubId)
  if (club?.owner_id === user.id) {
    throw new Error('Owners cannot leave their own club yet')
  }

  const { error } = await supabase
    .from('club_members')
    .delete()
    .eq('club_id', clubId)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function listClubPosts(
  supabase: Client,
  clubId: string,
  limit = 30
): Promise<DbClubPost[]> {
  const { data } = await supabase
    .from('club_posts')
    .select(`*, profile:profiles!club_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .eq('club_id', clubId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map(mapClubPost)
}

export async function postToClub(
  supabase: Client,
  input: {
    clubId: string
    title: string
    body: string
    bookId?: string | null
  }
): Promise<DbClubPost> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('club_posts')
    .insert({
      club_id: input.clubId,
      user_id: user.id,
      book_id: input.bookId ?? null,
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .select(`*, profile:profiles!club_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .single()

  if (error) throw error
  return mapClubPost(data)
}

export async function listRoadmapFeatures(supabase: Client): Promise<DbRoadmapFeature[]> {
  const user = await getCurrentUser(supabase)
  const { data: features } = await supabase
    .from('roadmap_features')
    .select('*')
    .order('vote_count', { ascending: false })

  if (!user) {
    return (features ?? []).map((feature: any) => ({
      ...(feature as DbRoadmapFeature),
      has_voted: false,
    }))
  }

  const { data: votes } = await supabase
    .from('roadmap_votes')
    .select('feature_id')
    .eq('user_id', user.id)

  const voted = new Set((votes ?? []).map((vote: any) => vote.feature_id))
  return (features ?? []).map((feature: any) => ({
    ...(feature as DbRoadmapFeature),
    has_voted: voted.has(feature.id),
  }))
}

export async function toggleRoadmapVote(
  supabase: Client,
  featureId: string
): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing } = await supabase
    .from('roadmap_votes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('feature_id', featureId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('roadmap_votes')
      .delete()
      .eq('user_id', user.id)
      .eq('feature_id', featureId)
    return false
  }

  await supabase.from('roadmap_votes').insert({
    user_id: user.id,
    feature_id: featureId,
  })
  return true
}

export async function submitRoadmapFeature(
  supabase: Client,
  input: { title: string; description?: string; category?: string }
): Promise<DbRoadmapFeature> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('roadmap_features')
    .insert({
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? 'feature',
      status: 'considering',
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw error
  return { ...(data as DbRoadmapFeature), has_voted: false }
}

export function avatarColorFor(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return `oklch(60% 0.15 ${hash % 360})`
}

export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function hashHue(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash % 360
}

export function toUiBook(
  book: DbBookWithAuthors | null | undefined,
  stats?: DbBookStats | null
) {
  if (!book) {
    return {
      id: 'unknown',
      title: 'Unknown',
      author: '',
      cover: '',
      rating: 0,
      ratings: 0,
      mood: [] as string[],
      genre: '',
      pages: 0,
      year: 0,
      color: '#222',
    }
  }

  return {
    id: book.id,
    title: book.title,
    author: book.authors.map((author) => author.name).join(', ') || 'Unknown',
    cover: book.cover_url ?? '',
    rating: stats?.avg_rating ?? 0,
    ratings: stats?.rating_count ?? 0,
    mood: [] as string[],
    genre: book.genres[0]?.name ?? '',
    pages: book.page_count ?? 0,
    year: book.published_year ?? 0,
    color: `oklch(36% 0.08 ${hashHue(book.id)})`,
  }
}

export function toUiUser(profile: DbProfile | null | undefined) {
  if (!profile) {
    return {
      id: 'anon',
      name: 'Someone',
      handle: 'anon',
      avatar: null,
      color: 'oklch(55% 0.14 200)',
    }
  }

  return {
    id: profile.id,
    name: profile.display_name ?? profile.username ?? 'Reader',
    handle: profile.username ?? profile.id.slice(0, 6),
    avatar: profile.avatar_url,
    color: avatarColorFor(profile.id),
    bio: profile.bio ?? undefined,
  }
}
