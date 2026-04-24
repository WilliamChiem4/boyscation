import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ActivityStatus } from '@/lib/types'

const LABELS: Record<ActivityStatus, string> = {
  booked: 'Booked',
  pending: 'Pending',
  idea: 'Idea',
}

const CLASSES: Record<ActivityStatus, string> = {
  booked: 'bg-brand-palm/15 text-brand-palm border-transparent',
  pending: 'bg-brand-sunset/15 text-brand-sunset border-transparent',
  idea: 'bg-brand-sand text-brand-charcoal/70 border-transparent',
}

export function StatusBadge({ status }: { status: ActivityStatus }) {
  return <Badge className={cn(CLASSES[status])}>{LABELS[status]}</Badge>
}
