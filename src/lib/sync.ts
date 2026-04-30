import { nanoid } from 'nanoid'
import { db } from './db'
import { blobToDataUrl, dataUrlToBlob } from './images'
import { requireSupabase, setAccessToken } from './supabase'
import type { Activity, Idea, Settlement, SyncRole, Trip } from './types'

type ResolvedToken = { tripId: string; role: SyncRole }

// ==========================================================================
// Trip <-> Supabase row translation (camelCase <-> snake_case)
// ==========================================================================

function tripToRow(t: Trip): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    destination: t.destination,
    start_date: t.startDate,
    end_date: t.endDate,
    travelers: t.travelers,
    notes: t.notes,
    is_template: t.isTemplate,
    archived_at: t.archivedAt,
    currency: t.currency,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    last_edited_by: t.lastEditedBy,
  }
}

function rowToTrip(row: Record<string, unknown>, role: SyncRole, token: string): Trip {
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    destination: (row.destination as string) ?? '',
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    travelers: (row.travelers as string[]) ?? [],
    notes: (row.notes as string) ?? '',
    isTemplate: (row.is_template as boolean) ?? false,
    archivedAt: (row.archived_at as number | null) ?? null,
    currency: (row.currency as string) ?? 'USD',
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    syncedRole: role,
    syncToken: token,
    lastSyncedAt: Date.now(),
    lastEditedBy: (row.last_edited_by as string | null) ?? null,
  }
}

function activityToRow(a: Activity, lastEditedBy: string | null = null): Record<string, unknown> {
  return {
    id: a.id,
    trip_id: a.tripId,
    date: a.date,
    order: a.order,
    time: a.time,
    title: a.title,
    location: a.location,
    map_link: a.mapLink,
    cost: a.cost,
    status: a.status,
    notes: a.notes,
    image_id: a.imageId,
    category: a.category,
    paid_by: a.paidBy,
    split_among: a.splitAmong,
    split_mode: a.splitMode,
    transport_mode: a.transportMode,
    carrier: a.carrier,
    flight_number: a.flightNumber,
    arrive_time: a.arriveTime,
    arrive_location: a.arriveLocation,
    confirmation_code: a.confirmationCode,
    updated_at: a.updatedAt,
    deleted_at: a.deletedAt,
    last_edited_by: lastEditedBy ?? a.lastEditedBy,
  }
}

function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    date: row.date as string,
    order: Number(row.order),
    time: (row.time as string) ?? '',
    title: (row.title as string) ?? '',
    location: (row.location as string) ?? '',
    mapLink: (row.map_link as string) ?? '',
    cost: Number(row.cost ?? 0),
    status: (row.status as Activity['status']) ?? 'idea',
    notes: (row.notes as string) ?? '',
    imageId: (row.image_id as string | null) ?? null,
    category: (row.category as Activity['category']) ?? 'other',
    paidBy: (row.paid_by as string | null) ?? null,
    splitAmong: (row.split_among as string[]) ?? [],
    splitMode: (row.split_mode as Activity['splitMode']) ?? 'equal',
    transportMode: (row.transport_mode as Activity['transportMode']) ?? null,
    carrier: (row.carrier as string) ?? '',
    flightNumber: (row.flight_number as string) ?? '',
    arriveTime: (row.arrive_time as string) ?? '',
    arriveLocation: (row.arrive_location as string) ?? '',
    confirmationCode: (row.confirmation_code as string) ?? '',
    updatedAt: Number(row.updated_at ?? 0),
    deletedAt: (row.deleted_at as number | null) ?? null,
    lastEditedBy: (row.last_edited_by as string | null) ?? null,
  }
}

function settlementToRow(s: Settlement, lastEditedBy: string | null = null): Record<string, unknown> {
  return {
    id: s.id,
    trip_id: s.tripId,
    from_name: s.from,
    to_name: s.to,
    amount: s.amount,
    note: s.note,
    created_at: s.createdAt,
    deleted_at: s.deletedAt,
    last_edited_by: lastEditedBy ?? s.lastEditedBy,
  }
}

function rowToSettlement(row: Record<string, unknown>): Settlement {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    from: (row.from_name as string) ?? '',
    to: (row.to_name as string) ?? '',
    amount: Number(row.amount ?? 0),
    note: (row.note as string) ?? '',
    createdAt: Number(row.created_at),
    deletedAt: (row.deleted_at as number | null) ?? null,
    lastEditedBy: (row.last_edited_by as string | null) ?? null,
  }
}

function ideaToRow(i: Idea): Record<string, unknown> {
  return {
    id: i.id,
    trip_id: i.tripId,
    author_name: i.authorName,
    title: i.title,
    notes: i.notes,
    suggested_date: i.suggestedDate,
    status: i.status,
    activity_id: i.activityId,
    created_at: i.createdAt,
  }
}

function rowToIdea(row: Record<string, unknown>): Idea {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    authorName: (row.author_name as string) ?? '',
    title: (row.title as string) ?? '',
    notes: (row.notes as string) ?? '',
    suggestedDate: (row.suggested_date as string | null) ?? null,
    status: (row.status as Idea['status']) ?? 'pending',
    activityId: (row.activity_id as string | null) ?? null,
    createdAt: Number(row.created_at),
  }
}

