'use client'

import Link from 'next/link'
import { use, useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import {
  Bookcase,
  toShelfBook,
  type ShelfBook,
  type ShelfKey,
} from '@/components/redesign/Bookcase'
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

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
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
      const nextProfile = await getProfileByUsername(supabase, username)
      if (!nextProfile) {
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
        return
      }
      if (cancelled) return

      setProfile(nextProfile)
      const me = await getCurrentUser(supabase)
      if (cancelled) return
      setMeId(me?.id ?? null)

      const [nextStats, allShelf, readingShelf, sessionRows, streakRow, favoriteRows, badgeRows] =
        await Promise.all([
          getProfileStats(supabase, nextProfile.id),
          listShelf(supabase, nextProfile.id),
          listShelf(supabase, nextProfile.id, 'reading'),
          listRecentSessions(supabase, nextProfile.id, 180),
          getStreak(supabase, nextProfile.id),
          listFavorites(supabase, nextProfile.id),
          listBadges(supabase, nextProfile.id),
        ])

      if (cancelled) return
      setStats(nextStats)
      setShelf(allShelf)
      setCurrentReading(readingShelf)
      setSessions(sessionRows)
      setStreak({
        current: streakRow.current_streak ?? 0,
        longest: streakRow.longest_streak ?? 0,
      })
      setFavorites(favoriteRows)
      setBadges(badgeRows)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [supabase, username])

  const heatmap = useMemo(() => {
    const days: number[] = new Array(91).fill(0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayMs = 86_400_000

    for (const session of sessions) {
      const date = new Date(session.session_date).getTime()
      const diffDays = Math.floor((today.getTime() - date) / dayMs)
      if (diffDays >= 0 && diffDays < days.length) {
        days[days.length - 1 - diffDays] +=
          (session.pages_read ?? 0) + (session.minutes_read ?? 0) * 0.5
      }
    }

    return days.map((value) => {
      if (value === 0) return ''
      if (value < 15) return 'l1'
      if (value < 40) return 'l2'
      if (value < 80) return 'l3'
      return 'l4'
    })
  }, [sessions])

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
        Loading profile...
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h1 className="display-md">No such reader</h1>
        <Link href="/home" className="btn btn-outline" style={{ marginTop: 16 }}>
          Back home
        </Link>
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
  const favoriteOptions = shelf.filter(
    (row) => row.book && !favoriteBookIds.has(row.book_id)
  )

  const favoriteSpines: ShelfBook[] = favorites
    .map((favorite) => (favorite.book ? toShelfBook({ book: favorite.book }) : null))
    .filter((book): book is ShelfBook => book !== null)

  const bookcaseSources: Record<ShelfKey, ShelfBook[]> = {
    reading: shelf
      .filter((row) => row.status === 'reading')
      .map(toShelfBook)
      .filter((book): book is ShelfBook => book !== null),
    to_read: shelf
      .filter((row) => row.status === 'to_read')
      .map(toShelfBook)
      .filter((book): book is ShelfBook => book !== null),
    read: shelf
      .filter((row) => row.status === 'read')
      .map(toShelfBook)
      .filter((book): book is ShelfBook => book !== null),
    dnf: shelf
      .filter((row) => row.status === 'dnf')
      .map(toShelfBook)
      .filter((book): book is ShelfBook => book !== null),
  }

  const moveFavorite = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= favorites.length) return
    const ordered = [...favorites.map((favorite) => favorite.book_id)]
    const [moved] = ordered.splice(index, 1)
    ordered.splice(nextIndex, 0, moved)
    const nextFavorites = await reorderFavorites(supabase, ordered)
    setFavorites(nextFavorites)
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 40px' }}>
      <div className="card" style={{ padding: 32, marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 28,
            alignItems: 'flex-start',
          }}
        >
          <Avatar user={uiUser} size={120} />

          <div style={{ flex: '1 1 360px', minWidth: 260 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Reader - joined {joined}
            </div>
            <h1 className="display-lg" style={{ marginBottom: 6 }}>
              {uiUser.name}
            </h1>
            <div style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 14 }}>
              @{uiUser.handle}
              {profile.location ? ` - ${profile.location}` : ''}
            </div>
            {profile.bio && (
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.5,
                  maxWidth: 560,
                  marginBottom: 20,
                }}
              >
                {profile.bio}
              </p>
            )}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Stat label="books read" value={stats?.books_read ?? 0} />
              <Stat label="followers" value={stats?.follower_count ?? 0} />
              <Stat label="following" value={stats?.following_count ?? 0} />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginLeft: 'auto',
            }}
          >
            {isMe ? (
              <Link href="/settings" className="btn btn-outline">
                Edit profile
              </Link>
            ) : (
              meId && (
                <button
                  className="btn btn-pulp"
                  onClick={async () => {
                    await toggleFollow(supabase, profile.id)
                    const nextStats = await getProfileStats(supabase, profile.id)
                    setStats(nextStats)
                  }}
                >
                  Follow
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <Bookcase
        ownerName={uiUser.name}
        favorites={favoriteSpines}
        sources={bookcaseSources}
        editable={isMe}
        storageKey={`bookcase-layout:${profile.id}`}
      />

      {isMe && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Curate your bookcase
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                Favorites feed the top shelf. Reorder them to change the first impression.
              </div>
            </div>

            {favoriteOptions.length > 0 && favorites.length < 4 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={favoriteSelection}
                  onChange={(event) => setFavoriteSelection(event.target.value)}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 12,
                    minWidth: 220,
                  }}
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
                    const nextFavorites = await pinFavorite(supabase, favoriteSelection)
                    setFavorites(nextFavorites)
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
              Pin up to four books you want front-and-center on your profile.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {favorites.map((favorite, index) => {
                if (!favorite.book) return null
                return (
                  <div
                    key={favorite.id}
                    className="card"
                    style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>
                      Shelf slot {index + 1}
                    </div>
                    <Link
                      href={`/book/${favorite.book.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>
                        {favorite.book.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                        {favorite.book.authors?.map((author) => author.name).join(', ') || 'Unknown author'}
                      </div>
                    </Link>
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => moveFavorite(index, -1)}
                        disabled={index === 0}
                      >
                        Move up
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => moveFavorite(index, 1)}
                        disabled={index === favorites.length - 1}
                      >
                        Move down
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={async () => {
                          const nextFavorites = await unpinFavorite(supabase, favorite.book_id)
                          setFavorites(nextFavorites)
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {badges.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Badges
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {badges.map((badge) => (
              <div
                key={badge.id}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: 'linear-gradient(135deg, var(--paper), var(--paper-2))',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--pulp)',
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          className="card"
          style={{
            padding: 20,
            background: 'linear-gradient(135deg, var(--pulp), oklch(72% 0.2 65))',
            color: 'white',
            borderColor: 'transparent',
          }}
        >
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
            Streak
          </div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>
            {streak.current}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
            days - longest {streak.longest}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Reading
          </div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1, color: 'var(--pulp)' }}>
            {currentReading.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
            books in progress
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Finished
          </div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>
            {stats?.books_read ?? 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
            all-time
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Sessions
          </div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>
            {sessions.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
            last 180 days
          </div>
        </div>
      </div>

      {currentReading.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Currently reading
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
              marginBottom: 40,
            }}
          >
            {currentReading.slice(0, 6).map((row) => {
              if (!row.book) return null
              const uiBook = toUiBook(row.book)
              return (
                <Link
                  key={row.id}
                  href={`/book/${row.book.id}`}
                  className="card"
                  style={{
                    padding: 20,
                    display: 'flex',
                    gap: 16,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Cover book={uiBook} size={80} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="serif" style={{ fontSize: 18, lineHeight: 1.15 }}>
                      {row.book.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
                      {uiBook.author}
                    </div>
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
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Reading life - last 90 days
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div className="heatmap">
            {heatmap.map((level, index) => (
              <div key={index} className={'cell ' + level} />
            ))}
          </div>
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>less</span>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: 'var(--paper-2)',
                border: '1px solid var(--border)',
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: 'oklch(66% 0.18 42 / 0.25)',
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: 'oklch(66% 0.18 42 / 0.5)',
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: 'oklch(66% 0.18 42 / 0.75)',
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: 'var(--pulp)',
              }}
            />
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
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--ink-3)',
          marginLeft: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
    </div>
  )
}
