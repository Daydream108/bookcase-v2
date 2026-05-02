import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoodreadsImportEntry } from './goodreads'
import { buildOpenLibraryCoverUrl } from './openlibrary'

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
  tags: DbTag[]
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

export type DbAccountExport = {
  exported_at: string
  account: {
    id: string
    email: string | null
  }
  profile: DbProfile | null
  notification_preferences: DbNotificationPreferences | null
  shelves: Array<DbUserBook & { book: DbBookWithAuthors | null }>
  favorites: DbFavoriteBook[]
  sessions: DbReadingSession[]
  reviews: DbReview[]
  threads: DbBookPost[]
  blocked_users: DbBlockedUser[]
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
  book?: DbBookWithAuthors | null
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

export type DbNotificationPreferences = {
  user_id: string
  notify_follows: boolean
  notify_comments: boolean
  notify_upvotes: boolean
  notify_likes: boolean
  notify_club_activity: boolean
  notify_roadmap_updates: boolean
  updated_at: string
}

export type DbContentReport = {
  id: string
  reporter_id: string
  target_user_id: string | null
  entity_type: 'review' | 'book_post' | 'book_post_comment' | 'club'
  entity_id: string
  reason_category:
    | 'spam'
    | 'harassment'
    | 'hate'
    | 'spoilers'
    | 'self_harm'
    | 'sexual_content'
    | 'other'
  details: string | null
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
}

export type DbContentReportRow = DbContentReport & {
  reporter?: DbProfile | null
  target_user?: DbProfile | null
}

export type DbModeratorUser = {
  user_id: string
  added_at: string
  profile: DbProfile | null
}

export type DbBookcasePreferences = {
  user_id: string
  row2_shelf: DbUserBook['status']
  row3_shelf: DbUserBook['status']
  row2_custom_name: string | null
  row3_custom_name: string | null
  updated_at: string
}

export type DbBlockedUser = {
  blocked_user_id: string
  created_at: string
  profile: DbProfile | null
}

export type DbBlockState = {
  blockedByMe: boolean
  blockedMe: boolean
}

export type DbOnboardingState = {
  hasBooks: boolean
  favoritesCount: number
  followingCount: number
  clubsCount: number
  sessionsCount: number
  reviewsCount: number
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
  tagNames?: string[]
}

const BOOK_SELECT = `
  id, title, subtitle, cover_url, description, published_year, page_count, isbn,
  book_authors ( authors ( id, name ) ),
  book_genres ( genres ( id, name ) ),
  book_tags ( tags ( id, name, slug, category, created_at ) )
`

function mapBookWithAuthors(row: any): DbBookWithAuthors {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? null,
    cover_url: resolveBookCoverUrl(row),
    description: row.description ?? null,
    published_year: row.published_year ?? null,
    page_count: row.page_count ?? null,
    isbn: row.isbn ?? null,
    authors: (row.book_authors ?? []).map((item: any) => item.authors).filter(Boolean),
    genres: (row.book_genres ?? []).map((item: any) => item.genres).filter(Boolean),
    tags: (row.book_tags ?? []).map((item: any) => item.tags).filter(Boolean),
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

function isMissingSchemaColumnError(error: unknown, column: string) {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string; details?: string }
  const haystack = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`.toLowerCase()
  return (
    (maybeError.code === 'PGRST204' || haystack.includes('schema cache')) &&
    haystack.includes(column.toLowerCase())
  )
}

function normalizeBookPost(row: any): DbBookPost {
  return {
    ...(row as DbBookPost),
    post_type: row?.post_type ?? 'discussion',
    contains_spoiler: row?.contains_spoiler ?? false,
    upvotes: row?.upvotes ?? 0,
  }
}

function currentYear() {
  return new Date().getFullYear()
}

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function yearFromDateOnly(value?: string | null) {
  const match = value?.match(/^(\d{4})-/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

function dateOnlyToUtcMs(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return Number.NaN
  return Date.UTC(year, month - 1, day)
}

function diffDateOnlyInDays(left: string, right: string) {
  return Math.round((dateOnlyToUtcMs(right) - dateOnlyToUtcMs(left)) / 86_400_000)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

const DEFAULT_NOTIFICATION_PREFERENCES = {
  notify_follows: true,
  notify_comments: true,
  notify_upvotes: true,
  notify_likes: true,
  notify_club_activity: true,
  notify_roadmap_updates: true,
} satisfies Omit<DbNotificationPreferences, 'user_id' | 'updated_at'>

const BOOKCASE_SHELVES = ['reading', 'to_read', 'read', 'dnf'] as const

const DEFAULT_BOOKCASE_PREFERENCES = {
  row2_shelf: 'reading',
  row3_shelf: 'to_read',
  row2_custom_name: null,
  row3_custom_name: null,
} satisfies Omit<DbBookcasePreferences, 'user_id' | 'updated_at'>

function normalizeBookcaseCustomName(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed.slice(0, 40) : null
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

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'to',
  'for',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'book',
])

function splitSearchQuery(input: string) {
  const trimmed = input.trim()
  const parts = trimmed.split(/\s+by\s+/i)
  return {
    title: parts.length > 1 ? parts[0].trim() : '',
    author: parts.length > 1 ? parts.slice(1).join(' by ').trim() : '',
  }
}

function tokenizeSearchTerms(input: string) {
  return Array.from(
    new Set(
      normalizeLookupValue(input)
        .split(' ')
        .map((term) => term.trim())
        .filter((term) => term.length > 1 && !SEARCH_STOP_WORDS.has(term))
    )
  ).slice(0, 8)
}

function buildIlikeClauses(columns: string[], values: string[]) {
  const uniqueValues = Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.replace(/,/g, ' '))
    )
  )

  return uniqueValues.flatMap((value) => {
    const like = `%${escapeLikePattern(value)}%`
    return columns.map((column) => `${column}.ilike.${like}`)
  })
}

function scoreBookSearchResult(
  book: DbBookWithAuthors,
  input: {
    rawQuery: string
    titleQuery: string
    authorQuery: string
    terms: string[]
  }
) {
  const normalizedRawQuery = normalizeLookupValue(input.rawQuery)
  const normalizedTitleQuery = normalizeLookupValue(input.titleQuery)
  const normalizedAuthorQuery = normalizeLookupValue(input.authorQuery)
  const normalizedTitle = normalizeLookupValue(book.title)
  const normalizedSubtitle = normalizeLookupValue(book.subtitle ?? '')
  const normalizedDescription = normalizeLookupValue(book.description ?? '')
  const normalizedIsbn = normalizeLookupValue(book.isbn ?? '')
  const normalizedAuthors = book.authors.map((author) => normalizeLookupValue(author.name)).join(' ')
  const normalizedGenres = book.genres.map((genre) => normalizeLookupValue(genre.name)).join(' ')
  const normalizedHaystack = [
    normalizedTitle,
    normalizedSubtitle,
    normalizedDescription,
    normalizedAuthors,
    normalizedGenres,
    normalizedIsbn,
  ].join(' ')

  let score = 0

  if (normalizedRawQuery && normalizedIsbn === normalizedRawQuery) score += 340
  if (normalizedRawQuery && normalizedTitle === normalizedRawQuery) score += 250
  if (normalizedTitleQuery && normalizedTitle === normalizedTitleQuery) score += 300
  if (normalizedTitleQuery && normalizedTitle.startsWith(normalizedTitleQuery)) score += 220
  if (normalizedTitleQuery && normalizedTitle.includes(normalizedTitleQuery)) score += 180
  if (normalizedAuthorQuery && normalizedAuthors.includes(normalizedAuthorQuery)) score += 190
  if (normalizedRawQuery && normalizedHaystack.includes(normalizedRawQuery)) score += 120

  let matchedTerms = 0
  for (const term of input.terms) {
    if (normalizedTitle.includes(term)) {
      score += 34
      matchedTerms += 1
      continue
    }
    if (normalizedAuthors.includes(term)) {
      score += 30
      matchedTerms += 1
      continue
    }
    if (normalizedSubtitle.includes(term)) {
      score += 18
      matchedTerms += 1
      continue
    }
    if (normalizedGenres.includes(term)) {
      score += 14
      matchedTerms += 1
      continue
    }
    if (normalizedDescription.includes(term)) {
      score += 8
      matchedTerms += 1
    }
  }

  if (input.terms.length > 1 && matchedTerms === input.terms.length) {
    score += 130
  }

  return score
}

function normalizeImportedIsbn(input?: string | null) {
  return input?.replace(/[^0-9Xx]/g, '').toUpperCase() || null
}

function resolveBookCoverUrl(input: { cover_url?: string | null; isbn?: string | null }) {
  return (
    input.cover_url ??
    buildOpenLibraryCoverUrl({
      isbn: normalizeImportedIsbn(input.isbn),
    }) ??
    null
  )
}

function notificationPreferenceKeyFor(type: DbNotification['type']) {
  switch (type) {
    case 'follow':
      return 'notify_follows'
    case 'comment':
    case 'review_on_book':
    case 'list_mention':
      return 'notify_comments'
    case 'upvote':
      return 'notify_upvotes'
    case 'like':
      return 'notify_likes'
    case 'club_invite':
      return 'notify_club_activity'
    case 'roadmap_status':
      return 'notify_roadmap_updates'
    default:
      return null
  }
}

function mapNotificationPreferences(row: any): DbNotificationPreferences {
  return {
    user_id: row.user_id,
    notify_follows: row.notify_follows ?? DEFAULT_NOTIFICATION_PREFERENCES.notify_follows,
    notify_comments: row.notify_comments ?? DEFAULT_NOTIFICATION_PREFERENCES.notify_comments,
    notify_upvotes: row.notify_upvotes ?? DEFAULT_NOTIFICATION_PREFERENCES.notify_upvotes,
    notify_likes: row.notify_likes ?? DEFAULT_NOTIFICATION_PREFERENCES.notify_likes,
    notify_club_activity:
      row.notify_club_activity ?? DEFAULT_NOTIFICATION_PREFERENCES.notify_club_activity,
    notify_roadmap_updates:
      row.notify_roadmap_updates ?? DEFAULT_NOTIFICATION_PREFERENCES.notify_roadmap_updates,
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

function coerceBookcaseShelf(value: unknown, fallback: DbUserBook['status']) {
  return BOOKCASE_SHELVES.includes(value as DbUserBook['status'])
    ? (value as DbUserBook['status'])
    : fallback
}

function mapBookcasePreferences(row: any): DbBookcasePreferences {
  const row2Shelf = coerceBookcaseShelf(
    row.row2_shelf,
    DEFAULT_BOOKCASE_PREFERENCES.row2_shelf
  )
  const row3Fallback = row2Shelf === 'to_read' ? 'read' : DEFAULT_BOOKCASE_PREFERENCES.row3_shelf
  const row3Shelf = coerceBookcaseShelf(row.row3_shelf, row3Fallback)

  return {
    user_id: row.user_id,
    row2_shelf: row2Shelf,
    row3_shelf: row3Shelf === row2Shelf ? row3Fallback : row3Shelf,
    row2_custom_name: row.row2_custom_name?.trim() || null,
    row3_custom_name: row.row3_custom_name?.trim() || null,
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

function mapContentReportRow(row: any): DbContentReportRow {
  const reporter = Array.isArray(row.reporter) ? row.reporter[0] : row.reporter
  const targetUser = Array.isArray(row.target_user) ? row.target_user[0] : row.target_user
  return {
    ...(row as DbContentReport),
    reporter: reporter ? (reporter as DbProfile) : null,
    target_user: targetUser ? (targetUser as DbProfile) : null,
  }
}

function mergeSessionNotes(...notes: Array<string | null | undefined>) {
  return (
    notes
      .map((value) => value?.trim())
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join('\n\n') || null
  )
}

function computeStreakSnapshot(sessionDates: string[]) {
  const uniqueDates = Array.from(
    new Set(
      sessionDates.filter((value) => value && Number.isFinite(dateOnlyToUtcMs(value)))
    )
  ).sort()

  if (!uniqueDates.length) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null as string | null,
    }
  }

  let longest = 1
  let currentRun = 1

  for (let index = 1; index < uniqueDates.length; index += 1) {
    if (diffDateOnlyInDays(uniqueDates[index - 1], uniqueDates[index]) === 1) {
      currentRun += 1
      longest = Math.max(longest, currentRun)
    } else {
      currentRun = 1
    }
  }

  const lastActivityDate = uniqueDates[uniqueDates.length - 1]
  let trailingRun = 1
  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    if (diffDateOnlyInDays(uniqueDates[index - 1], uniqueDates[index]) === 1) {
      trailingRun += 1
      continue
    }
    break
  }

  const daysSinceLast = diffDateOnlyInDays(lastActivityDate, localDateString())
  const current = daysSinceLast <= 1 ? trailingRun : 0

  return {
    current_streak: current,
    longest_streak: longest,
    last_activity_date: lastActivityDate,
  }
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

async function getNotificationPreferencesForUser(
  supabase: Client,
  userId: string
): Promise<DbNotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') return null
    throw error
  }

  return data ? mapNotificationPreferences(data) : null
}

async function getHiddenUserIdsForViewer(
  supabase: Client,
  viewerId?: string | null
): Promise<Set<string>> {
  if (!viewerId) return new Set<string>()

  const { data } = await supabase
    .from('blocked_users')
    .select('user_id, blocked_user_id')
    .or(`user_id.eq.${viewerId},blocked_user_id.eq.${viewerId}`)

  const hidden = new Set<string>()
  for (const row of (data ?? []) as Array<{ user_id: string; blocked_user_id: string }>) {
    if (row.user_id === viewerId && row.blocked_user_id) hidden.add(row.blocked_user_id)
    if (row.blocked_user_id === viewerId && row.user_id) hidden.add(row.user_id)
  }

  return hidden
}

async function getBlockStateForUsers(
  supabase: Client,
  viewerId: string,
  targetUserId: string
): Promise<DbBlockState> {
  const [{ data: blockedByMe }, { data: blockedMe }] = await Promise.all([
    supabase
      .from('blocked_users')
      .select('user_id')
      .eq('user_id', viewerId)
      .eq('blocked_user_id', targetUserId)
      .maybeSingle(),
    supabase
      .from('blocked_users')
      .select('user_id')
      .eq('user_id', targetUserId)
      .eq('blocked_user_id', viewerId)
      .maybeSingle(),
  ])

  return {
    blockedByMe: Boolean(blockedByMe),
    blockedMe: Boolean(blockedMe),
  }
}

function filterRowsByHiddenUsers<T extends { user_id: string }>(rows: T[], hiddenUserIds: Set<string>) {
  if (!hiddenUserIds.size) return rows
  return rows.filter((row) => !hiddenUserIds.has(row.user_id))
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

  const [prefs, blockState] = await Promise.all([
    getNotificationPreferencesForUser(supabase, input.userId),
    getBlockStateForUsers(supabase, input.actorId, input.userId),
  ])

  if (blockState.blockedByMe || blockState.blockedMe) return

  const preferenceKey = notificationPreferenceKeyFor(input.type)
  if (prefs && preferenceKey && prefs[preferenceKey] === false) return

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

const USERNAME_MENTION_REGEX = /(^|[^a-z0-9_])@([a-z0-9_][a-z0-9_.-]{1,29})/gi

function extractMentionedUsernames(...inputs: Array<string | null | undefined>) {
  const handles = new Set<string>()

  for (const input of inputs) {
    if (!input) continue
    for (const match of input.matchAll(USERNAME_MENTION_REGEX)) {
      const handle = match[2]?.trim().toLowerCase()
      if (handle) handles.add(handle)
    }
  }

  return [...handles]
}

async function getActorName(supabase: Client, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', userId)
    .maybeSingle()

  return data?.display_name ?? data?.username ?? 'Someone'
}

async function notifyMentionedUsers(
  supabase: Client,
  input: {
    actorId: string
    entityType: 'book_post' | 'comment' | 'club'
    entityId: string
    message: string
    texts: Array<string | null | undefined>
  }
) {
  const handles = extractMentionedUsernames(...input.texts)
  if (!handles.length) return

  const query = handles
    .map((handle) => `username.ilike.${escapeLikePattern(handle)}`)
    .join(',')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(query)
    .limit(handles.length)

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('mention lookup failed:', error.message)
    }
    return
  }

  const mentionedUsers = (data ?? []) as DbProfile[]
  for (const profile of mentionedUsers) {
    await insertNotification(supabase, {
      userId: profile.id,
      actorId: input.actorId,
      type: 'list_mention',
      entityType: input.entityType,
      entityId: input.entityId,
      message: input.message,
    })
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
    ...normalizeBookPost(post),
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

export async function getNotificationPreferences(
  supabase: Client
): Promise<DbNotificationPreferences | null> {
  const user = await getCurrentUser(supabase)
  if (!user) return null
  return getNotificationPreferencesForUser(supabase, user.id)
}

export async function exportMyAccountData(supabase: Client): Promise<DbAccountExport> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const [profile, notificationPreferences, shelves, favorites, sessions, blocks, reviewsResult, postsResult] =
    await Promise.all([
      getCurrentProfile(supabase),
      getNotificationPreferences(supabase),
      listShelf(supabase, user.id),
      listFavorites(supabase, user.id),
      listRecentSessions(supabase, user.id, 3650),
      listBlockedUsers(supabase),
      supabase
        .from('reviews')
        .select(`*, profile:profiles!reviews_user_id_fkey ( * )`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('book_posts')
        .select(`*, profile:profiles!book_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

  if (reviewsResult.error) throw reviewsResult.error
  if (postsResult.error) throw postsResult.error

  const threads = await hydrateBookPostCounts(
    supabase,
    (postsResult.data ?? []).map((row: any) =>
      normalizeBookPost({
        ...row,
        book: row.book ? mapBookWithAuthors(row.book) : null,
      })
    )
  )

  return {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
    },
    profile,
    notification_preferences: notificationPreferences,
    shelves,
    favorites,
    sessions,
    reviews: (reviewsResult.data ?? []) as DbReview[],
    threads,
    blocked_users: blocks,
  }
}

