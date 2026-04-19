'use client'

import { use, useMemo } from 'react'
import { books, users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const user = users.find((u) => u.id === username || u.handle === username) ?? users.find((u) => u.id === 'brett')!

  const heatmap = useMemo(() => {
    return Array.from({ length: 13 * 7 }).map(() => {
      const r = Math.random()
      return r > 0.88 ? 'l4' : r > 0.72 ? 'l3' : r > 0.5 ? 'l2' : r > 0.3 ? 'l1' : ''
    })
  }, [])

  const currentReading = ['nv', 'sb', 'tm'] as const
  const progress = [38, 72, 14]

  const shelfIds = ['sb', 'hm', 'pr', 'bb', 'kl', 'tm', 'an', 'st', 'nv', 'rd', 'cr', 'sv']

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
      <div className="card" style={{ padding: 32, marginBottom: 24, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'start' }}>
        <Avatar user={user} size={120} />
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>reader · joined march 2024</div>
          <h1 className="display-lg" style={{ marginBottom: 6 }}>{user.name}</h1>
          <div style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 14 }}>@{user.handle} · brooklyn, ny</div>
          <p style={{ fontSize: 16, lineHeight: 1.5, maxWidth: 540, marginBottom: 20 }}>
            book twin with nobody yet. currently spiraling about <i>the secret history</i>. 2026 goal: 24 books, 3 rereads, zero abandons.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <b style={{ fontSize: 20 }}>3</b>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>books read</span>
            </div>
            <div>
              <b style={{ fontSize: 20 }}>142</b>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>followers</span>
            </div>
            <div>
              <b style={{ fontSize: 20 }}>89</b>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>following</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-outline">Edit profile</button>
          <button className="btn btn-ghost btn-sm">Share shelf</button>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>📚 The shelf</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10 }}>
          {shelfIds.map((id) => {
            const b = books.find((x) => x.id === id)
            return b ? <Cover key={id} book={b} size="100%" style={{ width: '100%' }} /> : null
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--pulp), oklch(72% 0.2 65))', color: 'white', borderColor: 'transparent' }}>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>🔥 Streak</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>14</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>days in a row · longest: 21</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>⭐ Reader level</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1, color: 'var(--pulp)' }}>L7</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>324 / 500 XP to L8</div>
          <div className="progress" style={{ marginTop: 8 }}><div style={{ width: '64%' }} /></div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>🎯 2026 Goal</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>
            3<span style={{ fontSize: 24, color: 'var(--ink-4)' }}>/24</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>on pace — keep going</div>
          <div className="progress" style={{ marginTop: 8 }}><div style={{ width: '12%' }} /></div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>🏆 Badges</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {['🌱', '🔥', '📚', '🦉', '🌊', '☕', '⚔️', '?'].map((e, i) => (
              <div key={i} style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 20, background: i >= 5 ? 'var(--paper-2)' : 'var(--pulp-soft)', border: '1px solid var(--border)', opacity: i >= 5 ? 0.4 : 1 }}>
                {e}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>5 / 18 unlocked</div>
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 12 }}>📖 Currently reading</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
        {currentReading.map((id, i) => {
          const b = books.find((x) => x.id === id)
          if (!b) return null
          const pct = progress[i]
          return (
            <div key={id} className="card" style={{ padding: 20, display: 'flex', gap: 16 }}>
              <Cover book={b} size={80} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 18, lineHeight: 1.15 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>{b.author}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>
                  p.{Math.floor((b.pages * pct) / 100)} / {b.pages} · {pct}%
                </div>
                <div className="progress"><div style={{ width: pct + '%' }} /></div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, padding: '2px 0' }}>+ Log session</button>
              </div>
            </div>
          )
        })}
      </div>

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
