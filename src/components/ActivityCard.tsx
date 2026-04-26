import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { ActivityEditor } from '@/components/ActivityEditor'
import { ImageLightbox } from '@/components/ImageUpload'
import { useObjectURL } from '@/hooks/useObjectURL'
import { Clock, MapPin, ExternalLink, GripVertical, Pencil, ArrowRight, Copy } from 'lucide-react'
import { formatTime } from '@/lib/dates'
import { CATEGORY_EMOJI, TRANSPORT_EMOJI, TRANSPORT_LABELS, formatMoney } from '@/lib/budget'
import { duplicateActivity } from '@/lib/autosave'
import type { Activity } from '@/lib/types'

type Props = {
  activity: Activity
  availableDates: string[]
  travelers: string[]
  currency: string
}

export function ActivityCard({ activity, availableDates, travelers, currency }: Props) {
  const [editing, setEditing] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const imageUrl = useObjectURL(activity.imageId)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    data: { activity },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const hasContent =
    activity.title || activity.location || activity.notes || activity.time || activity.cost > 0

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="group bg-card border rounded-md p-3 flex gap-3 items-start shadow-sm hover:shadow transition-shadow"
      >
        <button
          className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 mt-0.5 no-print"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
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
                  <span className="text-xs inline-flex items-center gap-0.5">
                    <span aria-hidden>{CATEGORY_EMOJI[activity.category]}</span>
                  </span>
                )}
              </div>
              {activity.category === 'transport' && activity.transportMode && (
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-brand-ocean/10 text-brand-ocean border border-brand-ocean/30">
                  <span aria-hidden>{TRANSPORT_EMOJI[activity.transportMode]}</span>
                  <span>
                    {activity.carrier || TRANSPORT_LABELS[activity.transportMode]}
                    {activity.flightNumber ? ` ${activity.flightNumber}` : ''}
                  </span>
                  {activity.confirmationCode && (
                    <span className="text-brand-ocean/70">· {activity.confirmationCode}</span>
                  )}
                </div>
              )}
              <h3 className="font-heading font-semibold text-base mt-1 break-words text-brand-charcoal">
                {activity.title || <span className="text-muted-foreground italic font-normal">Untitled thing</span>}
              </h3>
              {(activity.location || activity.arriveLocation) && (
                <div className="text-sm text-muted-foreground mt-0.5 inline-flex items-center gap-1 flex-wrap">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="break-words">{activity.location}</span>
                  {activity.category === 'transport' && activity.arriveLocation && (
                    <>
                      <ArrowRight className="h-3 w-3" />
                      <span className="break-words">{activity.arriveLocation}</span>
                    </>
                  )}
                  {activity.mapLink && (
                    <a
                      href={activity.mapLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </a>
                  )}
                </div>
              )}
              {activity.cost > 0 && (
                <div className="text-sm text-muted-foreground mt-0.5">
                  {formatMoney(activity.cost, currency)}
                </div>
              )}
              {activity.notes && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                  {activity.notes}
                </p>
              )}
            </div>

            {imageUrl && (
              <button
                type="button"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxUrl(imageUrl)
                }}
                aria-label="Expand image"
              >
                <img
                  src={imageUrl}
                  alt=""
                  className="h-16 w-16 object-cover rounded border"
                  loading="lazy"
                />
              </button>
            )}
          </div>

          {!hasContent && (
            <p className="text-sm text-muted-foreground italic">Tap the pencil to fill it in.</p>
          )}
        </div>

        <div className="flex items-center shrink-0 no-print">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void duplicateActivity(activity.id)}
            aria-label="Duplicate activity"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            aria-label="Edit activity"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editing && (
        <ActivityEditor
          activity={activity}
          availableDates={availableDates}
          travelers={travelers}
          currency={currency}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </>
  )
}
