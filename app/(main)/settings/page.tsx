'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getCurrentProfile,
  getNotificationPreferences,
  updateProfile,
  upsertNotificationPreferences,
  type DbNotificationPreferences,
  type DbProfile,
} from '@/lib/db'

type LocalPrefsState = {
  spoilersBlurred: boolean
}

type NotificationPrefsState = Pick<
  DbNotificationPreferences,
  | 'notify_follows'
  | 'notify_comments'
  | 'notify_upvotes'
  | 'notify_likes'
  | 'notify_club_activity'
  | 'notify_roadmap_updates'
>

const DEFAULT_LOCAL_PREFS: LocalPrefsState = {
  spoilersBlurred: true,
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefsState = {
  notify_follows: true,
  notify_comments: true,
  notify_upvotes: true,
  notify_likes: true,
  notify_club_activity: true,
  notify_roadmap_updates: true,
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
  const [localPrefs, setLocalPrefs] = useState<LocalPrefsState>(DEFAULT_LOCAL_PREFS)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefsState>(
    DEFAULT_NOTIFICATION_PREFS
  )

  const [saving, setSaving] = useState(false)
  const [prefsSavingKey, setPrefsSavingKey] = useState<string | null>(null)
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
        const prefs = await getNotificationPreferences(supabase)
        if (!cancelled && prefs) {
          setNotificationPrefs({
            notify_follows: prefs.notify_follows,
            notify_comments: prefs.notify_comments,
            notify_upvotes: prefs.notify_upvotes,
            notify_likes: prefs.notify_likes,
            notify_club_activity: prefs.notify_club_activity,
            notify_roadmap_updates: prefs.notify_roadmap_updates,
          })
        }
      }
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(PREFS_KEY) : null
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<LocalPrefsState>
          if (!cancelled) setLocalPrefs({ ...DEFAULT_LOCAL_PREFS, ...parsed })
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false)
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

  const updateLocalPrefs = (patch: Partial<LocalPrefsState>) => {
    const next = { ...localPrefs, ...patch }
    setLocalPrefs(next)
    try {
      if (typeof window !== 'undefined') localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    flash('Device preference saved')
  }

  const updateNotificationPref = async (
    key: keyof NotificationPrefsState,
    value: boolean
  ) => {
    const next = { ...notificationPrefs, [key]: value }
    setNotificationPrefs(next)
    setPrefsSavingKey(key)
    try {
      await upsertNotificationPreferences(supabase, { [key]: value })
      flash('Notification preferences saved')
    } catch (err) {
      setNotificationPrefs(notificationPrefs)
      flash((err as Error).message || 'Could not save notification preferences')
    } finally {
      setPrefsSavingKey(null)
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
        Loading...
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
              placeholder="book twin with nobody yet..."
              rows={3}
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, resize: 'none', fontFamily: 'inherit', fontSize: 14 }}
            />
          </label>
          <button type="submit" disabled={saving} className="btn btn-pulp btn-sm" style={{ justifySelf: 'start' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {toast && <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--ink-3)' }}>{toast}</span>}
        </div>
      </form>

      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Privacy &amp; spoilers</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>Controls that only affect this device right now.</p>
        <Toggle
          label="Blur spoiler content until tapped"
          checked={localPrefs.spoilersBlurred}
          onChange={(v) => updateLocalPrefs({ spoilersBlurred: v })}
        />
        <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10 }}>
          Spoiler blur is still local-only. Notification settings below are now live server-side.
        </p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Notifications</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          These are saved to your account and now gate notification writes.
        </p>
        <Toggle
          label="New followers"
          checked={notificationPrefs.notify_follows}
          onChange={(v) => void updateNotificationPref('notify_follows', v)}
          saving={prefsSavingKey === 'notify_follows'}
        />
        <Toggle
          label="Replies and comments"
          checked={notificationPrefs.notify_comments}
          onChange={(v) => void updateNotificationPref('notify_comments', v)}
          saving={prefsSavingKey === 'notify_comments'}
        />
        <Toggle
          label="Thread upvotes"
          checked={notificationPrefs.notify_upvotes}
          onChange={(v) => void updateNotificationPref('notify_upvotes', v)}
          saving={prefsSavingKey === 'notify_upvotes'}
        />
        <Toggle
          label="Review likes"
          checked={notificationPrefs.notify_likes}
          onChange={(v) => void updateNotificationPref('notify_likes', v)}
          saving={prefsSavingKey === 'notify_likes'}
        />
        <Toggle
          label="Club joins and invites"
          checked={notificationPrefs.notify_club_activity}
          onChange={(v) => void updateNotificationPref('notify_club_activity', v)}
          saving={prefsSavingKey === 'notify_club_activity'}
        />
        <Toggle
          label="Roadmap updates"
          checked={notificationPrefs.notify_roadmap_updates}
          onChange={(v) => void updateNotificationPref('notify_roadmap_updates', v)}
          saving={prefsSavingKey === 'notify_roadmap_updates'}
        />
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Import library</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          Bring in your Goodreads CSV after signup or anytime later. We map shelf states, ratings, review text, and custom shelves into Bookcase.
        </p>
        <Link href="/import" className="btn btn-pulp btn-sm">
          Import Goodreads
        </Link>
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

function Toggle({
  label,
  checked,
  onChange,
  saving = false,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  saving?: boolean
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 12, cursor: 'pointer' }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {saving && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Saving...</span>}
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ transform: 'scale(1.2)', accentColor: 'var(--pulp)' }} />
      </div>
    </label>
  )
}
