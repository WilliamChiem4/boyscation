import type { Trip, SyncRole } from '@/lib/types'
import { getGuestName } from '@/lib/guestName'

export type SyncContext = {
  isSynced: boolean
  role: SyncRole
  canEdit: boolean
  canManage: boolean
  token: string | null
  guestName: string | null
}

export function getSyncContext(trip: Trip | undefined): SyncContext {
  if (!trip || trip.syncedRole === null) {
    return {
      isSynced: false,
      role: 'admin',
      canEdit: true,
      canManage: true,
      token: null,
      guestName: null,
    }
  }
  const role = trip.syncedRole
  const canEdit = role === 'admin' || role === 'editor'
  const canManage = role === 'admin'
  return {
    isSynced: true,
    role,
    canEdit,
    canManage,
    token: trip.syncToken,
    guestName: getGuestName(trip.id),
  }
}