// ==========================================================================
// Token resolution
// ==========================================================================

export async function resolveToken(token: string): Promise<ResolvedToken | null> {
  setAccessToken(token)
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('resolve_current_token')
  if (error) throw error
  const rows = (data as Array<{ trip_id: string; role: SyncRole }> | null) ?? []
  if (rows.length === 0) return null
  return { tripId: rows[0].trip_id, role: rows[0].role }
}

// ==========================================================================
// Image upload / download
// ==========================================================================

const IMAGES_BUCKET = 'trip-images'

async function uploadImageIfNeeded(imageId: string): Promise<void> {
  const record = await db.images.get(imageId)
  if (!record) return
  if (record.remoteKey) return // already uploaded
  const supabase = requireSupabase()
  const path = `${imageId}`
  const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, record.blob, {
    contentType: record.mimeType,
    upsert: true,
  })
  if (error) throw error
  await db.images.put({ ...record, remoteKey: path })
}

async function downloadImageIfNeeded(imageId: string): Promise<void> {
  const existing = await db.images.get(imageId)
  if (existing) return
  const supabase = requireSupabase()
  const { data, error } = await supabase.storage.from(IMAGES_BUCKET).download(imageId)
  if (error || !data) return
  const mimeType = data.type || 'image/webp'
  await db.images.put({ id: imageId, blob: data, mimeType, remoteKey: imageId })
}

// ==========================================================================
// Provisioning: upload a local trip to Supabase
// ==========================================================================

export type ProvisionResult = {
  tripId: string
  adminToken: string
  editorToken: string
  viewerToken: string
}

export async function provisionTrip(localTripId: string): Promise<ProvisionResult> {
  const trip = await db.trips.get(localTripId)
  if (!trip) throw new Error('Trip not found')
  const activities = await db.activities.where('tripId').equals(localTripId).toArray()
  const settlements = await db.settlements.where('tripId').equals(localTripId).toArray()

  // Bootstrap: no token yet; the RPC is security-definer and doesn't require one.
  setAccessToken(null)
  const supabase = requireSupabase()

  const { data, error } = await supabase.rpc('create_shared_trip', {
    payload: tripToRow(trip),
  })
  if (error) throw error
  const result = data as {
    trip_id: string
    admin_token: string
    editor_token: string
    viewer_token: string
  }

  // Now authenticate as admin so we can insert children
  setAccessToken(result.admin_token)

  if (activities.length > 0) {
    const now = Date.now()
    const rows = activities.map((a) =>
      activityToRow({ ...a, updatedAt: a.updatedAt || now }, trip.lastEditedBy),
    )
    const { error: err } = await requireSupabase().from('activities').insert(rows)
    if (err) throw err
  }

  if (settlements.length > 0) {
    const rows = settlements.map((s) => settlementToRow(s, trip.lastEditedBy))
    const { error: err } = await requireSupabase().from('settlements').insert(rows)
    if (err) throw err
  }

  // Upload images referenced by activities
  const imageIds = [...new Set(activities.map((a) => a.imageId).filter(Boolean))] as string[]
  for (const id of imageIds) await uploadImageIfNeeded(id)

  // Mark local trip as synced (admin)
  await db.trips.update(localTripId, {
    syncedRole: 'admin',
    syncToken: result.admin_token,
    lastSyncedAt: Date.now(),
  })

  return {
    tripId: result.trip_id,
    adminToken: result.admin_token,
    editorToken: result.editor_token,
    viewerToken: result.viewer_token,
  }
}

// ==========================================================================
// Pull: fetch a shared trip into local Dexie
// ==========================================================================

export type PullResult = {
  tripId: string
  role: SyncRole
}

export async function pullTrip(token: string): Promise<PullResult | null> {
  const resolved = await resolveToken(token)
  if (!resolved) return null
  const supabase = requireSupabase()

  const [{ data: tripData, error: tripErr }, { data: actData, error: actErr }, { data: setData, error: setErr }] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', resolved.tripId).single(),
      supabase.from('activities').select('*').eq('trip_id', resolved.tripId).is('deleted_at', null),
      supabase.from('settlements').select('*').eq('trip_id', resolved.tripId).is('deleted_at', null),
    ])
  if (tripErr) throw tripErr
  if (actErr) throw actErr
  if (setErr) throw setErr

  const trip = rowToTrip(tripData as Record<string, unknown>, resolved.role, token)
  const activities = (actData ?? []).map((r) => rowToActivity(r as Record<string, unknown>))
  const settlements = (setData ?? []).map((r) => rowToSettlement(r as Record<string, unknown>))

  await db.transaction('rw', db.trips, db.activities, db.settlements, async () => {
    await db.trips.put(trip)
    // Remove activities/settlements that no longer exist remotely
    await db.activities.where('tripId').equals(trip.id).delete()
    await db.settlements.where('tripId').equals(trip.id).delete()
    if (activities.length > 0) await db.activities.bulkPut(activities)
    if (settlements.length > 0) await db.settlements.bulkPut(settlements)
  })

  // Download referenced images lazily (best-effort; errors ignored)
  for (const a of activities) {
    if (a.imageId) {
      try {
        await downloadImageIfNeeded(a.imageId)
      } catch {
        /* image missing; continue */
      }
    }
  }

  return { tripId: trip.id, role: resolved.role }
}

