'use client'

import Link from 'next/link'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { PublicFooter } from '@/components/redesign/PublicFooter'
import { StarDisplay } from '@/components/redesign/Stars'
import { books, users } from '@/lib/redesign-data'

export default function LandingPage() {
  const floaters = [
    { book: books.find((book) => book.id === 'hm')!, x: '8%', y: '8%', r: -8, s: 1, d: 0 },
    { book: books.find((book) => book.id === 'sb')!, x: '72%', y: '4%', r: 6, s: 1.05, d: 0.6 },
    { book: books.find((book) => book.id === 'pr')!, x: '38%', y: '22%', r: -3, s: 1.18, d: 1.2 },
    { book: books.find((book) => book.id === 'rd')!, x: '4%', y: '54%', r: 9, s: 0.92, d: 0.3 },
    { book: books.find((book) => book.id === 'cr')!, x: '65%', y: '48%', r: -5, s: 1, d: 0.9 },
    { book: books.find((book) => book.id === 'bb')!, x: '30%', y: '66%', r: 4, s: 0.88, d: 1.5 },
  ]
  const trendingTape = [...books, ...books].map((book) => book.title.toUpperCase()).join('  /  ')
  const sampleReviews = [
    {
      book: books[0],
      user: users[0],
      rating: 4.5,
      body: 'Finished this last night and still want to talk about the ending.',
    },
    {
      book: books[1],
      user: users[1],
      rating: 5,
      body: 'Easy five stars. Fast, smart, and emotional.',
    },
    {
      book: books[2],
      user: users[2],
      rating: 4,
      body: 'This one needs a club thread. There is a lot to unpack.',
    },
  ]
  const features = [
    {
      title: 'Track your books',
      body: 'Save what you want to read, what you are reading, and what you finished.',
    },
    {
      title: 'Post reviews',
      body: 'Rate books, write short reviews, and hide spoilers until someone taps.',
    },
    {
      title: 'Join clubs',
      body: 'Read with a group and keep the discussion tied to the book.',
    },
    {
      title: 'Follow readers',
      body: 'Build a feed from people whose taste you trust.',
    },
    {
      title: 'Keep a streak',
      body: 'Log reading sessions and see your daily reading history.',
    },
    {
      title: 'Import your library',
      body: 'Bring in Goodreads books, ratings, reviews, and shelves.',
    },
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
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'color-mix(in oklab, var(--paper) 94%, white)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '16px 24px',
          }}
        >
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', textDecoration: 'none' }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'var(--ink)',
                color: 'var(--paper)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                boxShadow: 'inset 0 0 0 2px var(--pulp)',
              }}
            >
              B
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-0.02em' }}>
              Bookcase
            </div>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/search" className="link-u" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              Search
            </Link>
            <Link href="/clubs" className="link-u" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              Clubs
            </Link>
            <Link href="/roadmap" className="link-u" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              Roadmap
            </Link>
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-pulp btn-sm">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '72px 24px 40px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
              gap: 80,
              alignItems: 'center',
            }}
          >
            <div>
              <div className="chip chip-pulp" style={{ marginBottom: 22 }}>
                Social reading for books
              </div>
              <h1 className="display-xl" style={{ marginBottom: 24 }}>
                Read. Track.
                <br />
                <span style={{ fontStyle: 'italic', color: 'var(--pulp)' }}>Talk about books.</span>
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 560, marginBottom: 30 }}>
                Bookcase helps you save books, post reviews, follow readers, join clubs, and keep a reading streak.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/signup" className="btn btn-pulp btn-lg">
                  Create account <Icon name="arrow" size={16} color="white" />
                </Link>
                <Link href="/search" className="btn btn-outline btn-lg">
                  Search books
                </Link>
              </div>
            </div>

            <div style={{ position: 'relative', height: 540 }}>
              {floaters.map((floater, index) => (
                <div
                  key={floater.book.id}
                  className="floater"
                  style={{
                    position: 'absolute',
                    left: floater.x,
                    top: floater.y,
                    width: 150,
                    animationDelay: `${floater.d}s`,
                    zIndex: index === 2 ? 10 : index,
                    ['--r' as any]: `${floater.r}deg`,
                  }}
                >
                  <div style={{ transform: `rotate(${floater.r}deg) scale(${floater.s})` }}>
                    <Cover book={floater.book} size={150} />
                  </div>
                </div>
              ))}
              <div
                style={{
                  position: 'absolute',
                  right: '-4%',
                  top: '36%',
                  background: 'var(--paper)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 16,
                  padding: '10px 14px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 20,
                  fontSize: 13,
                  transform: 'rotate(-3deg)',
                }}
              >
                <div style={{ fontWeight: 600 }}>14-day streak</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>Log today</div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: '-2%',
                  top: '28%',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  borderRadius: 16,
                  padding: '10px 14px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 20,
                  fontSize: 13,
                  transform: 'rotate(4deg)',
                  maxWidth: 190,
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Book post
                </div>
                <div style={{ marginTop: 4, fontStyle: 'italic', fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.2 }}>
                  &quot;Need to talk about chapter 12.&quot;
                </div>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>324 replies / @avareads</div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: '20%',
                  bottom: '4%',
                  background: 'var(--paper)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 14,
                  padding: '8px 12px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 20,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transform: 'rotate(-2deg)',
                }}
              >
                <span>4.5</span>
                <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>2.1k ratings</div>
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            padding: '18px 0',
            overflow: 'hidden',
            borderTop: '1px solid var(--ink)',
            borderBottom: '1px solid var(--ink)',
            transform: 'rotate(-1deg)',
            margin: '36px -8px 44px',
          }}
        >
          <div className="marquee mono" style={{ whiteSpace: 'nowrap', fontSize: 18, letterSpacing: '0.04em', display: 'inline-block' }}>
            {trendingTape}
            {'  /  '}
            {trendingTape}
          </div>
        </div>

        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 24px 64px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {features.map((feature, index) => (
              <div key={feature.title} className="card" style={{ padding: 22 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--pulp)', marginBottom: 12 }}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>
                  {feature.title}
                </h2>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0 }}>
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            background: 'var(--paper-2)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            padding: '64px 24px',
          }}
        >
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  Reader posts
                </div>
                <h2 className="display-lg">
                  Talk about
                  <br />
                  <i style={{ color: 'var(--pulp)' }}>what you read.</i>
                </h2>
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', alignSelf: 'end' }}>
                Live feed
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
              {sampleReviews.map((review) => (
                <div key={`${review.book.id}-${review.user.id}`} className="card-raised" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                    <Cover book={review.book} size={64} />
                    <div>
                      <div className="serif" style={{ fontSize: 20, lineHeight: 1.1 }}>
                        {review.book.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                        {review.book.author}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <StarDisplay value={review.rating} size={13} />
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)', marginBottom: 16 }}>
                    "{review.body}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar user={review.user} size={26} />
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                      @{review.user.handle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '88px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <h2 className="display-xl" style={{ marginBottom: 22 }}>
              Start your
              <br />
              <i style={{ color: 'var(--pulp)' }}>reading profile.</i>
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--ink-2)', marginBottom: 30 }}>
              Save your books, find readers, join clubs, and keep track of what you actually read.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" className="btn btn-pulp btn-lg">
                Create account
              </Link>
              <Link href="/search" className="btn btn-outline btn-lg">
                Browse books
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            padding: '0 24px 72px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 1180,
              margin: '0 auto',
              padding: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <FooterFeature
              title="Open Library search"
              body="Look up long-tail books, comics, manga, graphic novels, series names, and ISBNs."
            />
            <FooterFeature
              title="Goodreads import"
              body="Bring over shelves, ratings, reviews, and custom Goodreads lists to skip the empty-account phase."
            />
            <FooterFeature
              title="Built for beta feedback"
              body="Profiles, clubs, reviews, threads, and safety tools are live so readers can really test the product."
            />
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

function FooterFeature({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{body}</div>
    </div>
  )
}
