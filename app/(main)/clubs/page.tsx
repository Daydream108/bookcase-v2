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
  getCommunityTournamentVoteState,
  getCurrentProfile,
  joinClub,
  leaveClub,
  listClubs,
  listRecentClubPostPreviews,
  setCommunityTournamentVote,
  toUiBook,
  toUiUser,
  type DbCommunityTournamentVoteState,
  type DbClub,
  type DbClubPostPreview,
  type DbProfile,
} from '@/lib/db'

type Tab = 'your' | 'discover' | 'live' | 'week'

const tournamentBooks = [
  { id: 'hm', title: 'Project Hail Mary', author: 'Andy Weir', cover: 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg', rating: 4.5, ratings: 0, mood: [], genre: 'sci-fi', pages: 476, year: 2021, color: '#1a1a1a' },
  { id: 'sr', title: 'Sunrise on the Reaping', author: 'Suzanne Collins', cover: 'https://covers.openlibrary.org/b/isbn/9781546171461-L.jpg', rating: 0, ratings: 0, mood: [], genre: 'dystopian', pages: 400, year: 2025, color: '#2a1812' },
]

const FALLBACK_TOURNAMENT: DbCommunityTournamentVoteState = {
  supported: false,
  my_vote: null,
  choices: tournamentBooks.map((book, index) => ({
    id: book.id,
    tournament_key: '2026-05-community-read',
    book_key: book.id,
    title: book.title,
    author: book.author,
    cover_url: book.cover,
    position: index + 1,
    vote_count: 0,
  })),
}

export default function ClubsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [me, setMe] = useState<DbProfile | null>(null)
  const [clubs, setClubs] = useState<DbClub[]>([])
  const [replyPreviews, setReplyPreviews] = useState<Record<string, DbClubPostPreview[]>>({})
  const [tab, setTab] = useState<Tab>('your')
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<DbCommunityTournamentVoteState>(FALLBACK_TOURNAMENT)

  const load = async () => {
    try {
      setLoadError('')
      const [profile, rows, tournamentState] = await Promise.all([
        getCurrentProfile(supabase),
        listClubs(supabase, 24),
        getCommunityTournamentVoteState(supabase),
      ])
      const previews = await listRecentClubPostPreviews(supabase, rows.map((club) => club.id))
      setMe(profile)
      setClubs(rows)
      setReplyPreviews(previews)
      setTournament(tournamentState)
    } catch (error) {
      setClubs([])
      setReplyPreviews({})
      setLoadError((error as Error).message || 'Could not load clubs right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await load()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const filteredClubs = clubs.filter((club) => {
    const haystack = `${club.name} ${club.description ?? ''} ${club.current_book?.title ?? ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })
  const liveClubs: DbClub[] = []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <section
        style={{
          position: 'relative',
          margin: '-32px -40px 0',
          padding: '58px 40px 38px',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, oklch(17% 0.02 60), oklch(24% 0.08 42) 54%, oklch(18% 0.04 150))',
          color: 'var(--paper)',
        }}
      >
        <FloatingSpines />
        <div className="clubs-hero-grid" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 390px', gap: 34, alignItems: 'center' }}>
          <div>
            <div className="chip" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.16)', marginBottom: 20 }}>
              <LiveDot /> 0 live rooms now
            </div>
            <h1 className="display-xl" style={{ maxWidth: 780, marginBottom: 22 }}>
              Read together,
              <br />
              <i style={{ color: 'var(--pulp)' }}>finish together.</i>
            </h1>
            <p style={{ maxWidth: 650, color: 'rgba(255,255,255,0.74)', fontSize: 18, lineHeight: 1.55, marginBottom: 26 }}>
              Bookcase clubs turn a shared book into a room: live check-ins, spoiler-aware threads, progress boards, and the little pressure that helps everyone actually finish.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-pulp btn-lg" onClick={() => setTab('live')}>
                Drop into live rooms <Icon name="arrow" size={16} color="white" />
              </button>
              <button className="btn btn-outline btn-lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.26)' }} onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Club name"]')?.focus()}>
                Start a club
              </button>
            </div>
          </div>
          <LiveNowPanel clubs={liveClubs} loading={loading} />
        </div>
      </section>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '26px 40px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div className="tabs" style={{ borderBottom: 0, gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'your' as const, label: 'Your clubs', count: clubs.length },
              { id: 'discover' as const, label: 'Discover', count: clubs.length },
              { id: 'live' as const, label: 'Live rooms', count: Math.max(liveClubs.length, 0) },
              { id: 'week' as const, label: 'This week', count: 0 },
            ].map((item) => (
              <button
                key={item.id}
                className={'chip' + (tab === item.id ? ' chip-ink' : '')}
                onClick={() => setTab(item.id)}
                style={{ padding: '9px 13px', cursor: 'pointer' }}
              >
                {item.label}
                <span className="mono" style={{ fontSize: 10, opacity: 0.7 }}>{item.count}</span>
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: 260 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search clubs"
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--paper-2)', fontSize: 13 }}
            />
            <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--ink-3)' }}>
              <Icon name="search" size={15} />
            </span>
          </div>
        </div>

        {loadError && (
          <StateCard icon="users" title="Clubs could not load" body={loadError} actionHref="/home" actionLabel="Back home" />
        )}

        {tab === 'your' && (
          <div style={{ display: 'grid', gap: 24 }}>
            <CreateClubPanel
              me={me}
              name={name}
              description={description}
              saving={saving}
              message={message}
              setName={setName}
              setDescription={setDescription}
              onSubmit={async () => {
                if (!name.trim()) return setMessage('Add a club name first')
                setSaving(true)
                try {
                  const club = await createClub(supabase, { name, description, isPublic: true })
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
            />

            {loading ? (
              <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--ink-3)' }}>Loading clubs...</div>
            ) : filteredClubs.length ? (
              <div className="clubs-two-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
                {filteredClubs.map((club, index) => (
                  <ClubCardBig
                    key={club.id}
                    club={club}
                    tone={clubTones[index % clubTones.length]}
                    previews={replyPreviews[club.id] ?? []}
                    me={me}
                    onJoinToggle={async () => {
                      if (club.is_member) await leaveClub(supabase, club.id)
                      else await joinClub(supabase, club.id)
                      await load()
                    }}
                  />
                ))}
              </div>
            ) : (
              <StateCard icon="users" title="No clubs yet" body="Start the first public club from your main account and the admin controls will belong to you." compact />
            )}

            <section className="clubs-two-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 18 }}>
              <Tournament
                state={tournament}
                me={me}
                onVote={async (choiceId) => {
                  const next = await setCommunityTournamentVote(supabase, choiceId)
                  setTournament(next)
                }}
              />
              <Leaderboard clubs={filteredClubs} />
            </section>
          </div>
        )}

        {tab === 'discover' && <DiscoverView me={me} />}
        {tab === 'live' && <LiveRoomsView clubs={liveClubs} />}
        {tab === 'week' && <CalendarView />}
      </main>
    </div>
  )
}

const clubTones = ['oklch(28% 0.08 42)', 'oklch(25% 0.08 240)', 'oklch(27% 0.09 150)', 'oklch(26% 0.1 340)']

function FloatingSpines() {
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            width: 18 + index * 3,
            height: 170 + index * 18,
            borderRadius: 8,
            background: index % 2 ? 'rgba(255,255,255,0.08)' : 'oklch(62% 0.18 42 / 0.22)',
            left: `${8 + index * 15}%`,
            top: `${index % 2 ? 10 : 46}%`,
            transform: `rotate(${index % 2 ? -18 : 14}deg)`,
          }}
        />
      ))}
    </>
  )
}

function LiveDot() {
  return <span style={{ width: 8, height: 8, borderRadius: 99, background: 'oklch(62% 0.22 25)', boxShadow: '0 0 0 6px oklch(62% 0.22 25 / 0.18)', animation: 'pulse 1.2s infinite' }} />
}

function LiveNowPanel({ clubs, loading }: { clubs: DbClub[]; loading: boolean }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.18)', borderRadius: 22, padding: 18, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
      <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.62)', marginBottom: 14 }}>Live now</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Checking rooms...</div>
        ) : clubs.length ? (
          clubs.map((club) => (
            <Link key={club.id} href={`/clubs/${club.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.1)' }}>
              <LiveDot />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)' }}>{club.member_count ?? 0} members / current book</div>
              </div>
              <span className="btn btn-pulp btn-sm">Drop-in</span>
            </Link>
          ))
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>No live rooms yet. Create a club and set the first current book.</div>
        )}
      </div>
    </div>
  )
}

