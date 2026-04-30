import { nanoid } from 'nanoid'
import { db } from './db'
import type { Activity, PackingItem, Settlement, Trip } from './types'
import { todayIso } from './dates'
import { deleteImage } from './images'
import { getGuestName } from './guestName'
import {
  pushActivityDelete,
  pushActivityUpsert,
  pushSettlementDelete,
  pushSettlementUpsert,
  pushTripDelete,
  pushTripPatch,
} from './sync'

type PendingTripPatch = { kind: 'trip'; id: string; patch: Partial<Trip> }
type PendingActivityPatch = { kind: 'activity'; id: string; patch: Partial<Activity> }
type PendingPackingPatch = { kind: 'packing'; id: string; patch: Partial<PackingItem> }
type Pending = PendingTripPatch | PendingActivityPatch | PendingPackingPatch

const TEXT_DEBOUNCE_MS = 400

const pending = new Map<string, Pending>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flush()
  }, TEXT_DEBOUNCE_MS)
}

// Best-effort remote sync: never blocks the user; logs errors.
function syncWarn(e: unknown): void {
  console.warn('[sync] remote push failed:', e)
}

async function remotePushTripPatch(trip: Trip, patch: Partial<Trip>): Promise<void> {
  if (!trip.syncToken || !trip.syncedRole) return
  if (trip.syncedRole === 'viewer') return
  try {
    await pushTripPatch(trip.id, patch, trip.syncToken, getGuestName(trip.id))
  } catch (e) {
    syncWarn(e)
  }
}

async function remotePushActivityUpsert(activity: Activity): Promise<void> {
  const trip = await db.trips.get(activity.tripId)
  if (!trip || !trip.syncToken || !trip.syncedRole) return
  if (trip.syncedRole === 'viewer') return
  try {
    await pushActivityUpsert(activity, trip.syncToken, getGuestName(trip.id))
  } catch (e) {
    syncWarn(e)
  }
}

async function remotePushActivityDelete(tripId: string, activityId: string): Promise<void> {
  const trip = await db.trips.get(tripId)
  if (!trip || !trip.syncToken || !trip.syncedRole) return
  if (trip.syncedRole === 'viewer') return
  try {
    await pushActivityDelete(activityId, trip.syncToken, getGuestName(trip.id))
  } catch (e) {
    syncWarn(e)
  }
}

async function remotePushSettlementUpsert(settlement: Settlement): Promise<void> {
  const trip = await db.trips.get(settlement.tripId)
  if (!trip || !trip.syncToken || !trip.syncedRole) return
  if (trip.syncedRole === 'viewer') return
  try {
    await pushSettlementUpsert(settlement, trip.syncToken, getGuestName(trip.id))
  } catch (e) {
    syncWarn(e)
  }
}

async function remotePushSettlementDelete(tripId: string, settlementId: string): Promise<void> {
  const trip = await db.trips.get(tripId)
  if (!trip || !trip.syncToken || !trip.syncedRole) return
  if (trip.syncedRole === 'viewer') return
  try {
    await pushSettlementDelete(settlementId, trip.syncToken, getGuestName(trip.id))
  } catch (e) {
    syncWarn(e)
  }
}

export async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (pending.size === 0) return
  const snapshot = Array.from(pending.values())
  pending.clear()
  const now = Date.now()

  await db.transaction('rw', db.trips, db.activities, db.packingItems, async () => {
    for (const item of snapshot) {
      if (item.kind === 'trip') {
        await db.trips.update(item.id, { ...item.patch, updatedAt: now })
      } else if (item.kind === 'activity') {
        await db.activities.update(item.id, { ...item.patch, updatedAt: now })
        if ('tripId' in item.patch || 'date' in item.patch) {
          const a = await db.activities.get(item.id)
          if (a) await db.trips.update(a.tripId, { updatedAt: now })
        }
      } else {
        await db.packingItems.update(item.id, item.patch)
        const p = await db.packingItems.get(item.id)
        if (p) await db.trips.update(p.tripId, { updatedAt: now })
      }
    }
  })

  // Remote push (fire-and-forget, outside the Dexie tx). Packing items are not synced.
  for (const item of snapshot) {
    if (item.kind === 'trip') {
      const trip = await db.trips.get(item.id)
      if (trip) void remotePushTripPatch(trip, { ...item.patch, updatedAt: now })
    } else if (item.kind === 'activity') {
      const activity = await db.activities.get(item.id)
      if (activity) void remotePushActivityUpsert(activity)
    }
  }
}

