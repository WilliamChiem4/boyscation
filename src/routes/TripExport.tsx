import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTrip } from '@/hooks/useTrip'
import { useObjectURL } from '@/hooks/useObjectURL'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { groupActivitiesByDay, formatDateRange, formatTime } from '@/lib/dates'
import { CATEGORY_EMOJI, TRANSPORT_EMOJI, TRANSPORT_LABELS, formatMoney } from '@/lib/budget'
import { avatarSay } from '@/lib/avatarBus'
import { ArrowLeft, Printer, Clock, MapPin, ExternalLink, ArrowRight } from 'lucide-react'
import type { Activity } from '@/lib/types'

export default function TripExport() {
  const { id } = useParams<{ id: string }>()
  const data = useTrip(id)

  const trip = data?.trip
  const activities = data?.activities ?? []

  const { days, unscheduled } = useMemo(
    () =>
      trip
        ? groupActivitiesByDay(trip.startDate, trip.endDate, activities)
        : { days: [], unscheduled: [] },
    [trip?.startDate, trip?.endDate, activities],
  )

  const totalCost = activities.reduce((s, a) => s + (a.cost || 0), 0)
  const currency = trip?.currency || 'USD'

  useEffect(() => {
    avatarSay('Tell the whole crew! 🗺️')
  }, [])

  if (data === undefined) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!trip) {
    return (
      <div className="p-8 space-y-4">
        <p>Trip not found.</p>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl py-6 px-6 print:py-0 print:px-0 print:max-w-none">
      <div className="no-print flex items-center justify-between gap-2 mb-6 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/trips/${trip.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to trip
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <header className="mb-8 border-b pb-4">
        <h1 className="font-heading text-3xl font-extrabold text-brand-charcoal">
          {trip.name || 'Untitled boyscation'}
        </h1>
        <div className="text-sm text-muted-foreground mt-2 space-y-0.5">
          {trip.destination && <div>{trip.destination}</div>}
          <div>{formatDateRange(trip.startDate, trip.endDate)}</div>
          {trip.travelers.length > 0 && <div>Travelers: {trip.travelers.join(', ')}</div>}
        </div>
        {trip.notes && (
          <p className="mt-3 text-sm whitespace-pre-wrap">{trip.notes}</p>
        )}
      </header>

      {unscheduled.length > 0 && (
        <section className="print-break-inside-avoid mb-6">
          <h2 className="font-heading text-lg font-bold mb-2">In limbo</h2>
          <div className="space-y-2">
            {unscheduled.map((a) => (
              <PrintActivity key={a.id} activity={a} currency={currency} />
            ))}
          </div>
        </section>
      )}

      <div className="space-y-6">
        {days.map((day) => {
          const dayTotal = day.activities.reduce((s, a) => s + (a.cost || 0), 0)
          return (
            <section key={day.date} className="print-break-inside-avoid">
              <div className="flex items-baseline justify-between gap-2 border-b pb-1 mb-2">
                <h2 className="font-heading text-lg font-bold">
                  Day {day.dayNumber} · {day.label}
                </h2>
                {dayTotal > 0 && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatMoney(dayTotal, currency)}
                  </span>
                )}
              </div>
              {day.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No activities planned.</p>
              ) : (
                <div className="space-y-2">
                  {day.activities.map((a) => (
                    <PrintActivity key={a.id} activity={a} currency={currency} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {totalCost > 0 && (
        <footer className="mt-8 pt-4 border-t text-sm">
          <strong>Total estimated cost:</strong> {formatMoney(totalCost, currency)}
        </footer>
      )}
    </div>
  )
}

function PrintActivity({ activity, currency }: { activity: Activity; currency: string }) {
  const url = useObjectURL(activity.imageId)
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {activity.time && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatTime(activity.time)}
              {activity.arriveTime && (
                <>
                  <ArrowRight className="h-3 w-3" />
                  {formatTime(activity.arriveTime)}
                </>
              )}
            </span>
          )}
          <StatusBadge status={activity.status} />
          {activity.category && activity.category !== 'other' && (
            <span className="text-xs" aria-hidden>
              {CATEGORY_EMOJI[activity.category]}
            </span>
          )}
        </div>
        {activity.category === 'transport' && activity.transportMode && (
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium">
            <span aria-hidden>{TRANSPORT_EMOJI[activity.transportMode]}</span>
            <span>
              {activity.carrier || TRANSPORT_LABELS[activity.transportMode]}
              {activity.flightNumber ? ` ${activity.flightNumber}` : ''}
            </span>
            {activity.confirmationCode && <span>· {activity.confirmationCode}</span>}
          </div>
        )}
        <div className="font-medium">
          {activity.title || <span className="italic text-muted-foreground">Untitled</span>}
        </div>
        {(activity.location || activity.arriveLocation) && (
          <div className="text-sm text-muted-foreground inline-flex items-center gap-1 flex-wrap">
            <MapPin className="h-3 w-3" />
            {activity.location}
            {activity.category === 'transport' && activity.arriveLocation && (
              <>
                <ArrowRight className="h-3 w-3" />
                {activity.arriveLocation}
              </>
            )}
            {activity.mapLink && (
              <a
                href={activity.mapLink}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline inline-flex items-center no-print"
              >
                <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>
            )}
          </div>
        )}
        {activity.cost > 0 && (
          <div className="text-sm text-muted-foreground">
            {formatMoney(activity.cost, currency)}
          </div>
        )}
        {activity.notes && (
          <p className="text-sm mt-1 whitespace-pre-wrap">{activity.notes}</p>
        )}
      </div>
      {url && (
        <img src={url} alt="" className="h-20 w-20 object-cover rounded border shrink-0" />
      )}
    </div>
  )
}
