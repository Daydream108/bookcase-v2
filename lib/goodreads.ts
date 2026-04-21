export type GoodreadsShelfStatus = 'to_read' | 'reading' | 'read' | 'dnf'

export type GoodreadsImportCustomShelf = {
  name: string
  position: number | null
}

export type GoodreadsImportEntry = {
  sourceBookId: string | null
  title: string
  authors: string[]
  isbn: string | null
  isbn13: string | null
  rating: number | null
  averageRating: number | null
  pageCount: number | null
  yearPublished: number | null
  originalPublicationYear: number | null
  dateRead: string | null
  dateAdded: string | null
  status: GoodreadsShelfStatus | null
  review: string | null
  spoiler: boolean
  readCount: number
  customShelves: GoodreadsImportCustomShelf[]
}

export type GoodreadsImportPreview = {
  totalBooks: number
  booksWithRatings: number
  booksWithReviews: number
  customShelfCount: number
  customShelfNames: string[]
}

export const GOODREADS_EXPORT_URL = 'https://www.goodreads.com/review/import'

const STANDARD_SHELVES = new Set([
  'read',
  'to-read',
  'currently-reading',
  'did-not-finish',
  'dnf',
])

export function parseGoodreadsCsv(csv: string): GoodreadsImportEntry[] {
  const rows = parseCsv(csv)
  if (rows.length < 2) return []

  const [headerRow, ...bodyRows] = rows
  const headers = headerRow.map((header) => header.trim())
  const entries: GoodreadsImportEntry[] = []

  for (const values of bodyRows) {
    if (values.every((value) => !value.trim())) continue

    const row = Object.fromEntries(
      headers.map((header, index) => [header, normalizeCell(values[index] ?? '')])
    )

    const title = readField(row, 'Title')
    const primaryAuthor = readField(row, 'Author')
    if (!title || !primaryAuthor) continue

    const additionalAuthors = splitPeople(readField(row, 'Additional Authors'))
    const authors = dedupeStrings([primaryAuthor, ...additionalAuthors])
    const shelfNames = splitShelves(readField(row, 'Bookshelves'))
    const positionedShelves = parsePositionedShelves(readField(row, 'Bookshelves with positions'))
    const exclusiveShelf = normalizeShelfName(readField(row, 'Exclusive Shelf'))
    const customShelves = buildCustomShelves(shelfNames, positionedShelves, exclusiveShelf)
    const rating = parsePositiveNumber(readField(row, 'My Rating'))
    const review = normalizeOptionalText(readField(row, 'My Review'))
    const dateRead = parseDate(readField(row, 'Date Read'))

    entries.push({
      sourceBookId: normalizeIdentifier(readField(row, 'Book Id')),
      title,
      authors,
      isbn: normalizeIdentifier(readField(row, 'ISBN')),
      isbn13: normalizeIdentifier(readField(row, 'ISBN13')),
      rating,
      averageRating: parsePositiveNumber(readField(row, 'Average Rating')),
      pageCount: parseInteger(readField(row, 'Number of Pages')),
      yearPublished: parseInteger(readField(row, 'Year Published')),
      originalPublicationYear: parseInteger(readField(row, 'Original Publication Year')),
      dateRead,
      dateAdded: parseDate(readField(row, 'Date Added')),
      status: deriveStatus(shelfNames, exclusiveShelf, dateRead),
      review,
      spoiler: parseBoolean(readField(row, 'Spoiler')),
      readCount: parseInteger(readField(row, 'Read Count')) ?? 0,
      customShelves,
    })
  }

  return entries
}

