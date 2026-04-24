import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Trip } from '@/lib/types'

export function useTrips(): Trip[] | undefined {
  return useLiveQuery(async () => {
    const trips = await db.trips.toArray()
    return trips.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [])
}
