import type { SyncRole } from './types'

const STORAGE_KEY = 'boyscation.syncedTrips'

export type SyncedTripEntry = {
  tripId: string
  name: string
  role: SyncRole
  token: string
  addedAt: number
}

function read(): SyncedTripEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SyncedTripEntry[]
  } catch {
    return []
  }
}

function write(entries: SyncedTripEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function listSyncedTrips(): SyncedTripEntry[] {
  return read()
}

export function rememberSyncedTrip(entry: SyncedTripEntry): void {
  const existing = read().filter((e) => e.tripId !== entry.tripId)
  existing.unshift(entry)
  write(existing)
}

export function forgetSyncedTrip(tripId: string): void {
  write(read().filter((e) => e.tripId !== tripId))
}
