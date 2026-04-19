'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    router.push('/home')
    router.refresh()
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Welcome back</div>
      <h1 className="display-md" style={{ marginBottom: 10 }}>Sign in.</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24 }}>
        Pick up where you left off — streak intact.
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

        <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--paper)' }}
        />

        {error && (
          <div style={{ fontSize: 13, color: 'var(--pulp-deep)', background: 'var(--pulp-soft)', border: '1px solid var(--pulp)', padding: 10, borderRadius: 10 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-pulp" style={{ justifyContent: 'center', marginTop: 6 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div style={{ marginTop: 20, fontSize: 13, color: 'var(--ink-3)' }}>
        New here?{' '}
        <Link href="/signup" className="link-u" style={{ color: 'var(--pulp)', fontWeight: 600 }}>
          Create an account →
        </Link>
      </div>
    </div>
  )
}
