import { nanoid } from 'nanoid'
import { db } from './db'
import { exportImagesForTrip, importImages } from './images'
import { TripExportSchema, type TripExport } from './types'

export async function exportTripToJSON(tripId: string): Promise<Blob> {
  const trip = await db.trips.get(tripId)
  if (!trip) throw new Error('Trip not found')
  const activities = await db.activities.where('tripId').equals(tripId).toArray()
  const settlements = await db.settlements.where('tripId').equals(tripId).toArray()
  const imageIds = activities.map((a) => a.imageId).filter(Boolean) as string[]
  const images = await exportImagesForTrip(imageIds)

  const payload: TripExport = { version: 1, trip, activities, images, settlements }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export type ImportResult =
  | { ok: true; tripId: string }
  | { ok: false; errors: string[] }

export async function importTripFromJSON(text: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${(e as Error).message}`] }
  }
  const result = TripExportSchema.safeParse(parsed)
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    }
  }

  const data = result.data
  const now = Date.now()
  const imageIdMap = await importImages(data.images)
  const newTripId = nanoid()

  await db.transaction('rw', db.trips, db.activities, db.settlements, async () => {
    await db.trips.put({
      ...data.trip,
      id: newTripId,
      name: `${data.trip.name} (Imported)`,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    const newActivities = data.activities.map((a) => ({
      ...a,
      id: nanoid(),
      tripId: newTripId,
      imageId: a.imageId ? imageIdMap.get(a.imageId) ?? null : null,
    }))
    if (newActivities.length > 0) await db.activities.bulkPut(newActivities)
    const newSettlements = (data.settlements ?? []).map((s) => ({
      ...s,
      id: nanoid(),
      tripId: newTripId,
    }))
    if (newSettlements.length > 0) await db.settlements.bulkPut(newSettlements)
  })

  return { ok: true, tripId: newTripId }
}
