import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { ActivityCard } from '@/components/ActivityCard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { addActivity } from '@/lib/autosave'
import { avatarSay } from '@/lib/avatarBus'
import type { Activity } from '@/lib/types'

type Props = {
  tripId: string
  date: string
  label: string
  dayNumber: number
  activities: Activity[]
  availableDates: string[]
  travelers: string[]
  currency: string
}

export function DayBlock({
  tripId,
  date,
  label,
  dayNumber,
  activities,
  availableDates,
  travelers,
  currency,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}`, data: { date } })
  const ids = activities.map((a) => a.id)

  return (
    <section className="print-break-inside-avoid surface p-4">
      <header className="flex items-baseline justify-between gap-2 mb-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-brand-charcoal">Day {dayNumber}</h2>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            addActivity(tripId, date)
            avatarSay('Sounds fun! Is there meat?! 🍖')
          }}
          className="no-print"
        >
          <Plus className="h-4 w-4" /> Add activity
        </Button>
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`space-y-2 min-h-[60px] rounded-md p-2 transition-colors ${
            isOver ? 'bg-accent/50' : ''
          } ${activities.length === 0 ? 'border border-dashed' : ''}`}
        >
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 italic">
              Nothing planned. Drop something here. 👇
            </p>
          )}
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