function CreateClubPanel({
  me,
  name,
  description,
  saving,
  message,
  setName,
  setDescription,
  onSubmit,
}: {
  me: DbProfile | null
  name: string
  description: string
  saving: boolean
  message: string
  setName: (value: string) => void
  setDescription: (value: string) => void
  onSubmit: () => Promise<void>
}) {
  return (
    <div className="card clubs-create-grid" style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 390px', gap: 18, alignItems: 'center', background: 'linear-gradient(135deg, var(--paper), var(--pulp-soft))' }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Host controls</div>
        <h2 className="display-md" style={{ marginBottom: 8 }}>Start the room from your main account.</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5 }}>The club you create here will make you the owner, so the admin features on the detail page will be yours to test.</p>
      </div>
      {me ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit()
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Club name" style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--paper)' }} />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this club about?" rows={3} style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--paper)', resize: 'vertical' }} />
          <button type="submit" disabled={saving} className="btn btn-pulp" style={{ justifyContent: 'center' }}>{saving ? 'Creating...' : 'Create club'}</button>
          {message && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{message}</div>}
        </form>
      ) : (
        <Link href="/login" className="btn btn-outline" style={{ justifyContent: 'center' }}>Sign in to start one</Link>
      )}
    </div>
  )
}

function ClubCardBig({ club, tone, previews, me, onJoinToggle }: { club: DbClub; tone: string; previews: DbClubPostPreview[]; me: DbProfile | null; onJoinToggle: () => Promise<void> }) {
  const book = club.current_book ? toUiBook(club.current_book) : null
  return (
    <div className="card" style={{ overflow: 'hidden', transition: 'box-shadow 0.18s' }}>
      <div style={{ position: 'relative', minHeight: 178, padding: 22, background: tone, color: 'var(--paper)' }}>
        <div style={{ position: 'absolute', right: 18, top: 10, fontSize: 82, opacity: 0.12 }}>BC</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, position: 'relative' }}>
          <div>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.58)', marginBottom: 10 }}>Weekly room</div>
            <h3 className="serif" style={{ fontSize: 34, lineHeight: 0.98, marginBottom: 10 }}>{club.name}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span className="chip" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.18)', color: 'white' }}>wine optional</span>
              <span className="chip" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.18)', color: 'white' }}>spoiler-aware</span>
            </div>
          </div>
          <span className="chip" style={{ alignSelf: 'start', background: 'rgba(255,255,255,0.14)', color: 'white', borderColor: 'rgba(255,255,255,0.18)' }}>{club.member_count ?? 0} members</span>
        </div>
      </div>
      <div style={{ padding: 18, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {book ? <Cover book={book} size={64} /> : <div style={{ width: 44, height: 64, borderRadius: 8, background: 'var(--paper-2)', display: 'grid', placeItems: 'center' }}><Icon name="book" size={19} /></div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Current book</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{club.current_book?.title ?? 'Pick a current book'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>
              {club.current_book ? 'Progress appears once members log sessions.' : 'Owner can choose this on the club page.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {club.is_member ? 'You are a member' : club.is_public ? 'Public club' : 'Private club'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/clubs/${club.id}`} className="btn btn-pulp btn-sm">Drop-in</Link>
            <Link href={`/clubs/${club.id}`} className="btn btn-outline btn-sm">Open</Link>
            {me && me.id !== club.owner_id && <ReportButton entityType="club" entityId={club.id} targetUserId={club.owner_id} compact />}
            {me && <button className={club.is_member ? 'btn btn-ghost btn-sm' : 'btn btn-pulp btn-sm'} onClick={() => void onJoinToggle()}>{club.is_member ? 'Leave' : 'Join'}</button>}
          </div>
        </div>
        <ReplyPreview previews={previews} clubId={club.id} />
      </div>
    </div>
  )
}

function ReplyPreview({ previews, clubId }: { previews: DbClubPostPreview[]; clubId: string }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="eyebrow">Club chatter</div>
      {previews.length ? previews.map((preview) => {
        const user = toUiUser(preview.profile)
        return (
          <Link key={preview.id} href={`/clubs/${clubId}`} style={{ padding: 11, borderRadius: 12, background: 'var(--paper-2)', border: '1px solid var(--border)', display: 'grid', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
              <b>{preview.title}</b>
              <span className="mono" style={{ color: 'var(--ink-4)' }}>@{user.handle}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{preview.body}</div>
          </Link>
        )
      }) : <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No replies yet.</div>}
    </div>
  )
}

function Tournament({
  state,
  me,
  onVote,
}: {
  state: DbCommunityTournamentVoteState
  me: DbProfile | null
  onVote: (choiceId: string) => Promise<void>
}) {
  const [pendingChoiceId, setPendingChoiceId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const totalVotes = state.choices.reduce((sum, choice) => sum + choice.vote_count, 0)

  const castVote = async (choiceId: string) => {
    if (!me) {
      setError('Sign in to vote')
      return
    }
    setError('')
    setPendingChoiceId(choiceId)
    try {
      await onVote(choiceId)
    } catch (err) {
      setError((err as Error).message || 'Could not save your vote')
    } finally {
      setPendingChoiceId(null)
    }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Community tournament</div>
      <h2 className="display-sm" style={{ marginBottom: 8 }}>May matchup</h2>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 16 }}>
        Pick the next community read. Votes are shared through Supabase and visible to every reader.
      </p>
      <div className="clubs-two-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {state.choices.map((choice) => (
          <TournamentChoice
            key={choice.id}
            choice={choice}
            total={totalVotes}
            selected={state.my_vote === choice.id}
            pending={pendingChoiceId === choice.id}
            disabled={!state.supported}
            onVote={() => castVote(choice.id)}
          />
        ))}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 12 }}>
        {totalVotes === 0 ? 'No votes yet' : `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'} cast`}
      </div>
      {!state.supported && (
        <div style={{ fontSize: 12, color: 'var(--pulp-deep)', marginTop: 10 }}>
          Run the latest Supabase schema to enable shared tournament voting.
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--pulp-deep)', marginTop: 10 }}>{error}</div>}
    </div>
  )
}

