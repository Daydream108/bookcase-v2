const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export function normalizeNextPath(
  next: string | null | undefined,
  fallback = '/home',
) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback
  }

  return next
}

export function buildAuthCallbackUrl(next: string) {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : DEFAULT_APP_URL

  const url = new URL('/auth/callback', origin)
  url.searchParams.set('next', normalizeNextPath(next))
  return url.toString()
}