export async function upsertNotificationPreferences(
  supabase: Client,
  patch: Partial<Omit<DbNotificationPreferences, 'user_id' | 'updated_at'>>
): Promise<DbNotificationPreferences> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error) {
    if (error.code === '42P01') {
      throw new Error(
        'Notification preferences need the latest Supabase migration before they can be saved.'
      )
    }
    throw error
  }
  return mapNotificationPreferences(data)
}

export async function getBookcasePreferences(
  supabase: Client,
  userId: string
): Promise<{ supported: boolean; preferences: DbBookcasePreferences | null }> {
  const { data, error } = await supabase
    .from('bookcase_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') {
      return {
        supported: false,
        preferences: null,
      }
    }
    throw error
  }

  return {
    supported: true,
    preferences: data ? mapBookcasePreferences(data) : null,
  }
}

export async function upsertBookcasePreferences(
  supabase: Client,
  patch: Partial<Omit<DbBookcasePreferences, 'user_id' | 'updated_at'>>
): Promise<DbBookcasePreferences> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const current = await getBookcasePreferences(supabase, user.id)
  const nextRow2 = coerceBookcaseShelf(
    patch.row2_shelf,
    current.preferences?.row2_shelf ?? DEFAULT_BOOKCASE_PREFERENCES.row2_shelf
  )
  const nextRow3 = coerceBookcaseShelf(
    patch.row3_shelf,
    current.preferences?.row3_shelf ?? DEFAULT_BOOKCASE_PREFERENCES.row3_shelf
  )

  if (nextRow2 === nextRow3) {
    throw new Error('Choose two different shelves for rows 2 and 3')
  }

  const { data, error } = await supabase
    .from('bookcase_preferences')
    .upsert(
      {
        user_id: user.id,
        ...DEFAULT_BOOKCASE_PREFERENCES,
        ...(current.preferences ?? {}),
        ...patch,
        row2_shelf: nextRow2,
        row3_shelf: nextRow3,
        row2_custom_name: normalizeBookcaseCustomName(
          patch.row2_custom_name ?? current.preferences?.row2_custom_name
        ),
        row3_custom_name: normalizeBookcaseCustomName(
          patch.row3_custom_name ?? current.preferences?.row3_custom_name
        ),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error) {
    if (error.code === '42P01') {
      throw new Error(
        'Bookcase syncing needs the latest Supabase migration before it can be saved.'
      )
    }
    throw error
  }

  return mapBookcasePreferences(data)
}