export function summarizeGoodreadsImport(entries: GoodreadsImportEntry[]): GoodreadsImportPreview {
  const customShelfNames = Array.from(
    new Set(entries.flatMap((entry) => entry.customShelves.map((shelf) => shelf.name)))
  ).sort((a, b) => a.localeCompare(b))

  return {
    totalBooks: entries.length,
    booksWithRatings: entries.filter((entry) => entry.rating !== null).length,
    booksWithReviews: entries.filter((entry) => Boolean(entry.review)).length,
    customShelfCount: customShelfNames.length,
    customShelfNames,
  }
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  const text = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv

  let row: string[] = []
  let value = ''
  let index = 0
  let inQuotes = false

  while (index < text.length) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          value += '"'
          index += 2
          continue
        }
        inQuotes = false
        index += 1
        continue
      }

      value += char
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      index += 1
      continue
    }

    if (char === ',') {
      row.push(value)
      value = ''
      index += 1
      continue
    }

    if (char === '\r' || char === '\n') {
      row.push(value)
      rows.push(row)
      row = []
      value = ''
      index += char === '\r' && text[index + 1] === '\n' ? 2 : 1
      continue
    }

    value += char
    index += 1
  }

  row.push(value)
  if (row.some((cell) => cell.trim()) || rows.length === 0) rows.push(row)
  return rows
}

function readField(row: Record<string, string>, key: string) {
  return row[key]?.trim() ?? ''
}

function normalizeCell(value: string) {
  return value.replace(/\r/g, '').trim()
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeIdentifier(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const withoutFormula = trimmed
    .replace(/^="/, '')
    .replace(/"$/, '')
    .replace(/^=/, '')
    .trim()

  const cleaned = withoutFormula.replace(/[^0-9Xx-]/g, '')
  return cleaned || null
}

function parseInteger(value: string) {
  const cleaned = value.replace(/,/g, '').trim()
  if (!cleaned) return null
  const parsed = Number.parseInt(cleaned, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parsePositiveNumber(value: string) {
  const cleaned = value.trim()
  if (!cleaned) return null
  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function parseDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parts = trimmed.split(/[/-]/).map((part) => part.trim())
  if (parts.length !== 3) return null

  if (parts[0].length === 4) {
    const [year, month, day] = parts
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  if (parts[2].length === 4) {
    const [month, day, year] = parts
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return null
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase()
  return ['true', 'yes', '1', 'spoiler'].includes(normalized)
}

function splitPeople(value: string) {
  return value
    .split(/\s*(?:,|;|&)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function splitShelves(value: string) {
  return dedupeStrings(
    value
      .split(',')
      .map((part) => normalizeShelfName(part))
      .filter(Boolean)
  )
}

function parsePositionedShelves(value: string): GoodreadsImportCustomShelf[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)(?:\s*\(#(\d+)\))?$/)
      const name = normalizeShelfName(match?.[1] ?? part)
      const position = match?.[2] ? Number.parseInt(match[2], 10) : null
      return name ? { name, position: Number.isFinite(position) ? position : null } : null
    })
    .filter(Boolean) as GoodreadsImportCustomShelf[]
}

function normalizeShelfName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-')
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(normalized)
  }

  return deduped
}

function buildCustomShelves(
  shelves: string[],
  positionedShelves: GoodreadsImportCustomShelf[],
  exclusiveShelf: string | null
) {
  const byName = new Map<string, GoodreadsImportCustomShelf>()

  for (const shelf of positionedShelves) {
    if (STANDARD_SHELVES.has(shelf.name)) continue
    byName.set(shelf.name, shelf)
  }

  for (const shelf of shelves) {
    if (STANDARD_SHELVES.has(shelf) || byName.has(shelf)) continue
    byName.set(shelf, { name: shelf, position: null })
  }

  if (exclusiveShelf && !STANDARD_SHELVES.has(exclusiveShelf) && !byName.has(exclusiveShelf)) {
    byName.set(exclusiveShelf, { name: exclusiveShelf, position: null })
  }

  return Array.from(byName.values()).sort((left, right) => {
    if (left.position !== null && right.position !== null) return left.position - right.position
    if (left.position !== null) return -1
    if (right.position !== null) return 1
    return left.name.localeCompare(right.name)
  })
}

function deriveStatus(
  shelves: string[],
  exclusiveShelf: string | null,
  dateRead: string | null
): GoodreadsShelfStatus | null {
  const allShelves = new Set(shelves)
  if (exclusiveShelf) allShelves.add(exclusiveShelf)

  if (allShelves.has('did-not-finish') || allShelves.has('dnf')) return 'dnf'
  if (allShelves.has('currently-reading')) return 'reading'
  if (allShelves.has('read') || dateRead) return 'read'
  if (allShelves.has('to-read')) return 'to_read'
  return null
}
