import Link from 'next/link'
import { PublicFooter } from '@/components/redesign/PublicFooter'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in oklab, var(--paper) 94%, white)' }}>
        <div
          style={{
            maxWidth: 980,
            margin: '0 auto',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 30, textDecoration: 'none' }}>
            Bookcase
          </Link>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/terms" className="btn btn-outline btn-sm">
              Terms
            </Link>
            <Link href="/signup" className="btn btn-pulp btn-sm">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 56px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Privacy</div>
        <h1 className="display-lg" style={{ marginBottom: 16 }}>Privacy policy.</h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: 760, marginBottom: 28 }}>
          Bookcase stores only what it needs to run your reading profile, shelves, reviews, threads, clubs, notifications, and safety tools. This page explains what is public, what stays private, and how account data is used inside the product.
        </p>

        <div style={{ display: 'grid', gap: 16 }}>
          <LegalCard
            title="What is public"
            body={[
              'Your display name, username, bio, location, shelves, favorites, reviews, ratings, and thread posts can appear to other readers.',
              'If you join a public club or comment publicly, that activity can be visible inside the app.',
            ]}
          />
          <LegalCard
            title="What stays private"
            body={[
              'Your email address, password, notification settings, blocked-reader list, and account-export data are private to your account.',
              'Password handling and sign-in sessions are managed through Supabase authentication.',
            ]}
          />
          <LegalCard
            title="Catalog and imports"
            body={[
              'Search results may come from Open Library so Bookcase can find long-tail books, comics, manga, and graphic novels.',
              'If you import Goodreads, the books, shelf states, ratings, reviews, and custom shelves in your CSV are used to build your Bookcase account.',
            ]}
          />
          <LegalCard
            title="Safety and moderation"
            body={[
              'Reports, blocks, and moderator actions are used to keep the social features usable and safe.',
              'Content may be reviewed when a report is filed or when moderation is needed to enforce product rules.',
            ]}
          />
          <LegalCard
            title="Your controls"
            body={[
              'You can update your profile, notification preferences, password, blocked readers, and exportable account data from Settings and Safety.',
              'If you need help with account privacy or moderation questions, use the in-app safety tools first.',
            ]}
          />
        </div>
      </main>

      <PublicFooter compact />
    </div>
  )
}

function LegalCard({
  title,
  body,
}: {
  title: string
  body: string[]
}) {
  return (
    <section className="card" style={{ padding: 24 }}>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ display: 'grid', gap: 10, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  )
}
