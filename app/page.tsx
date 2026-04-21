'use client'

import Link from 'next/link'
import { books, users } from '@/lib/redesign-data'
import { Cover } from '@/components/redesign/Cover'
import { Avatar } from '@/components/redesign/Avatar'
import { Icon } from '@/components/redesign/Icon'

export default function LandingPage() {
  const floaters = [
    { book: books.find((b) => b.id === 'hm')!, x: '8%', y: '8%', r: -8, s: 1, d: 0 },
    { book: books.find((b) => b.id === 'sb')!, x: '72%', y: '4%', r: 6, s: 1.05, d: 0.6 },
    { book: books.find((b) => b.id === 'pr')!, x: '38%', y: '22%', r: -3, s: 1.18, d: 1.2 },
    { book: books.find((b) => b.id === 'rd')!, x: '4%', y: '54%', r: 9, s: 0.92, d: 0.3 },
    { book: books.find((b) => b.id === 'cr')!, x: '65%', y: '48%', r: -5, s: 1, d: 0.9 },
    { book: books.find((b) => b.id === 'bb')!, x: '30%', y: '66%', r: 4, s: 0.88, d: 1.5 },
  ]

  const trendingTape = [...books, ...books].map((b) => b.title.toUpperCase()).join('  ★  ')

  const reviews = [
    { book: 'sb', rating: 5, user: 'ava', body: 'the book that rearranged my brain chemistry. henry is my roman empire.', reacts: [{ e: '🕯️', c: 142 }, { e: '💔', c: 88 }] },
    { book: 'hm', rating: 4.5, user: 'maya', body: "if you don't cry over ROCKY i don't know what to tell you. hard sci-fi with a heart.", reacts: [{ e: '🪐', c: 201 }, { e: '😭', c: 94 }] },
    { book: 'bb', rating: 4, user: 'jules', body: 'imperial core narrative BURN. kuang cooked, robin is insufferable, i loved every page.', reacts: [{ e: '🔥', c: 310 }, { e: '📚', c: 122 }] },
  ]

  const features = [
    { title: 'Rant. React. Reveal.', body: 'Tap to reveal spoilers. React with stickers. Argue about the ending in a thread pinned to the exact page.', emoji: '💬', accent: 'var(--pulp)' },
    { title: 'Every book has a room.', body: "Each title gets its own discussion — cleaner than any forum, no brigading, just people who've actually read the damn book.", emoji: '📚', accent: 'var(--moss)' },
    { title: 'Reading, but a habit.', body: "Streaks compound. Heatmap fills up. Badges drop. Your shelf becomes a receipt of who you're becoming.", emoji: '🔥', accent: 'var(--pulp)' },
    { title: 'Follow authors like artists.', body: 'New book announcements, AMAs, and shelf drops — right in your feed, no email newsletter in sight.', emoji: '✍️', accent: 'var(--plum)' },
    { title: 'Clubs that actually read.', body: 'Small, focused reading groups with shared progress bars. Nobody gets left behind. Nobody gets spoiled.', emoji: '🫂', accent: 'var(--sky)' },
    { title: 'Taste, made visible.', body: 'Your profile becomes a mood board: favorites grid, current read, reading heatmap, literary vibes.', emoji: '🎨', accent: 'var(--gold)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 50% 40% at 10% 0%, var(--pulp-glow), transparent 70%), radial-gradient(ellipse 60% 40% at 90% 100%, oklch(48% 0.09 150 / 0.1), transparent 70%)',
        }}
      />

      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--paper)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'var(--ink)', color: 'var(--paper)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-display)', fontSize: 20,
                boxShadow: 'inset 0 0 0 2px var(--pulp)',
              }}
            >
              B
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-0.02em' }}>Bookcase</div>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a className="link-u" style={{ fontSize: 14, color: 'var(--ink-2)' }}>Why Bookcase</a>
            <a className="link-u" style={{ fontSize: 14, color: 'var(--ink-2)' }}>Clubs</a>
            <a className="link-u" style={{ fontSize: 14, color: 'var(--ink-2)' }}>Roadmap</a>
            <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link href="/signup" className="btn btn-pulp btn-sm">Get started</Link>
          </nav>
        </div>
      </header>

      <section style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '80px 32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 80, alignItems: 'center' }}>
          <div>
            <div className="chip chip-pulp" style={{ marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--pulp)' }} />
              Social reading, finally done right
            </div>
            <h1 className="display-xl" style={{ marginBottom: 28 }}>
              Your bookshelf,<br />
              <span style={{ fontStyle: 'italic', color: 'var(--pulp)' }}>but it talks back.</span>
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.5, color: 'var(--ink-2)', maxWidth: 540, marginBottom: 36 }}>
              Track what you read. Rant about plot twists. Follow authors, join book clubs, run a reading streak. Bookcase is a shelf that talks back — for people who actually finish the book.
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
              <Link href="/signup" className="btn btn-pulp btn-lg">
                Build your shelf <Icon name="arrow" size={16} color="white" />
              </Link>
              <a className="btn btn-outline btn-lg">See a live shelf</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex' }}>
                {users.slice(0, 4).map((u, i) => (
                  <div key={u.id} style={{ marginLeft: i === 0 ? 0 : -10, border: '2px solid var(--paper)', borderRadius: 99 }}>
                    <Avatar user={u} size={32} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                <b style={{ color: 'var(--ink)' }}>24,182</b> readers · <b style={{ color: 'var(--ink)' }}>398k</b> books logged
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', height: 540 }}>
            {floaters.map((f, i) => (
              <div
                key={i}
                className="floater"
                style={{
                  position: 'absolute',
                  left: f.x,
                  top: f.y,
                  width: 150,
                  animationDelay: f.d + 's',
                  zIndex: i === 2 ? 10 : i,
                  ['--r' as any]: f.r + 'deg',
                } as React.CSSProperties}
              >
                <div style={{ transform: `rotate(${f.r}deg) scale(${f.s})` }}>
                  <Cover book={f.book} size={150} />
                </div>
              </div>
            ))}
            <div
              style={{
                position: 'absolute', right: '-4%', top: '36%',
                background: 'var(--paper)', border: '1px solid var(--border-2)',
                borderRadius: 16, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
                zIndex: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                transform: 'rotate(-3deg)',
              }}
            >
              <span style={{ fontSize: 16 }}>🔥</span>
              <div>
                <div style={{ fontWeight: 600 }}>14-day streak</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>keep it alive</div>
              </div>
            </div>
            <div
              style={{
                position: 'absolute', left: '-2%', top: '28%',
                background: 'var(--ink)', color: 'var(--paper)',
                borderRadius: 16, padding: '10px 14px', boxShadow: 'var(--shadow-lg)',
                zIndex: 20, fontSize: 13, transform: 'rotate(4deg)', maxWidth: 180,
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Spoiler thread</div>
              <div style={{ marginTop: 4, fontStyle: 'italic', fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.2 }}>&quot;the twin thing RUINED me&quot;</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>324 replies · @avareads</div>
            </div>
            <div
              style={{
                position: 'absolute', left: '20%', bottom: '4%',
                background: 'var(--paper)', border: '1px solid var(--border-2)',
                borderRadius: 14, padding: '8px 12px', boxShadow: 'var(--shadow-md)',
                zIndex: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                transform: 'rotate(-2deg)',
              }}
            >
              <span>★★★★</span><span style={{ opacity: 0.4 }}>★</span>
              <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>4.5 · 2.1k ratings</div>
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          background: 'var(--ink)', color: 'var(--paper)',
          padding: '18px 0', overflow: 'hidden',
          borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)',
          transform: 'rotate(-1deg)', margin: '40px -8px',
        }}
      >
        <div className="marquee mono" style={{ whiteSpace: 'nowrap', fontSize: 18, letterSpacing: '0.04em', display: 'inline-block' }}>
          {trendingTape}{'  ★  '}{trendingTape}
        </div>
      </div>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--paper)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: f.accent, opacity: 0.9, display: 'grid', placeItems: 'center', fontSize: 22 }}>{f.emoji}</div>
              <h3 className="serif" style={{ fontSize: 26, lineHeight: 1.1 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'var(--paper-2)', padding: '80px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>What readers are saying</div>
              <h2 className="display-lg">Hot takes,<br /><i style={{ color: 'var(--pulp)' }}>cold reads.</i></h2>
            </div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--ink-3)' }}>live · updated 2m ago</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {reviews.map((r, i) => {
              const book = books.find((b) => b.id === r.book)!
              const user = users.find((u) => u.id === r.user)!
              return (
                <div key={i} className="card-raised" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <Cover book={book} size={72} />
                    <div>
                      <div className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>{book.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{book.author}</div>
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        {'★'.repeat(Math.floor(r.rating))}
                        {r.rating % 1 ? '½' : ''}
                        <span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>{'★'.repeat(5 - Math.ceil(r.rating))}</span>
                      </div>
                    </div>
                  </div>
                  <p className="serif" style={{ fontSize: 19, lineHeight: 1.35, marginBottom: 16 }}>&quot;{r.body}&quot;</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar user={user} size={26} />
                      <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>@{user.handle}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {r.reacts.map((rc, j) => (
                        <span key={j} className="reaction" style={{ fontSize: 11, padding: '2px 8px' }}>
                          <span>{rc.e}</span>
                          <span className="count">{rc.c}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: '120px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 className="display-xl" style={{ marginBottom: 28 }}>
            Stop <i style={{ color: 'var(--pulp)' }}>pretending</i><br />
            you&apos;ll remember.
          </h2>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: 'var(--ink-2)', marginBottom: 36 }}>
            Your 2026 reading self will thank you. Probably. If they&apos;re not too busy arguing about <i>Babel</i> in the threads.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/signup" className="btn btn-pulp btn-lg">Claim your shelf — free</Link>
            <a className="btn btn-outline btn-lg">Browse public reads</a>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          Made for people who dog-ear. · <a className="link-u">Terms</a> · <a className="link-u">Privacy</a> · <a className="link-u">Roadmap</a>
        </div>
      </footer>
    </div>
  )
}
