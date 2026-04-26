'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { buildAuthCallbackUrl } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const trimmedUsername = username.trim()
    if (trimmedUsername.length < 2 || trimmedUsername.length > 30) {
      setError('Username must be 2 to 30 characters.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('Username can only contain letters, numbers, and underscores.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: trimmedUsername, display_name: trimmedUsername },
        emailRedirectTo: buildAuthCallbackUrl('/import?source=signup'),
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.session) {
      router.push('/import?source=signup')
      router.refresh()
      return
    }

    setMessage('Check your email for a confirmation link. If it does not show up, you can resend it below.')
  }

  const onResend = async () => {
    if (!email) {
      setError('Enter your email first so we know where to resend the confirmation.')
      return
    }

    setError(null)
    setMessage(null)
    setResending(true)

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: buildAuthCallbackUrl('/import?source=signup'),
      },
    })

    setResending(false)

    if (resendError) {
      setError(resendError.message)
      return
    }

    setMessage('A fresh confirmation email is on the way.')
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Join Bookcase</div>
      <h1 className="display-md" style={{ marginBottom: 10 }}>Create account.</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24 }}>
        Track books, post reviews, and join clubs.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
          Username
        </label>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={2}
          maxLength={30}
          pattern="[a-zA-Z0-9_]+"
          autoComplete="username"
          placeholder="brett_reads"
          style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--paper)' }}
        />
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: -6 }}>
          Letters, numbers, and underscores. This is also your display name; you can change either later in settings.
        </div>

        <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
          style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--paper)' }}
        />

        <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
          Password
        </label>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="at least 8 characters"
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
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <button
          type="button"
          disabled={resending || !email}
          className="btn"
          onClick={onResend}
          style={{ justifyContent: 'center' }}
        >
          {resending ? 'Resending...' : 'Resend confirmation email'}
        </button>
      </form>

      <div style={{ marginTop: 20, fontSize: 13, color: 'var(--ink-3)' }}>
        Already have one?{' '}
        <Link href="/login" className="link-u" style={{ color: 'var(--pulp)', fontWeight: 600 }}>
          Sign in
        </Link>
      </div>
    </div>
  )
}
