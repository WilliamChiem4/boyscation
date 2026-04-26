import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { PackingItem } from '@/lib/types'

export function usePackingList(tripId: string | undefined): PackingItem[] | undefined {
  return useLiveQuery(async () => {
    if (!tripId) return []
    const list = await db.packingItems.where('tripId').equals(tripId).toArray()
    return list.sort((a, b) => a.order - b.order)
  }, [tripId])
}
