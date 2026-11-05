'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DesignRecord, PageData } from '@/lib/types'

export interface DesignMeta {
  id: string
  name: string
  width: number
  height: number
  thumbnail: string | null
  source: string
  ownerId: string | null
  /** v0.9.1: ownerless + (this browser's attribution OR legacy) — i.e. the
   *  signed-in account may claim this design. Foreign anonymous designs
   *  are view/share-only and can never be claimed from here. */
  claimable?: boolean
  /** v0.9.1: ownerless AND attributed to this exact browser — the only rows
   *  the bulk "Save my designs" action will claim. */
  mine?: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

function toRecord(row: Record<string, unknown>): DesignRecord {
  const pages = typeof row.pages === 'string' ? JSON.parse(row.pages || '[]') : (row.pages ?? [])
  return { ...(row as unknown as DesignRecord), pages: pages as PageData[] }
}

/** v0.8: fetch a JSON error body if the API produced one (server sends
 *  { error, code, fix } for database trouble) so the UI can show the fix. */
async function readApiError(res: Response): Promise<{ message: string; code?: string; fix?: string }> {
  try {
    const body = (await res.json()) as { error?: string; code?: string; fix?: string }
    return { message: body.error ?? 'Request failed', code: body.code, fix: body.fix }
  } catch {
    return { message: `Request failed (${res.status})` }
  }
}

export class ApiError extends Error {
  code?: string
  fix?: string
  constructor(message: string, code?: string, fix?: string) {
    super(message)
    this.code = code
    this.fix = fix
  }
}

const LOCAL_STORAGE_KEY = 'qalamstudio-local-designs'

export function getLocalDesigns(): DesignRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalDesigns(list: DesignRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
  } catch {
    /* quota exceeded or private mode */
  }
}