export async function getUserBlockState(
  supabase: Client,
  targetUserId: string
): Promise<DbBlockState> {
  const user = await getCurrentUser(supabase)
  if (!user) {
    return {
      blockedByMe: false,
      blockedMe: false,
    }
  }

  return getBlockStateForUsers(supabase, user.id, targetUserId)
}

export async function toggleBlockUser(
  supabase: Client,
  targetUserId: string
): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')
  if (user.id === targetUserId) throw new Error('You cannot block yourself')

  const state = await getBlockStateForUsers(supabase, user.id, targetUserId)
  if (state.blockedByMe) {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('user_id', user.id)
      .eq('blocked_user_id', targetUserId)
    if (error) throw error
    return false
  }

  const { error } = await supabase.from('blocked_users').insert({
    user_id: user.id,
    blocked_user_id: targetUserId,
  })
  if (error) throw error

  await Promise.all([
    supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId),
    supabase
      .from('follows')
      .delete()
      .eq('follower_id', targetUserId)
      .eq('following_id', user.id),
  ])

  return true
}

export async function listBlockedUsers(supabase: Client): Promise<DbBlockedUser[]> {
  const user = await getCurrentUser(supabase)
  if (!user) return []

  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_user_id, created_at, profile:profiles!blocked_users_blocked_user_id_fkey ( * )')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') return []
    throw error
  }

  return (
    (data ?? []) as Array<{
      blocked_user_id: string
      created_at: string
      profile?: DbProfile[] | DbProfile | null
    }>
  ).map((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
    return {
      blocked_user_id: row.blocked_user_id,
      created_at: row.created_at,
      profile: profile ?? null,
    }
  })
}

