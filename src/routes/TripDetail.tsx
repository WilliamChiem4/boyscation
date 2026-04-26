import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DayBlock } from '@/components/DayBlock'
import { UnscheduledBin, UNSCHEDULED_ID } from '@/components/UnscheduledBin'
import { ActivityCard } from '@/components/ActivityCard'
import { useTrip } from '@/hooks/useTrip'
import {
  queueTripPatch,
  duplicateTrip,
  reorderActivities,
  flush,
} from '@/lib/autosave'
import { groupActivitiesByDay, isValidIso, daysInRange } from '@/lib/dates'
import { downloadBlob, exportTripToJSON } from '@/lib/export'
import type { Activity } from '@/lib/types'
import { ArrowLeft, Printer, FileText, Copy, BookmarkPlus, Wallet, Backpack } from 'lucide-react'

export default function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const data = useTrip(id)

  const trip = data?.trip
  const activitiesFromDb = data?.activities ?? []

  const [optimistic, setOptimistic] = useState<Activity[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const activities = optimistic ?? activitiesFromDb

  const availableDates = useMemo(
    () => (trip ? daysInRange(trip.startDate, trip.endDate) : []),
    [trip?.startDate, trip?.endDate],
  )

  const { days, unscheduled } = useMemo(
    () =>
      trip
        ? groupActivitiesByDay(trip.startDate, trip.endDate, activities)
        : { days: [], unscheduled: [] },
    [trip?.startDate, trip?.endDate, activities],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  const activeActivity = activeId ? activities.find((a) => a.id === activeId) : null

  function containerIdForActivity(id: string, list: Activity[]): string {
    const a = list.find((x) => x.id === id)
    if (!a) return UNSCHEDULED_ID
    if (availableDates.includes(a.date)) return `day:${a.date}`
    return UNSCHEDULED_ID
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
    if (!optimistic) setOptimistic([...activities])
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    setOptimistic((prev) => {
      const list = prev ?? [...activities]
      const activeItem = list.find((a) => a.id === activeIdStr)
      if (!activeItem) return list

      const activeContainer = containerIdForActivity(activeIdStr, list)
      const overContainer =
        typeof over.id === 'string' && over.id.startsWith('day:')
          ? over.id
          : containerIdForActivity(overIdStr, list)

      if (activeContainer === overContainer) return list

      const targetDate =
        overContainer === UNSCHEDULED_ID ? activeItem.date : overContainer.slice(4)

      return list.map((a) =>
        a.id === activeIdStr && overContainer !== UNSCHEDULED_ID ? { ...a, date: targetDate } : a,
      )
    })
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over) {
      setOptimistic(null)
      return
    }
    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    const list = optimistic ?? [...activities]
    const activeItem = list.find((a) => a.id === activeIdStr)
    if (!activeItem) {
      setOptimistic(null)
      return
    }

    let targetDate: string
    if (overIdStr === UNSCHEDULED_ID) {
      targetDate = activeItem.date
    } else if (overIdStr.startsWith('day:')) {
      targetDate = overIdStr.slice(4)
    } else {
      const overItem = list.find((a) => a.id === overIdStr)
      targetDate = overItem?.date ?? activeItem.date
    }

    const inSameDay = list
      .filter((a) => a.date === targetDate && a.id !== activeIdStr)
      .sort((a, b) => a.order - b.order)

    let insertIndex = inSameDay.length
    if (overIdStr !== UNSCHEDULED_ID && !overIdStr.startsWith('day:')) {
      const overIdx = inSameDay.findIndex((a) => a.id === overIdStr)
      if (overIdx >= 0) insertIndex = overIdx
    }

    const reordered = [
      ...inSameDay.slice(0, insertIndex),
      { ...activeItem, date: targetDate },
      ...inSameDay.slice(insertIndex),
    ]

    const updates = reordered.map((a, i) => ({ id: a.id, date: targetDate, order: i }))
    await reorderActivities(updates)
    setOptimistic(null)
  }

  function handleDragCancel() {
    setActiveId(null)
    setOptimistic(null)
  }

  async function handleDateChange(field: 'startDate' | 'endDate', value: string) {
    if (!isValidIso(value)) return
    queueTripPatch(trip!.id, { [field]: value } as Parameters<typeof queueTripPatch>[1], true)
  }

  async function handleExportJSON() {
    const blob = await exportTripToJSON(trip!.id)
    downloadBlob(blob, `${trip!.name.replace(/\s+/g, '-').toLowerCase() || 'trip'}.json`)
  }

  async function handleDuplicate() {
    await flush()
    const newId = await duplicateTrip(trip!.id)
    navigate(`/trips/${newId}`)
  }

  async function handleSaveAsTemplate() {
    await flush()
    const newId = await duplicateTrip(trip!.id, { asTemplate: true })
    navigate(`/trips/${newId}`)
  }

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4 md:px-8">
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap no-print">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> All trips
          </Link>
        </Button>
        <div className="flex items-center gap-1 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/trips/${trip.id}/budget`}>
              <Wallet className="h-4 w-4" /> Budget
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/trips/${trip.id}/packing`}>
              <Backpack className="h-4 w-4" /> Packing
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/trips/${trip.id}/export`}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <FileText className="h-4 w-4" /> Export JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSaveAsTemplate}>
            <BookmarkPlus className="h-4 w-4" /> Save as template
          </Button>
        </div>
      </div>

      <div className="inline-flex rounded-md border bg-background overflow-hidden text-sm mb-6 no-print">
        <span className="px-3 py-1.5 bg-primary text-primary-foreground">📋 Itinerary</span>
        <Link
          to={`/trips/${trip.id}/budget`}
          className="px-3 py-1.5 hover:bg-accent border-l"
        >
          💰 Budget
        </Link>
        <Link
          to={`/trips/${trip.id}/packing`}
          className="px-3 py-1.5 hover:bg-accent border-l"
        >
          🎒 Packing
        </Link>
      </div>

      <header className="space-y-4 mb-8">
        {trip.isTemplate && (
          <Badge variant="muted" className="no-print">Template</Badge>
        )}
        <Input
          className="font-heading text-3xl md:text-4xl font-extrabold h-auto py-2 border-transparent hover:border-input focus:border-input bg-transparent"
          value={trip.name}
          placeholder="Name this boyscation"
          onChange={(e) => queueTripPatch(trip.id, { name: e.target.value })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Destination</Label>
            <Input
              value={trip.destination}
              placeholder="Where we headed?"
              onChange={(e) => queueTripPatch(trip.id, { destination: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>The crew (comma-separated)</Label>
            <Input
              value={trip.travelers.join(', ')}
              placeholder="Alex, Sam"
              onChange={(e) =>
                queueTripPatch(trip.id, {
                  travelers: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input
              type="date"
              value={trip.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input
              type="date"
              value={trip.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes to self</Label>
          <Textarea
            value={trip.notes}
            placeholder="Packing list, flight numbers, whatever…"
            rows={2}
            onChange={(e) => queueTripPatch(trip.id, { notes: e.target.value })}
          />
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-6">
          {unscheduled.length > 0 && (
            <UnscheduledBin
              activities={unscheduled}
              availableDates={availableDates}
              travelers={trip.travelers}
              currency={trip.currency || 'USD'}
            />
          )}
          {days.map((d) => (
            <DayBlock
              key={d.date}
              tripId={trip.id}
              date={d.date}
              label={d.label}
              dayNumber={d.dayNumber}
              activities={d.activities}
              availableDates={availableDates}
              travelers={trip.travelers}
              currency={trip.currency || 'USD'}
            />
          ))}
          {days.length === 0 && (
            <p className="text-muted-foreground text-center py-10">
              Pick a start and end date up top — days will show up here.
            </p>
          )}
        </div>

        <DragOverlay>
          {activeActivity ? (
            <div className="opacity-90 rotate-1">
              <ActivityCard
                activity={activeActivity}
                availableDates={availableDates}
                travelers={trip.travelers}
                currency={trip.currency || 'USD'}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TripSummary activities={activities} />
    </div>
  )
}

function TripSummary({ activities }: { activities: Activity[] }) {
  const booked = activities.filter((a) => a.status === 'booked').length
  const pending = activities.filter((a) => a.status === 'pending').length
  const idea = activities.filter((a) => a.status === 'idea').length
  if (activities.length === 0) return null
  return (
    <footer className="mt-10 pt-6 border-t text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 no-print">
      <span>{activities.length} activities</span>
      <span>Booked: {booked}</span>
      <span>Pending: {pending}</span>
      <span>Idea: {idea}</span>
    </footer>
  )
}
