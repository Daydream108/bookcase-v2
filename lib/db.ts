import type { SupabaseClient } from '@supabase/supabase-js'

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
  const { data } = await supabase.from('books').select(BOOK_SELECT).ilike('title', like).limit(limit)
  return (data ?? []).map(mapBookWithAuthors)
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
  return data as DbBookPostComment
}

export async function deleteComment(supabase: Client, commentId: string) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase.from('book_post_comments').delete().eq('id', commentId)
  if (error) throw error
}

export async function togglePostUpvote(
  supabase: Client,
  postId: string
): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing } = await supabase
    .from('book_post_upvotes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('book_post_upvotes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId)

    if (error) throw error
    return false
  }

  const { error } = await supabase.from('book_post_upvotes').insert({
    user_id: user.id,
    post_id: postId,
    vote_value: 1,
  })

  if (error) throw error
  return true
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

  return true
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
