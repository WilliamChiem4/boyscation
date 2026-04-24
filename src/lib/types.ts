import { z } from 'zod'

export const ActivityStatus = z.enum(['booked', 'pending', 'idea'])
export type ActivityStatus = z.infer<typeof ActivityStatus>

export const ActivityCategory = z.enum(['lodging', 'food', 'activity', 'transport', 'other'])
export type ActivityCategory = z.infer<typeof ActivityCategory>

export const TransportMode = z.enum(['plane', 'train', 'bus', 'car', 'ferry', 'other'])
export type TransportMode = z.infer<typeof TransportMode>

export const SplitMode = z.enum(['equal', 'except-payer', 'custom'])
export type SplitMode = z.infer<typeof SplitMode>

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const isoDate = z.string().regex(ISO_DATE, 'Expected yyyy-MM-dd')

export const TripSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  destination: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  travelers: z.array(z.string()),
  notes: z.string(),
  isTemplate: z.boolean(),
  archivedAt: z.number().nullable().default(null),
  currency: z.string().default('USD'),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Trip = z.infer<typeof TripSchema>

export const ActivitySchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  date: isoDate,
  order: z.number(),
  time: z.string(),
  title: z.string(),
  location: z.string(),
  mapLink: z.string(),
  cost: z.number(),
  status: ActivityStatus,
  notes: z.string(),
  imageId: z.string().nullable(),
  category: ActivityCategory.default('other'),
  paidBy: z.string().nullable().default(null),
  splitAmong: z.array(z.string()).default([]),
  splitMode: SplitMode.default('equal'),
  transportMode: TransportMode.nullable().default(null),
  carrier: z.string().default(''),
  flightNumber: z.string().default(''),
  arriveTime: z.string().default(''),
  arriveLocation: z.string().default(''),
  confirmationCode: z.string().default(''),
})
export type Activity = z.infer<typeof ActivitySchema>

export type StoredImage = {
  id: string
  blob: Blob
  mimeType: string
}

export const TripExportImageSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  dataUrl: z.string().startsWith('data:'),
})
export type TripExportImage = z.infer<typeof TripExportImageSchema>

export const SettlementSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  from: z.string(),
  to: z.string(),
  amount: z.number(),
  note: z.string().default(''),
  createdAt: z.number(),
})
export type Settlement = z.infer<typeof SettlementSchema>

export const TripExportSchema = z.object({
  version: z.literal(1),
  trip: TripSchema,
  activities: z.array(ActivitySchema),
  images: z.array(TripExportImageSchema),
  settlements: z.array(SettlementSchema).default([]),
})
export type TripExport = z.infer<typeof TripExportSchema>
