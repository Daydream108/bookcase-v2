'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    const checkRecoverySession = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!active) {
        return
      }

      if (userError || !user) {
        setReady(false)
        setError('This reset link is missing or has expired. Request a new one to keep going.')
      } else {
        setReady(true)
      }

      setChecking(false)
    }

    void checkRecoverySession()

    return () => {
      active = false
    }
  }, [supabase])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match yet.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage('Password updated. Sending you back into Bookcase...')
    window.setTimeout(() => {
      router.replace('/home')
      router.refresh()
    }, 900)
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Password reset</div>
      <h1 className="display-md" style={{ marginBottom: 10 }}>Choose a new password.</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24 }}>
        Enter a new password and sign back in.
      </p>

      {checking ? (
        <div style={{ fontSize: 13, color: 'var(--ink-3)', background: 'var(--paper-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 10 }}>
          Checking your reset link...
        </div>
      ) : ready ? (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
            New password
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

          <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>
            Confirm password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="repeat your new password"
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
            {loading ? 'Saving...' : 'Save new password'}
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ fontSize: 13, color: 'var(--pulp-deep)', background: 'var(--pulp-soft)', border: '1px solid var(--pulp)', padding: 10, borderRadius: 10 }}>
              {error}
            </div>
          )}

          <Link href="/forgot-password" className="btn btn-pulp" style={{ justifyContent: 'center' }}>
            Request another reset link
          </Link>
        </div>
      )}
    </div>
  )
}
