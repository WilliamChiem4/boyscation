import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { pullTrip } from '@/lib/sync'
import { rememberSyncedTrip } from '@/lib/syncedTrips'
import { getGuestName } from '@/lib/guestName'
import { GuestNamePrompt } from '@/components/GuestNamePrompt'
import { db } from '@/lib/db'
import { Loader2 } from 'lucide-react'

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'needs-name'; tripId: string; tripName: string }
  | { kind: 'done'; tripId: string }

export default function SharedTrip() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        setPhase({ kind: 'error', message: 'No token in URL.' })
        return
      }
      try {
        const result = await pullTrip(token)
        if (cancelled) return
        if (!result) {
          setPhase({ kind: 'error', message: 'Link is invalid or has been revoked.' })
          return
        }
        const trip = await db.trips.get(result.tripId)
        if (!trip) {
          setPhase({ kind: 'error', message: 'Trip could not be loaded.' })
          return
        }
        rememberSyncedTrip({
          tripId: trip.id,
          name: trip.name,
          role: result.role,
          token,
          addedAt: Date.now(),
        })
        const existingName = getGuestName(trip.id)
        if (!existingName) {
          setPhase({ kind: 'needs-name', tripId: trip.id, tripName: trip.name })
        } else {
          setPhase({ kind: 'done', tripId: trip.id })
        }
      } catch (e) {
        if (cancelled) return
        setPhase({ kind: 'error', message: (e as Error).message })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (phase.kind === 'done') {
      navigate(`/trips/${phase.tripId}`, { replace: true })
    }
  }, [phase, navigate])

  if (phase.kind === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (phase.kind === 'error') {
    return (
      <div className="mx-auto max-w-md p-8 text-center space-y-2">
        <h1 className="font-heading text-xl">Couldn't open this link</h1>
        <p className="text-sm text-muted-foreground">{phase.message}</p>
      </div>
    )
  }

  if (phase.kind === 'needs-name') {
    return (
      <GuestNamePrompt
        tripId={phase.tripId}
        tripName={phase.tripName}
        onDone={() => setPhase({ kind: 'done', tripId: phase.tripId })}
      />
    )
  }

  return null
}
