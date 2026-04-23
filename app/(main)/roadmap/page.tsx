'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  getCurrentProfile,
  listRoadmapFeatures,
  submitRoadmapFeature,
  toggleRoadmapVote,
  type DbProfile,
  type DbRoadmapFeature,
} from '@/lib/db'
import { createClient } from '@/lib/supabase/client'

type Status = DbRoadmapFeature['status']

const statusMeta: Record<Status, { label: string; color: string }> = {
  considering: { label: 'Considering', color: 'var(--gold)' },
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
      const profile = await getCurrentProfile(supabase)
      if (!cancelled) setMe(profile)
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
      window.setTimeout(() => setToast(''), 2000)
      return
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              has_voted: !item.has_voted,
              vote_count: item.has_voted ? item.vote_count - 1 : item.vote_count + 1,
            }
          : item
      )
    )

    try {
      await toggleRoadmapVote(supabase, id)
    } catch {
      await refresh()
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
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
      setToast('Request submitted')
    } catch (error) {
      setToast((error as Error).message || 'Could not submit')
    } finally {
      setSubmitting(false)
      window.setTimeout(() => setToast(''), 2400)
    }
  }

  const counts = {
    all: items.length,
    considering: items.filter((item) => item.status === 'considering').length,
    planned: items.filter((item) => item.status === 'planned').length,
    in_progress: items.filter((item) => item.status === 'in_progress').length,
    completed: items.filter((item) => item.status === 'completed').length,
  }

  let filtered = items
    .filter((item) => filter === 'all' || item.status === filter)
    .filter((item) => {
      if (!query.trim()) return true
      const normalizedQuery = query.toLowerCase()
      return (
        item.title.toLowerCase().includes(normalizedQuery) ||
        (item.description ?? '').toLowerCase().includes(normalizedQuery)
      )
    })

  if (sort === 'top') filtered = [...filtered].sort((left, right) => right.vote_count - left.vote_count)
  if (sort === 'new') filtered = [...filtered].sort((left, right) => right.created_at.localeCompare(left.created_at))

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Roadmap
      </div>
      <h1 className="display-lg" style={{ marginBottom: 16 }}>
        Vote on
        <br />
        <i style={{ color: 'var(--pulp)' }}>what comes next.</i>
      </h1>
      <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 640, marginBottom: 28 }}>
        Request features and vote on the work you want prioritized.
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
            ).map((tab) => (
              <button
                key={tab.id}
                className={'tab' + (filter === tab.id ? ' active' : '')}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}{' '}
                <span className="mono" style={{ fontSize: 11, marginLeft: 4, color: 'var(--ink-4)' }}>
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              placeholder="Search roadmap"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
            />
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {([{ id: 'top' as const, label: 'Top' }, { id: 'new' as const, label: 'Newest' }]).map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSort(option.id)}
                  className="mono"
                  style={{
                    padding: '8px 14px',
                    fontSize: 11,
                    background: sort === option.id ? 'var(--pulp-soft)' : 'transparent',
                    color: sort === option.id ? 'var(--pulp)' : 'var(--ink-3)',
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 && (
              <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                {items.length === 0 ? 'No roadmap items yet. Submit the first one.' : 'No results.'}
              </div>
            )}
            {filtered.map((item) => {
              const status = statusMeta[item.status]
              return (
                <div key={item.id} className="card" style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <button
                    onClick={() => toggleVote(item.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '10px 12px',
                      minWidth: 54,
                      border: '1px solid ' + (item.has_voted ? 'var(--pulp)' : 'var(--border)'),
                      background: item.has_voted ? 'var(--pulp-soft)' : 'var(--paper)',
                      color: item.has_voted ? 'var(--pulp)' : 'var(--ink-3)',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                      Vote
                    </span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      {item.vote_count}
                    </span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          borderRadius: 99,
                          background: 'color-mix(in oklab, ' + status.color + ' 18%, transparent)',
                          color: status.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          fontWeight: 600,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
                      {item.title}
                    </div>
                    {item.description && (
                      <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Request a feature
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 14 }}>
              Explain what is missing and why it matters.
            </p>
            {me ? (
              <form onSubmit={submit}>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Feature title"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, marginBottom: 10 }}
                />
                <textarea
                  value={desc}
                  onChange={(event) => setDesc(event.target.value)}
                  placeholder="What should it do?"
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, marginBottom: 10, resize: 'vertical', fontFamily: 'inherit' }}
                />
                <button type="submit" className="btn btn-pulp" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit request'}
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
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Top requests
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...items]
                .sort((left, right) => right.vote_count - left.vote_count)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start' }}>
                    <span className="mono" style={{ color: 'var(--pulp)', fontWeight: 700, minWidth: 42 }}>
                      {item.vote_count}
                    </span>
                    <span style={{ lineHeight: 1.4 }}>{item.title}</span>
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
