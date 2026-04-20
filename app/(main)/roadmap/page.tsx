'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  getCurrentProfile,
  listRoadmapFeatures,
  submitRoadmapFeature,
  toggleRoadmapVote,
  type DbProfile,
  type DbRoadmapFeature,
} from '@/lib/db'

type Status = DbRoadmapFeature['status']

const statusMeta: Record<Status, { label: string; color: string }> = {
  considering: { label: 'Under consideration', color: 'var(--gold)' },
  planned: { label: 'Planned', color: 'var(--plum)' },
  in_progress: { label: 'In progress', color: 'var(--pulp)' },
  completed: { label: 'Shipped', color: 'var(--moss)' },
}

export default function RoadmapPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [items, setItems] = useState<DbRoadmapFeature[]>([])
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const refresh = async () => {
    const data = await listRoadmapFeatures(supabase)
    setItems(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = await getCurrentProfile(supabase)
      if (!cancelled) setMe(p)
      await refresh()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const toggleVote = async (id: string) => {
    if (!me) {
      setToast('Sign in to vote')
      setTimeout(() => setToast(''), 2000)
      return
    }
    // optimistic
    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, has_voted: !x.has_voted, vote_count: x.has_voted ? x.vote_count - 1 : x.vote_count + 1 }
          : x
      )
    )
    try {
      await toggleRoadmapVote(supabase, id)
    } catch {
      await refresh()
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me) {
      setToast('Sign in to submit')
      return
    }
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await submitRoadmapFeature(supabase, { title, description: desc })
      setTitle('')
      setDesc('')
      await refresh()
      setToast('Submitted — thanks!')
    } catch (err) {
      setToast((err as Error).message || 'Could not submit')
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(''), 2400)
    }
  }

  const counts = {
    all: items.length,
    considering: items.filter((x) => x.status === 'considering').length,
    planned: items.filter((x) => x.status === 'planned').length,
    in_progress: items.filter((x) => x.status === 'in_progress').length,
    completed: items.filter((x) => x.status === 'completed').length,
  }

  let filtered = items
    .filter((x) => filter === 'all' || x.status === filter)
    .filter((x) => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return x.title.toLowerCase().includes(q) || (x.description ?? '').toLowerCase().includes(q)
    })
  if (sort === 'top') filtered = [...filtered].sort((a, b) => b.vote_count - a.vote_count)
  if (sort === 'new') filtered = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Public roadmap</div>
      <h1 className="display-lg" style={{ marginBottom: 16 }}>
        Shape what<br />
        <i style={{ color: 'var(--pulp)' }}>ships next.</i>
      </h1>
      <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 640, marginBottom: 28 }}>
        Vote, submit, ship. Readers actually build Bookcase with us.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>
        <div>
          <div className="tabs" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            {(
              [
                { id: 'all' as const, label: 'All' },
                { id: 'considering' as const, label: 'Considering' },
                { id: 'planned' as const, label: 'Planned' },
                { id: 'in_progress' as const, label: 'In progress' },
                { id: 'completed' as const, label: 'Shipped' },
              ]
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
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
            />
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {([{ id: 'top' as const, label: '▲ Top' }, { id: 'new' as const, label: '🆕 Newest' }]).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className="mono"
                  style={{
                    padding: '8px 14px', fontSize: 11,
                    background: sort === s.id ? 'var(--pulp-soft)' : 'transparent',
                    color: sort === s.id ? 'var(--pulp)' : 'var(--ink-3)',
                    border: 'none', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
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
                {items.length === 0 ? 'No roadmap items yet. Submit the first one!' : 'No results.'}
              </div>
            )}
            {filtered.map((it) => {
              const s = statusMeta[it.status]
              return (
                <div key={it.id} className="card" style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <button
                    onClick={() => toggleVote(it.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      padding: '10px 12px', minWidth: 54,
                      border: '1px solid ' + (it.has_voted ? 'var(--pulp)' : 'var(--border)'),
                      background: it.has_voted ? 'var(--pulp-soft)' : 'var(--paper)',
                      color: it.has_voted ? 'var(--pulp)' : 'var(--ink-3)',
                      borderRadius: 10, cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>▲</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{it.vote_count}</span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 99,
                          background: 'color-mix(in oklab, ' + s.color + ' 18%, transparent)',
                          color: s.color, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600,
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{it.title}</div>
                    {it.description && (
                      <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>{it.description}</p>
                    )}
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
              A good request explains the missing behavior and why readers would care.
            </p>
            {me ? (
              <form onSubmit={submit}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Feature title"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, marginBottom: 10 }}
                />
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="What should it unlock?"
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, marginBottom: 10, resize: 'vertical', fontFamily: 'inherit' }}
                />
                <button type="submit" className="btn btn-pulp" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit request'}
                </button>
                {toast && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, textAlign: 'center' }}>{toast}</div>}
              </form>
            ) : (
              <Link href="/login" className="btn btn-pulp" style={{ width: '100%', justifyContent: 'center' }}>
                Sign in to submit
              </Link>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>🔥 Top community requests</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...items].sort((a, b) => b.vote_count - a.vote_count).slice(0, 5).map((it) => (
                <div key={it.id} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start' }}>
                  <span className="mono" style={{ color: 'var(--pulp)', fontWeight: 700, minWidth: 32 }}>▲ {it.vote_count}</span>
                  <span style={{ lineHeight: 1.4 }}>{it.title}</span>
                </div>
              ))}
              {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No requests yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
