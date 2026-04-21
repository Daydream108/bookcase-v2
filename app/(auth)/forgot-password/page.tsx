'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { buildAuthCallbackUrl } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAuthCallbackUrl('/reset-password'),
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage('If that email is in Bookcase, we sent a reset link. Check your inbox and spam folder.')
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Recover your shelf</div>
      <h1 className="display-md" style={{ marginBottom: 10 }}>Reset password.</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24 }}>
        We&apos;ll email you a secure link so you can set a new password and get back to tracking.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--paper)' }}
        />

        {error && (
          <div style={{ fontSize: 13, color: 'var(--pulp-deep)', background: 'var(--pulp-soft)', border: '1px solid var(--pulp)', padding: 10, borderRadius: 10 }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ fontSize: 13, color: 'var(--moss)', background: 'color-mix(in oklab, var(--moss) 10%, transparent)', border: '1px solid var(--moss)', padding: 10, borderRadius: 10 }}>
            {message}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-pulp" style={{ justifyContent: 'center', marginTop: 6 }}>
          {loading ? 'Sending link...' : 'Send reset link'}
        </button>
      </form>

      <div style={{ marginTop: 20, fontSize: 13, color: 'var(--ink-3)' }}>
        Remembered it?{' '}
        <Link href="/login" className="link-u" style={{ color: 'var(--pulp)', fontWeight: 600 }}>
          Back to sign in -&gt;
        </Link>
      </div>
    </div>
  )
}
