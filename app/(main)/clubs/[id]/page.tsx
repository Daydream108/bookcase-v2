'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { createClient } from '@/lib/supabase/client'
import {
  getClub,
  getCurrentProfile,
  joinClub,
  leaveClub,
  listClubPosts,
  postToClub,
  toUiBook,
  toUiUser,
  type DbClub,
  type DbClubPost,
  type DbProfile,
} from '@/lib/db'

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [club, setClub] = useState<DbClub | null>(null)
  const [posts, setPosts] = useState<DbClubPost[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    const [profile, clubRow, postRows] = await Promise.all([
      getCurrentProfile(supabase),
      getClub(supabase, id),
      listClubPosts(supabase, id, 40),
    ])
    setMe(profile)
    setClub(clubRow)
    setPosts(postRows)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [profile, clubRow, postRows] = await Promise.all([
        getCurrentProfile(supabase),
        getClub(supabase, id),
        listClubPosts(supabase, id, 40),
      ])
      if (cancelled) return
      setMe(profile)
      setClub(clubRow)
      setPosts(postRows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, supabase])

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>Loading...</div>
  }

  if (!club) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h1 className="display-md">Club not found</h1>
        <Link href="/clubs" className="btn btn-outline" style={{ marginTop: 16 }}>
          Back to clubs
        </Link>
      </div>
    )
  }

  const currentBook = club.current_book ? toUiBook(club.current_book) : null

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 40px' }}>
      <Link href="/clubs" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        Back to clubs
      </Link>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              {club.is_public ? 'Public club' : 'Private club'} · {club.member_count ?? 0} members
            </div>
            <h1 className="display-lg" style={{ marginBottom: 10 }}>{club.name}</h1>
            {club.description && (
              <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 720 }}>{club.description}</p>
            )}
          </div>

          {me && (
            <button
              className={club.is_member ? 'btn btn-ghost' : 'btn btn-pulp'}
              onClick={async () => {
                try {
                  if (club.is_member) {
                    await leaveClub(supabase, club.id)
                  } else {
                    await joinClub(supabase, club.id)
                  }
                  await load()
                } catch (error) {
                  setMessage((error as Error).message || 'Could not update membership')
                }
              }}
            >
              {club.is_member ? 'Leave club' : 'Join club'}
            </button>
          )}
        </div>

        {currentBook && club.current_book && (
          <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center' }}>
            <Cover book={currentBook} size={72} />
            <div>
              <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', marginBottom: 4 }}>
                Current read
              </div>
              <Link href={`/book/${club.current_book.id}`} style={{ fontSize: 16, fontWeight: 700 }}>
                {club.current_book.title}
              </Link>
            </div>
          </div>
        )}
        {message && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 14 }}>{message}</div>}
      </div>

      {me && club.is_member && (
        <div className="card" style={{ padding: 22, marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Post to the club</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!title.trim() || !body.trim()) {
                setMessage('Add a title and body first')
                return
              }
              try {
                await postToClub(supabase, {
                  clubId: club.id,
                  title,
                  body,
                  bookId: club.current_book_id ?? null,
                })
                setTitle('')
                setBody('')
                setMessage('Post added')
                await load()
              } catch (error) {
                setMessage((error as Error).message || 'Could not post to club')
              }
            }}
            style={{ display: 'grid', gap: 10 }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14 }}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start the conversation"
              rows={4}
              style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <button type="submit" className="btn btn-pulp" style={{ justifyContent: 'center' }}>
              Publish post
            </button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {posts.map((post) => {
          const user = toUiUser(post.profile)
          return (
            <div key={post.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar user={user} size={30} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    @{user.handle} · {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginBottom: 8 }}>{post.title}</div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{post.body}</div>
            </div>
          )
        })}

        {posts.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
            No club posts yet. {club.is_member ? 'Start the first discussion.' : 'Join the club to post.'}
          </div>
        )}
      </div>
    </div>
  )
}
