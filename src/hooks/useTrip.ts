import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Activity, Trip } from '@/lib/types'

export type TripWithActivities = {
  trip: Trip | undefined
  activities: Activity[]
}

export function useTrip(id: string | undefined): TripWithActivities | undefined {
  return useLiveQuery(async () => {
    if (!id) return { trip: undefined, activities: [] }
    const trip = await db.trips.get(id)
    const activities = await db.activities.where('tripId').equals(id).toArray()
    return { trip, activities }
  }, [id])
}
