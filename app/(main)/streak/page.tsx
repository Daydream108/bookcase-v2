'use client'

import { useMemo } from 'react'

export default function StreakPage() {
  const heatmap = useMemo(() => {
    return Array.from({ length: 26 * 7 }).map(() => {
      const r = Math.random()
      return r > 0.88 ? 'l4' : r > 0.72 ? 'l3' : r > 0.5 ? 'l2' : r > 0.3 ? 'l1' : ''
    })
  }, [])

  const badges = [
    { e: '🌱', n: 'First page', u: true },
    { e: '🔥', n: '7-day streak', u: true },
    { e: '📚', n: '3 books', u: true },
    { e: '🦉', n: 'Night owl', u: true },
    { e: '🌊', n: 'Dreamy reads', u: true },
    { e: '☕', n: 'Cozy mode', u: false },
    { e: '⚔️', n: 'Epic reader', u: false },
    { e: '🎭', n: 'Classic buff', u: false },
    { e: '💔', n: 'Made me cry', u: false },
  ]

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Momentum tracker</div>
      <h1 className="display-lg" style={{ marginBottom: 20 }}>
        Don&apos;t break<br />
        <i style={{ color: 'var(--pulp)' }}>the chain.</i>
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 30 }}>
        <div className="card" style={{ padding: 32, background: 'linear-gradient(135deg, var(--pulp), oklch(72% 0.2 65))', color: 'white', borderColor: 'transparent', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 200, opacity: 0.15 }}>🔥</div>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>current streak</div>
          <div className="serif" style={{ fontSize: 120, lineHeight: 0.9, marginTop: 8 }}>14</div>
          <div style={{ fontSize: 18, marginTop: 10 }}>days in a row</div>
          <div style={{ marginTop: 24, display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Longest streak</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>21 days</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Next milestone</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>30 days · 🥉 → 🥈</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Log today&apos;s session</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="which book?" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }} defaultValue="The Secret History" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input placeholder="pages" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }} defaultValue="24" />
              <input placeholder="minutes" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }} defaultValue="40" />
            </div>
            <textarea placeholder="a note…" rows={2} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, resize: 'none', fontFamily: 'inherit' }} />
            <button className="btn btn-pulp" style={{ justifyContent: 'center' }}>🔥 Keep the streak alive</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="eyebrow">🏆 Badges · 5 of 18 unlocked</div>
          <div className="progress" style={{ width: 140 }}><div style={{ width: '28%' }} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 10 }}>
          {badges.map((b, i) => (
            <div key={i} style={{ textAlign: 'center', opacity: b.u ? 1 : 0.35 }}>
              <div style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 14, background: b.u ? 'var(--pulp-soft)' : 'var(--paper-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontSize: 28 }}>
                {b.e}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, fontWeight: 500 }}>{b.n}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>📊 Your reading life · last 6 months</div>
        <div className="heatmap" style={{ gridTemplateRows: 'repeat(7, 16px)', gridAutoColumns: '16px', gap: 4 }}>
          {heatmap.map((level, i) => (
            <div key={i} className={'cell ' + level} style={{ width: 16, height: 16, borderRadius: 4 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
