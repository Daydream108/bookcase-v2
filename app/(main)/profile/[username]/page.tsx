'use client'

import Link from 'next/link'
import { use, useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { CatalogBookPickerModal } from '@/components/redesign/CatalogBookPickerModal'
import { Cover } from '@/components/redesign/Cover'
import { StateCard } from '@/components/redesign/StateCard'
import {
  Bookcase,
  SHELF_LABELS,
  toShelfBook,
  type BookcaseShelfTarget,
  type ShelfBook,
  type ShelfKey,
} from '@/components/redesign/Bookcase'
import { createClient } from '@/lib/supabase/client'
import {
  getBookcasePreferences,
  getCurrentUser,
  getUserBlockState,
  getProfileByUsername,
  getProfileStats,
  getStreak,
  listBadges,
  listFavorites,
  listRecentSessions,
  listShelf,
  pinFavorite,
  removeUserBook,
  reorderFavorites,
  toggleBlockUser,
  toggleFollow,
  toUiBook,
  toUiUser,
  unpinFavorite,
  upsertBookcasePreferences,
  upsertUserBook,
  type DbBadge,
  type DbBlockState,
  type DbBookcasePreferences,
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
  const [picker, setPicker] = useState<BookcaseShelfTarget | null>(null)
  const [bookcasePreferences, setBookcasePreferences] = useState<DbBookcasePreferences | null>(null)
  const [bookcaseSyncSupported, setBookcaseSyncSupported] = useState(false)
  const [blockState, setBlockState] = useState<DbBlockState>({
    blockedByMe: false,
    blockedMe: false,
  })
  const [actionMessage, setActionMessage] = useState('')
  const [savingBookcase, setSavingBookcase] = useState(false)
  const [bookcaseDraft, setBookcaseDraft] = useState<{
    row2_shelf: ShelfKey
    row3_shelf: ShelfKey
    row2_custom_name: string
    row3_custom_name: string
  }>({
    row2_shelf: 'reading',
    row3_shelf: 'to_read',
    row2_custom_name: '',
    row3_custom_name: '',
  })

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
      setNotFound(false)
      const me = await getCurrentUser(supabase)
      if (cancelled) return
      setMeId(me?.id ?? null)

      let shouldHideProfileData = false
      if (me && me.id !== nextProfile.id) {
        const nextBlockState = await getUserBlockState(supabase, nextProfile.id)
        if (!cancelled) setBlockState(nextBlockState)
        shouldHideProfileData = nextBlockState.blockedByMe || nextBlockState.blockedMe
      } else if (!cancelled) {
        setBlockState({ blockedByMe: false, blockedMe: false })
      }

      if (shouldHideProfileData) {
        if (!cancelled) {
          setStats({
            user_id: nextProfile.id,
            follower_count: 0,
            following_count: 0,
            books_read: 0,
          })
          setShelf([])
          setCurrentReading([])
          setSessions([])
          setStreak({ current: 0, longest: 0 })
          setFavorites([])
          setBadges([])
          setBookcasePreferences(null)
          setBookcaseSyncSupported(false)
          setLoading(false)
        }
        return
      }

      const [
        nextStats,
        allShelf,
        readingShelf,
        sessionRows,
        streakRow,
        favoriteRows,
        badgeRows,
        nextBookcasePreferences,
      ] =
        await Promise.all([
          getProfileStats(supabase, nextProfile.id),
          listShelf(supabase, nextProfile.id),
          listShelf(supabase, nextProfile.id, 'reading'),
          listRecentSessions(supabase, nextProfile.id, 180),
          getStreak(supabase, nextProfile.id),
          listFavorites(supabase, nextProfile.id),
          listBadges(supabase, nextProfile.id),
          getBookcasePreferences(supabase, nextProfile.id),
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
      setBookcasePreferences(nextBookcasePreferences.preferences)
      setBookcaseSyncSupported(nextBookcasePreferences.supported)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [supabase, username])

  useEffect(() => {
    setBookcaseDraft({
      row2_shelf: (bookcasePreferences?.row2_shelf as ShelfKey | undefined) ?? 'reading',
      row3_shelf: (bookcasePreferences?.row3_shelf as ShelfKey | undefined) ?? 'to_read',
      row2_custom_name: bookcasePreferences?.row2_custom_name ?? '',
      row3_custom_name: bookcasePreferences?.row3_custom_name ?? '',
    })
  }, [bookcasePreferences])

  const heatmap = useMemo(() => {
    const days: number[] = new Array(91).fill(0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayMs = 86_400_000

    for (const session of sessions) {
      const date = dateOnlyToUtcMs(session.session_date)
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
  const isBlocked = blockState.blockedByMe || blockState.blockedMe
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

  const refreshShelfData = async () => {
    if (!profile) return
    const [nextShelf, nextReading, nextFavorites] = await Promise.all([
      listShelf(supabase, profile.id),
      listShelf(supabase, profile.id, 'reading'),
      listFavorites(supabase, profile.id),
    ])
    setShelf(nextShelf)
    setCurrentReading(nextReading)
    setFavorites(nextFavorites)
  }

  const openPicker = (target: BookcaseShelfTarget) => {
    setPicker(target)
  }

  const closePicker = () => {
    setPicker(null)
  }

  const addToShelf = async (target: BookcaseShelfTarget, book: DbBookWithAuthors) => {
    if (target === 'favorites') {
      const nextFavorites = await pinFavorite(supabase, book.id)
      setFavorites(nextFavorites)
      setActionMessage('Favorite pinned')
    } else {
      await upsertUserBook(supabase, { bookId: book.id, status: target })
      await refreshShelfData()
      setActionMessage('Book added to that shelf')
    }
  }

  const removeFromShelf = async (bookId: string, target: BookcaseShelfTarget) => {
    if (target === 'favorites') {
      const nextFavorites = await unpinFavorite(supabase, bookId)
      setFavorites(nextFavorites)
      setActionMessage('Favorite removed')
    } else {
      await removeUserBook(supabase, bookId)
      await refreshShelfData()
      setActionMessage('Book removed from that shelf')
    }
  }

  const moveFavorite = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= favorites.length) return
    const ordered = [...favorites.map((favorite) => favorite.book_id)]
    const [moved] = ordered.splice(index, 1)
    ordered.splice(nextIndex, 0, moved)
    const nextFavorites = await reorderFavorites(supabase, ordered)
    setFavorites(nextFavorites)
    setActionMessage('Favorites reordered')
  }

  const saveBookcaseCustomization = async (
    patch?: Partial<{
      row2_shelf: ShelfKey
      row3_shelf: ShelfKey
      row2_custom_name: string
      row3_custom_name: string
    }>
  ) => {
    if (!bookcaseSyncSupported) {
      setActionMessage('Bookcase sync is not available on this account yet')
      return
    }

    const nextDraft = {
      ...bookcaseDraft,
      ...patch,
    }

    if (nextDraft.row2_shelf === nextDraft.row3_shelf) {
      setActionMessage('Rows 2 and 3 need different shelves')
      return
    }

    setSavingBookcase(true)
    try {
      const saved = await upsertBookcasePreferences(supabase, {
        row2_shelf: nextDraft.row2_shelf,
        row3_shelf: nextDraft.row3_shelf,
        row2_custom_name: nextDraft.row2_custom_name.trim() || null,
        row3_custom_name: nextDraft.row3_custom_name.trim() || null,
      })
      setBookcasePreferences(saved)
      setActionMessage('Bookcase rows saved')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Could not save bookcase rows')
    } finally {
      setSavingBookcase(false)
    }
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
          {blockState.blockedMe ? (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: '1px solid var(--border)',
                background: 'var(--paper-2)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                color: 'var(--ink-3)',
              }}
            >
              Hidden
            </div>
          ) : (
            <Avatar user={uiUser} size={120} />
          )}

          <div style={{ flex: '1 1 360px', minWidth: 260 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {isBlocked ? 'Reader profile' : `Reader - joined ${joined}`}
            </div>
            <h1 className="display-lg" style={{ marginBottom: 6 }}>
              {blockState.blockedMe ? 'Profile unavailable' : uiUser.name}
            </h1>
            {!isBlocked ? (
              <>
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
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 520 }}>
                {blockState.blockedMe
                  ? 'This reader has blocked you, so their profile, shelves, and reading activity are hidden.'
                  : 'You blocked this reader. Unblock them any time to see their shelves and reading activity again.'}
              </div>
            )}
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
                <>
                  {!blockState.blockedByMe && !blockState.blockedMe && (
                    <button
                      className="btn btn-pulp"
                      onClick={async () => {
                        try {
                          await toggleFollow(supabase, profile.id)
                          const nextStats = await getProfileStats(supabase, profile.id)
                          setStats(nextStats)
                          setActionMessage('Follow updated')
                        } catch (error) {
                          setActionMessage(error instanceof Error ? error.message : 'Could not update follow')
                        }
                      }}
                    >
                      Follow
                    </button>
                  )}
                  <button
                    className="btn btn-outline"
                    onClick={async () => {
                      try {
                        const nextBlocked = await toggleBlockUser(supabase, profile.id)
                        setBlockState((current) => ({
                          ...current,
                          blockedByMe: nextBlocked,
                        }))
                        setActionMessage(nextBlocked ? 'Reader blocked' : 'Reader unblocked')
                      } catch (error) {
                        setActionMessage(error instanceof Error ? error.message : 'Could not update block')
                      }
                    }}
                  >
                    {blockState.blockedByMe ? 'Unblock' : 'Block'}
                  </button>
                  {actionMessage && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'right' }}>
                      {actionMessage}
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </div>

      {isBlocked ? (
        <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {blockState.blockedMe ? 'Profile unavailable' : 'Reader blocked'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
            {blockState.blockedMe
              ? 'This reader has blocked you, so their shelves and reading activity are hidden.'
              : 'You blocked this reader, so their shelves and reading activity stay hidden until you unblock them.'}
          </div>
        </div>
      ) : (
        <Bookcase
          ownerName={uiUser.name}
          favorites={favoriteSpines}
          sources={bookcaseSources}
          editable={isMe}
          storageKey={bookcasePreferences ? null : isMe ? `bookcase-layout:${profile.id}` : null}
          defaultRow2={
            isMe ? bookcaseDraft.row2_shelf : ((bookcasePreferences?.row2_shelf as ShelfKey) ?? 'reading')
          }
          defaultRow3={
            isMe ? bookcaseDraft.row3_shelf : ((bookcasePreferences?.row3_shelf as ShelfKey) ?? 'to_read')
          }
          row2CustomName={isMe ? bookcaseDraft.row2_custom_name : bookcasePreferences?.row2_custom_name}
          row3CustomName={isMe ? bookcaseDraft.row3_custom_name : bookcasePreferences?.row3_custom_name}
          onAddToShelf={isMe ? openPicker : undefined}
          onRemoveFromShelf={isMe ? removeFromShelf : undefined}
          onLayoutChange={
            isMe && bookcaseSyncSupported
              ? async (layout) => {
                  setBookcaseDraft((current) => ({
                    ...current,
                    row2_shelf: layout.row2,
                    row3_shelf: layout.row3,
                  }))
                  await saveBookcaseCustomization({
                    row2_shelf: layout.row2,
                    row3_shelf: layout.row3,
                  })
                }
              : undefined
          }
        />
      )}

      {picker && !isBlocked && (
        <CatalogBookPickerModal
          title={
            picker === 'favorites'
              ? 'Pin a favorite'
              : picker === 'reading'
              ? 'Add to Currently reading'
              : picker === 'to_read'
              ? 'Add to Want to read'
              : picker === 'read'
              ? 'Add to Finished'
              : 'Add to Did not finish'
          }
          localActionLabel="Add"
          onSelect={async (book) => {
            try {
              await addToShelf(picker, book)
              closePicker()
            } catch (error) {
              setActionMessage(error instanceof Error ? error.message : 'Could not add book')
            }
          }}
          onClose={closePicker}
        />
      )}

      {isMe && !isBlocked && (
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
                Favorites always lead row 1. Rows 2 and 3 can be renamed, switched, and filled from your shelves.
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
                    try {
                      const nextFavorites = await pinFavorite(supabase, favoriteSelection)
                      setFavorites(nextFavorites)
                      setFavoriteSelection('')
                      setActionMessage('Favorite pinned')
                    } catch (error) {
                      setActionMessage(
                        error instanceof Error ? error.message : 'Could not pin favorite'
                      )
                    }
                  }}
                >
                  Pin
                </button>
              </div>
            )}
          </div>

          <div
            className="card"
            style={{
              padding: 16,
              marginBottom: 16,
              background: 'color-mix(in oklab, var(--paper) 90%, white)',
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
              Rows 2 and 3
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 14 }}>
              Pick which shelves feed the lower rows, then give each row an optional custom name so the profile reads the way you want.
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'grid', gap: 4 }}>
                Row 2 shelf
                <select
                  value={bookcaseDraft.row2_shelf}
                  onChange={(event) =>
                    setBookcaseDraft((current) => ({
                      ...current,
                      row2_shelf: event.target.value as ShelfKey,
                    }))
                  }
                  style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }}
                >
                  {(Object.keys(SHELF_LABELS) as ShelfKey[])
                    .filter((key) => key !== bookcaseDraft.row3_shelf)
                    .map((key) => (
                      <option key={key} value={key}>
                        {SHELF_LABELS[key].label}
                      </option>
                    ))}
                </select>
              </label>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'grid', gap: 4 }}>
                Row 2 custom name
                <input
                  value={bookcaseDraft.row2_custom_name}
                  onChange={(event) =>
                    setBookcaseDraft((current) => ({
                      ...current,
                      row2_custom_name: event.target.value,
                    }))
                  }
                  maxLength={40}
                  placeholder={SHELF_LABELS[bookcaseDraft.row2_shelf].label}
                  style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }}
                />
              </label>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'grid', gap: 4 }}>
                Row 3 shelf
                <select
                  value={bookcaseDraft.row3_shelf}
                  onChange={(event) =>
                    setBookcaseDraft((current) => ({
                      ...current,
                      row3_shelf: event.target.value as ShelfKey,
                    }))
                  }
                  style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }}
                >
                  {(Object.keys(SHELF_LABELS) as ShelfKey[])
                    .filter((key) => key !== bookcaseDraft.row2_shelf)
                    .map((key) => (
                      <option key={key} value={key}>
                        {SHELF_LABELS[key].label}
                      </option>
                    ))}
                </select>
              </label>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'grid', gap: 4 }}>
                Row 3 custom name
                <input
                  value={bookcaseDraft.row3_custom_name}
                  onChange={(event) =>
                    setBookcaseDraft((current) => ({
                      ...current,
                      row3_custom_name: event.target.value,
                    }))
                  }
                  maxLength={40}
                  placeholder={SHELF_LABELS[bookcaseDraft.row3_shelf].label}
                  style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-pulp btn-sm"
                onClick={() => void saveBookcaseCustomization()}
                disabled={savingBookcase || !bookcaseSyncSupported}
              >
                {savingBookcase ? 'Saving...' : 'Save rows'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() =>
                  setBookcaseDraft((current) => ({
                    ...current,
                    row2_custom_name: '',
                    row3_custom_name: '',
                  }))
                }
              >
                Clear custom names
              </button>
              {actionMessage && (
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{actionMessage}</span>
              )}
            </div>
          </div>

          {favorites.length === 0 ? (
            <StateCard
              icon="star"
              title="No favorites pinned yet"
              body="Pin up to four books so the top of this profile has something to lead with."
              actionHref={isMe ? '/search' : undefined}
              actionLabel={isMe ? 'Find books' : undefined}
              compact
            />
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

      {!isBlocked && badges.length > 0 && (
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

      {!isBlocked && (
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
      )}

      {!isBlocked && (
        <>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Currently reading
          </div>
          {currentReading.length > 0 ? (
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
                          started {formatDateOnly(row.started_at)}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div style={{ marginBottom: 40 }}>
              <StateCard
                icon="book"
                title={isMe ? 'No current reads yet' : `${uiUser.name} is not tracking a current read yet`}
                body={
                  isMe
                    ? 'Add a book to your reading shelf and it will show up here.'
                    : 'This section fills in once a book is on the reading shelf.'
                }
                actionHref={isMe ? '/search' : undefined}
                actionLabel={isMe ? 'Find a book' : undefined}
                compact
              />
            </div>
          )}
        </>
      )}

      {!isBlocked && (
        <div className="card" style={{ padding: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Reading life - last 90 days
        </div>
        {sessions.length > 0 ? (
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
        ) : (
          <StateCard
            icon="clock"
            title="No recent sessions yet"
            body={isMe ? 'Log a reading session and your recent reading pattern will show up here.' : 'This chart fills in once sessions are logged.'}
            actionHref={isMe ? '/streak' : undefined}
            actionLabel={isMe ? 'Open tracker' : undefined}
            compact
          />
        )}
        </div>
      )}
    </div>
  )
}

function BookcasePickerModal({
  target,
  query,
  onQueryChange,
  results,
  loading,
  error,
  onPick,
  onClose,
}: {
  target: BookcaseShelfTarget
  query: string
  onQueryChange: (value: string) => void
  results: DbBookWithAuthors[]
  loading: boolean
  error: string
  onPick: (bookId: string) => Promise<void>
  onClose: () => void
}) {
  const heading =
    target === 'favorites'
      ? 'Pin a favorite'
      : target === 'reading'
      ? 'Add to Currently reading'
      : target === 'to_read'
      ? 'Add to Want to read'
      : target === 'read'
      ? 'Add to Finished'
      : 'Add to Did not finish'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 120,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 560, maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 24 }}
      >
        <div className="eyebrow" style={{ marginBottom: 8 }}>{heading}</div>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by title, author, or series"
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            fontSize: 14,
            marginBottom: 14,
          }}
        />
        {error && <div style={{ fontSize: 12, color: 'var(--danger, #c0392b)', marginBottom: 10 }}>{error}</div>}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          {loading && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Searching...</div>}
          {!loading && results.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              {query ? 'No matches. Try a different search.' : 'Start typing to search the catalog.'}
            </div>
          )}
          {results.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => onPick(book.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--paper)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {book.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {book.authors?.map((a) => a.name).join(', ') || 'Unknown author'}
                  {book.published_year ? ` · ${book.published_year}` : ''}
                </div>
              </div>
              <span className="btn btn-outline btn-sm">Add</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
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

function dateOnlyToUtcMs(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString()
}