export async function createContentReport(
  supabase: Client,
  input: {
    entityType: DbContentReport['entity_type']
    entityId: string
    targetUserId?: string | null
    reasonCategory: DbContentReport['reason_category']
    details?: string | null
  }
): Promise<DbContentReport> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reporter_id: user.id,
      target_user_id: input.targetUserId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      reason_category: input.reasonCategory,
      details: input.details?.trim() || null,
    })
      .select('*')
      .single()

  if (error) {
    if (error.code === '42P01') {
      throw new Error('Reporting needs the latest Supabase migration before it can be used.')
    }
    throw error
  }
  return data as DbContentReport
}

export async function isModerator(supabase: Client): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  if (!user) return false

  const { data, error } = await supabase
    .from('moderator_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') return false
    throw error
  }

  return Boolean(data?.user_id)
}

export async function listModerators(supabase: Client): Promise<DbModeratorUser[]> {
  const user = await getCurrentUser(supabase)
  if (!user) return []
  if (!(await isModerator(supabase))) return []

  const { data, error } = await supabase
    .from('moderator_users')
    .select('user_id, added_at, profile:profiles ( * )')
    .order('added_at', { ascending: true })

  if (error) {
    if (error.code === '42P01') return []
    throw error
  }

  return ((data ?? []) as Array<{
    user_id: string
    added_at: string
    profile: DbProfile[] | DbProfile | null
  }>).map((row) => ({
    user_id: row.user_id,
    added_at: row.added_at,
    profile: Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile ?? null,
  }))
}

export async function grantModeratorRole(supabase: Client, userId: string): Promise<void> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')
  if (!(await isModerator(supabase))) {
    throw new Error('Moderator access required')
  }

  const { error } = await supabase.from('moderator_users').insert({ user_id: userId })

  if (error) {
    if (error.code === '23505') return
    if (error.code === '42P01' || error.code === '42501') {
      throw new Error('Moderator management needs the latest Supabase SQL before it can be used.')
    }
    throw error
  }
}

export async function revokeModeratorRole(supabase: Client, userId: string): Promise<void> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')
  if (!(await isModerator(supabase))) {
    throw new Error('Moderator access required')
  }

  const moderators = await listModerators(supabase)
  if (moderators.length <= 1 && moderators.some((entry) => entry.user_id === userId)) {
    throw new Error('Keep at least one moderator on the beta.')
  }

  const { error } = await supabase.from('moderator_users').delete().eq('user_id', userId)

  if (error) {
    if (error.code === '42P01' || error.code === '42501') {
      throw new Error('Moderator management needs the latest Supabase SQL before it can be used.')
    }
    throw error
  }
}

export async function listContentReports(
  supabase: Client,
  options: {
    scope?: 'mine' | 'moderation'
    status?: DbContentReport['status'] | 'all'
    limit?: number
  } = {}
): Promise<DbContentReportRow[]> {
  const user = await getCurrentUser(supabase)
  if (!user) return []

  const scope = options.scope ?? 'mine'
  if (scope === 'moderation' && !(await isModerator(supabase))) {
    return []
  }

  let query = supabase
    .from('content_reports')
    .select(
      `*,
       reporter:profiles!content_reports_reporter_id_fkey ( * ),
       target_user:profiles!content_reports_target_user_id_fkey ( * )`
    )
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 100)

  if (scope === 'mine') {
    query = query.eq('reporter_id', user.id)
  }

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    if (error.code === '42P01') return []
    throw error
  }

  return (data ?? []).map(mapContentReportRow)
}

export async function updateContentReportStatus(
  supabase: Client,
  reportId: string,
  status: DbContentReport['status']
): Promise<DbContentReportRow> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')
  if (!(await isModerator(supabase))) {
    throw new Error('Moderator access required')
  }

  const { data, error } = await supabase
    .from('content_reports')
    .update({ status })
    .eq('id', reportId)
    .select(
      `*,
       reporter:profiles!content_reports_reporter_id_fkey ( * ),
       target_user:profiles!content_reports_target_user_id_fkey ( * )`
    )
    .single()

  if (error) {
    if (error.code === '42P01') {
      throw new Error('Moderation tools need the latest Supabase migration before they can be used.')
    }
    throw error
  }

  return mapContentReportRow(data)
}

