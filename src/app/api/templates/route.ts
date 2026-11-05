import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withLogging } from '@/lib/observability'
import { templatesAsRecords } from '@/lib/templates'

// GET /api/templates — built-in template library (from DB or fallback to code records)
async function __canvix_get(_req: NextRequest) {
  try {
    let templates: any[] = []
    if (process.env.DATABASE_URL) {
      try {
        templates = await db.template.findMany({
          orderBy: { createdAt: 'asc' },
        })
      } catch (dbErr) {
        console.warn('DB query for templates failed; falling back to built-in templates library', dbErr)
      }
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json(templatesAsRecords(), {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
        },
      })
    }

    return NextResponse.json(
      templates.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        category: t.category,
        width: t.width,
        height: t.height,
        accent: t.accent,
        pages: t.pages ?? [],
      })),
      {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    )
  } catch (error) {
    console.warn('GET /api/templates returning default static templates after error', error)
    return NextResponse.json(templatesAsRecords(), {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  }
}

// v0.12.5 (H7): opt-in request logging wrapper — passthrough
// unless CANVIX_LOG=requests (see src/lib/observability.ts)
export const GET = withLogging('GET /api/templates', __canvix_get)