export function createLocalDesign(opts: {
  name: string
  width: number
  height: number
  pages: PageData[]
  source?: string
}): DesignRecord {
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const record: DesignRecord = {
    id: localId,
    name: opts.name,
    width: opts.width,
    height: opts.height,
    pages: opts.pages,
    thumbnail: null,
    source: opts.source ?? 'blank',
    ownerId: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const existing = getLocalDesigns()
  saveLocalDesigns([record, ...existing.filter((d) => d.id !== record.id)])
  return record
}

/** v0.9.2: /api/designs is keyset-paginated (60 rows/page) — this is the
 * cursor the server hands back for the next page. */
interface DesignsPage {
  designs: DesignMeta[]
  nextCursor: { cursor: string; id: string } | null
}

async function fetchDesignsPage(cursor?: { cursor: string; id: string } | null): Promise<DesignsPage> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor.cursor)}&id=${encodeURIComponent(cursor.id)}` : ''
  const res = await fetch(`/api/designs${qs}`, { cache: 'no-store' })
  if (!res.ok) {
    const err = await readApiError(res)
    throw new ApiError(err.message, err.code, err.fix)
  }
  const body = (await res.json()) as Partial<DesignsPage>
  return { designs: body.designs ?? [], nextCursor: body.nextCursor ?? null }
}

export function useDesigns() {
  const [designs, setDesigns] = useState<DesignMeta[] | null>(null)
  const [loading, setLoading] = useState(true)
  // v0.8: null = healthy; otherwise an error code/message from the API
  const [dbIssue, setDbIssue] = useState<string | null>(null)
  // v0.9.2: pagination state — true when the server says there is another page
  const [hasMore, setHasMore] = useState(false)
  const loadingMoreRef = useRef(false)
  const nextCursorRef = useRef<{ cursor: string; id: string } | null>(null)

  const refresh = useCallback(async () => {
    try {
      const page = await fetchDesignsPage()
      const local = getLocalDesigns().map((d) => ({
        id: d.id,
        name: d.name,
        width: d.width,
        height: d.height,
        thumbnail: d.thumbnail,
        source: d.source,
        ownerId: null,
        mine: true,
        claimable: false,
        deletedAt: null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
      const combined = [...local, ...page.designs.filter((p) => !local.some((l) => l.id === p.id))]
      setDesigns(combined)
      setHasMore(page.nextCursor !== null)
      nextCursorRef.current = page.nextCursor
      setDbIssue(null)
    } catch (err) {
      const e = err as ApiError
      setDbIssue(e.code ?? e.message)
      const local = getLocalDesigns().map((d) => ({
        id: d.id,
        name: d.name,
        width: d.width,
        height: d.height,
        thumbnail: d.thumbnail,
        source: d.source,
        ownerId: null,
        mine: true,
        claimable: false,
        deletedAt: null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
      setDesigns(local)
      setHasMore(false)
      nextCursorRef.current = null
    } finally {
      setLoading(false)
    }
  }, [])

  /** v0.9.2: append the next page (guard against double-clicks/stale calls). */
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !nextCursorRef.current) return
    loadingMoreRef.current = true
    try {
      const page = await fetchDesignsPage(nextCursorRef.current)
      nextCursorRef.current = page.nextCursor
      setHasMore(page.nextCursor !== null)
      setDesigns((prev) => (prev ? [...prev, ...page.designs] : page.designs))
    } catch {
      /* transient — the user can click Load more again */
    } finally {
      loadingMoreRef.current = false
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => refresh())
  }, [refresh])

  return { designs, loading, refresh, dbIssue, clearDbIssue: () => setDbIssue(null), hasMore, loadMore }
}

export async function createDesign(opts: {
  name: string
  width: number
  height: number
  pages: PageData[]
  source?: string
}): Promise<DesignRecord> {
  try {
    const res = await fetch('/api/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: opts.name,
        width: opts.width,
        height: opts.height,
        pages: opts.pages,
        source: opts.source ?? 'blank',
      }),
    })
    if (!res.ok) {
      const err = await readApiError(res)
      if (
        err.code === 'DB_NOT_MIGRATED' ||
        err.code === 'DB_UNREACHABLE' ||
        err.code === 'DB_TIMEOUT' ||
        res.status >= 500
      ) {
        console.warn('Database unavailable; creating design in local mode:', err.message)
        return createLocalDesign(opts)
      }
      throw new ApiError(err.message, err.code, err.fix)
    }
    return toRecord(await res.json())
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.code !== 'DB_NOT_MIGRATED' &&
      err.code !== 'DB_UNREACHABLE' &&
      err.code !== 'DB_TIMEOUT'
    ) {
      throw err
    }
    console.warn('Network or DB exception creating design; fallback to local mode:', err)
    return createLocalDesign(opts)
  }
}

export async function fetchDesign(id: string): Promise<DesignRecord> {
  if (id.startsWith('local-')) {
    const local = getLocalDesigns().find((d) => d.id === id)
    if (local) return local
  }
  try {
    const res = await fetch(`/api/designs/${id}`, { cache: 'no-store' })
    if (!res.ok) {
      const local = getLocalDesigns().find((d) => d.id === id)
      if (local) return local
      const err = await readApiError(res)
      throw new ApiError(err.message, err.code, err.fix)
    }
    return toRecord(await res.json())
  } catch (err) {
    const local = getLocalDesigns().find((d) => d.id === id)
    if (local) return local
    throw err
  }
}

export async function duplicateDesign(id: string): Promise<DesignRecord> {
  const source = await fetchDesign(id)
  return createDesign({
    name: `${source.name} copy`,
    width: source.width,
    height: source.height,
    pages: source.pages,
    source: `duplicate:${id}`,
  })
}

export async function deleteDesign(id: string): Promise<void> {
  if (id.startsWith('local-')) {
    const local = getLocalDesigns().filter((d) => d.id !== id)
    saveLocalDesigns(local)
    return
  }
  const res = await fetch(`/api/designs/${id}`, { method: 'DELETE' }) // soft delete -> Trash
  if (!res.ok) throw new Error('Failed to delete design')
  // v0.10: drop any locally persisted offline state for this design
  void purgeOfflineState(id)
}
  // v0.10: drop any locally persisted offline state for this design
  void purgeOfflineState(id)
}

/** v0.10: remove the IndexedDB offline doc + op queue for a design. */
async function purgeOfflineState(id: string): Promise<void> {
  try {
    const { purge } = await import('@/lib/collab/offline-store')
    await purge(id)
  } catch {
    /* IndexedDB unavailable — nothing persisted */
  }
  try {
    localStorage.removeItem(`canvix-seq-${id}`)
  } catch {
    /* storage unavailable */
  }
}

/** v0.4: trash list / restore / permanent delete */
export async function listTrash(): Promise<DesignMeta[]> {
  const res = await fetch('/api/designs?trash=1', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to list trash')
  // v0.9.2: same paginated envelope as the main list — the trash dialog
  // only needs the most recent page.
  const body = (await res.json()) as Partial<DesignsPage>
  return body.designs ?? []
}

export async function restoreDesign(id: string): Promise<void> {
  const res = await fetch(`/api/designs/${id}/restore`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to restore design')
}

export async function deleteDesignForever(id: string): Promise<void> {
  const res = await fetch(`/api/designs/${id}?permanent=1`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete design permanently')
  void purgeOfflineState(id)
}

export async function renameDesign(id: string, name: string): Promise<void> {
  if (id.startsWith('local-')) {
    const local = getLocalDesigns().map((d) => (d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d))
    saveLocalDesigns(local)
    return
  }
  const res = await fetch(`/api/designs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to rename design')
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  return new Date(iso).toLocaleDateString()
}
