'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { createClient } from '@/lib/supabase/client'
import {
  listBlockedUsers,
  exportMyAccountData,
  getCurrentProfile,
  getNotificationPreferences,
  toUiUser,
  updateProfile,
  upsertNotificationPreferences,
  type DbBlockedUser,
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
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [localPrefs, setLocalPrefs] = useState<LocalPrefsState>(DEFAULT_LOCAL_PREFS)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefsState>(
    DEFAULT_NOTIFICATION_PREFS
  )
  const [blockedUsers, setBlockedUsers] = useState<DbBlockedUser[]>([])

  const [saving, setSaving] = useState(false)
  const [prefsSavingKey, setPrefsSavingKey] = useState<string | null>(null)
  const [exportingData, setExportingData] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const profile = await getCurrentProfile(supabase)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      setMe(profile)
      setEmail(user?.email ?? '')
      if (profile) {
        setDisplayName(profile.display_name ?? '')
        setUsername(profile.username ?? '')
        setBio(profile.bio ?? '')
        setLocation(profile.location ?? '')
        setAvatarUrl(profile.avatar_url ?? '')
        const [prefs, blocks] = await Promise.all([
          getNotificationPreferences(supabase),
          listBlockedUsers(supabase),
        ])
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
        if (!cancelled) setBlockedUsers(blocks)
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
        avatar_url: avatarUrl.trim() || null,
      })
      setMe((current) =>
        current
          ? {
              ...current,
              display_name: displayName.trim() || null,
              username: username.trim() || null,
              bio: bio.trim() || null,
              location: location.trim() || null,
              avatar_url: avatarUrl.trim() || null,
            }
          : current
      )
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

  const copyProfileLink = async () => {
    if (!me?.username || typeof window === 'undefined') return
    const profileUrl = `${window.location.origin}/profile/${me.username}`
    try {
      await navigator.clipboard.writeText(profileUrl)
      flash('Profile link copied')
    } catch {
      flash('Could not copy profile link')
    }
  }

  const downloadData = async () => {
    setExportingData(true)
    try {
      const payload = await exportMyAccountData(supabase)
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `bookcase-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      flash('Data export downloaded')
    } catch (error) {
      flash((error as Error).message || 'Could not export your data')
    } finally {
      setExportingData(false)
    }
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
        <h1 className="display-md" style={{ marginBottom: 16 }}>Sign in to edit settings</h1>
        <Link href="/login" className="btn btn-pulp">Sign in</Link>
      </div>
    )
  }

  const previewProfile: DbProfile = {
    ...me,
    display_name: displayName.trim() || me.display_name,
    username: username.trim() || me.username,
    bio: bio.trim() || me.bio,
    location: location.trim() || me.location,
    avatar_url: avatarUrl.trim() || null,
  }
  const previewUser = toUiUser(previewProfile)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Reader settings</div>
      <h1 className="display-lg" style={{ marginBottom: 30 }}>Settings.</h1>

      <form onSubmit={saveProfile} className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Profile</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          This is what readers see on your public profile.
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
            Avatar image URL
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
              Paste a direct image URL for now. The whole app will use it anywhere your avatar appears.
            </span>
          </label>
          <label style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What do you like to read?"
              rows={3}
              style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, resize: 'none', fontFamily: 'inherit', fontSize: 14 }}
            />
          </label>
          <div
            className="card"
            style={{
              gridColumn: '1 / -1',
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'color-mix(in oklab, var(--paper) 90%, white)',
            }}
          >
            <Avatar user={previewUser} size={56} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{previewUser.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>@{previewUser.handle}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                This preview is what readers will see in the feed, comments, and clubs.
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn btn-pulp btn-sm" style={{ justifySelf: 'start' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {toast && <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--ink-3)' }}>{toast}</span>}
        </div>
      </form>

      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Privacy &amp; spoilers</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          Control how the app behaves on this device and see what is public to other readers.
        </p>
        <Toggle
          label="Blur spoiler content until tapped"
          checked={localPrefs.spoilersBlurred}
          onChange={(v) => updateLocalPrefs({ spoilersBlurred: v })}
        />
        <div
          className="card"
          style={{
            marginTop: 14,
            padding: 14,
            background: 'color-mix(in oklab, var(--paper) 88%, white)',
          }}
        >
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
            Public on your profile
          </div>
          <div style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--ink-2)' }}>
            <div>Display name, username, bio, and location</div>
            <div>Favorites, shelves, streak summary, and reading activity</div>
            <div>Reviews, ratings, and thread posts you publish</div>
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '12px 0 8px' }}>
            Private to your account
          </div>
          <div style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--ink-2)' }}>
            <div>Email address and sign-in data</div>
            <div>Notification preferences and blocked-reader list</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Notifications</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          Choose which notifications you want to receive.
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
          Upload your Goodreads CSV to add books, ratings, reviews, and shelves.
        </p>
        <Link href="/import" className="btn btn-pulp btn-sm">
          Import Goodreads
        </Link>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Data &amp; safety</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          Export what Bookcase knows about your account and manage reader-level safety tools.
        </p>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>
          {blockedUsers.length} blocked {blockedUsers.length === 1 ? 'reader' : 'readers'} on this account.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void downloadData()}
            disabled={exportingData}
          >
            {exportingData ? 'Preparing export...' : 'Download my data'}
          </button>
          <Link href="/safety" className="btn btn-outline btn-sm">
            Blocked readers & reports
          </Link>
          {me.username && (
            <Link href={`/profile/${me.username}`} className="btn btn-outline btn-sm">
              View public profile
            </Link>
          )}
          {me.username && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void copyProfileLink()}>
              Copy profile link
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <Link href="/privacy" className="link-u" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
            Privacy policy
          </Link>
          <Link href="/terms" className="link-u" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
            Terms
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Account</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
          Manage your sign-in and account access.
        </p>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14 }}>
          Signed in as <b>{email || 'your account'}</b>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/forgot-password" className="btn btn-outline btn-sm">
            Reset password
          </Link>
          <button type="button" className="btn btn-outline btn-sm" onClick={signOut}>
            Sign out
          </button>
        </div>
        <div
          className="card"
          style={{
            marginTop: 16,
            padding: 14,
            background: 'color-mix(in oklab, var(--paper) 90%, white)',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 8,
            }}
          >
            Before wider beta
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            Self-serve permanent account deletion is not live yet. Download your data first if you need a full record of your account before signing out or asking the team to remove it.
          </div>
        </div>
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