// ==========================================================================
// Push helpers (used by autosave.ts)
// ==========================================================================

function tripPatchToRow(patch: Partial<Trip>, lastEditedBy: string | null): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if ('name' in patch) row.name = patch.name
  if ('destination' in patch) row.destination = patch.destination
  if ('startDate' in patch) row.start_date = patch.startDate
  if ('endDate' in patch) row.end_date = patch.endDate
  if ('travelers' in patch) row.travelers = patch.travelers
  if ('notes' in patch) row.notes = patch.notes
  if ('isTemplate' in patch) row.is_template = patch.isTemplate
  if ('archivedAt' in patch) row.archived_at = patch.archivedAt
  if ('currency' in patch) row.currency = patch.currency
  if ('updatedAt' in patch) row.updated_at = patch.updatedAt
  if (lastEditedBy !== null) row.last_edited_by = lastEditedBy
  return row
}

export async function pushTripPatch(tripId: string, patch: Partial<Trip>, token: string, lastEditedBy: string | null): Promise<void> {
  setAccessToken(token)
  const row = tripPatchToRow(patch, lastEditedBy)
  if (Object.keys(row).length === 0) return
  const { error } = await requireSupabase().from('trips').update(row).eq('id', tripId)
  if (error) throw error
}

export async function pushActivityUpsert(activity: Activity, token: string, lastEditedBy: string | null): Promise<void> {
  setAccessToken(token)
  if (activity.imageId) {
    try { await uploadImageIfNeeded(activity.imageId) } catch { /* ignore */ }
  }
  const row = activityToRow({ ...activity, updatedAt: Date.now() }, lastEditedBy)
  const { error } = await requireSupabase().from('activities').upsert(row, { onConflict: 'id' })
  if (error) throw error
}

export async function pushActivityDelete(activityId: string, token: string, lastEditedBy: string | null): Promise<void> {
  setAccessToken(token)
  const { error } = await requireSupabase()
    .from('activities')
    .update({ deleted_at: Date.now(), last_edited_by: lastEditedBy, updated_at: Date.now() })
    .eq('id', activityId)
  if (error) throw error
}

export async function pushSettlementUpsert(settlement: Settlement, token: string, lastEditedBy: string | null): Promise<void> {
  setAccessToken(token)
  const row = settlementToRow(settlement, lastEditedBy)
  const { error } = await requireSupabase().from('settlements').upsert(row, { onConflict: 'id' })
  if (error) throw error
}

export async function pushSettlementDelete(settlementId: string, token: string, lastEditedBy: string | null): Promise<void> {
  setAccessToken(token)
  const { error } = await requireSupabase()
    .from('settlements')
    .update({ deleted_at: Date.now(), last_edited_by: lastEditedBy })
    .eq('id', settlementId)
  if (error) throw error
}

export async function pushTripDelete(tripId: string, token: string): Promise<void> {
  setAccessToken(token)
  const { error } = await requireSupabase().from('trips').delete().eq('id', tripId)
  if (error) throw error
}

// ==========================================================================
// Ideas
// ==========================================================================

export async function listIdeas(tripId: string, token: string): Promise<Idea[]> {
  setAccessToken(token)
  const { data, error } = await requireSupabase()
    .from('ideas')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => rowToIdea(r as Record<string, unknown>))
}

export async function submitIdea(
  tripId: string,
  token: string,
  input: { authorName: string; title: string; notes?: string; suggestedDate?: string | null },
): Promise<Idea> {
  setAccessToken(token)
  const idea: Idea = {
    id: nanoid(),
    tripId,
    authorName: input.authorName,
    title: input.title,
    notes: input.notes ?? '',
    suggestedDate: input.suggestedDate ?? null,
    status: 'pending',
    activityId: null,
    createdAt: Date.now(),
  }
  const { error } = await requireSupabase().from('ideas').insert(ideaToRow(idea))
  if (error) throw error
  return idea
}

export async function updateIdeaStatus(
  ideaId: string,
  token: string,
  status: Idea['status'],
  activityId: string | null = null,
): Promise<void> {
  setAccessToken(token)
  const patch: Record<string, unknown> = { status }
  if (activityId !== null) patch.activity_id = activityId
  const { error } = await requireSupabase().from('ideas').update(patch).eq('id', ideaId)
  if (error) throw error
}

// ==========================================================================
// Re-sync helpers
// ==========================================================================

/**
 * Ensure the Supabase client is authenticated for this trip. Call before any
 * push* operation originating from a location (like autosave.flush) that
 * doesn't already have the token in scope.
 */
export async function setTripToken(tripId: string): Promise<string | null> {
  const trip = await db.trips.get(tripId)
  if (!trip || !trip.syncToken) return null
  setAccessToken(trip.syncToken)
  return trip.syncToken
}

// Re-export for convenience
export { blobToDataUrl, dataUrlToBlob }
