'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentProfile, updateProfile, type DbProfile } from '@/lib/db'

type PrefsState = {
  spoilersBlurred: boolean
  publicShelf: boolean
  notifyFollows: boolean
  notifyComments: boolean
  notifyUpvotes: boolean
}

const DEFAULT_PREFS: PrefsState = {
  spoilersBlurred: true,
  publicShelf: true,
  notifyFollows: true,
  notifyComments: true,
  notifyUpvotes: true,
}

const PREFS_KEY = 'bookcase:prefs'

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [prefs, setPrefs] = useState<PrefsState>(DEFAULT_PREFS)

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const profile = await getCurrentProfile(supabase)
      if (cancelled) return
      setMe(profile)
      if (profile) {
        setDisplayName(profile.display_name ?? '')
        setUsername(profile.username ?? '')
        setBio(profile.bio ?? '')
        setLocation(profile.location ?? '')
      }
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(PREFS_KEY) : null
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) })
      } catch {
        /* ignore */
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 2200)
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me) return
    setSaving(true)
    try {
      await updateProfile(supabase, {
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
      })
      flash('Profile saved')
    } catch (err) {
      flash((err as Error).message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const updatePrefs = (patch: Partial<PrefsState>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      if (typeof window !== 'undefined') localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  const signOut = async () => {
    const form = document.createElement('form')
    form.method = 'post'
    form.action = '/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 40px', textAlign: 'center', color: 'var(--ink-3)' }}>
        Loading…
      </div>
    )
  }

  if (!me) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 40px', textAlign: 'center' }}>
        <h1 className="display-md" style={{ marginBottom: 16 }}>Sign in to tune your settings</h1>
        <Link href="/login" className="btn btn-pulp">Sign in</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Reader settings</div>
      <h1 className="display-lg" style={{ marginBottom: 30 }}>Make it yours.</h1>

      <form onSubmit={saveProfile} className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Profile</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          The identity readers meet when they land on your shelf.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="display name"
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }}
            />
          </label>
          <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="handle"
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }}
            />
          </label>
          <label style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Brooklyn, NY"
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }}
            />
          </label>
          <label style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="book twin with nobody yet…"
              rows={3}
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, resize: 'none', fontFamily: 'inherit', fontSize: 14 }}
            />
          </label>
          <button type="submit" disabled={saving} className="btn btn-pulp btn-sm" style={{ justifySelf: 'start' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {toast && <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--ink-3)' }}>{toast}</span>}
        </div>
      </form>

      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Privacy &amp; spoilers</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>Who sees your shelf, and how much.</p>
        <Toggle
          label="Blur spoiler content until tapped"
          checked={prefs.spoilersBlurred}
          onChange={(v) => updatePrefs({ spoilersBlurred: v })}
        />
        <Toggle
          label="Show my shelf on my public profile"
          checked={prefs.publicShelf}
          onChange={(v) => updatePrefs({ publicShelf: v })}
        />
        <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10 }}>
          Preferences save locally. Server-side enforcement lands when club privacy ships.
        </p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Notifications</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          Threads, replies, author drops, badge unlocks.
        </p>
        <Toggle
          label="New followers"
          checked={prefs.notifyFollows}
          onChange={(v) => updatePrefs({ notifyFollows: v })}
        />
        <Toggle
          label="Replies on my threads"
          checked={prefs.notifyComments}
          onChange={(v) => updatePrefs({ notifyComments: v })}
        />
        <Toggle
          label="Upvotes on my posts"
          checked={prefs.notifyUpvotes}
          onChange={(v) => updatePrefs({ notifyUpvotes: v })}
        />
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Account</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>Email, session, sign out.</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 12, cursor: 'pointer' }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ transform: 'scale(1.2)', accentColor: 'var(--pulp)' }} />
    </label>
  )
}
