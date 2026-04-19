'use client'

import { useState, ReactNode } from 'react'

export function Spoiler({ children }: { children: ReactNode }) {
  const [r, setR] = useState(false)
  return (
    <span className={'spoiler' + (r ? ' revealed' : '')} onClick={() => setR(!r)}>
      {children}
    </span>
  )
}

export function VoteBar({ initialScore = 0 }: { initialScore?: number }) {
  const [vote, setVote] = useState<-1 | 0 | 1>(0)
  const score = initialScore + vote
  const color = vote === 1 ? 'var(--pulp)' : vote === -1 ? 'oklch(55% 0.16 260)' : 'var(--ink-3)'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'var(--paper-2)', borderRadius: 99, padding: '2px 4px', border: '1px solid var(--border)' }}>
      <button onClick={() => setVote(vote === 1 ? 0 : 1)} style={{ width: 28, height: 28, borderRadius: 99, border: 'none', background: vote === 1 ? 'var(--pulp-soft)' : 'transparent', color: vote === 1 ? 'var(--pulp)' : 'var(--ink-3)', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>▲</button>
      <span className="mono" style={{ fontSize: 12, fontWeight: 700, minWidth: 28, textAlign: 'center', color }}>{score}</span>
      <button onClick={() => setVote(vote === -1 ? 0 : -1)} style={{ width: 28, height: 28, borderRadius: 99, border: 'none', background: vote === -1 ? 'color-mix(in oklab, oklch(55% 0.16 260) 18%, transparent)' : 'transparent', color: vote === -1 ? 'oklch(55% 0.16 260)' : 'var(--ink-3)', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>▼</button>
    </div>
  )
}

export function Reaction({ emoji, count, initial = false }: { emoji: string; count: number; initial?: boolean }) {
  const [active, setActive] = useState(initial)
  const [c, setC] = useState(count)
  return (
    <button
      className={'reaction' + (active ? ' active' : '')}
      onClick={() => {
        setActive(!active)
        setC(c + (active ? -1 : 1))
      }}
    >
      <span className="emoji">{emoji}</span>
      <span className="count">{c}</span>
    </button>
  )
}
