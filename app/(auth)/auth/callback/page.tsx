'use client'

import type { EmailOtpType } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { normalizeNextPath } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [status, setStatus] = useState('Verifying your link...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let resolved = false
    let fallbackTimer: number | null = null

    const completeSignIn = (nextPath: string) => {
      if (!active || resolved) {
        return
      }

      resolved = true
      router.replace(nextPath)
      router.refresh()
    }

    const fail = (message: string) => {
      if (!active || resolved) {
        return
      }

      resolved = true
      setError(message)
      setStatus('That link could not be completed.')
    }

    const url = new URL(window.location.href)
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
    const nextPath = normalizeNextPath(url.searchParams.get('next'))
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')
    const code = url.searchParams.get('code')
    const redirectError =
      url.searchParams.get('error_description') ?? hashParams.get('error_description')

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || resolved || !session) {
        return
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'PASSWORD_RECOVERY' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        completeSignIn(nextPath)
      }
    })

    const finishAuth = async () => {
      try {
        if (redirectError) {
          fail(redirectError)
          return
        }

        if (tokenHash && type) {
          setStatus(type === 'recovery' ? 'Opening your password reset...' : 'Signing you in...')
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          })

          if (verifyError) {
            fail(verifyError.message)
            return
          }

          completeSignIn(nextPath)
          return
        }

        if (code) {
          setStatus('Finishing sign-in...')
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            fail(exchangeError.message)
            return
          }

          completeSignIn(nextPath)
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          completeSignIn(nextPath)
          return
        }

        setStatus('Finishing sign-in...')
        fallbackTimer = window.setTimeout(async () => {
          if (!active || resolved) {
            return
          }

          const {
            data: { session: delayedSession },
          } = await supabase.auth.getSession()

          if (delayedSession) {
            completeSignIn(nextPath)
            return
          }

          fail('This link is invalid or expired. Request a fresh one and try again.')
        }, 1500)
      } catch (caughtError) {
        fail(caughtError instanceof Error ? caughtError.message : 'We could not finish that sign-in.')
      }
    }

    void finishAuth()

    return () => {
      active = false
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer)
      }
      subscription.unsubscribe()
    }
  }, [router, supabase])

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 12 }}>One moment</div>
      <h1 className="display-md" style={{ marginBottom: 10 }}>Finishing auth.</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24 }}>
        {status}
      </p>

      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--pulp-deep)', background: 'var(--pulp-soft)', border: '1px solid var(--pulp)', padding: 10, borderRadius: 10 }}>
            {error}
          </div>
          <Link href="/login" className="btn btn-pulp" style={{ justifyContent: 'center' }}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ink-3)', background: 'var(--paper-2)', border: '1px solid var(--border)', padding: 12, borderRadius: 10 }}>
          Keep this tab open for a second while we finish the redirect.
        </div>
      )}
    </div>
  )
}
