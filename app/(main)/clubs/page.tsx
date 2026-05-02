'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { ReportButton } from '@/components/redesign/ReportButton'
import { StateCard } from '@/components/redesign/StateCard'
import { createClient } from '@/lib/supabase/client'
import {
  createClub,
  getCurrentProfile,
  joinClub,
  leaveClub,
  listClubs,
  toUiBook,
  type DbClub,
  type DbProfile,
} from '@/lib/db'

export default function ClubsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [me, setMe] = useState<DbProfile | null>(null)
  const [clubs, setClubs] = useState<DbClub[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const featuredClubs = clubs.slice(0, 3)
  const totalMembers = clubs.reduce((sum, club) => sum + (club.member_count ?? 0), 0)
  const activeBooks = clubs.filter((club) => club.current_book).length

  const load = async () => {
    try {
      setLoadError('')
      const [profile, rows] = await Promise.all([
        getCurrentProfile(supabase),
        listClubs(supabase, 24),
      ])
      setMe(profile)
      setClubs(rows)
    } catch (error) {
      setClubs([])
      setLoadError((error as Error).message || 'Could not load clubs right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoadError('')
        const [profile, rows] = await Promise.all([
          getCurrentProfile(supabase),
          listClubs(supabase, 24),
        ])
        if (cancelled) return
        setMe(profile)
        setClubs(rows)
      } catch (error) {
        if (cancelled) return
        setClubs([])
        setLoadError((error as Error).message || 'Could not load clubs right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 48% 36% at 12% 0%, var(--pulp-glow), transparent 70%), radial-gradient(ellipse 52% 40% at 95% 18%, oklch(48% 0.09 150 / 0.12), transparent 72%)',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '34px 40px 56px' }}>
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)',
            gap: 40,
            alignItems: 'center',
            marginBottom: 30,
          }}
        >
          <div>
            <div className="chip chip-pulp" style={{ marginBottom: 20 }}>
              Reading clubs
            </div>
            <h1 className="display-xl" style={{ marginBottom: 22 }}>
              Read together.
              <br />
              <i style={{ color: 'var(--pulp)' }}>Stay in the thread.</i>
            </h1>
            <p style={{ fontSize: 18, color: 'var(--ink-2)', lineHeight: 1.58, maxWidth: 650, marginBottom: 26 }}>
              Browse public clubs, jump into the current book, or start a small room for the book everyone keeps meaning to read.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <a href="#public-clubs" className="btn btn-pulp btn-lg">
                Browse clubs <Icon name="arrow" size={16} color="white" />
              </a>
              {me ? (
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Club name"]')?.focus()}
                >
                  <Icon name="plus" size={16} /> Start one
                </button>
              ) : (
                <Link href="/login" className="btn btn-outline btn-lg">
                  Sign in to create
                </Link>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, maxWidth: 660 }}>
              <ClubStat label="public clubs" value={loading ? '-' : String(clubs.length)} />
              <ClubStat label="members" value={loading ? '-' : String(totalMembers)} />
              <ClubStat label="current books" value={loading ? '-' : String(activeBooks)} />
            </div>
          </div>

          <div style={{ position: 'relative', minHeight: 500 }}>
            <div
              style={{
                position: 'absolute',
                inset: '16px 10px 44px 42px',
                borderRadius: 28,
                background: 'var(--ink)',
                boxShadow: 'var(--shadow-lg)',
                transform: 'rotate(2deg)',
              }}
            />
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                margin: '34px 34px 0 0',
                padding: 22,
                borderRadius: 24,
                background: 'var(--paper)',
                border: '1px solid var(--border-2)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 16 }}>
                Featured rooms
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {(featuredClubs.length ? featuredClubs : previewClubs).map((club, index) => {
                  const bookUi = 'current_book' in club && club.current_book ? toUiBook(club.current_book) : null
                  return (
                    <Link
                      key={club.id}
                      href={'owner_id' in club ? `/clubs/${club.id}` : '#public-clubs'}
                      className="card"
                      style={{
                        padding: 14,
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: 'inherit',
                        transform: `rotate(${index === 1 ? -1.5 : index === 2 ? 1.2 : 0}deg)`,
                        boxShadow: index === 0 ? 'var(--shadow-md)' : undefined,
                      }}
                    >
                      {bookUi ? (
                        <Cover book={bookUi} size={58} />
                      ) : (
                        <div
                          style={{
                            width: 46,
                            height: 58,
                            borderRadius: 8,
                            background:
                              index === 0
                                ? 'var(--pulp)'
                                : index === 1
                                ? 'var(--moss)'
                                : 'var(--plum)',
                            color: 'white',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <Icon name={index === 1 ? 'message' : 'users'} size={21} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="serif" style={{ fontSize: 22, lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {club.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>
                          {club.member_count ?? 0} members
                          {'current_book' in club && club.current_book ? ` / ${club.current_book.title}` : ''}
                        </div>
                      </div>
                      <Icon name="chevron" size={18} color="var(--ink-3)" />
                    </Link>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 28,
                zIndex: 3,
                background: 'var(--paper)',
                border: '1px solid var(--border-2)',
                borderRadius: 16,
                padding: '10px 14px',
                boxShadow: 'var(--shadow-md)',
                transform: 'rotate(-4deg)',
              }}
            >
              <div className="mono" style={{ fontSize: 10, color: 'var(--pulp)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Next discussion
              </div>
              <div className="serif" style={{ fontSize: 20, marginTop: 2 }}>
                Chapter 12 at 8
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            padding: '14px 0',
            overflow: 'hidden',
            borderRadius: 18,
            margin: '0 0 34px',
            transform: 'rotate(-0.6deg)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="marquee mono" style={{ whiteSpace: 'nowrap', fontSize: 14, letterSpacing: '0.06em', display: 'inline-block' }}>
            BOOK CLUBS / SPOILER THREADS / GROUP READS / CURRENT PICKS / MEMBER POSTS / BOOK CLUBS / SPOILER THREADS / GROUP READS / CURRENT PICKS / MEMBER POSTS /
          </div>
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 390px',
            gap: 20,
            alignItems: 'start',
            marginBottom: 34,
          }}
        >
          <div
            className="card"
            style={{
              padding: 22,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 14,
              background: 'linear-gradient(135deg, var(--paper), color-mix(in oklab, var(--moss) 8%, var(--paper)))',
            }}
          >
            <ClubFeature icon="book" title="Pick a current book" body="Keep each group centered around the title everyone is reading." />
            <ClubFeature icon="thread" title="Talk in context" body="Club posts and book threads keep the discussion easy to return to." />
            <ClubFeature icon="shield" title="Public by default" body="Find open rooms, report issues, and keep smaller groups manageable." />
          </div>

          <div className="card" style={{ padding: 22, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Start a club</div>
                <div className="serif" style={{ fontSize: 26, lineHeight: 1 }}>
                  Make a room.
                </div>
              </div>
              <span className="chip chip-moss">
                Public
              </span>
            </div>
          {me ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!name.trim()) {
                  setMessage('Add a club name first')
                  return
                }
                setSaving(true)
                try {
                  const club = await createClub(supabase, {
                    name,
                    description,
                    isPublic: true,
                  })
                  setName('')
                  setDescription('')
                  setMessage('Club created')
                  await load()
                  router.push(`/clubs/${club.id}`)
                } catch (error) {
                  setMessage((error as Error).message || 'Could not create club')
                } finally {
                  setSaving(false)
                }
              }}
              style={{ display: 'grid', gap: 10 }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Club name"
                style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', fontSize: 14, background: 'var(--paper-2)' }}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this club about?"
                rows={4}
                style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', background: 'var(--paper-2)' }}
              />
              <button type="submit" disabled={saving} className="btn btn-pulp" style={{ justifyContent: 'center' }}>
                {saving ? 'Creating...' : <>Create club <Icon name="arrow" size={15} color="white" /></>}
              </button>
              {message && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{message}</div>}
            </form>
          ) : (
            <Link href="/login" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
              Sign in to start a club
            </Link>
          )}
          </div>
        </section>

      <div id="public-clubs" style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16, marginBottom: 16, scrollMarginTop: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Public clubs</div>
          <h2 className="display-md">
            Find your
            <br />
            <i style={{ color: 'var(--pulp)' }}>next room.</i>
          </h2>
        </div>
        <Link href="/search" className="btn btn-ghost btn-sm">
          <Icon name="search" size={14} /> Search books
        </Link>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading clubs...</div>
      ) : loadError ? (
        <StateCard
          icon="users"
          title="Clubs could not load"
          body={loadError}
          actionHref="/home"
          actionLabel="Back home"
        />
      ) : clubs.length === 0 ? (
        <StateCard
          icon="users"
          title="No clubs yet"
          body="Start the first public club so new readers have somewhere to gather."
          action={
            me ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() =>
                  document.querySelector<HTMLInputElement>('input[placeholder=\"Club name\"]')?.focus()
                }
              >
                Start one
              </button>
            ) : (
              <Link href="/login" className="btn btn-outline btn-sm">
                Sign in to start one
              </Link>
            )
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
          {clubs.map((club) => {
            const bookUi = club.current_book ? toUiBook(club.current_book) : null
            return (
              <div key={club.id} className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div
                  style={{
                    padding: 24,
                    background:
                      'linear-gradient(135deg, var(--ink), color-mix(in oklab, var(--ink) 78%, var(--pulp)))',
                    color: 'var(--paper)',
                    minHeight: 150,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: 18,
                      bottom: -18,
                      width: 82,
                      height: 82,
                      borderRadius: 24,
                      border: '1px solid rgba(255,255,255,0.14)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'rgba(255,255,255,0.72)',
                      transform: 'rotate(8deg)',
                    }}
                  >
                    <Icon name="users" size={34} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <h3 className="serif" style={{ fontSize: 30, lineHeight: 1.02 }}>{club.name}</h3>
                      {club.description && (
                        <p style={{ fontSize: 14, opacity: 0.88, marginTop: 10, lineHeight: 1.5, maxWidth: 420 }}>{club.description}</p>
                      )}
                    </div>
                    <span className="chip" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                      {club.member_count ?? 0} members
                    </span>
                  </div>
                </div>

                {bookUi && club.current_book && (
                  <div style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Cover book={bookUi} size={60} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                        Currently reading
                      </div>
                      <Link href={`/book/${club.current_book.id}`} style={{ fontSize: 14, fontWeight: 600 }}>
                        {club.current_book.title}
                      </Link>
                    </div>
                  </div>
                )}

                {!bookUi && (
                  <div style={{ padding: 20, display: 'flex', gap: 12, alignItems: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                    <Icon name="book" size={18} />
                    No current book yet.
                  </div>
                )}

                <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {club.is_public ? 'Public' : 'Private'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {me && me.id !== club.owner_id && (
                      <ReportButton
                        entityType="club"
                        entityId={club.id}
                        targetUserId={club.owner_id}
                        compact
                      />
                    )}
                    <Link href={`/clubs/${club.id}`} className="btn btn-outline btn-sm">
                      Open <Icon name="chevron" size={13} />
                    </Link>
                    {me && (
                      <button
                        className={club.is_member ? 'btn btn-ghost btn-sm' : 'btn btn-pulp btn-sm'}
                        onClick={async () => {
                          try {
                            if (club.is_member) {
                              await leaveClub(supabase, club.id)
                            } else {
                              await joinClub(supabase, club.id)
                            }
                            await load()
                          } catch (error) {
                            setMessage((error as Error).message || 'Could not update membership')
                          }
                        }}
                      >
                        {club.is_member ? 'Leave' : 'Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

const previewClubs = [
  { id: 'preview-1', name: 'Weekend Sci-Fi', member_count: 18 },
  { id: 'preview-2', name: 'Chapter by Chapter', member_count: 12 },
  { id: 'preview-3', name: 'Slow Burn Classics', member_count: 9 },
]

function ClubStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        border: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--paper) 78%, white)',
      }}
    >
      <div className="serif" style={{ fontSize: 34, lineHeight: 1 }}>
        {value}
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 7 }}>
        {label}
      </div>
    </div>
  )
}

function ClubFeature({
  icon,
  title,
  body,
}: {
  icon: string
  title: string
  body: string
}) {
  return (
    <div>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--ink)',
          color: 'var(--paper)',
          marginBottom: 12,
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      <div className="serif" style={{ fontSize: 23, lineHeight: 1.05, marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}>
        {body}
      </p>
    </div>
  )
}
