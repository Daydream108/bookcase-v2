import { books, users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'

const clubs = [
  { name: 'Dark Academia Society', members: 324, book: 'sb', progress: 68, color: 'oklch(38% 0.06 60)', emoji: '🕯️', blurb: 'Secret societies, seasonal mist, questionable decisions.' },
  { name: 'Crying Over Sci-Fi', members: 198, book: 'hm', progress: 42, color: 'oklch(42% 0.1 240)', emoji: '🪐', blurb: 'Hard sci-fi with feelings. Tissues provided.' },
  { name: 'Slow & Steady Reads', members: 94, book: 'pr', progress: 82, color: 'oklch(48% 0.09 150)', emoji: '🌊', blurb: '20 pages a day, no pressure, big impact.' },
  { name: 'Short Books, Huge Impact', members: 142, book: 'st', progress: 12, color: 'oklch(58% 0.12 25)', emoji: '📖', blurb: 'Under 250 pages. Hits like a truck.' },
]

export default function ClubsPage() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Reading clubs</div>
          <h1 className="display-lg">
            Read<br />
            <i style={{ color: 'var(--pulp)' }}>with someone.</i>
          </h1>
        </div>
        <button className="btn btn-pulp">+ Start a club</button>
      </div>
      <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 640, marginBottom: 40 }}>
        Small focused reading groups with shared progress bars. Nobody gets left behind. Nobody gets spoiled.
      </p>

      <div className="eyebrow" style={{ marginBottom: 14 }}>✨ Your clubs</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>
        {clubs.slice(0, 2).map((c, i) => {
          const book = books.find((b) => b.id === c.book)!
          return (
            <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 24, background: c.color, color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 28 }}>{c.emoji}</div>
                  <div>
                    <h3 className="serif" style={{ fontSize: 24, lineHeight: 1 }}>{c.name}</h3>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{c.members} members · private</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, opacity: 0.9 }}>{c.blurb}</p>
              </div>
              <div style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
                <Cover book={book} size={60} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                    CURRENTLY READING · WEEK 3 OF 5
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{book.title}</div>
                  <div className="progress" style={{ marginTop: 8 }}><div style={{ width: c.progress + '%' }} /></div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                    Club is on p.{Math.floor((book.pages * c.progress) / 100)} · you&apos;re at p.{Math.floor((book.pages * (c.progress - 8)) / 100)}{' '}
                    <b style={{ color: 'var(--pulp)' }}>catch up →</b>
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex' }}>
                  {users.slice(0, 5).map((u, j) => (
                    <div key={u.id} style={{ marginLeft: j === 0 ? 0 : -8, border: '2px solid var(--paper)', borderRadius: 99 }}>
                      <Avatar user={u} size={26} />
                    </div>
                  ))}
                  <div style={{ marginLeft: -8, border: '2px solid var(--paper)', borderRadius: 99, width: 26, height: 26, background: 'var(--ink)', color: 'var(--paper)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700 }}>
                    +{c.members - 5}
                  </div>
                </div>
                <button className="btn btn-outline btn-sm">Open club →</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="eyebrow" style={{ marginBottom: 14 }}>🔍 Discover public clubs</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {clubs.slice(2).map((c, i) => (
          <div key={i} className="card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: c.color, color: 'white', display: 'grid', placeItems: 'center', fontSize: 28 }}>
              {c.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{c.blurb}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>{c.members} members · open</div>
            </div>
            <button className="btn btn-pulp btn-sm">Join</button>
          </div>
        ))}
      </div>
    </div>
  )
}
