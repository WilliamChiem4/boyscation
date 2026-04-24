import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { ActivityCard } from '@/components/ActivityCard'
import { AlertTriangle } from 'lucide-react'
import type { Activity } from '@/lib/types'

const UNSCHEDULED_ID = 'day:__unscheduled__'

type Props = {
  activities: Activity[]
  availableDates: string[]
  travelers: string[]
  currency: string
}

export function UnscheduledBin({ activities, availableDates, travelers, currency }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_ID, data: { date: null } })
  const ids = activities.map((a) => a.id)

  if (activities.length === 0) return null

  return (
    <section className="print-break-inside-avoid border border-brand-sunset/40 rounded-lg p-4 bg-brand-sunset/10 surface">
      <header className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-brand-sunset mt-0.5 shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-brand-charcoal">
            {activities.length} {activities.length === 1 ? 'thing' : 'things'} in limbo
          </h2>
          <p className="text-sm text-brand-charcoal/70">
            These dates fell outside the trip. Drag 'em onto a day, change the date, or just let
            them go.
          </p>
        </div>
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`space-y-2 min-h-[60px] rounded-md p-2 transition-colors ${
            isOver ? 'bg-brand-sunset/15' : ''
          }`}
        >
          {activities.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              availableDates={availableDates}
              travelers={travelers}
              currency={currency}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}

export { UNSCHEDULED_ID }
