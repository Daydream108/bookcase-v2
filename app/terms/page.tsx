import Link from 'next/link'
import { PublicFooter } from '@/components/redesign/PublicFooter'

export default function TermsPage() {
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
            <Link href="/privacy" className="btn btn-outline btn-sm">
              Privacy
            </Link>
            <Link href="/signup" className="btn btn-pulp btn-sm">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 56px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Terms</div>
        <h1 className="display-lg" style={{ marginBottom: 16 }}>Terms of use.</h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: 760, marginBottom: 28 }}>
          Bookcase is a beta social reading product. These terms describe the basic rules for using the service, posting content, importing book data, and participating in social features like reviews, clubs, threads, and comments.
        </p>

        <div style={{ display: 'grid', gap: 16 }}>
          <LegalCard
            title="Use the product responsibly"
            body={[
              'Do not use Bookcase to harass people, spam the platform, post hateful content, or evade moderation tools.',
              'If you block someone or are blocked, respect those account boundaries.',
            ]}
          />
          <LegalCard
            title="Your account and your content"
            body={[
              'You are responsible for the activity that happens through your account.',
              'Reviews, thread posts, comments, and club posts you publish remain your content, but Bookcase needs permission to store and display that content inside the app.',
            ]}
          />
          <LegalCard
            title="Imported catalog data"
            body={[
              'Search may use Open Library metadata and covers to help readers find books that are not already in Bookcase.',
              'If you import Goodreads data, you are confirming that you have the right to upload and use the contents of that export in your own account.',
            ]}
          />
          <LegalCard
            title="Moderation and enforcement"
            body={[
              'Bookcase may remove content, limit features, or suspend access when moderation tools show abuse, spam, or safety violations.',
              'Reported content can be reviewed by moderators to keep clubs, comments, reviews, and thread posts usable.',
            ]}
          />
          <LegalCard
            title="Beta product limits"
            body={[
              'Because Bookcase is still in beta, features may change, break, or be removed while the product improves.',
              'Use account exports if you want a copy of your current data before making major changes.',
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