export function queueTripPatch(id: string, patch: Partial<Trip>, immediate = false): void {
  const existing = pending.get(`trip:${id}`)
  const merged: PendingTripPatch = {
    kind: 'trip',
    id,
    patch: existing && existing.kind === 'trip' ? { ...existing.patch, ...patch } : patch,
  }
  pending.set(`trip:${id}`, merged)
  if (immediate) void flush()
  else scheduleFlush()
}

export function queueActivityPatch(id: string, patch: Partial<Activity>, immediate = false): void {
  const existing = pending.get(`activity:${id}`)
  const merged: PendingActivityPatch = {
    kind: 'activity',
    id,
    patch: existing && existing.kind === 'activity' ? { ...existing.patch, ...patch } : patch,
  }
  pending.set(`activity:${id}`, merged)
  if (immediate) void flush()
  else scheduleFlush()
}

export function queuePackingPatch(id: string, patch: Partial<PackingItem>, immediate = false): void {
  const existing = pending.get(`packing:${id}`)
  const merged: PendingPackingPatch = {
    kind: 'packing',
    id,
    patch: existing && existing.kind === 'packing' ? { ...existing.patch, ...patch } : patch,
  }
  pending.set(`packing:${id}`, merged)
  if (immediate) void flush()
  else scheduleFlush()
}

export async function createTrip(input: {
  name: string
  destination?: string
  startDate: string
  endDate: string
  travelers?: string[]
  notes?: string
  isTemplate?: boolean
}): Promise<string> {
  const now = Date.now()
  const trip: Trip = {
    id: nanoid(),
    name: input.name,
    destination: input.destination ?? '',
    startDate: input.startDate,
    endDate: input.endDate,
    travelers: input.travelers ?? [],
    notes: input.notes ?? '',
    isTemplate: input.isTemplate ?? false,
    archivedAt: null,
    currency: 'USD',
    createdAt: now,
    updatedAt: now,
    syncedRole: null,
    syncToken: null,
    lastSyncedAt: null,
    lastEditedBy: null,
  }
  await db.trips.put(trip)
  return trip.id
}

export async function deleteTrip(id: string): Promise<void> {
  const trip = await db.trips.get(id)
  await db.transaction(
    'rw',
    [db.trips, db.activities, db.images, db.settlements, db.packingItems, db.ideas],
    async () => {
      const activities = await db.activities.where('tripId').equals(id).toArray()
      const imageIds = activities.map((a) => a.imageId).filter(Boolean) as string[]
      for (const imgId of imageIds) await deleteImage(imgId)
      await db.activities.where('tripId').equals(id).delete()
      await db.settlements.where('tripId').equals(id).delete()
      await db.packingItems.where('tripId').equals(id).delete()
      await db.ideas.where('tripId').equals(id).delete()
      await db.trips.delete(id)
    },
  )
  if (trip?.syncedRole === 'admin' && trip.syncToken) {
    try {
      await pushTripDelete(id, trip.syncToken)
    } catch (e) {
      syncWarn(e)
    }
  }
}

export function archiveTrip(id: string): void {
  queueTripPatch(id, { archivedAt: Date.now() }, true)
}

export function unarchiveTrip(id: string): void {
  queueTripPatch(id, { archivedAt: null }, true)
}

export function setTripTemplate(id: string, isTemplate: boolean): void {
  queueTripPatch(id, { isTemplate }, true)
}

