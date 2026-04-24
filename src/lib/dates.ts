import { addDays, eachDayOfInterval, format, isValid, parseISO } from 'date-fns'
import type { Activity } from './types'

export function toIso(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function fromIso(iso: string): Date {
  return parseISO(iso)
}

export function isValidIso(iso: string): boolean {
  return isValid(parseISO(iso))
}

export function todayIso(): string {
  return toIso(new Date())
}

export function addDaysIso(iso: string, days: number): string {
  return toIso(addDays(parseISO(iso), days))
}

export function daysInRange(startIso: string, endIso: string): string[] {
  if (!isValidIso(startIso) || !isValidIso(endIso)) return []
  const start = parseISO(startIso)
  const end = parseISO(endIso)
  if (end < start) return [startIso]
  return eachDayOfInterval({ start, end }).map(toIso)
}

export function formatDayHeader(iso: string): string {
  return format(parseISO(iso), 'EEEE, MMM d')
}

export function formatTime(hhmm: string): string {
  if (!hhmm) return ''
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return hhmm
  let h = Number(m[1])
  const min = m[2]
  if (Number.isNaN(h) || h < 0 || h > 23) return hhmm
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${min} ${suffix}`
}

export function formatDateRange(startIso: string, endIso: string): string {
  if (!isValidIso(startIso) || !isValidIso(endIso)) return ''
  const start = parseISO(startIso)
  const end = parseISO(endIso)
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
}

export type DayGroup = {
  date: string
  label: string
  dayNumber: number
  activities: Activity[]
}

export function groupActivitiesByDay(
  startIso: string,
  endIso: string,
  activities: Activity[],
): { days: DayGroup[]; unscheduled: Activity[] } {
  const range = daysInRange(startIso, endIso)
  const inRange = new Set(range)
  const byDate = new Map<string, Activity[]>()

  for (const iso of range) byDate.set(iso, [])
  const unscheduled: Activity[] = []

  const sorted = [...activities].sort((a, b) => a.order - b.order)
  for (const a of sorted) {
    if (inRange.has(a.date)) {
      byDate.get(a.date)!.push(a)
    } else {
      unscheduled.push(a)
    }
  }

  const days: DayGroup[] = range.map((date, idx) => ({
    date,
    label: formatDayHeader(date),
    dayNumber: idx + 1,
    activities: byDate.get(date)!,
  }))

  return { days, unscheduled }
}
