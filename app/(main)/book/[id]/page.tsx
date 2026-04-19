'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { books, users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { Spoiler, VoteBar } from '@/components/redesign/primitives'

type Quote = {
  id: number
  userId: string
  body: string
  page: number | null
  votes: number
  comments: number
  voted: boolean
  time: string
  timebucket: string
  mine?: boolean
}

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const book = books.find((b) => b.id === id) ?? books[0]

  const [shelf, setShelf] = useState<'none' | 'reading' | 'want'>('none')
  const [rating, setRating] = useState(0)
  const [tab, setTab] = useState<'threads' | 'reviews' | 'quotes' | 'lists'>('threads')
  const [sort, setSort] = useState<'hot' | 'top' | 'new'>('hot')
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all')
  const [showLog, setShowLog] = useState(false)
  const [tags, setTags] = useState(['Campus', 'Unreliable narrator', 'Secret society'])
  const [newTag, setNewTag] = useState('')
  const [quotes, setQuotes] = useState<Quote[]>([
    { id: 1, userId: 'ava', body: 'Beauty is terror. Whatever we call beautiful, we quiver before it.', page: 42, votes: 1284, comments: 87, voted: true, time: '3d', timebucket: 'week' },
    { id: 2, userId: 'jules', body: 'Does such a thing as "the fatal flaw," that showy dark crack running down the middle of a life, exist outside literature?', page: 9, votes: 892, comments: 42, voted: false, time: '5d', timebucket: 'week' },
    { id: 3, userId: 'sam', body: 'I suppose at one time in my life I might have had any number of stories, but now there is no other. This is the only story I will ever be able to tell.', page: 1, votes: 2104, comments: 132, voted: false, time: '2w', timebucket: 'month' },
    { id: 4, userId: 'maya', body: 'The world is a mess, and I just need to rule it.', page: 218, votes: 68, comments: 4, voted: false, time: '8h', timebucket: 'day' },
  ])
  const [newQuote, setNewQuote] = useState('')
  const [newQuotePage, setNewQuotePage] = useState('')

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t))

  const addQuote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuote.trim()) return
    setQuotes([
      { id: Date.now(), userId: 'brett', body: newQuote, page: parseInt(newQuotePage) || null, votes: 1, comments: 0, voted: true, time: 'just now', timebucket: 'day', mine: true },
      ...quotes,
    ])
    setNewQuote('')
    setNewQuotePage('')
  }

  const toggleQuoteVote = (id: number) =>
    setQuotes(quotes.map((q) => (q.id === id ? { ...q, voted: !q.voted, votes: q.voted ? q.votes - 1 : q.votes + 1 } : q)))

  const reviews = [
    { userId: 'ava', rating: 5, body: 'i will think about this book every single october. henry is my roman empire. the way donna tartt writes obsession—', spoiler: 'the bacchanal reveal completely rewired how i read the first third', votes: 230, replies: 23, time: '2h', timebucket: 'day' },
    { userId: 'jules', rating: 4.5, body: 'peak dark academia. the prose is gorgeous, the dread is immaculate. deducting half a star because ', spoiler: 'the judy/camilla thing never lands for me', bodyPost: '', votes: 94, replies: 12, time: '1d', timebucket: 'day' },
    { userId: 'sam', rating: 4, body: "henry winter is fiction's worst friend and i would do anything for him. shoutout to bunny for being the most realistically annoying character ever written.", votes: 267, replies: 41, time: '3d', timebucket: 'week' },
    { userId: 'maya', rating: 5, body: 'read this in one sitting. the prose does things to me. normal reviewers: "i liked it." me: "i am becoming it."', votes: 58, replies: 8, time: '2w', timebucket: 'month' },
  ]

  const threads = [
    { title: 'Was Bunny actually likable? A case for the defense.', replies: 324, upvotes: 892, time: '4h', timebucket: 'day', author: 'avareads' },
    { title: 'Richard as an unreliable narrator — evidence thread', replies: 198, upvotes: 621, time: '1d', timebucket: 'day', author: 'julesr' },
    { title: 'Henry × Julian: reading list for the vibes', replies: 87, upvotes: 412, time: '2d', timebucket: 'week', author: 'mayamoss' },
    { title: '[SPOILERS CH 1-3] First impressions of the group', replies: 56, upvotes: 198, time: '3w', timebucket: 'month', author: 'samreads' },
    { title: 'Hot take: Camilla is the actual antagonist', replies: 412, upvotes: 1204, time: '4mo', timebucket: 'year', author: 'leopark' },
  ]

  const lists = [
    { title: 'Dark academia starter pack', by: 'avareads', count: 12, saves: 2410 },
    { title: 'Books that ruin your sleep schedule', by: 'julesr', count: 18, saves: 892 },
    { title: 'If you liked The Secret History…', by: 'samreads', count: 9, saves: 1204 },
  ]

  const order: Record<string, number> = { day: 0, week: 1, month: 2, year: 3 }
  const passTime = (bucket: string) => timeframe === 'all' || order[bucket] <= order[timeframe]
  type Sortable = { votes?: number; upvotes?: number; timebucket: string }
  const sortFn = (a: Sortable, b: Sortable) => {
    if (sort === 'new') return 0
    if (sort === 'top') return (b.votes || b.upvotes || 0) - (a.votes || a.upvotes || 0)
    return (b.votes || b.upvotes || 0) * (b.timebucket === 'day' ? 3 : 1) - (a.votes || a.upvotes || 0) * (a.timebucket === 'day' ? 3 : 1)
  }

  const filteredThreads = threads.filter((t) => passTime(t.timebucket)).sort(sortFn)
  const filteredReviews = reviews.filter((r) => passTime(r.timebucket)).sort(sortFn)
  const filteredQuotes = quotes.filter((q) => passTime(q.timebucket)).sort(sortFn)

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ position: 'relative', padding: '40px 40px 60px', background: 'linear-gradient(180deg, var(--paper-2), var(--paper))', borderBottom: '1px solid var(--border)' }}>
        <Link href="/home" className="btn btn-ghost btn-sm" style={{ marginBottom: 20, display: 'inline-flex' }}>← Back</Link>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr auto', gap: 40, alignItems: 'start' }}>
          <div>
            <Cover book={book} size={280} style={{ borderRadius: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-pulp" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShelf('reading')}>
                {shelf === 'reading' ? '✓ Reading' : '+ Start reading'}
              </button>
              <button className="btn btn-outline" onClick={() => setShelf('want')}>{shelf === 'want' ? '✓' : '+ Want'}</button>
            </div>
            <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setShowLog(true)}>📖 Log a reading session</button>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{book.genre} · {book.year}</div>
            <h1 className="display-xl" style={{ marginBottom: 14 }}>{book.title}</h1>
            <div style={{ fontSize: 18, color: 'var(--ink-2)', marginBottom: 24 }}>by <b style={{ color: 'var(--ink)' }}>{book.author}</b> <span style={{ color: 'var(--moss)', fontSize: 13 }}>✓ verified</span></div>

            <div style={{ display: 'flex', gap: 32, marginBottom: 28 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="serif" style={{ fontSize: 44, color: 'var(--pulp)', lineHeight: 1 }}>{book.rating}</span>
                  <span style={{ fontSize: 16, color: 'var(--ink-4)' }}>/ 5</span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{book.ratings.toLocaleString()} ratings</div>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 44, lineHeight: 1 }}>{book.pages}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>pages</div>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 44, lineHeight: 1 }}>2.8k</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>currently reading</div>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 44, lineHeight: 1 }}>142</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>active threads</div>
              </div>
            </div>

            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 720, marginBottom: 20 }}>
              Under the influence of their charismatic classics professor, a group of clever, eccentric misfits at an elite New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries.
            </p>

            <div style={{ marginBottom: 8 }}>
              <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 8 }}>Tags · searchable</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {book.mood.map((m) => (
                  <span key={m} className="chip chip-pulp">{m}</span>
                ))}
                {tags.map((t) => (
                  <span key={t} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    #{t}
                    <button onClick={() => removeTag(t)} style={{ border: 'none', background: 'transparent', color: 'var(--ink-4)', cursor: 'pointer', padding: 0, fontSize: 12 }}>×</button>
                  </span>
                ))}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="+ add tag"
                    style={{ padding: '4px 10px', borderRadius: 99, border: '1px dashed var(--border-2)', fontSize: 12, background: 'transparent', color: 'var(--ink-2)', width: 110 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, width: 260, background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
            <div className="eyebrow" style={{ color: 'var(--ink-4)', marginBottom: 12 }}>your rating</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)} style={{ fontSize: 28, color: s <= rating ? 'var(--pulp)' : 'var(--ink-4)' }}>★</button>
              ))}
            </div>
            <button className="btn btn-pulp btn-sm" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>Write a review</button>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', color: 'var(--paper)', marginBottom: 8 }}>Start a thread</button>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', color: 'var(--paper)' }}>✎ Add a quote</button>
          </div>
        </div>
      </div>

      {showLog && (
        <div onClick={() => setShowLog(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ padding: 28, width: 480, maxWidth: '100%' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>📖 Log reading session</div>
            <h3 className="serif" style={{ fontSize: 26, marginBottom: 4 }}>{book.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>Syncs to your streak, heatmap, and yearly goals.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Pages read</label>
                <input defaultValue="32" style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--paper)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Minutes</label>
                <input defaultValue="45" style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--paper)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Date</label>
                <input type="date" defaultValue="2026-04-18" style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--paper)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Time</label>
                <input type="time" defaultValue="21:30" style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--paper)', color: 'var(--ink)' }} />
              </div>
            </div>
            <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Notes (optional)</label>
            <textarea rows={3} placeholder="What hit different?" style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--paper)', color: 'var(--ink)', resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-pulp" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowLog(false)}>Log session →</button>
              <button className="btn btn-ghost" onClick={() => setShowLog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 40 }}>
        <main>
          <div className="tabs" style={{ marginBottom: 16 }}>
            <button className={'tab' + (tab === 'threads' ? ' active' : '')} onClick={() => setTab('threads')}>Threads · {threads.length}</button>
            <button className={'tab' + (tab === 'reviews' ? ' active' : '')} onClick={() => setTab('reviews')}>Reviews · {reviews.length}</button>
            <button className={'tab' + (tab === 'quotes' ? ' active' : '')} onClick={() => setTab('quotes')}>Quotes · {quotes.length}</button>
            <button className={'tab' + (tab === 'lists' ? ' active' : '')} onClick={() => setTab('lists')}>Lists · {lists.length}</button>
          </div>

          {tab !== 'lists' && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {([{ id: 'hot', label: '🔥 Hot' }, { id: 'top', label: '▲ Top' }, { id: 'new', label: '🆕 New' }] as const).map((s) => (
                  <button key={s.id} onClick={() => setSort(s.id)} className="mono" style={{ padding: '7px 12px', fontSize: 11, background: sort === s.id ? 'var(--pulp-soft)' : 'transparent', color: sort === s.id ? 'var(--pulp)' : 'var(--ink-3)', border: 'none', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, cursor: 'pointer' }}>{s.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {([{ id: 'day', label: '24h' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }, { id: 'all', label: 'All time' }] as const).map((t) => (
                  <button key={t.id} onClick={() => setTimeframe(t.id)} className="mono" style={{ padding: '7px 12px', fontSize: 11, background: timeframe === t.id ? 'var(--pulp-soft)' : 'transparent', color: timeframe === t.id ? 'var(--pulp)' : 'var(--ink-3)', border: 'none', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>
                ))}
              </div>
            </div>
          )}

          {tab === 'threads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredThreads.map((t, i) => (
                <div key={i} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, textAlign: 'center' }}>
                    <div className="serif" style={{ fontSize: 24, color: 'var(--pulp)', lineHeight: 1 }}>↑</div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{t.upvotes}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t.replies} replies · {t.time} ago · by @{t.author}</div>
                  </div>
                  <button className="btn btn-outline btn-sm">Open</button>
                </div>
              ))}
              {filteredThreads.length === 0 && (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No threads in this window.</div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredReviews.map((r, i) => {
                const u = users.find((x) => x.id === r.userId)!
                return (
                  <div key={i} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Avatar user={u} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>@{u.handle} · {r.time}</div>
                      </div>
                      <div style={{ color: 'var(--pulp)', fontSize: 14 }}>
                        {'★'.repeat(Math.floor(r.rating))}
                        {r.rating % 1 ? '½' : ''}
                        <span style={{ color: 'var(--ink-4)' }}>{'★'.repeat(5 - Math.ceil(r.rating))}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.55 }}>
                      {r.body}
                      {r.spoiler && (
                        <>
                          <span className="spoiler-tag"> ⚠ SPOILER</span> <Spoiler>{r.spoiler}</Spoiler>
                        </>
                      )}
                      {r.bodyPost}
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                      <VoteBar initialScore={r.votes} />
                      <button className="btn btn-ghost btn-sm"><Icon name="message" size={13} /> {r.replies}</button>
                      <button className="btn btn-ghost btn-sm"><Icon name="bookmark" size={13} /> Save</button>
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}><Icon name="share" size={13} /> Share</button>
                    </div>
                  </div>
                )
              })}
              {filteredReviews.length === 0 && (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No reviews in this window.</div>
              )}
            </div>
          )}

          {tab === 'quotes' && (
            <>
              <form onSubmit={addQuote} className="card" style={{ padding: 18, marginBottom: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>✎ Share a quote</div>
                <textarea
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                  placeholder="Type a passage that hit…"
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', background: 'var(--paper-2)', color: 'var(--ink)', resize: 'vertical', marginBottom: 10 }}
                />
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input value={newQuotePage} onChange={(e) => setNewQuotePage(e.target.value)} placeholder="p.#" style={{ width: 80, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--paper)', color: 'var(--ink)' }} />
                  <button type="submit" className="btn btn-pulp btn-sm" style={{ marginLeft: 'auto' }}>Post quote</button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredQuotes.map((q) => {
                  const u = users.find((x) => x.id === q.userId) ?? { id: 'brett', name: 'You', handle: 'brett', avatar: null, color: 'var(--pulp)' }
                  return (
                    <div key={q.id} className="card" style={{ padding: 22, position: 'relative', display: 'flex', gap: 16 }}>
                      <button
                        onClick={() => toggleQuoteVote(q.id)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          padding: '8px 10px', minWidth: 46, height: 'fit-content',
                          border: '1px solid ' + (q.voted ? 'var(--pulp)' : 'var(--border)'),
                          background: q.voted ? 'var(--pulp-soft)' : 'var(--paper)',
                          color: q.voted ? 'var(--pulp)' : 'var(--ink-3)',
                          borderRadius: 10, cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 13, lineHeight: 1 }}>▲</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{q.votes}</span>
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 32, lineHeight: 1, color: 'var(--pulp)', fontFamily: 'var(--font-display, serif)', marginBottom: 4 }}>&quot;</div>
                        <blockquote className="serif" style={{ fontSize: 19, lineHeight: 1.45, fontStyle: 'italic', margin: 0, marginBottom: 14, color: 'var(--ink)' }}>
                          {q.body}
                        </blockquote>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
                          <Avatar user={u} size={22} />
                          <span>
                            <b>@{u.handle}</b> {q.mine && <span style={{ color: 'var(--pulp)' }}>· you</span>}
                          </span>
                          {q.page && <span>· p.{q.page}</span>}
                          <span>· {q.time}</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-sm"><Icon name="message" size={13} /> {q.comments}</button>
                            <button className="btn btn-ghost btn-sm"><Icon name="bookmark" size={13} /></button>
                            <button className="btn btn-ghost btn-sm"><Icon name="share" size={13} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredQuotes.length === 0 && (
                  <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No quotes in this window.</div>
                )}
              </div>
            </>
          )}

          {tab === 'lists' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {lists.map((l, i) => (
                <div key={i} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--pulp-soft)', color: 'var(--pulp)', display: 'grid', placeItems: 'center', fontSize: 22 }}>📑</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{l.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{l.count} books · by @{l.by} · {l.saves.toLocaleString()} saves</div>
                  </div>
                  <button className="btn btn-outline btn-sm">Open list</button>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>📊 Ratings distribution</div>
            {[5, 4, 3, 2, 1].map((n) => {
              const pct = [72, 56, 18, 8, 4][5 - n]
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, fontSize: 12 }}>
                  <span className="mono" style={{ width: 20, color: 'var(--ink-3)' }}>{n}★</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--paper-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: 'var(--pulp)', borderRadius: 99 }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', width: 30, textAlign: 'right' }}>{pct}%</span>
                </div>
              )
            })}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>👥 Your friends who read this</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['ava', 'maya', 'jules'] as const).map((id, idx) => {
                const u = users.find((x) => x.id === id)!
                const r = [5, 4.5, 4][idx]
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar user={u} size={28} />
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <b>{u.name}</b>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>rated {r}★</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>📖 Similar reads</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['bb', 'cr', 'pr'].map((id) => {
                const b = books.find((x) => x.id === id)!
                return (
                  <Link key={id} href={`/book/${id}`} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Cover book={b} size={40} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                      <div style={{ color: 'var(--ink-3)' }}>{b.author}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--pulp)' }}>★ {b.rating}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
