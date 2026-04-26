import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTrip } from '@/hooks/useTrip'
import { useSettlements } from '@/hooks/useSettlements'
import { SettlementsLedger } from '@/components/SettlementsLedger'
import { queueTripPatch } from '@/lib/autosave'
import {
  CATEGORY_COLORS,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  formatMoney,
  totalByStatus,
  totalsByCategory,
  totalsByDay,
  tripTotal,
} from '@/lib/budget'
import { CURRENCY_CODES, canConvert, convert } from '@/lib/currency'
import {
  applySettlements,
  computeBalances,
  collectKnownParties,
  minimizeTransfers,
} from '@/lib/settlement'
import { formatDayHeader } from '@/lib/dates'
import type { ActivityCategory } from '@/lib/types'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const SHOW_IN_NONE = '__none__'

export default function TripBudget() {
  const { id } = useParams<{ id: string }>()
  const data = useTrip(id)
  const trip = data?.trip
  const activities = data?.activities ?? []

  const currency = trip?.currency || 'USD'
  const [showIn, setShowIn] = useState<string>(SHOW_IN_NONE)
  const secondary = showIn !== SHOW_IN_NONE && canConvert(currency, showIn) ? showIn : null

  const renderMoney = (amount: number) => {
    const primary = formatMoney(amount, currency)
    if (!secondary) return primary
    const converted = convert(amount, currency, secondary)
    return (
      <>
        {primary}
        <span className="ml-2 text-muted-foreground text-sm font-normal">
          ≈ {formatMoney(converted, secondary)}
        </span>
      </>
    )
  }

  const total = useMemo(() => tripTotal(activities), [activities])
  const bookedTotal = useMemo(() => totalByStatus(activities, 'booked'), [activities])
  const pendingTotal = useMemo(() => totalByStatus(activities, 'pending'), [activities])
  const categoryTotals = useMemo(() => totalsByCategory(activities), [activities])
  const dayTotals = useMemo(() => totalsByDay(activities), [activities])

  const settlements = useSettlements(id) ?? []

  const balances = useMemo(() => {
    const b = computeBalances(activities, trip?.travelers ?? [])
    return applySettlements(b, settlements)
  }, [activities, trip?.travelers, settlements])
  const transfers = useMemo(() => minimizeTransfers(balances), [balances])

  const knownParties = useMemo(() => collectKnownParties(activities), [activities])
  const activeTravelers = trip?.travelers ?? []
  const staleParties = useMemo(
    () => Array.from(knownParties).filter((n) => !activeTravelers.includes(n)),
    [knownParties, activeTravelers],
  )

  const unassignedCount = activities.filter(
    (a) => a.cost > 0 && !a.paidBy,
  ).length
  const unassignedAmount = activities
    .filter((a) => a.cost > 0 && !a.paidBy)
    .reduce((s, a) => s + (a.cost || 0), 0)

  const perTravelerAverage =
    activeTravelers.length > 0 ? total / activeTravelers.length : 0

  if (data === undefined) {
    return <div className="p-8 text-muted-foreground">Loading…</div>
  }
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

  const totalForCategories = Array.from(categoryTotals.values()).reduce((s, v) => s + v, 0)
  const categoryRows = (Object.keys(CATEGORY_LABELS) as ActivityCategory[])
    .map((c) => ({ cat: c, amount: categoryTotals.get(c) ?? 0 }))
    .filter((r) => r.amount > 0)

  const sortedDayTotals = Array.from(dayTotals.entries())
    .filter(([, v]) => v.count > 0 || v.total > 0)
    .sort(([a], [b]) => a.localeCompare(b))

  const nonZeroBalances = Array.from(balances.entries()).filter(
    ([, v]) => Math.abs(v) >= 0.01,
  )
  nonZeroBalances.sort((a, b) => b[1] - a[1])

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4 md:px-8">
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/trips/${trip.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to itinerary
          </Link>
        </Button>
        <div className="inline-flex rounded-md border bg-background overflow-hidden text-sm">
          <Link
            to={`/trips/${trip.id}`}
            className="px-3 py-1.5 hover:bg-accent"
          >
            📋 Itinerary
          </Link>
          <span className="px-3 py-1.5 bg-primary text-primary-foreground border-l">
            💰 Budget
          </span>
          <Link
            to={`/trips/${trip.id}/packing`}
            className="px-3 py-1.5 hover:bg-accent border-l"
          >
            🎒 Packing
          </Link>
        </div>
      </div>

      <header className="mb-8 space-y-4">
        <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-brand-charcoal">
          💰 {trip.name || 'Untitled boyscation'} · Budget
        </h1>
        <div className="grid gap-3 sm:grid-cols-[160px_180px_1fr] items-end">
          <div className="space-y-1.5">
            <Label htmlFor="trip-currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => queueTripPatch(trip.id, { currency: v })}
            >
              <SelectTrigger id="trip-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_CODES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="show-in">Also show in</Label>
            <Select value={showIn} onValueChange={setShowIn}>
              <SelectTrigger id="show-in">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SHOW_IN_NONE}>— off —</SelectItem>
                {CURRENCY_CODES.filter((c) => c !== currency.toUpperCase()).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            {secondary
              ? `Approximate — rates are cached, not live.`
              : 'Pick a secondary currency (e.g. VND) to see conversions alongside totals.'}
          </p>
        </div>
      </header>

      {total === 0 ? (
        <div className="surface p-8 text-center">
          <p className="text-muted-foreground">
            No costs entered yet. Add a cost to any activity to see your budget come alive.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3 mb-8">
            <SummaryCard label="💸 Trip total" value={renderMoney(total)} />
            <SummaryCard
              label="✅ Booked / ⏳ Pending"
              value={
                <span>
                  {formatMoney(bookedTotal, currency)} / {formatMoney(pendingTotal, currency)}
                </span>
              }
            />
            <SummaryCard
              label={`👥 Per traveler (${activeTravelers.length || 0})`}
              value={renderMoney(perTravelerAverage)}
            />
          </section>

          {categoryRows.length > 0 && (
            <section className="mb-8">
              <h2 className="font-heading text-xl font-bold mb-3">🗂️ By category</h2>
              <div className="w-full h-4 rounded-full overflow-hidden flex border">
                {categoryRows.map((r) => (
                  <div
                    key={r.cat}
                    title={`${CATEGORY_LABELS[r.cat]}: ${formatMoney(r.amount, currency)}`}
                    style={{
                      width: `${(r.amount / totalForCategories) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[r.cat],
                    }}
                  />
                ))}
              </div>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                {categoryRows.map((r) => (
                  <li
                    key={r.cat}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm border"
                        style={{ backgroundColor: CATEGORY_COLORS[r.cat] }}
                      />
                      <span>
                        {CATEGORY_EMOJI[r.cat]} {CATEGORY_LABELS[r.cat]}
                      </span>
                    </span>
                    <span className="text-muted-foreground">{renderMoney(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sortedDayTotals.length > 0 && (
            <section className="mb-8">
              <h2 className="font-heading text-xl font-bold mb-3">📅 By day</h2>
              <div className="surface divide-y">
                {sortedDayTotals.map(([date, info]) => (
                  <div
                    key={date}
                    className="flex items-center justify-between px-4 py-2 gap-2 text-sm"
                  >
                    <span className="font-medium text-brand-charcoal">
                      {formatDayHeader(date)}
                    </span>
                    <span className="text-muted-foreground">
                      {info.count} {info.count === 1 ? 'thing' : 'things'}
                    </span>
                    <span className="tabular-nums font-medium">{renderMoney(info.total)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="mb-8">
        <h2 className="font-heading text-xl font-bold mb-3">🤝 Who owes whom</h2>

        {unassignedCount > 0 && (
          <div className="mb-4 rounded-md border border-brand-sunset/40 bg-brand-sunset/10 px-4 py-2 text-sm text-brand-charcoal">
            ⚠️ {unassignedCount} {unassignedCount === 1 ? 'activity has' : 'activities have'} no
            payer — {formatMoney(unassignedAmount, currency)} is unassigned and excluded from the
            settlement.
          </div>
        )}

        {nonZeroBalances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a payer and split on activities to see who owes whom.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Net balances
              </h3>
              <ul className="surface divide-y">
                {nonZeroBalances.map(([name, amount]) => {
                  const owed = amount > 0
                  const stale = !activeTravelers.includes(name)
                  return (
                    <li
                      key={name}
                      className="flex items-center justify-between px-4 py-2 text-sm gap-2"
                    >
                      <span
                        className={`font-medium ${stale ? 'italic text-muted-foreground' : ''}`}
                      >
                        {name}
                        {stale ? ' (not on trip)' : ''}
                      </span>
                      <span className="flex items-center gap-2 tabular-nums">
                        <span className={owed ? 'text-brand-palm' : 'text-brand-sunset'}>
                          {formatMoney(Math.abs(amount), currency)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            owed
                              ? 'bg-brand-palm/15 text-brand-palm'
                              : 'bg-brand-sunset/15 text-brand-sunset'
                          }`}
                        >
                          {owed ? 'owed' : 'owes'}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Transfers
              </h3>
              {transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">All settled up.</p>
              ) : (
                <ul className="surface divide-y">
                  {transfers.map((t, i) => (
                    <li
                      key={`${t.from}->${t.to}-${i}`}
                      className="flex items-center justify-between px-4 py-2 text-sm gap-2"
                    >
                      <span className="inline-flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                        <span className="font-medium">{t.from}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{t.to}</span>
                      </span>
                      <span className="tabular-nums font-medium">
                        {formatMoney(t.amount, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {staleParties.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              No longer on trip
            </h3>
            <p className="text-sm text-muted-foreground">
              Appear in some activities but aren't in the current traveler list:{' '}
              <span className="italic">{staleParties.join(', ')}</span>. Edit those activities to
              reassign.
            </p>
          </div>
        )}

        <SettlementsLedger
          tripId={trip.id}
          travelers={activeTravelers}
          currency={currency}
          settlements={settlements}
        />
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="font-heading text-2xl font-bold text-brand-charcoal tabular-nums">
        {value}
      </div>
    </div>
  )
}
