import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Settlement } from '@/lib/types'

export function useSettlements(tripId: string | undefined): Settlement[] | undefined {
  return useLiveQuery(async () => {
    if (!tripId) return []
    const list = await db.settlements.where('tripId').equals(tripId).toArray()
    return list.sort((a, b) => a.createdAt - b.createdAt)
  }, [tripId])
}
