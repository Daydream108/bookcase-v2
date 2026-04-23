'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Cover } from '@/components/redesign/Cover'
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
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 420px', gap: 20, alignItems: 'start', marginBottom: 36 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Reading clubs</div>
          <h1 className="display-lg">
            Read<br />
            <i style={{ color: 'var(--pulp)' }}>with someone.</i>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 620, marginTop: 18 }}>
            Join a public club or start one for a book you want to read with others.
          </p>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Start a club</div>
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
                style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14 }}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this club about?"
                rows={4}
                style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <button type="submit" disabled={saving} className="btn btn-pulp" style={{ justifyContent: 'center' }}>
                {saving ? 'Creating...' : 'Create club'}
              </button>
              {message && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{message}</div>}
            </form>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              Sign in to start a club.
            </div>
          )}
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 14 }}>Public clubs</div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading...</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {clubs.map((club) => {
            const bookUi = club.current_book ? toUiBook(club.current_book) : null
            return (
              <div key={club.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 24, background: 'var(--ink)', color: 'var(--paper)' }}>
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <h3 className="serif" style={{ fontSize: 24, lineHeight: 1.1 }}>{club.name}</h3>
                      {club.description && (
                        <p style={{ fontSize: 14, opacity: 0.9, marginTop: 10 }}>{club.description}</p>
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
                      Open
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
  )
}
