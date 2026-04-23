export type CatalogFormat = 'book' | 'comic' | 'graphic_novel' | 'manga'

export type OpenLibrarySearchResult = {
  source: 'openlibrary'
  sourceId: string
  title: string
  subtitle: string | null
  authors: string[]
  publishedYear: number | null
  pageCount: number | null
  coverUrl: string | null
  isbns: string[]
  languageCodes: string[]
  format: CatalogFormat
  openLibraryUrl: string
}

type OpenLibraryDoc = {
  key?: string
  title?: string
  subtitle?: string
  author_name?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  cover_i?: number
  isbn?: string[]
  language?: string[]
  subject?: string[]
}

const OPEN_LIBRARY_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000
const openLibrarySearchCache = new Map<
  string,
  { expiresAt: number; results: OpenLibrarySearchResult[] }
>()
const openLibrarySearchInflight = new Map<string, Promise<OpenLibrarySearchResult[]>>()

export function buildOpenLibraryCoverUrl(input: { coverId?: number | null; isbn?: string | null }) {
  if (input.coverId) {
    return `https://covers.openlibrary.org/b/id/${input.coverId}-L.jpg?default=false`
  }

  if (input.isbn) {
    return `https://covers.openlibrary.org/b/isbn/${input.isbn}-L.jpg?default=false`
  }

  return null
}

export async function searchOpenLibraryBooks(query: string, limit = 12): Promise<OpenLibrarySearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const cacheKey = `${normalizeCatalogSearchValue(trimmed)}::${clamp(limit, 1, 120)}`
  const cached = openLibrarySearchCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results
  }

  const inFlight = openLibrarySearchInflight.get(cacheKey)
  if (inFlight) {
    return inFlight
  }

  const request = searchOpenLibraryBooksUncached(trimmed, limit)
    .then((results) => {
      openLibrarySearchCache.set(cacheKey, {
        expiresAt: Date.now() + OPEN_LIBRARY_SEARCH_CACHE_TTL_MS,
        results,
      })
      return results
    })
    .finally(() => {
      openLibrarySearchInflight.delete(cacheKey)
    })

  openLibrarySearchInflight.set(cacheKey, request)
  return request
}

async function searchOpenLibraryBooksUncached(
  trimmed: string,
  limit: number
): Promise<OpenLibrarySearchResult[]> {

  const parsed = splitCatalogSearch(trimmed)
  const perRequestLimit = Math.max(limit, Math.min(limit * 4, 120))
  const searchPlans = buildOpenLibrarySearchPlans(trimmed, parsed, perRequestLimit)
  const responses = await Promise.all(
    searchPlans.map(async (plan) => ({
      plan,
      docs: await fetchOpenLibraryDocs(plan.params),
    }))
  )

  const ranked = new Map<string, { result: OpenLibrarySearchResult; score: number }>()

  for (const response of responses) {
    for (const doc of response.docs) {
      const mapped = mapOpenLibraryDoc(doc)
      if (!mapped) continue
      const score =
        response.plan.boost +
        scoreOpenLibraryResult(mapped, {
          rawQuery: trimmed,
          titleQuery: parsed.title,
          authorQuery: parsed.author,
          terms: parsed.terms,
        })

      const existing = ranked.get(mapped.sourceId)
      if (!existing || score > existing.score) {
        ranked.set(mapped.sourceId, { result: mapped, score })
      }
    }
  }

  return [...ranked.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return (right.result.publishedYear ?? 0) - (left.result.publishedYear ?? 0)
    })
    .slice(0, limit)
    .map((entry) => entry.result)
}

function mapOpenLibraryDoc(doc: OpenLibraryDoc): OpenLibrarySearchResult | null {
  const title = doc.title?.trim()
  const sourceId = doc.key?.trim()
  if (!title || !sourceId) return null

  const isbns = dedupeStrings((doc.isbn ?? []).map(normalizeIsbn).filter(Boolean) as string[])
  const authors = dedupeStrings((doc.author_name ?? []).map((author) => author.trim()).filter(Boolean))

  return {
    source: 'openlibrary',
    sourceId,
    title,
    subtitle: doc.subtitle?.trim() || null,
    authors,
    publishedYear: toFiniteNumber(doc.first_publish_year),
    pageCount: toFiniteNumber(doc.number_of_pages_median),
    coverUrl: buildOpenLibraryCoverUrl({
      coverId: toFiniteNumber(doc.cover_i),
      isbn: pickPreferredIsbn(isbns),
    }),
    isbns,
    languageCodes: dedupeStrings((doc.language ?? []).map((code) => code.trim()).filter(Boolean)),
    format: classifyCatalogFormat({
      title,
      subtitle: doc.subtitle ?? null,
      subjects: doc.subject ?? [],
    }),
    openLibraryUrl: `https://openlibrary.org${sourceId}`,
  }
}

type CatalogSearchParse = {
  title: string
  author: string
  terms: string[]
}

