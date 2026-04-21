'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Cover } from '@/components/redesign/Cover'
import { createClient } from '@/lib/supabase/client'
import {
  awardProgressBadges,
  getCurrentProfile,
  getReadingGoal,
  getStreak,
  listRecentSessions,
  listShelf,
  logReadingSession,
  searchBooks,
  toUiBook,
  upsertReadingGoal,
  type DbBookWithAuthors,
  type DbProfile,
  type DbReadingGoal,
  type DbReadingSession,
  type DbUserBook,
} from '@/lib/db'

type ShelfEntry = DbUserBook & { book: DbBookWithAuthors | null }

export default function StreakPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [streak, setStreak] = useState({ current: 0, longest: 0 })
  const [sessions, setSessions] = useState<DbReadingSession[]>([])
  const [reading, setReading] = useState<ShelfEntry[]>([])
  const [goal, setGoal] = useState<DbReadingGoal | null>(null)

  const [book, setBook] = useState<DbBookWithAuthors | null>(null)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DbBookWithAuthors[]>([])
  const [pages, setPages] = useState('')
  const [minutes, setMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(todayInputValue())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [goalBooks, setGoalBooks] = useState('24')
  const [goalPages, setGoalPages] = useState('5000')
  const [goalMinutes, setGoalMinutes] = useState('3000')
  const [goalSaving, setGoalSaving] = useState(false)

  const loadAll = async (userId: string) => {
    const [nextSessions, nextStreak, nextReading, nextGoal] = await Promise.all([
      listRecentSessions(supabase, userId, 180),
      getStreak(supabase, userId),
      listShelf(supabase, userId, 'reading'),
      getReadingGoal(supabase),
    ])

    setSessions(nextSessions)
    setStreak({
      current: nextStreak.current_streak ?? 0,
      longest: nextStreak.longest_streak ?? 0,
    })
    setReading(nextReading)
    setGoal(nextGoal)

    if (nextGoal) {
      setGoalBooks(String(nextGoal.book_goal))
      setGoalPages(String(nextGoal.page_goal))
      setGoalMinutes(String(nextGoal.minute_goal))
    }

    if (!book && nextReading[0]?.book) {
      setBook(nextReading[0].book)
    }
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const profile = await getCurrentProfile(supabase)
      if (cancelled) return
      setMe(profile)
      if (profile) {
        await loadAll(profile.id)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  useEffect(() => {
    if (!picking) return
    let cancelled = false

    const handle = setTimeout(async () => {
      const data = await searchBooks(supabase, query, 8)
      if (!cancelled) setResults(data)
    }, query ? 180 : 0)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [picking, query, supabase])

  const heatmap = useMemo(() => {
    const cells: string[] = new Array(26 * 7).fill('')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayMs = 86_400_000
    const sums = new Array(cells.length).fill(0)

    for (const session of sessions) {
      const sessionMs = dateOnlyToUtcMs(session.session_date)
      const diffDays = Math.floor((today.getTime() - sessionMs) / dayMs)
      if (diffDays >= 0 && diffDays < cells.length) {
        sums[cells.length - 1 - diffDays] +=
          (session.pages_read ?? 0) + (session.minutes_read ?? 0) * 0.5
      }
    }

    return sums.map((value) => {
      if (value === 0) return ''
      if (value < 15) return 'l1'
      if (value < 40) return 'l2'
      if (value < 80) return 'l3'
      return 'l4'
    })
  }, [sessions])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!me) {
      setToast('Sign in to log a session')
      return
    }
    if (!pages && !minutes) {
      setToast('Add pages or minutes')
      return
    }

    setSaving(true)
    try {
      await logReadingSession(supabase, {
        bookId: book?.id ?? null,
        pages: pages ? Number(pages) : undefined,
        minutes: minutes ? Number(minutes) : undefined,
        notes: notes || undefined,
        date,
      })
      setPages('')
      setMinutes('')
      setNotes('')
      await loadAll(me.id)
      const awarded = await awardProgressBadges(supabase)
      setToast(formatToast('Session logged', awarded))
    } catch (error) {
      setToast((error as Error).message || 'Could not log the session')
    } finally {
      setSaving(false)
      window.setTimeout(() => setToast(''), 2400)
    }
  }

  const saveGoal = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!me) {
      setToast('Sign in to save a goal')
      return
    }

    setGoalSaving(true)
    try {
      const nextGoal = await upsertReadingGoal(supabase, {
        book_goal: Number(goalBooks || 0),
        page_goal: Number(goalPages || 0),
        minute_goal: Number(goalMinutes || 0),
      })
      setGoal(nextGoal)
      setToast('Goal saved')
    } catch (error) {
      setToast((error as Error).message || 'Could not save the goal')
    } finally {
      setGoalSaving(false)
      window.setTimeout(() => setToast(''), 2400)
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Momentum tracker
      </div>
      <h1 className="display-lg" style={{ marginBottom: 20 }}>
        Do not break
        <br />
        <i style={{ color: 'var(--pulp)' }}>the chain.</i>
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 30 }}>
        <div
          className="card"
          style={{
            padding: 32,
            background: 'linear-gradient(135deg, var(--pulp), oklch(72% 0.2 65))',
            color: 'white',
            borderColor: 'transparent',
          }}
        >
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>
            current streak
          </div>
          <div className="serif" style={{ fontSize: 120, lineHeight: 0.9, marginTop: 8 }}>
            {streak.current}
          </div>
          <div style={{ fontSize: 18, marginTop: 10 }}>
            {streak.current === 1 ? 'day' : 'days'} in a row
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Longest streak</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{streak.longest} days</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Sessions - 6 months</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{sessions.length}</div>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="card" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Log today's session
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {book ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 8,
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: 'var(--paper-2)',
                }}
              >
                <Cover book={toUiBook(book)} size={36} />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {book.title}
                </div>
                <button
                  type="button"
                  onClick={() => setBook(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ink-3)',
                    fontSize: 14,
                  }}
                >
                  x
                </button>
              </div>
            ) : picking ? (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 6 }}>
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search books..."
                  style={{
                    width: '100%',
                    padding: 8,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 13,
                  }}
                />
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setBook(result)
                        setPicking(false)
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 6,
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      {result.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPicking(true)}
                style={{ justifyContent: 'center' }}
              >
                Pick a book {reading[0]?.book ? '' : '(optional)'}
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                value={pages}
                onChange={(event) => setPages(event.target.value)}
                placeholder="pages"
                type="number"
                min={0}
                style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
              />
              <input
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                placeholder="minutes"
                type="number"
                min={0}
                style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
              />
            </div>

            <input
              value={date}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
            />

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="A note..."
              rows={2}
              style={{
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 13,
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />

            <button type="submit" disabled={saving} className="btn btn-pulp" style={{ justifyContent: 'center' }}>
              {saving ? 'Saving...' : 'Keep the streak alive'}
            </button>

            {toast && <div style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'center' }}>{toast}</div>}
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20, alignItems: 'start' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Yearly goal
            </div>
            <h2 className="serif" style={{ fontSize: 30, lineHeight: 1.05, marginBottom: 10 }}>
              Read with
              <br />
              <i style={{ color: 'var(--pulp)' }}>intention.</i>
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 18, maxWidth: 420 }}>
              Set a target for books, pages, and minutes. We update the progress bars as you log sessions and finish books.
            </p>

            {goal ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <GoalBar label="Books" value={goal.books_completed} target={goal.book_goal} />
                <GoalBar label="Pages" value={goal.pages_completed} target={goal.page_goal} />
                <GoalBar label="Minutes" value={goal.minutes_completed} target={goal.minute_goal} />
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                No goal saved yet. Add one on the right and we will start tracking it immediately.
              </div>
            )}
          </div>

          <form onSubmit={saveGoal} style={{ display: 'grid', gap: 10 }}>
            <input
              value={goalBooks}
              onChange={(event) => setGoalBooks(event.target.value)}
              type="number"
              min={1}
              placeholder="books this year"
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
            />
            <input
              value={goalPages}
              onChange={(event) => setGoalPages(event.target.value)}
              type="number"
              min={1}
              placeholder="pages this year"
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
            />
            <input
              value={goalMinutes}
              onChange={(event) => setGoalMinutes(event.target.value)}
              type="number"
              min={1}
              placeholder="minutes this year"
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={goalSaving}
              className="btn btn-pulp"
              style={{ justifyContent: 'center' }}
            >
              {goalSaving ? 'Saving...' : goal ? 'Update goal' : 'Save goal'}
            </button>
          </form>
        </div>
      </div>

      {reading.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Currently reading
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
            {reading.map((entry) => {
              if (!entry.book) return null
              const ui = toUiBook(entry.book)
              return (
                <Link key={entry.id} href={`/book/${entry.book.id}`} style={{ textAlign: 'center' }}>
                  <Cover book={ui} size="100%" style={{ width: '100%' }} />
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.book.title}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Recent sessions
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {sessions.slice(0, 10).map((session) => (
              <div
                key={session.id}
                style={{
                  paddingBottom: 10,
                  borderBottom: '1px solid var(--border)',
                  display: 'grid',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {session.book ? session.book.title : 'General reading session'}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {formatDateOnly(session.session_date)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {(session.pages_read ?? 0) > 0 ? `${session.pages_read} pages` : '0 pages'}
                  {(session.minutes_read ?? 0) > 0 ? ` - ${session.minutes_read} minutes` : ''}
                </div>
                {session.notes && (
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    {session.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Your reading life - last 6 months
        </div>
        <div className="heatmap" style={{ gridTemplateRows: 'repeat(7, 16px)', gridAutoColumns: '16px', gap: 4 }}>
          {heatmap.map((level, index) => (
            <div key={index} className={'cell ' + level} style={{ width: 16, height: 16, borderRadius: 4 }} />
          ))}
        </div>
      </div>

      {!me && (
        <div className="card" style={{ padding: 20, marginTop: 20, textAlign: 'center' }}>
          <Link href="/login" className="btn btn-pulp">
            Sign in to track your streak
          </Link>
        </div>
      )}
    </div>
  )
}

function GoalBar({
  label,
  value,
  target,
}: {
  label: string
  value: number
  target: number
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--ink-3)' }}>
          {value} / {target}
        </span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: 'var(--paper-2)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--pulp), oklch(76% 0.16 72))',
          }}
        />
      </div>
    </div>
  )
}

function formatToast(base: string, awarded: { title: string }[]) {
  if (!awarded.length) return base
  return `${base} - badge unlocked: ${awarded.map((badge) => badge.title).join(', ')}`
}

function todayInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateOnlyToUtcMs(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString()
}
