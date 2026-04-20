'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { createClient } from '@/lib/supabase/client'
import {
  getCurrentUser,
  getProfileByUsername,
  getProfileStats,
  getStreak,
  listBadges,
  listFavorites,
  listRecentSessions,
  listShelf,
  pinFavorite,
  reorderFavorites,
  toggleFollow,
  toUiBook,
  toUiUser,
  unpinFavorite,
  type DbBadge,
  type DbBookWithAuthors,
  type DbFavoriteBook,
  type DbProfile,
  type DbProfileStats,
  type DbReadingSession,
  type DbUserBook,
} from '@/lib/db'

type ShelfEntry = DbUserBook & { book: DbBookWithAuthors | null }

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [stats, setStats] = useState<DbProfileStats | null>(null)
  const [shelf, setShelf] = useState<ShelfEntry[]>([])
  const [currentReading, setCurrentReading] = useState<ShelfEntry[]>([])
  const [sessions, setSessions] = useState<DbReadingSession[]>([])
  const [streak, setStreak] = useState({ current: 0, longest: 0 })
  const [favorites, setFavorites] = useState<DbFavoriteBook[]>([])
  const [badges, setBadges] = useState<DbBadge[]>([])
  const [favoriteSelection, setFavoriteSelection] = useState('')
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const p = await getProfileByUsername(supabase, username)
      if (!p) {
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
        return
      }
      if (cancelled) return
      setProfile(p)
      const me = await getCurrentUser(supabase)
      if (cancelled) return
      setMeId(me?.id ?? null)

      const [s, all, reading, ss, st, favs, badgeRows] = await Promise.all([
        getProfileStats(supabase, p.id),
        listShelf(supabase, p.id),
        listShelf(supabase, p.id, 'reading'),
        listRecentSessions(supabase, p.id, 180),
        getStreak(supabase, p.id),
        listFavorites(supabase, p.id),
        listBadges(supabase, p.id),
      ])
      if (cancelled) return
      setStats(s)
      setShelf(all)
      setCurrentReading(reading)
      setSessions(ss)
      setStreak({ current: st.current_streak ?? 0, longest: st.longest_streak ?? 0 })
      setFavorites(favs)
      setBadges(badgeRows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, username])

  const heatmap = useMemo(() => {
    // Build 13 columns × 7 rows = 91 days ending today, Sun..Sat
    const days: number[] = new Array(91).fill(0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayMs = 86_400_000
    for (const s of sessions) {
      const d = new Date(s.session_date).getTime()
      const diffDays = Math.floor((today.getTime() - d) / dayMs)
      if (diffDays >= 0 && diffDays < days.length) {
        days[days.length - 1 - diffDays] += (s.pages_read ?? 0) + (s.minutes_read ?? 0) * 0.5
      }
    }
    return days.map((v) => {
      if (v === 0) return ''
      if (v < 15) return 'l1'
      if (v < 40) return 'l2'
      if (v < 80) return 'l3'
      return 'l4'
    })
  }, [sessions])

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>Loading profile…</div>
  }
  if (notFound || !profile) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h1 className="display-md">No such reader</h1>
        <Link href="/home" className="btn btn-outline" style={{ marginTop: 16 }}>Back home</Link>
      </div>
    )
  }

  const uiUser = toUiUser(profile)
  const isMe = meId === profile.id
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const favoriteBookIds = new Set(favorites.map((favorite) => favorite.book_id))
  const favoriteOptions = shelf.filter((row) => row.book && !favoriteBookIds.has(row.book_id))

  const moveFavorite = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= favorites.length) return
    const ordered = [...favorites.map((favorite) => favorite.book_id)]
    const [moved] = ordered.splice(index, 1)
    ordered.splice(nextIndex, 0, moved)
    const next = await reorderFavorites(supabase, ordered)
    setFavorites(next)
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
      <div className="card" style={{ padding: 32, marginBottom: 24, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'start' }}>
        <Avatar user={uiUser} size={120} />
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>reader · joined {joined}</div>
          <h1 className="display-lg" style={{ marginBottom: 6 }}>{uiUser.name}</h1>
          <div style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 14 }}>
            @{uiUser.handle}{profile.location ? ` · ${profile.location}` : ''}
          </div>
          {profile.bio && (
            <p style={{ fontSize: 16, lineHeight: 1.5, maxWidth: 540, marginBottom: 20 }}>{profile.bio}</p>
          )}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Stat label="books read" value={stats?.books_read ?? 0} />
            <Stat label="followers" value={stats?.follower_count ?? 0} />
            <Stat label="following" value={stats?.following_count ?? 0} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isMe ? (
            <Link href="/settings" className="btn btn-outline">Edit profile</Link>
          ) : (
            meId && (
              <button
                className="btn btn-pulp"
                onClick={async () => {
                  await toggleFollow(supabase, profile.id)
                  const s = await getProfileStats(supabase, profile.id)
                  setStats(s)
                }}
              >
                Follow
              </button>
            )
          )}
        </div>
      </div>

      {badges.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Badges</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {badges.map((badge) => (
              <div key={badge.id} style={{ padding: 14, borderRadius: 16, border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--paper), var(--paper-2))' }}>
                <div style={{ fontSize: 12, color: 'var(--pulp)', fontWeight: 700, marginBottom: 6 }}>
                  {badge.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
                  {badge.description ?? 'Unlocked'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="eyebrow">Favorite books</div>
          {isMe && favoriteOptions.length > 0 && favorites.length < 4 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={favoriteSelection}
                onChange={(e) => setFavoriteSelection(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, minWidth: 220 }}
              >
                <option value="">Pick a book to pin</option>
                {favoriteOptions.map((row) =>
                  row.book ? (
                    <option key={row.id} value={row.book.id}>
                      {row.book.title}
                    </option>
                  ) : null
                )}
              </select>
              <button
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  if (!favoriteSelection) return
                  const next = await pinFavorite(supabase, favoriteSelection)
                  setFavorites(next)
                  setFavoriteSelection('')
                }}
              >
                Pin
              </button>
            </div>
          )}
        </div>

        {favorites.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: 16 }}>
            {isMe ? 'Pin up to four books you want front-and-center on your profile.' : 'No favorites pinned yet.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {favorites.map((favorite, index) => {
              if (!favorite.book) return null
              const ui = toUiBook(favorite.book)
              return (
                <div key={favorite.id} className="card" style={{ padding: 16 }}>
                  <Link href={`/book/${favorite.book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Cover book={ui} size="100%" style={{ width: '100%', marginBottom: 10 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {favorite.book.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ui.author}</div>
                  </Link>
                  {isMe && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveFavorite(index, -1)} disabled={index === 0}>
                        ←
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveFavorite(index, 1)} disabled={index === favorites.length - 1}>
                        →
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={async () => {
                          const next = await unpinFavorite(supabase, favorite.book_id)
                          setFavorites(next)
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>📚 The shelf · {shelf.length}</div>
        {shelf.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: 20 }}>
            No books on the shelf yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10 }}>
            {shelf.slice(0, 24).map((row) => {
              if (!row.book) return null
              const ui = toUiBook(row.book)
              return (
                <Link key={row.id} href={`/book/${row.book.id}`}>
                  <Cover book={ui} size="100%" style={{ width: '100%' }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--pulp), oklch(72% 0.2 65))', color: 'white', borderColor: 'transparent' }}>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>🔥 Streak</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>{streak.current}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>days · longest {streak.longest}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>📖 Reading</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1, color: 'var(--pulp)' }}>{currentReading.length}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>books in progress</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>✅ Finished</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>{stats?.books_read ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>all-time</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>📝 Sessions</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>{sessions.length}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>last 180 days</div>
        </div>
      </div>

      {currentReading.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 12 }}>📖 Currently reading</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
            {currentReading.slice(0, 6).map((row) => {
              if (!row.book) return null
              const ui = toUiBook(row.book)
              return (
                <Link
                  key={row.id}
                  href={`/book/${row.book.id}`}
                  className="card"
                  style={{ padding: 20, display: 'flex', gap: 16, textDecoration: 'none', color: 'inherit' }}
                >
                  <Cover book={ui} size={80} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="serif" style={{ fontSize: 18, lineHeight: 1.15 }}>{row.book.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>{ui.author}</div>
                    {row.started_at && (
                      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        started {new Date(row.started_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <div className="card" style={{ padding: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>📊 Reading life · last 90 days</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="heatmap">
            {heatmap.map((level, i) => <div key={i} className={'cell ' + level} />)}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>less</span>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--paper-2)', border: '1px solid var(--border)' }} />
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(66% 0.18 42 / 0.25)' }} />
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(66% 0.18 42 / 0.5)' }} />
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'oklch(66% 0.18 42 / 0.75)' }} />
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--pulp)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>more</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <b style={{ fontSize: 20 }}>{value}</b>
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
    </div>
  )
}
