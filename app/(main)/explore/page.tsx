'use client'

import Link from 'next/link'
import { books, moods, users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'

export default function ExplorePage() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Discovery desk</div>
      <h1 className="display-lg" style={{ marginBottom: 16 }}>
        Find your<br />
        <i style={{ color: 'var(--pulp)' }}>next obsession.</i>
      </h1>
      <p style={{ fontSize: 17, color: 'var(--ink-2)', marginBottom: 32, maxWidth: 640 }}>
        Browse by mood, genre, and vibe. Follow the readers shaping the shelf right now.
      </p>

      <div className="eyebrow" style={{ marginBottom: 14 }}>Browse by mood</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 40 }}>
        {moods.map((m) => (
          <button key={m.name} className="card" style={{ padding: 16, textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{m.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.count} books</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 16 }}>
        <div>
          <div className="eyebrow">🔥 The dark academia drop</div>
          <h2 className="display-sm">Campus vibes, immaculate dread.</h2>
        </div>
        <Link href="/explore" className="link-u mono" style={{ fontSize: 12, color: 'var(--pulp)' }}>
          SEE ALL →
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 40 }}>
        {['sb', 'bb', 'nv', 'st', 'sv', 'an'].map((id) => {
          const b = books.find((x) => x.id === id)
          if (!b) return null
          return (
            <Link key={id} href={`/book/${id}`} style={{ textAlign: 'left', padding: 0 }}>
              <Cover book={b} size="100%" style={{ width: '100%', marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{b.author}</div>
              <div style={{ fontSize: 12, color: 'var(--pulp)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>★ {b.rating}</div>
            </Link>
          )
        })}
      </div>

      <div className="eyebrow" style={{ marginBottom: 14 }}>📝 Curated by readers you follow</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        {[
          { title: 'Books that rewired my brain', curator: 'ava', count: 14, covers: ['sb', 'pr', 'bb'], color: 'var(--pulp)' },
          { title: 'Sci-fi with a heart (crying optional)', curator: 'maya', count: 9, covers: ['hm', 'kl', 'tb'], color: 'var(--moss)' },
          { title: 'Short books, HUGE impact', curator: 'jules', count: 11, covers: ['st', 'an', 'rd'], color: 'var(--plum)' },
        ].map((l, i) => {
          const u = users.find((x) => x.id === l.curator)!
          return (
            <div key={i} className="card" style={{ padding: 20, background: l.color, color: 'white', borderColor: 'transparent' }}>
              <h3 className="serif" style={{ fontSize: 24, lineHeight: 1.15, marginBottom: 12 }}>{l.title}</h3>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {l.covers.map((id) => {
                  const b = books.find((x) => x.id === id)
                  return b ? <Cover key={id} book={b} size={48} /> : null
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar user={u} size={22} />
                  <span style={{ fontSize: 12 }}>@{u.handle} · {l.count} books</span>
                </div>
                <button style={{ color: 'white', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)', padding: '4px 10px', borderRadius: 99, background: 'transparent' }}>
                  Save
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
