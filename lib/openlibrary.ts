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
}

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

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(limit),
    fields: [
      'key',
      'title',
      'subtitle',
      'author_name',
      'first_publish_year',
      'number_of_pages_median',
      'cover_i',
      'isbn',
      'language',
    ].join(','),
  })

  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Open Library search failed with ${response.status}`)
  }

  const payload = (await response.json()) as { docs?: OpenLibraryDoc[] }
  const seen = new Set<string>()
  const results: OpenLibrarySearchResult[] = []

  for (const doc of payload.docs ?? []) {
    const mapped = mapOpenLibraryDoc(doc)
    if (!mapped) continue
    if (seen.has(mapped.sourceId)) continue
    seen.add(mapped.sourceId)
    results.push(mapped)
    if (results.length >= limit) break
  }

  return results
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
    openLibraryUrl: `https://openlibrary.org${sourceId}`,
  }
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