function TournamentChoice({
  choice,
  total,
  selected,
  pending,
  disabled,
  onVote,
}: {
  choice: DbCommunityTournamentVoteState['choices'][number]
  total: number
  selected: boolean
  pending: boolean
  disabled: boolean
  onVote: () => void
}) {
  const count = choice.vote_count
  const percent = total > 0 ? Math.round((count / total) * 100) : 0
  const book = {
    id: choice.id,
    title: choice.title,
    author: choice.author,
    cover: choice.cover_url ?? '',
    rating: 0,
    ratings: 0,
    mood: [] as string[],
    genre: '',
    pages: 0,
    year: 0,
    color: '#1a1a1a',
  }
  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderColor: selected ? 'var(--pulp)' : 'var(--border)',
        background: selected ? 'var(--pulp-soft)' : 'var(--paper)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <Cover book={book} size={54} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, lineHeight: 1.15 }}>{book.title}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{book.author}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
        <span className="mono">{count} {count === 1 ? 'vote' : 'votes'}</span>
        <span className="mono">{percent}%</span>
      </div>
      <div className="progress" style={{ marginBottom: 12 }}>
        <div style={{ width: `${percent}%`, background: selected ? 'var(--pulp)' : 'var(--ink-4)' }} />
      </div>
      <button
        className={selected ? 'btn btn-pulp btn-sm' : 'btn btn-outline btn-sm'}
        onClick={onVote}
        disabled={disabled || pending}
        style={{ width: '100%', justifyContent: 'center', opacity: disabled ? 0.65 : 1 }}
      >
        {pending ? 'Saving...' : selected ? 'Voted' : 'Cast vote'}
      </button>
    </div>
  )
}