export async function useTemplate(id: string): Promise<string> {
  const original = await db.trips.get(id)
  if (!original) throw new Error('Template not found')
  const activities = await db.activities.where('tripId').equals(id).toArray()
  const packingItems = await db.packingItems.where('tripId').equals(id).toArray()

  const now = Date.now()
  const newId = nanoid()
  const cleanName = original.name.replace(/\s*\(Template\)\s*$/i, '').trim() || 'Untitled boyscation'
  const copy: Trip = {
    ...original,
    id: newId,
    name: cleanName,
    isTemplate: false,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    syncedRole: null,
    syncToken: null,
    lastSyncedAt: null,
    lastEditedBy: null,
  }
  await db.trips.put(copy)

  if (activities.length > 0) {
    const cloned: Activity[] = activities.map((a) => ({
      ...a,
      id: nanoid(),
      tripId: newId,
      updatedAt: now,
      deletedAt: null,
      lastEditedBy: null,
    }))
    await db.activities.bulkPut(cloned)
  }
  if (packingItems.length > 0) {
    const clonedPacking: PackingItem[] = packingItems.map((p) => ({
      ...p,
      id: nanoid(),
      tripId: newId,
      checked: false,
      createdAt: now,
    }))
    await db.packingItems.bulkPut(clonedPacking)
  }
  return newId
}

export async function addSettlement(
  tripId: string,
  input: { from: string; to: string; amount: number; note?: string },
): Promise<string> {
  const settlement: Settlement = {
    id: nanoid(),
    tripId,
    from: input.from,
    to: input.to,
    amount: input.amount,
    note: input.note ?? '',
    createdAt: Date.now(),
    deletedAt: null,
    lastEditedBy: null,
  }
  await db.settlements.put(settlement)
  await db.trips.update(tripId, { updatedAt: Date.now() })
  void remotePushSettlementUpsert(settlement)
  return settlement.id
}

export async function deleteSettlement(id: string): Promise<void> {
  const s = await db.settlements.get(id)
  if (!s) return
  await db.settlements.delete(id)
  await db.trips.update(s.tripId, { updatedAt: Date.now() })
  void remotePushSettlementDelete(s.tripId, id)
}

export async function duplicateTrip(id: string, opts?: { asTemplate?: boolean }): Promise<string> {
  const original = await db.trips.get(id)
  if (!original) throw new Error('Trip not found')
  const activities = await db.activities.where('tripId').equals(id).toArray()
  const packingItems = await db.packingItems.where('tripId').equals(id).toArray()

  const now = Date.now()
  const newId = nanoid()
  const copy: Trip = {
    ...original,
    id: newId,
    name: opts?.asTemplate ? `${original.name} (Template)` : `${original.name} (Copy)`,
    isTemplate: opts?.asTemplate ?? original.isTemplate,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    syncedRole: null,
    syncToken: null,
    lastSyncedAt: null,
    lastEditedBy: null,
  }
  await db.trips.put(copy)

  if (activities.length > 0) {
    const cloned: Activity[] = activities.map((a) => ({
      ...a,
      id: nanoid(),
      tripId: newId,
      updatedAt: now,
      deletedAt: null,
      lastEditedBy: null,
    }))
    await db.activities.bulkPut(cloned)
  }
  if (packingItems.length > 0) {
    const clonedPacking: PackingItem[] = packingItems.map((p) => ({
      ...p,
      id: nanoid(),
      tripId: newId,
      checked: opts?.asTemplate ? false : p.checked,
      createdAt: now,
    }))
    await db.packingItems.bulkPut(clonedPacking)
  }
  return newId
}

export async function addActivity(
  tripId: string,
  date: string,
  partial?: Partial<Activity>,
): Promise<string> {
  const existing = await db.activities
    .where('[tripId+date]')
    .equals([tripId, date])
    .toArray()
  const maxOrder = existing.reduce((m, a) => Math.max(m, a.order), -1)
  const now = Date.now()
  const activity: Activity = {
    id: nanoid(),
    tripId,
    date,
    order: maxOrder + 1,
    time: '',
    title: '',
    location: '',
    mapLink: '',
    cost: 0,
    status: 'idea',
    notes: '',
    imageId: null,
    category: 'other',
    paidBy: null,
    splitAmong: [],
    splitMode: 'equal',
    transportMode: null,
    carrier: '',
    flightNumber: '',
    arriveTime: '',
    arriveLocation: '',
    confirmationCode: '',
    updatedAt: now,
    deletedAt: null,
    lastEditedBy: null,
    ...partial,
  }
  await db.activities.put(activity)
  await db.trips.update(tripId, { updatedAt: now })
  void remotePushActivityUpsert(activity)
  return activity.id
}