type OpenLibrarySearchPlan = {
  params: URLSearchParams
  boost: number
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

function splitCatalogSearch(query: string): CatalogSearchParse {
  const trimmed = query.trim()
  const byParts = trimmed.split(/\s+by\s+/i)
  const title = byParts.length > 1 ? byParts[0].trim() : ''
  const author = byParts.length > 1 ? byParts.slice(1).join(' by ').trim() : ''
  const normalizedTerms = normalizeCatalogSearchValue(trimmed)
    .split(' ')
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !SEARCH_STOP_WORDS.has(term))
  const terms = Array.from(new Set(normalizedTerms)).slice(0, 8)

  return {
    title,
    author,
    terms,
  }
}

function buildOpenLibrarySearchPlans(
  rawQuery: string,
  parsed: CatalogSearchParse,
  limit: number
): OpenLibrarySearchPlan[] {
  const plans: OpenLibrarySearchPlan[] = []
  const seen = new Set<string>()

  const pushPlan = (params: Record<string, string>, boost: number) => {
    const searchParams = new URLSearchParams({
      ...params,
      limit: String(limit),
      fields: OPEN_LIBRARY_FIELDS,
    })
    const key = searchParams.toString()
    if (seen.has(key)) return
    seen.add(key)
    plans.push({ params: searchParams, boost })
  }

  pushPlan({ q: rawQuery }, 0)

  if (parsed.title && parsed.author) {
    pushPlan({ title: parsed.title, author: parsed.author }, 220)
    pushPlan({ title: parsed.title }, 110)
    pushPlan({ author: parsed.author }, 80)
  } else {
    pushPlan({ title: rawQuery }, 60)
  }

  return plans
}

async function fetchOpenLibraryDocs(params: URLSearchParams) {
  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Open Library search failed with ${response.status}`)
  }

  const payload = (await response.json()) as { docs?: OpenLibraryDoc[] }
  return payload.docs ?? []
}

function scoreOpenLibraryResult(
  result: OpenLibrarySearchResult,
  input: {
    rawQuery: string
    titleQuery: string
    authorQuery: string
    terms: string[]
  }
) {
  const normalizedRawQuery = normalizeCatalogSearchValue(input.rawQuery)
  const normalizedTitleQuery = normalizeCatalogSearchValue(input.titleQuery)
  const normalizedAuthorQuery = normalizeCatalogSearchValue(input.authorQuery)
  const normalizedTitle = normalizeCatalogSearchValue(result.title)
  const normalizedSubtitle = normalizeCatalogSearchValue(result.subtitle ?? '')
  const normalizedAuthors = result.authors.map(normalizeCatalogSearchValue).join(' ')
  const normalizedHaystack = [normalizedTitle, normalizedSubtitle, normalizedAuthors].join(' ')

  let score = 0

  if (normalizedRawQuery && normalizedTitle === normalizedRawQuery) score += 240
  if (normalizedTitleQuery && normalizedTitle === normalizedTitleQuery) score += 280
  if (normalizedTitleQuery && normalizedTitle.startsWith(normalizedTitleQuery)) score += 200
  if (normalizedTitleQuery && normalizedTitle.includes(normalizedTitleQuery)) score += 170
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
      score += 28
      matchedTerms += 1
      continue
    }
    if (normalizedSubtitle.includes(term)) {
      score += 18
      matchedTerms += 1
    }
  }

  if (input.terms.length > 1 && matchedTerms === input.terms.length) {
    score += 120
  }

  return score
}

function normalizeCatalogSearchValue(value: string | null | undefined) {
  return value
    ?.toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || ''
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

const OPEN_LIBRARY_FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'first_publish_year',
  'number_of_pages_median',
  'cover_i',
  'isbn',
  'language',
  'subject',
].join(',')

export function catalogFormatLabel(format: CatalogFormat) {
  switch (format) {
    case 'comic':
      return 'Comic'
    case 'graphic_novel':
      return 'Graphic Novel'
    case 'manga':
      return 'Manga'
    default:
      return 'Book'
  }
}

export function catalogFormatTags(format: CatalogFormat) {
  switch (format) {
    case 'comic':
      return ['Comic']
    case 'graphic_novel':
      return ['Graphic Novel']
    case 'manga':
      return ['Manga']
    default:
      return []
  }
}

function classifyCatalogFormat(input: {
  title: string
  subtitle?: string | null
  subjects?: string[]
}): CatalogFormat {
  const haystack = [input.title, input.subtitle ?? '', ...(input.subjects ?? [])]
    .join(' | ')
    .toLowerCase()

  if (
    haystack.includes('manga') ||
    haystack.includes('shonen') ||
    haystack.includes('shojo') ||
    haystack.includes('seinen')
  ) {
    return 'manga'
  }

  if (haystack.includes('graphic novel') || haystack.includes('graphic novels')) {
    return 'graphic_novel'
  }

  if (
    haystack.includes('comic') ||
    haystack.includes('comics') ||
    haystack.includes('comic books') ||
    haystack.includes('strips, etc')
  ) {
    return 'comic'
  }

  return 'book'
}

function pickPreferredIsbn(isbns: string[]) {
  return (
    isbns.find((isbn) => isbn.length === 13) ??
    isbns.find((isbn) => isbn.length === 10) ??
    isbns[0] ??
    null
  )
}

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, '').toUpperCase()
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const value of values) {
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(value)
  }

  return deduped
}

function toFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