function Leaderboard({ clubs }: { clubs: DbClub[] }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Club leaderboard</div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}>
        No leaderboard yet. This will turn on after clubs have real logged reading sessions.
      </p>
    </div>
  )
}

function DiscoverView({ me }: { me: DbProfile | null }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{['Trending', 'New', 'Small', 'Hardcore', 'Casual', 'Voice rooms', 'Spoiler-safe'].map((chip) => <button key={chip} className="chip" style={{ cursor: 'pointer' }}>{chip}</button>)}</div>
      <StateCard
        icon="search"
        title="Discover is waiting on real clubs"
        body="Once more public clubs exist, this view can rank and filter them without invented data."
        compact
        action={
          me ? (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Club name"]')?.focus()}
            >
              Start a club
            </button>
          ) : (
            <Link href="/login" className="btn btn-outline btn-sm">Sign in</Link>
          )
        }
      />
    </div>
  )
}

function LiveRoomsView({ clubs }: { clubs: DbClub[] }) {
  const rooms = clubs.length ? clubs : []
  return rooms.length ? (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
      {rooms.map((club) => <LiveRoomCard key={club.id} club={club} />)}
      <div className="card" style={{ borderStyle: 'dashed', padding: 24, display: 'grid', placeItems: 'center', minHeight: 180 }}><button className="btn btn-outline">Host your own live room</button></div>
    </div>
  ) : <StateCard icon="users" title="No live rooms yet" body="Create a club, choose a current book, and it will be ready for live-room testing." compact />
}

function LiveRoomCard({ club }: { club: DbClub }) {
  return (
    <div className="card" style={{ padding: 22, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><span className="chip chip-pulp"><LiveDot /> Live now</span><h3 className="serif" style={{ fontSize: 32, marginTop: 10 }}>{club.name}</h3><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Voice + chat / spoiler-tagged for current chapters</div></div><AudioBars /></div>
      <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>Live presence counts will appear once voice rooms are wired to real room state.</div>
      <div style={{ display: 'flex', gap: 8 }}><Link href={`/clubs/${club.id}`} className="btn btn-pulp">Drop in</Link><Link href={`/clubs/${club.id}`} className="btn btn-outline">Listen only</Link></div>
    </div>
  )
}

function AudioBars() {
  return <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 30 }}>{[0, 1, 2, 3, 4].map((bar) => <span key={bar} style={{ width: 5, height: 8 + bar * 4, borderRadius: 99, background: 'var(--pulp)', animation: `bar ${0.7 + bar * 0.08}s alternate infinite ease-in-out` }} />)}</div>
}

function CalendarView() {
  return (
    <StateCard
      icon="clock"
      title="No club events yet"
      body="Events will show here after a club owner schedules them."
      compact
    />
  )
}