export async function deleteActivity(id: string): Promise<void> {
  const a = await db.activities.get(id)
  if (!a) return
  if (a.imageId) await deleteImage(a.imageId)
  await db.activities.delete(id)
  await db.trips.update(a.tripId, { updatedAt: Date.now() })
  void remotePushActivityDelete(a.tripId, id)
}

export async function reorderActivities(updates: Array<{ id: string; date: string; order: number }>): Promise<void> {
  if (updates.length === 0) return
  const now = Date.now()
  const touched: Activity[] = []
  await db.transaction('rw', db.activities, db.trips, async () => {
    const tripIds = new Set<string>()
    for (const u of updates) {
      const existing = await db.activities.get(u.id)
      if (!existing) continue
      tripIds.add(existing.tripId)
      await db.activities.update(u.id, { date: u.date, order: u.order, updatedAt: now })
      const updated = await db.activities.get(u.id)
      if (updated) touched.push(updated)
    }
    for (const tid of tripIds) await db.trips.update(tid, { updatedAt: now })
  })
  for (const a of touched) void remotePushActivityUpsert(a)
}

export async function setActivityImage(activityId: string, imageId: string | null): Promise<void> {
  const a = await db.activities.get(activityId)
  if (!a) return
  if (a.imageId && a.imageId !== imageId) await deleteImage(a.imageId)
  const now = Date.now()
  await db.activities.update(activityId, { imageId, updatedAt: now })
  await db.trips.update(a.tripId, { updatedAt: now })
  const updated = await db.activities.get(activityId)
  if (updated) void remotePushActivityUpsert(updated)
}

export async function duplicateActivity(id: string): Promise<string | null> {
  const original = await db.activities.get(id)
  if (!original) return null
  const sameDay = await db.activities
    .where('[tripId+date]')
    .equals([original.tripId, original.date])
    .toArray()
  const sorted = sameDay.sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((a) => a.id === original.id)
  const insertAt = idx >= 0 ? idx + 1 : sorted.length

  await db.transaction('rw', db.activities, db.trips, async () => {
    const tail = sorted.slice(insertAt)
    for (const t of tail) {
      await db.activities.update(t.id, { order: t.order + 1 })
    }
    await db.trips.update(original.tripId, { updatedAt: Date.now() })
  })

  const newId = nanoid()
  const copy: Activity = {
    ...original,
    id: newId,
    title: original.title ? `${original.title} (copy)` : '',
    imageId: null,
    order: original.order + 1,
  }
  await db.activities.put(copy)
  await db.trips.update(original.tripId, { updatedAt: Date.now() })
  return newId
}

export async function addPackingItem(
  tripId: string,
  input: { name: string; qty?: number; assignee?: string | null },
): Promise<string> {
  const existing = await db.packingItems.where('tripId').equals(tripId).toArray()
  const maxOrder = existing.reduce((m, p) => Math.max(m, p.order), -1)
  const item: PackingItem = {
    id: nanoid(),
    tripId,
    name: input.name,
    qty: Math.max(1, Math.floor(input.qty ?? 1)),
    assignee: input.assignee ?? null,
    checked: false,
    order: maxOrder + 1,
    createdAt: Date.now(),
  }
  await db.packingItems.put(item)
  await db.trips.update(tripId, { updatedAt: Date.now() })
  return item.id
}

export async function deletePackingItem(id: string): Promise<void> {
  const item = await db.packingItems.get(id)
  if (!item) return
  await db.packingItems.delete(id)
  await db.trips.update(item.tripId, { updatedAt: Date.now() })
}

export async function togglePackingItem(id: string, checked: boolean): Promise<void> {
  const item = await db.packingItems.get(id)
  if (!item) return
  await db.packingItems.update(id, { checked })
  await db.trips.update(item.tripId, { updatedAt: Date.now() })
}

export async function clearPackedItems(tripId: string): Promise<void> {
  await db.transaction('rw', db.packingItems, db.trips, async () => {
    await db.packingItems
      .where('tripId')
      .equals(tripId)
      .modify({ checked: false })
    await db.trips.update(tripId, { updatedAt: Date.now() })
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    void flush()
  })
}

export { todayIso }
