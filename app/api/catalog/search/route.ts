import { NextRequest, NextResponse } from 'next/server'
import { searchOpenLibraryBooks } from '@/lib/openlibrary'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '12', 10)

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchOpenLibraryBooks(query, clamp(limit, 1, 18))
    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Could not search the wider catalog.' },
      { status: 500 }
    )
  }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
