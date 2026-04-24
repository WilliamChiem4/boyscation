import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Archive,
  ArchiveRestore,
  BookmarkPlus,
  BookmarkMinus,
  Copy,
  FileText,
  Play,
  Calendar,
  MapPin,
  Trash2,
  Users,
} from 'lucide-react'
import { formatDateRange } from '@/lib/dates'
import type { Trip } from '@/lib/types'

export type TripCardVariant = 'home' | 'template' | 'archived'

type Props = {
  trip: Trip
  variant?: TripCardVariant
  onDuplicate?: (id: string) => void
  onDelete: (id: string) => void
  onExport: (id: string) => void
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
  onSetTemplate?: (id: string, isTemplate: boolean) => void
  onUseTemplate?: (id: string) => void
}

export function TripCard({
  trip,
  variant = 'home',
  onDuplicate,
  onDelete,
  onExport,
  onArchive,
  onUnarchive,
  onSetTemplate,
  onUseTemplate,
}: Props) {
  return (
    <Card className="surface hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="font-heading text-lg truncate">
              <Link to={`/trips/${trip.id}`} className="hover:underline">
                {trip.name || 'Untitled boyscation'}
              </Link>
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              {variant === 'template' && <Badge variant="muted">Template</Badge>}
              {variant === 'archived' && <Badge variant="muted">Archived</Badge>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {trip.destination && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{trip.destination}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
        </div>
        {trip.travelers.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{trip.travelers.join(', ')}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1 pt-3">
          {variant === 'template' ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => onUseTemplate?.(trip.id)}
              title="Start a trip from this template"
            >
              <Play className="h-4 w-4" /> Use template
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to={`/trips/${trip.id}`}>Open</Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onExport(trip.id)} title="Export JSON">
            <FileText className="h-4 w-4" />
          </Button>
          {variant === 'home' && onDuplicate && (
            <Button size="sm" variant="ghost" onClick={() => onDuplicate(trip.id)} title="Duplicate">
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {variant === 'home' && onSetTemplate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetTemplate(trip.id, true)}
              title="Save as template"
            >
              <BookmarkPlus className="h-4 w-4" />
            </Button>
          )}
          {variant === 'home' && onArchive && (
            <Button size="sm" variant="ghost" onClick={() => onArchive(trip.id)} title="Archive">
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {variant === 'template' && onSetTemplate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetTemplate(trip.id, false)}
              title="Unmark as template"
            >
              <BookmarkMinus className="h-4 w-4" />
            </Button>
          )}
          {variant === 'archived' && onUnarchive && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUnarchive(trip.id)}
              title="Unarchive"
            >
              <ArchiveRestore className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(trip.id)}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
