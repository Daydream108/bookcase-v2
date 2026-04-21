'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  importGoodreadsLibrary,
} from '@/lib/db'
import {
  GOODREADS_EXPORT_URL,
  parseGoodreadsCsv,
  summarizeGoodreadsImport,
  type GoodreadsImportEntry,
} from '@/lib/goodreads'

type ImportResult = Awaited<ReturnType<typeof importGoodreadsLibrary>>

export default function GoodreadsImportPage() {
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState<GoodreadsImportEntry[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [includeReviews, setIncludeReviews] = useState(true)
  const [includeCustomShelves, setIncludeCustomShelves] = useState(true)
  const [progress, setProgress] = useState<{ current: number; total: number; title: string } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fromSignup, setFromSignup] = useState(false)

  const preview = useMemo(() => summarizeGoodreadsImport(entries), [entries])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setFromSignup(params.get('source') === 'signup')
  }, [])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    setResult(null)
    setProgress(null)

    if (!file) {
      setEntries([])
      setFileName('')
      return
    }

    try {
      const parsed = parseGoodreadsCsv(await file.text())
      if (!parsed.length) {
        setEntries([])
        setFileName(file.name)
        setError('No Goodreads rows were detected. Upload the CSV export from your Goodreads account.')
        return
      }

      setEntries(parsed)
      setFileName(file.name)
    } catch (readError) {
      setEntries([])
      setFileName(file.name)
      setError((readError as Error).message || 'Could not read that CSV file.')
    }
  }

  const handleImport = async () => {
    if (!entries.length) {
      setError('Upload your Goodreads CSV first.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setProgress({ current: 0, total: entries.length, title: '' })

    try {
      const outcome = await importGoodreadsLibrary(supabase, entries, {
        includeReviews,
        includeCustomShelves,
        onProgress: setProgress,
      })
      setResult(outcome)
    } catch (importError) {
      setError((importError as Error).message || 'Import failed.')
    } finally {
      setLoading(false)
    }
  }

  const headline = fromSignup ? 'Bring your Goodreads life over.' : 'Import your Goodreads shelves.'
  const subcopy = fromSignup
    ? 'Your account is ready. Start with the books, ratings, reviews, and custom shelves you already built elsewhere.'
    : 'Upload the Goodreads CSV export and we will map it into Bookcase without flooding your feed with fake activity.'

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 40px 56px' }}>
      <div
        className="card"
        style={{
          padding: 28,
          borderRadius: 28,
          border: '1px solid color-mix(in oklab, var(--moss) 24%, var(--border))',
          background:
            'radial-gradient(circle at top left, color-mix(in oklab, var(--moss) 16%, white), transparent 34%), linear-gradient(140deg, var(--paper), color-mix(in oklab, var(--moss) 10%, var(--paper)))',
          marginBottom: 18,
        }}
      >
        <div className="eyebrow" style={{ color: 'var(--moss)', marginBottom: 10 }}>
          Goodreads import
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
            gap: 22,
            alignItems: 'start',
          }}
        >
          <div>
            <h1 className="display-lg" style={{ marginBottom: 12 }}>
              {headline}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 720, lineHeight: 1.65 }}>
              {subcopy}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
              <a
                href={GOODREADS_EXPORT_URL}
                target="_blank"
                rel="noreferrer"
                className="btn btn-pulp"
              >
                Download Goodreads CSV
              </a>
              <Link href="/home" className="btn btn-outline">
                Skip for now
              </Link>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: 18,
              background: 'color-mix(in oklab, var(--paper) 88%, white)',
              borderRadius: 22,
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
              What imports
            </div>
            <div style={{ display: 'grid', gap: 10, fontSize: 13, color: 'var(--ink-2)' }}>
              <ImportBullet text="Read / currently reading / want to read shelf states" />
              <ImportBullet text="Ratings and review text from Goodreads" />
              <ImportBullet text="Custom Goodreads shelves as private Bookcase lists" />
              <ImportBullet text="Book basics like title, author, ISBN, page count, and publication year" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 18, alignItems: 'start' }}>
        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Upload</div>
          <h2 className="serif" style={{ fontSize: 28, marginBottom: 10 }}>Drop in your export.</h2>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 18, lineHeight: 1.6 }}>
            Goodreads exports a file usually named <code>goodreads_library_export.csv</code>. Upload that here and we will preview it before writing anything.
          </p>

          <label
            htmlFor="goodreads-csv"
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 20,
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: 'color-mix(in oklab, var(--pulp) 28%, var(--border))',
              background: 'color-mix(in oklab, var(--pulp-soft) 38%, var(--paper))',
              cursor: 'pointer',
              marginBottom: 18,
            }}
          >
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              CSV file
            </span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {fileName || 'Choose a Goodreads export file'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              {entries.length ? `${entries.length} books parsed and ready to review.` : 'Nothing is uploaded yet.'}
            </span>
            <input
              id="goodreads-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>

          <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
            <ToggleCard
              label="Import ratings and review text"
              description="Ratings update your shelf and review text gets written into Bookcase reviews."
              checked={includeReviews}
              onChange={setIncludeReviews}
            />
            <ToggleCard
              label="Create custom shelves as private lists"
              description="Standard Goodreads shelves map to status. Extra shelves become reusable Bookcase lists."
              checked={includeCustomShelves}
              onChange={setIncludeCustomShelves}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-pulp"
              onClick={handleImport}
              disabled={loading || !entries.length}
            >
              {loading
                ? progress?.title
                  ? `Importing ${progress.current}/${progress.total}`
                  : 'Importing...'
                : 'Import into Bookcase'}
            </button>
            {progress && loading && (
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                {progress.title ? `Working on ${progress.title}` : `Preparing ${progress.total} books...`}
              </span>
            )}
          </div>

          {error && (
            <div
              style={{
                marginTop: 16,
                fontSize: 13,
                color: 'var(--pulp-deep)',
                background: 'var(--pulp-soft)',
                border: '1px solid var(--pulp)',
                padding: 12,
                borderRadius: 14,
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              style={{
                marginTop: 18,
                padding: 18,
                borderRadius: 18,
                background: 'color-mix(in oklab, var(--moss) 12%, white)',
                border: '1px solid color-mix(in oklab, var(--moss) 34%, var(--border))',
              }}
            >
              <div className="eyebrow" style={{ color: 'var(--moss)', marginBottom: 8 }}>Import complete</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
                <StatCard label="Imported" value={String(result.imported)} />
                <StatCard label="Matched" value={String(result.matched)} />
                <StatCard label="Created" value={String(result.created)} />
                <StatCard label="Reviews" value={String(result.importedReviews)} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                Shelf records updated: <b>{result.updatedShelves}</b>. Private lists touched: <b>{result.createdLists}</b> new, <b>{result.addedToLists}</b> total list placements.
              </div>
              {result.skipped > 0 && (
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-2)' }}>
                  Skipped <b>{result.skipped}</b> rows. {result.errors[0]}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <Link href="/home" className="btn btn-pulp btn-sm">
                  Go to home
                </Link>
                <Link href="/streak" className="btn btn-outline btn-sm">
                  Log first session
                </Link>
                <Link href="/settings" className="btn btn-outline btn-sm">
                  Account settings
                </Link>
              </div>
              <div
                className="card"
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: 'color-mix(in oklab, var(--paper) 88%, white)',
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                    marginBottom: 8,
                  }}
                >
                  Next up
                </div>
                <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
                  <div>1. Open Home to see the onboarding checklist and your first recommendations.</div>
                  <div>2. Pin favorites on your profile so the bookcase looks alive right away.</div>
                  <div>3. Log a reading session to start a trustworthy streak and tracker history.</div>
                  <div>4. Follow readers or join a club so the feed fills with real activity.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Preview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Books" value={String(preview.totalBooks)} />
              <StatCard label="Ratings" value={String(preview.booksWithRatings)} />
              <StatCard label="Reviews" value={String(preview.booksWithReviews)} />
              <StatCard label="Custom shelves" value={String(preview.customShelfCount)} />
            </div>
            {preview.customShelfNames.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
                  Shelf names
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {preview.customShelfNames.slice(0, 10).map((shelf) => (
                    <span
                      key={shelf}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        background: 'color-mix(in oklab, var(--paper) 82%, white)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {shelf}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Sample rows</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {entries.length ? (
                entries.slice(0, 5).map((entry) => (
                  <div key={`${entry.title}-${entry.authors[0]}`} style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                      {entry.authors.join(', ')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>
                      {entry.status ? `Status: ${entry.status.replace('_', ' ')}` : 'No shelf status'}{' '}
                      {entry.rating !== null ? `· Rating ${entry.rating.toFixed(1)}` : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                  Upload a file to preview the first few books before the import runs.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImportBullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--moss)', fontWeight: 700 }}>+</span>
      <span>{text}</span>
    </div>
  )
}

function ToggleCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label
      className="card"
      style={{
        padding: 14,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ marginTop: 4, transform: 'scale(1.15)', accentColor: 'var(--pulp)' }}
      />
    </label>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 14,
        background: 'color-mix(in oklab, var(--paper) 86%, white)',
      }}
    >
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>
        {label}
      </div>
      <div className="serif" style={{ fontSize: 28, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}
