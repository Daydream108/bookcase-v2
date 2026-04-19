'use client'

import { useState } from 'react'

type Status = 'under' | 'progress' | 'shipped'
type Item = {
  id: number
  status: Status
  t: string
  desc: string
  votes: number
  comments: number
  voted: boolean
  mine?: boolean
}

const initial: Item[] = [
  { id: 1, status: 'under', t: 'Follow book threads (reply notifications)', desc: 'Subscribe to any book thread or review and get pinged when replies land.', votes: 142, comments: 18, voted: false },
  { id: 2, status: 'under', t: 'Block button for users + themes', desc: 'Mute individual readers, authors, or trigger themes from your feed entirely.', votes: 98, comments: 12, voted: false },
  { id: 3, status: 'under', t: 'Series pages with reading order', desc: 'Bundle books into series hubs so readers can track order, spin-offs, and installments.', votes: 87, comments: 9, voted: false },
  { id: 4, status: 'under', t: 'Quote highlights → shareable cards', desc: 'Pull a quote, get a pretty export card ready for stories & group chats.', votes: 64, comments: 7, voted: true },
  { id: 5, status: 'progress', t: 'Reading buddy matching (taste twins)', desc: 'Weekly matches based on overlapping shelves and moods.', votes: 312, comments: 44, voted: true },
  { id: 6, status: 'progress', t: 'Author AMAs in the feed', desc: 'Verified authors hop in for scheduled Q&A threads. Notifications included.', votes: 224, comments: 28, voted: false },
  { id: 7, status: 'progress', t: 'Reading heatmap → home widget', desc: 'Pin your 90-day heatmap to the top of home, phone widget optional.', votes: 156, comments: 14, voted: false },
  { id: 8, status: 'shipped', t: 'Public reader profiles', desc: 'Shelves, favorites, activity — all discoverable.', votes: 421, comments: 52, voted: true },
  { id: 9, status: 'shipped', t: 'Want-to-read shelves', desc: 'Visible TBR with drag-to-reorder.', votes: 389, comments: 31, voted: true },
  { id: 10, status: 'shipped', t: 'Spoiler tag on reviews', desc: 'Blurred text, tap to reveal.', votes: 356, comments: 22, voted: false },
  { id: 11, status: 'shipped', t: 'Reading streaks & heatmap', desc: 'Daily check-in + contribution grid.', votes: 318, comments: 19, voted: true },
]

const statusMeta: Record<Status, { label: string; color: string }> = {
  under: { label: 'Under consideration', color: 'var(--gold)' },
  progress: { label: 'In progress', color: 'var(--pulp)' },
  shipped: { label: 'Shipped', color: 'var(--moss)' },
}

export default function RoadmapPage() {
  const [items, setItems] = useState<Item[]>(initial)
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const toggleVote = (id: number) => {
    setItems(items.map((x) => (x.id === id ? { ...x, voted: !x.voted, votes: x.voted ? x.votes - 1 : x.votes + 1 } : x)))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const next: Item = { id: Date.now(), status: 'under', t: title, desc: desc || 'Submitted by you.', votes: 1, comments: 0, voted: true, mine: true }
    setItems([next, ...items])
    setTitle('')
    setDesc('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2400)
  }

  const counts = {
    all: items.length,
    under: items.filter((x) => x.status === 'under').length,
    progress: items.filter((x) => x.status === 'progress').length,
    shipped: items.filter((x) => x.status === 'shipped').length,
  }

  let filtered = items
    .filter((x) => filter === 'all' || x.status === filter)
    .filter((x) => !query.trim() || x.t.toLowerCase().includes(query.toLowerCase()) || x.desc.toLowerCase().includes(query.toLowerCase()))
  if (sort === 'top') filtered = [...filtered].sort((a, b) => b.votes - a.votes)
  if (sort === 'new') filtered = [...filtered].sort((a, b) => b.id - a.id)

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Public roadmap</div>
      <h1 className="display-lg" style={{ marginBottom: 16 }}>
        Shape what<br />
        <i style={{ color: 'var(--pulp)' }}>ships next.</i>
      </h1>
      <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 640, marginBottom: 28 }}>
        Vote, comment, ship. Readers actually build Bookcase with us.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>
        <div>
          <div className="tabs" style={{ marginBottom: 14 }}>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'under', label: 'Under consideration' },
                { id: 'progress', label: 'In progress' },
                { id: 'shipped', label: 'Shipped' },
              ] as const
            ).map((t) => (
              <button key={t.id} className={'tab' + (filter === t.id ? ' active' : '')} onClick={() => setFilter(t.id)}>
                {t.label}{' '}
                <span className="mono" style={{ fontSize: 11, marginLeft: 4, color: 'var(--ink-4)' }}>
                  {counts[t.id]}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              placeholder="Search roadmap…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--paper)', color: 'var(--ink-1)' }}
            />
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {([{ id: 'top', label: '▲ Top' }, { id: 'new', label: '🆕 Newest' }] as const).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className="mono"
                  style={{
                    padding: '8px 14px',
                    fontSize: 11,
                    background: sort === s.id ? 'var(--pulp-soft)' : 'transparent',
                    color: sort === s.id ? 'var(--pulp)' : 'var(--ink-3)',
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 && (
              <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                No results. Try another search?
              </div>
            )}
            {filtered.map((it) => {
              const s = statusMeta[it.status]
              return (
                <div key={it.id} className="card" style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <button
                    onClick={() => toggleVote(it.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '10px 12px',
                      minWidth: 54,
                      border: '1px solid ' + (it.voted ? 'var(--pulp)' : 'var(--border)'),
                      background: it.voted ? 'var(--pulp-soft)' : 'var(--paper)',
                      color: it.voted ? 'var(--pulp)' : 'var(--ink-3)',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>▲</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{it.votes}</span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          borderRadius: 99,
                          background: 'color-mix(in oklab, ' + s.color + ' 18%, transparent)',
                          color: s.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          fontWeight: 600,
                        }}
                      >
                        {s.label}
                      </span>
                      {it.mine && (
                        <span
                          className="mono"
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'var(--pulp-soft)', color: 'var(--pulp)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}
                        >
                          your idea
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{it.t}</div>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>{it.desc}</p>
                    <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
                      <span>💬 {it.comments} comments</span>
                      <button className="btn btn-ghost btn-sm" style={{ padding: 0, fontSize: 12 }}>Open →</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>📝 Pitch a feature</div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 14 }}>
              Keep it concrete. A good request explains the missing behavior and why readers would care.
            </p>
            <form onSubmit={submit}>
              <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
                Feature title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Audiobook minute tracker"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, marginTop: 6, marginBottom: 12, background: 'var(--paper)', color: 'var(--ink-1)' }}
              />
              <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
                What should it unlock?
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Readers could…"
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, marginTop: 6, marginBottom: 12, resize: 'vertical', fontFamily: 'inherit', background: 'var(--paper)', color: 'var(--ink-1)' }}
              />
              <button type="submit" className="btn btn-pulp" style={{ width: '100%' }}>
                {submitted ? '✓ Submitted — thanks!' : 'Submit request'}
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>🔥 Top community requests</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...items].sort((a, b) => b.votes - a.votes).slice(0, 3).map((it) => (
                <div key={it.id} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start' }}>
                  <span className="mono" style={{ color: 'var(--pulp)', fontWeight: 700, minWidth: 32 }}>▲ {it.votes}</span>
                  <span style={{ lineHeight: 1.4 }}>{it.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
