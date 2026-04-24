import type { Activity, ActivityCategory, TransportMode } from './types'

export function tripTotal(activities: Activity[]): number {
  return activities.reduce((s, a) => s + (a.cost || 0), 0)
}

export function totalByStatus(activities: Activity[], status: Activity['status']): number {
  return activities
    .filter((a) => a.status === status)
    .reduce((s, a) => s + (a.cost || 0), 0)
}

export function totalsByDay(activities: Activity[]): Map<string, { count: number; total: number }> {
  const map = new Map<string, { count: number; total: number }>()
  for (const a of activities) {
    const prev = map.get(a.date) ?? { count: 0, total: 0 }
    map.set(a.date, { count: prev.count + 1, total: prev.total + (a.cost || 0) })
  }
  return map
}

export function totalsByCategory(activities: Activity[]): Map<ActivityCategory, number> {
  const map = new Map<ActivityCategory, number>()
  for (const a of activities) {
    const cat = a.category ?? 'other'
    map.set(cat, (map.get(cat) ?? 0) + (a.cost || 0))
  }
  return map
}

export function formatMoney(amount: number, currency: string | undefined): string {
  const code = currency && currency.trim() ? currency.trim().toUpperCase() : 'USD'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  lodging: 'Lodging',
  food: 'Food',
  activity: 'Activity',
  transport: 'Transport',
  other: 'Other',
}

export const CATEGORY_EMOJI: Record<ActivityCategory, string> = {
  lodging: '🏨',
  food: '🍜',
  activity: '🎟️',
  transport: '✈️',
  other: '📦',
}

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  lodging: '#3A78B9',
  food: '#E58A4E',
  activity: '#5E8B63',
  transport: '#1F2430',
  other: '#F4EBDD',
}

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  plane: 'Flight',
  train: 'Train',
  bus: 'Bus',
  car: 'Car',
  ferry: 'Ferry',
  other: 'Other',
}

export const TRANSPORT_EMOJI: Record<TransportMode, string> = {
  plane: '✈️',
  train: '🚆',
  bus: '🚌',
  car: '🚗',
  ferry: '⛴️',
  other: '🧭',
}