export async function getOnboardingState(
  supabase: Client
): Promise<DbOnboardingState | null> {
  const user = await getCurrentUser(supabase)
  if (!user) return null

  const [{ count: booksCount }, { count: favoritesCount }, stats, { count: clubsCount }, { count: sessionsCount }, { count: reviewsCount }] =
    await Promise.all([
      supabase.from('user_books').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('favorite_books').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      getProfileStats(supabase, user.id),
      supabase.from('club_members').select('club_id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('reading_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

  return {
    hasBooks: (booksCount ?? 0) > 0,
    favoritesCount: favoritesCount ?? 0,
    followingCount: stats.following_count ?? 0,
    clubsCount: clubsCount ?? 0,
    sessionsCount: sessionsCount ?? 0,
    reviewsCount: reviewsCount ?? 0,
  }
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

  const parsed = splitSearchQuery(query)
  const terms = tokenizeSearchTerms(query)
  const candidateLimit = clamp(limit * 4, limit, 90)
  const bookClauses = buildIlikeClauses(
    ['title', 'subtitle', 'description', 'isbn'],
    [query, parsed.title, ...terms]
  )
  const authorClauses = buildIlikeClauses(['name'], [parsed.author, query, ...terms])
  const taxonomyClauses = buildIlikeClauses(['name'], [query, parsed.title, ...terms])

  const [directMatches, authorMatches, genreMatches, tagMatches] = await Promise.all([
    supabase
      .from('books')
      .select(BOOK_SELECT)
      .or(bookClauses.join(','))
      .limit(candidateLimit),
    supabase
      .from('authors')
      .select('id, book_authors ( book:books ( ' + BOOK_SELECT + ' ) )')
      .or(authorClauses.join(','))
      .limit(20),
    supabase
      .from('genres')
      .select('id, book_genres ( book:books ( ' + BOOK_SELECT + ' ) )')
      .or(taxonomyClauses.join(','))
      .limit(12),
    supabase
      .from('tags')
      .select('id, book_tags ( book:books ( ' + BOOK_SELECT + ' ) )')
      .or(taxonomyClauses.join(','))
      .limit(12),
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

  return [...byId.values()]
    .map((book) => ({
      book,
      score: scoreBookSearchResult(book, {
        rawQuery: query,
        titleQuery: parsed.title,
        authorQuery: parsed.author,
        terms,
      }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return (right.book.published_year ?? 0) - (left.book.published_year ?? 0)
    })
    .slice(0, limit)
    .map((entry) => entry.book)
}

export async function searchProfiles(
  supabase: Client,
  q: string,
  limit = 12
): Promise<DbProfile[]> {
  const query = q.trim()
  if (!query) return []
  const currentUser = await getCurrentUser(supabase)
  const like = `%${query.replace(/%/g, '\\%')}%`
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.${like},display_name.ilike.${like},bio.ilike.${like}`)
    .limit(limit)
  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  return ((data ?? []) as DbProfile[]).filter((profile) => !hiddenUserIds.has(profile.id))
}

export async function searchClubsByName(
  supabase: Client,
  q: string,
  limit = 12
): Promise<DbClub[]> {
  const query = q.trim()
  if (!query) return []
  const currentUser = await getCurrentUser(supabase)
  const like = `%${query.replace(/%/g, '\\%')}%`
  const { data } = await supabase
    .from('clubs')
    .select(`*, current_book:books ( ${BOOK_SELECT} )`)
    .eq('is_public', true)
    .or(`name.ilike.${like},description.ilike.${like}`)
    .limit(limit)
  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  return (data ?? [])
    .map(mapClub)
    .filter((club) => !hiddenUserIds.has(club.owner_id))
}

export async function searchBookPosts(
  supabase: Client,
  q: string,
  limit = 12
): Promise<DbBookPost[]> {
  const query = q.trim()
  if (!query) return []
  const currentUser = await getCurrentUser(supabase)
  const like = `%${query.replace(/%/g, '\\%')}%`
  const { data } = await supabase
    .from('book_posts')
    .select(`*, profile:profiles!book_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .or(`title.ilike.${like},body.ilike.${like}`)
    .order('upvotes', { ascending: false, nullsFirst: false })
    .limit(limit)

  const mapped = (data ?? []).map((row: any) =>
    normalizeBookPost({
      ...row,
      book: row.book ? mapBookWithAuthors(row.book) : null,
    })
  )

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  return hydrateBookPostCounts(supabase, filterRowsByHiddenUsers(mapped, hiddenUserIds))
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
  rawTagName: string,
  category: DbTag['category'] = 'theme'
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
        category,
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
  if (existing) {
    await ensureImportedBookTags(supabase, existing.id, input.tagNames)
    return { book: existing, created: false }
  }

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
    cover_url: input.coverUrl ?? resolveBookCoverUrl({ isbn: canonicalIsbn }) ?? null,
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
  await ensureImportedBookTags(supabase, book.id, input.tagNames)
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
      cover_url: resolveBookCoverUrl({ isbn: canonicalIsbn }),
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
      tagNames: normalizeImportedTagNames(input.tagNames),
    },
    bookCache,
    authorCache
  )
}

function normalizeImportedTagNames(input?: string[]) {
  return Array.from(
    new Set(
      (input ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
    )
  )
}

async function ensureImportedBookTags(
  supabase: Client,
  bookId: string,
  tagNames?: string[]
) {
  const normalized = normalizeImportedTagNames(tagNames)
  for (const tagName of normalized) {
    await addTag(supabase, bookId, tagName, 'style')
  }
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
  const today = localDateString()
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
  const existingFinishedYear = yearFromDateOnly(existing?.finished_at)
  const rowFinishedYear = yearFromDateOnly(row.finished_at)
  if (existingFinishedYear !== null) goalYears.add(existingFinishedYear)
  if (rowFinishedYear !== null) goalYears.add(rowFinishedYear)
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
        const finishedYear = yearFromDateOnly(userBook.finished_at)
        if (finishedYear !== null) yearsToSync.add(finishedYear)
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
  const currentUser = await getCurrentUser(supabase)
  const { data } = await supabase
    .from('reviews')
    .select(`*, profile:profiles!reviews_user_id_fkey ( * )`)
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(limit)

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  return filterRowsByHiddenUsers((data ?? []) as DbReview[], hiddenUserIds)
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

export async function updateReview(
  supabase: Client,
  reviewId: string,
  input: { rating: number; body?: string; spoiler?: boolean }
): Promise<DbReview> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('reviews')
    .update({
      rating: input.rating,
      body: input.body?.trim() ?? '',
      contains_spoiler: input.spoiler ?? false,
    })
    .eq('id', reviewId)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) throw error
  return data as DbReview
}

export async function deleteReview(supabase: Client, reviewId: string) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id)
  if (error) throw error
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
  const currentUser = await getCurrentUser(supabase)
  const { data } = await supabase
    .from('book_posts')
    .select(`*, profile:profiles!book_posts_user_id_fkey ( * )`)
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(limit)

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  return hydrateBookPostCounts(
    supabase,
    filterRowsByHiddenUsers((data ?? []).map(normalizeBookPost), hiddenUserIds)
  )
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

  const trimmedTitle = input.title.trim()
  const trimmedBody = input.body?.trim() || null

  const requiredPayload = {
    user_id: user.id,
    book_id: input.bookId,
    title: trimmedTitle,
    body: trimmedBody,
  }

  const preferredPayloads = [
    {
      ...requiredPayload,
      post_type: input.post_type ?? 'discussion',
      contains_spoiler: input.spoiler ?? false,
    },
    {
      ...requiredPayload,
      post_type: input.post_type ?? 'discussion',
    },
    requiredPayload,
  ]

  let lastError: unknown = null
  for (const payload of preferredPayloads) {
    const { data, error } = await supabase
      .from('book_posts')
      .insert(payload)
      .select('*')
      .single()

    if (!error) {
      const createdPost = normalizeBookPost(data)
      const actorName = await getActorName(supabase, user.id)
      await notifyMentionedUsers(supabase, {
        actorId: user.id,
        entityType: 'book_post',
        entityId: createdPost.id,
        message: `${actorName} mentioned you in "${createdPost.title}"`,
        texts: [trimmedTitle, trimmedBody],
      })
      return createdPost
    }
    lastError = error

    if (
      !isMissingSchemaColumnError(error, 'contains_spoiler') &&
      !isMissingSchemaColumnError(error, 'post_type')
    ) {
      throw error
    }
  }

  throw lastError
}

export async function updateBookPost(
  supabase: Client,
  postId: string,
  input: {
    title: string
    body?: string
    post_type?: DbBookPost['post_type']
    spoiler?: boolean
  }
): Promise<DbBookPost> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const requiredPayload = {
    title: input.title.trim(),
    body: input.body?.trim() || null,
  }

  const preferredPayloads = [
    {
      ...requiredPayload,
      post_type: input.post_type ?? 'discussion',
      contains_spoiler: input.spoiler ?? false,
    },
    {
      ...requiredPayload,
      post_type: input.post_type ?? 'discussion',
    },
    requiredPayload,
  ]

  let lastError: unknown = null
  for (const payload of preferredPayloads) {
    const { data, error } = await supabase
      .from('book_posts')
      .update(payload)
      .eq('id', postId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (!error) return normalizeBookPost(data)
    lastError = error

    if (
      !isMissingSchemaColumnError(error, 'contains_spoiler') &&
      !isMissingSchemaColumnError(error, 'post_type')
    ) {
      throw error
    }
  }

  throw lastError
}

export async function deleteBookPost(supabase: Client, postId: string) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('book_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)
  if (error) throw error
}

export async function listRecentBookPosts(
  supabase: Client,
  limit = 30
): Promise<DbBookPost[]> {
  const currentUser = await getCurrentUser(supabase)
  const { data } = await supabase
    .from('book_posts')
    .select(`*, profile:profiles!book_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .order('created_at', { ascending: false })
    .limit(limit)

  const mapped = (data ?? []).map((row: any) =>
    normalizeBookPost({
      ...row,
      book: row.book ? mapBookWithAuthors(row.book) : null,
    })
  )

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  return hydrateBookPostCounts(
    supabase,
    filterRowsByHiddenUsers(mapped, hiddenUserIds)
  )
}

export async function listPostComments(
  supabase: Client,
  postId: string,
  limit = 50
): Promise<DbBookPostComment[]> {
  const currentUser = await getCurrentUser(supabase)
  const { data } = await supabase
    .from('book_post_comments')
    .select(`*, profile:profiles!book_post_comments_user_id_fkey ( * )`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(limit)

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  return filterRowsByHiddenUsers((data ?? []) as DbBookPostComment[], hiddenUserIds)
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
  const trimmedBody = input.body.trim()

  const basePayload = {
    post_id: input.postId,
    user_id: user.id,
    body: trimmedBody,
  }

  const buildPayload = (opts: { withSpoiler: boolean; withParent: boolean }) => {
    const payload: Record<string, unknown> = { ...basePayload }
    if (opts.withSpoiler) payload.contains_spoiler = input.spoiler ?? false
    if (opts.withParent) payload.parent_id = input.parentId ?? null
    return payload
  }

  let result = await supabase
    .from('book_post_comments')
    .insert(buildPayload({ withSpoiler: true, withParent: true }))
    .select('*')
    .single()

  if (isMissingSchemaColumnError(result.error, 'parent_id')) {
    result = await supabase
      .from('book_post_comments')
      .insert(buildPayload({ withSpoiler: true, withParent: false }))
      .select('*')
      .single()
  }
  if (isMissingSchemaColumnError(result.error, 'contains_spoiler')) {
    const lastTry = await supabase
      .from('book_post_comments')
      .insert(buildPayload({ withSpoiler: false, withParent: false }))
      .select('*')
      .single()
    if (lastTry.error) throw lastTry.error
    result = {
      ...lastTry,
      data: { ...(lastTry.data as DbBookPostComment), contains_spoiler: false },
    }
  }

  const { data, error } = result
  if (error) throw error

  const { data: post } = await supabase
    .from('book_posts')
    .select('user_id, title')
    .eq('id', input.postId)
    .maybeSingle()
  const actorName = await getActorName(supabase, user.id)

  if (post?.user_id) {
    await insertNotification(supabase, {
      userId: post.user_id,
      actorId: user.id,
      type: 'comment',
      entityType: 'book_post',
      entityId: input.postId,
      message: `${actorName} commented on "${post.title}"`,
    })
  }

  if (input.parentId) {
    const { data: parent } = await supabase
      .from('book_post_comments')
      .select('user_id')
      .eq('id', input.parentId)
      .maybeSingle()

    if (parent?.user_id && parent.user_id !== post?.user_id) {
      await insertNotification(supabase, {
        userId: parent.user_id,
        actorId: user.id,
        type: 'comment',
        entityType: 'comment',
        entityId: input.parentId,
        message: `${actorName} replied to your comment`,
      })
    }
  }

  await notifyMentionedUsers(supabase, {
    actorId: user.id,
    entityType: 'comment',
    entityId: (data as DbBookPostComment).id,
    message: `${actorName} mentioned you in a comment${post?.title ? ` on "${post.title}"` : ''}`,
    texts: [trimmedBody],
  })

  return data as DbBookPostComment
}

export async function updateComment(
  supabase: Client,
  commentId: string,
  input: {
    body: string
    spoiler?: boolean
  }
): Promise<DbBookPostComment> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing, error: existingError } = await supabase
    .from('book_post_comments')
    .select('id, user_id, created_at, contains_spoiler')
    .eq('id', commentId)
    .maybeSingle()

  if (existingError) throw existingError
  if (!existing || existing.user_id !== user.id) {
    throw new Error('You can only edit your own comment')
  }

  const createdAt = new Date(existing.created_at).getTime()
  if (!Number.isFinite(createdAt)) {
    throw new Error('This comment can no longer be edited')
  }

  const hoursSinceCreation = (Date.now() - createdAt) / 3_600_000
  if (hoursSinceCreation > 24) {
    throw new Error('Comments can only be edited for 24 hours')
  }

  const preferredPayload = {
    body: input.body.trim(),
    contains_spoiler: input.spoiler ?? existing.contains_spoiler ?? false,
  }

  const updated = await supabase
    .from('book_post_comments')
    .update(preferredPayload)
    .eq('id', commentId)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (isMissingSchemaColumnError(updated.error, 'contains_spoiler')) {
    const fallback = await supabase
      .from('book_post_comments')
      .update({ body: input.body.trim() })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (fallback.error) throw fallback.error
    return {
      ...(fallback.data as DbBookPostComment),
      contains_spoiler: existing.contains_spoiler ?? false,
    }
  }

  if (updated.error) throw updated.error
  return updated.data as DbBookPostComment
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

  let voteValueSupported = true
  let existing: { vote_value?: number } | null = null

  const initial = await supabase
    .from('book_post_upvotes')
    .select('vote_value')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle()

  if (initial.error && isMissingSchemaColumnError(initial.error, 'vote_value')) {
    voteValueSupported = false
    const fallback = await supabase
      .from('book_post_upvotes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle()
    if (fallback.error) throw fallback.error
    existing = fallback.data ? { vote_value: 1 } : null
  } else if (initial.error) {
    throw initial.error
  } else {
    existing = initial.data
  }

  const currentVote = (existing?.vote_value ?? 0) as PostVote

  // If vote_value is not supported in prod, downvotes silently behave as upvotes.
  const effectiveNext: PostVote = voteValueSupported ? next : next === -1 ? 1 : next

  if (effectiveNext === 0) {
    if (!existing) return 0
    const { error } = await supabase
      .from('book_post_upvotes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId)
    if (error) throw error
    return 0
  }

  if (currentVote === effectiveNext) return currentVote

  if (existing) {
    if (voteValueSupported) {
      const { error } = await supabase
        .from('book_post_upvotes')
        .update({ vote_value: effectiveNext })
        .eq('user_id', user.id)
        .eq('post_id', postId)
      if (error) throw error
    }
    // If unsupported, the row already exists representing an upvote — no-op.
  } else {
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      post_id: postId,
    }
    if (voteValueSupported) insertPayload.vote_value = effectiveNext
    const { error } = await supabase.from('book_post_upvotes').insert(insertPayload)
    if (error && isMissingSchemaColumnError(error, 'vote_value')) {
      const retry = await supabase.from('book_post_upvotes').insert({
        user_id: user.id,
        post_id: postId,
      })
      if (retry.error) throw retry.error
    } else if (error) {
      throw error
    }
  }

  if (effectiveNext === 1 && currentVote !== 1) {
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

  return effectiveNext
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
  const currentUser = await getCurrentUser(supabase)
  const { data } = await supabase
    .from('activity_events')
    .select(
      `*,
       profile:profiles!activity_events_user_id_fkey ( * ),
       book:books ( ${BOOK_SELECT} )`
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)

  return (data ?? [])
    .map((row: any) => ({
    ...(row as DbActivityEvent),
    metadata: toJsonMap(row.metadata),
    book: row.book ? mapBookWithAuthors(row.book) : null,
    }))
    .filter((row) => !hiddenUserIds.has(row.user_id))
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

  const sessionDate = input.date ?? localDateString()
  if (diffDateOnlyInDays(localDateString(), sessionDate) > 0) {
    throw new Error('Reading sessions cannot be logged in the future')
  }

  if (!(input.pages ?? 0) && !(input.minutes ?? 0)) {
    throw new Error('Add pages or minutes to log a reading session')
  }

  let existingQuery = supabase
    .from('reading_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('session_date', sessionDate)

  existingQuery = input.bookId
    ? existingQuery.eq('book_id', input.bookId)
    : existingQuery.is('book_id', null)

  const { data: existing } = await existingQuery.maybeSingle()

  const payload = {
    user_id: user.id,
    book_id: input.bookId ?? null,
    pages_read: (existing?.pages_read ?? 0) + (input.pages ?? 0) || null,
    minutes_read: (existing?.minutes_read ?? 0) + (input.minutes ?? 0) || null,
    notes: mergeSessionNotes(existing?.notes, input.notes),
    session_date: sessionDate,
  }

  const { data, error } = existing
    ? await supabase
        .from('reading_sessions')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single()
    : await supabase.from('reading_sessions').insert(payload).select('*').single()

  if (error) throw error

  await touchStreak(supabase, user.id)
  const goalYear = yearFromDateOnly(sessionDate)
  if (goalYear !== null) {
    await syncReadingGoalProgress(supabase, user.id, goalYear)
  }
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

export async function updateReadingSession(
  supabase: Client,
  sessionId: string,
  input: {
    bookId?: string | null
    pages?: number
    minutes?: number
    notes?: string | null
    date?: string
  }
): Promise<DbReadingSession> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing, error: existingError } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (existingError) throw existingError

  const nextDate = input.date ?? existing.session_date
  if (diffDateOnlyInDays(localDateString(), nextDate) > 0) {
    throw new Error('Reading sessions cannot be logged in the future')
  }

  const nextBookId = input.bookId === undefined ? existing.book_id : input.bookId
  const nextPages = input.pages === undefined ? existing.pages_read ?? 0 : Math.max(0, Math.round(input.pages))
  const nextMinutes =
    input.minutes === undefined ? existing.minutes_read ?? 0 : Math.max(0, Math.round(input.minutes))
  const nextNotes = input.notes === undefined ? existing.notes : input.notes?.trim() || null

  if (!nextPages && !nextMinutes) {
    throw new Error('Add pages or minutes to log a reading session')
  }

  let collisionQuery = supabase
    .from('reading_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('session_date', nextDate)
    .neq('id', sessionId)

  collisionQuery = nextBookId
    ? collisionQuery.eq('book_id', nextBookId)
    : collisionQuery.is('book_id', null)

  const { data: collision } = await collisionQuery.maybeSingle()

  let savedRow: DbReadingSession

  if (collision) {
    const { data, error } = await supabase
      .from('reading_sessions')
      .update({
        book_id: nextBookId,
        pages_read: ((collision.pages_read ?? 0) + nextPages) || null,
        minutes_read: ((collision.minutes_read ?? 0) + nextMinutes) || null,
        notes: mergeSessionNotes(collision.notes, nextNotes),
        session_date: nextDate,
      })
      .eq('id', collision.id)
      .select('*')
      .single()

    if (error) throw error

    const { error: deleteError } = await supabase
      .from('reading_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (deleteError) throw deleteError
    savedRow = data as DbReadingSession
  } else {
    const { data, error } = await supabase
      .from('reading_sessions')
      .update({
        book_id: nextBookId,
        pages_read: nextPages || null,
        minutes_read: nextMinutes || null,
        notes: nextNotes,
        session_date: nextDate,
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) throw error
    savedRow = data as DbReadingSession
  }

  await touchStreak(supabase, user.id)
  const yearsToSync = new Set(
    [yearFromDateOnly(existing.session_date), yearFromDateOnly(nextDate)].filter(
      (value): value is number => value !== null
    )
  )

  for (const year of yearsToSync) {
    await syncReadingGoalProgress(supabase, user.id, year)
  }

  return savedRow
}

export async function deleteReadingSession(supabase: Client, sessionId: string): Promise<void> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data: existing, error: existingError } = await supabase
    .from('reading_sessions')
    .select('session_date')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (existingError) throw existingError

  const { error } = await supabase
    .from('reading_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) throw error

  await touchStreak(supabase, user.id)
  const year = yearFromDateOnly(existing.session_date)
  if (year !== null) {
    await syncReadingGoalProgress(supabase, user.id, year)
  }
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
    .select(`*, book:books ( ${BOOK_SELECT} )`)
    .eq('user_id', userId)
    .gte('session_date', localDateString(since))
    .order('session_date', { ascending: false })

  return (data ?? []).map((row: any) => ({
    ...(row as DbReadingSession),
    book: row.book ? mapBookWithAuthors(row.book) : null,
  }))
}

export async function getStreak(
  supabase: Client,
  userId: string
): Promise<{ current_streak: number; longest_streak: number; last_activity_date: string | null }> {
  return touchStreak(supabase, userId)
}

async function touchStreak(
  supabase: Client,
  userId: string
): Promise<{ current_streak: number; longest_streak: number; last_activity_date: string | null }> {
  const { data: sessions } = await supabase
    .from('reading_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .order('session_date', { ascending: true })

  const snapshot = computeStreakSnapshot(
    ((sessions ?? []) as Array<{ session_date: string | null }>)
      .map((row) => row.session_date ?? '')
      .filter(Boolean)
  )

  await supabase.from('streaks').upsert({
    user_id: userId,
    current_streak: snapshot.current_streak,
    longest_streak: snapshot.longest_streak,
    last_activity_date: snapshot.last_activity_date,
    updated_at: new Date().toISOString(),
  })

  return snapshot
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

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, user.id)
  return ((data ?? []) as DbNotification[]).filter(
    (notification) => !notification.actor_id || !hiddenUserIds.has(notification.actor_id)
  )
}

export async function unreadNotificationCount(supabase: Client): Promise<number> {
  const notifications = await listNotifications(supabase, 100)
  return notifications.filter((notification) => !notification.is_read).length
}

export async function markNotificationsRead(supabase: Client, ids?: string[]) {
  const user = await getCurrentUser(supabase)
  if (!user) return

  let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
  if (ids?.length) query = query.in('id', ids)
  const { error } = await query
  if (error) throw error
}

export async function deleteNotifications(supabase: Client, ids?: string[]) {
  const user = await getCurrentUser(supabase)
  if (!user) return

  let query = supabase.from('notifications').delete().eq('user_id', user.id)
  if (ids?.length) query = query.in('id', ids)
  const { error } = await query
  if (error) throw error
}

export async function toggleFollow(supabase: Client, targetUserId: string): Promise<boolean> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')
  if (user.id === targetUserId) throw new Error('You cannot follow yourself')

  const blockState = await getBlockStateForUsers(supabase, user.id, targetUserId)
  if (blockState.blockedByMe) {
    throw new Error('Unblock this reader before following them')
  }
  if (blockState.blockedMe) {
    throw new Error('This reader has blocked you')
  }

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
  let rows: Array<{ post_id: string; vote_value?: number }> = []
  const initial = await supabase
    .from('book_post_upvotes')
    .select('post_id, vote_value')
    .eq('user_id', user.id)
    .in('post_id', postIds)
  if (initial.error && isMissingSchemaColumnError(initial.error, 'vote_value')) {
    const fallback = await supabase
      .from('book_post_upvotes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)
    rows = ((fallback.data ?? []) as Array<{ post_id: string }>).map((row) => ({
      post_id: row.post_id,
    }))
  } else if (initial.error) {
    return {}
  } else {
    rows = (initial.data ?? []) as Array<{ post_id: string; vote_value: number }>
  }
  const result: Record<string, PostVote> = {}
  for (const row of rows) {
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
  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  const visibleClubs = mapped.filter((club) => !hiddenUserIds.has(club.owner_id))
  const ids = visibleClubs.map((club) => club.id)
  const { countMap, membershipSet } = await getClubCounts(supabase, ids, currentUser?.id)

  return visibleClubs.map((club) => ({
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

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  if (hiddenUserIds.has(data.owner_id)) return null

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

export async function updateClub(
  supabase: Client,
  clubId: string,
  input: {
    name?: string
    description?: string | null
    isPublic?: boolean
    currentBookId?: string | null
  }
): Promise<DbClub> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined)
    updates.description = input.description?.trim() ? input.description.trim() : null
  if (input.isPublic !== undefined) updates.is_public = input.isPublic
  if (input.currentBookId !== undefined) updates.current_book_id = input.currentBookId

  const { data, error } = await supabase
    .from('clubs')
    .update(updates)
    .eq('id', clubId)
    .eq('owner_id', user.id)
    .select(`*, current_book:books ( ${BOOK_SELECT} )`)
    .single()

  if (error) throw error

  try {
    if (input.currentBookId !== undefined && input.currentBookId) {
      await supabase
        .from('club_books')
        .update({ status: 'past', finished_at: new Date().toISOString() })
        .eq('club_id', clubId)
        .eq('status', 'current')
        .neq('book_id', input.currentBookId)
      await supabase.from('club_books').upsert(
        {
          club_id: clubId,
          book_id: input.currentBookId,
          status: 'current',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
        { onConflict: 'club_id,book_id' }
      )
    } else if (input.currentBookId === null) {
      await supabase
        .from('club_books')
        .update({ status: 'past', finished_at: new Date().toISOString() })
        .eq('club_id', clubId)
        .eq('status', 'current')
    }
  } catch (err) {
    console.warn('club_books not available; skipping history update', err)
  }

  return mapClub(data)
}

export type DbClubBook = {
  id: string
  club_id: string
  book_id: string
  status: 'current' | 'past'
  position: number
  started_at: string | null
  finished_at: string | null
  added_at: string
  book?: DbBookWithAuthors | null
}

export async function listClubBooks(
  supabase: Client,
  clubId: string
): Promise<DbClubBook[]> {
  const { data, error } = await supabase
    .from('club_books')
    .select(`*, book:books ( ${BOOK_SELECT} )`)
    .eq('club_id', clubId)
    .order('status', { ascending: true })
    .order('finished_at', { ascending: false, nullsFirst: false })
    .order('added_at', { ascending: false })
  if (error) return []
  return ((data ?? []) as any[]).map((row) => ({
    ...(row as DbClubBook),
    book: row.book ? mapBookWithAuthors(row.book) : null,
  }))
}

export async function addClubPastBook(
  supabase: Client,
  clubId: string,
  bookId: string
): Promise<void> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase.from('club_books').upsert(
    {
      club_id: clubId,
      book_id: bookId,
      status: 'past',
      finished_at: new Date().toISOString(),
    },
    { onConflict: 'club_id,book_id' }
  )
  if (error) {
    throw new Error(
      'Could not add past book — run the latest supabase/bookcase.sql to create the club_books table.'
    )
  }
}

export async function removeClubBook(
  supabase: Client,
  clubId: string,
  bookId: string
): Promise<void> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase
    .from('club_books')
    .delete()
    .eq('club_id', clubId)
    .eq('book_id', bookId)
  if (error) throw error
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
  const currentUser = await getCurrentUser(supabase)
  const { data } = await supabase
    .from('club_posts')
    .select(`*, profile:profiles!club_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .eq('club_id', clubId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  const hiddenUserIds = await getHiddenUserIdsForViewer(supabase, currentUser?.id)
  return (data ?? [])
    .map(mapClubPost)
    .filter((post) => !hiddenUserIds.has(post.user_id))
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
  const trimmedTitle = input.title.trim()
  const trimmedBody = input.body.trim()

  const { data, error } = await supabase
    .from('club_posts')
    .insert({
      club_id: input.clubId,
      user_id: user.id,
      book_id: input.bookId ?? null,
      title: trimmedTitle,
      body: trimmedBody,
    })
    .select(`*, profile:profiles!club_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .single()

  if (error) throw error
  const createdPost = mapClubPost(data)
  const [actorName, club] = await Promise.all([
    getActorName(supabase, user.id),
    supabase.from('clubs').select('name').eq('id', input.clubId).maybeSingle(),
  ])

  await notifyMentionedUsers(supabase, {
    actorId: user.id,
    entityType: 'club',
    entityId: input.clubId,
    message: `${actorName} mentioned you in ${club.data?.name ?? 'a club post'}`,
    texts: [trimmedTitle, trimmedBody],
  })

  return createdPost
}

export async function updateClubPost(
  supabase: Client,
  postId: string,
  input: {
    title: string
    body: string
  }
): Promise<DbClubPost> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('club_posts')
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .eq('id', postId)
    .eq('user_id', user.id)
    .select(`*, profile:profiles!club_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .single()

  if (error) throw error
  return mapClubPost(data)
}

export async function setClubPostPinned(
  supabase: Client,
  postId: string,
  pinned: boolean
): Promise<DbClubPost> {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('club_posts')
    .update({ is_pinned: pinned })
    .eq('id', postId)
    .eq('user_id', user.id)
    .select(`*, profile:profiles!club_posts_user_id_fkey ( * ), book:books ( ${BOOK_SELECT} )`)
    .single()

  if (error) throw error
  return mapClubPost(data)
}

export async function deleteClubPost(supabase: Client, postId: string) {
  const user = await getCurrentUser(supabase)
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('club_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)

  if (error) throw error
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
    cover: resolveBookCoverUrl(book) ?? '',
    rating: stats?.avg_rating ?? 0,
    ratings: stats?.rating_count ?? 0,
    mood: [] as string[],
    genre: book.genres[0]?.name ?? book.tags[0]?.name ?? '',
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
