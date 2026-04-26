import Dexie, { type Table } from 'dexie'
import type { Activity, PackingItem, Settlement, StoredImage, Trip } from './types'

class TripPlannerDB extends Dexie {
  trips!: Table<Trip, string>
  activities!: Table<Activity, string>
  images!: Table<StoredImage, string>
  settlements!: Table<Settlement, string>
  packingItems!: Table<PackingItem, string>

  constructor() {
    super('trip-planner')
    this.version(1).stores({
      trips: 'id, updatedAt, isTemplate',
      activities: 'id, tripId, [tripId+date], [tripId+date+order]',
      images: 'id',
    })
    this.version(2)
      .stores({
        trips: 'id, updatedAt, isTemplate',
        activities: 'id, tripId, [tripId+date], [tripId+date+order]',
        images: 'id',
      })
      .upgrade(async (tx) => {
        await tx.table('trips').toCollection().modify((t: Partial<Trip>) => {
          if (t.currency == null) t.currency = 'USD'
        })
        const trips = (await tx.table('trips').toArray()) as Trip[]
        const travelersByTrip = new Map(trips.map((t) => [t.id, t.travelers ?? []]))
        await tx
          .table('activities')
          .toCollection()
          .modify((a: Partial<Activity>) => {
            if (a.category == null) a.category = 'other'
            if (a.paidBy === undefined) a.paidBy = null
            if (a.splitAmong == null) a.splitAmong = travelersByTrip.get(a.tripId ?? '') ?? []
          })
      })
    this.version(3)
      .stores({
        trips: 'id, updatedAt, isTemplate',
        activities: 'id, tripId, [tripId+date], [tripId+date+order]',
        images: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('activities')
          .toCollection()
          .modify((a: Partial<Activity>) => {
            if (a.transportMode === undefined) a.transportMode = null
            if (a.carrier == null) a.carrier = ''
            if (a.flightNumber == null) a.flightNumber = ''
            if (a.arriveTime == null) a.arriveTime = ''
            if (a.arriveLocation == null) a.arriveLocation = ''
            if (a.confirmationCode == null) a.confirmationCode = ''
          })
      })
    this.version(4)
      .stores({
        trips: 'id, updatedAt, isTemplate, archivedAt',
        activities: 'id, tripId, [tripId+date], [tripId+date+order]',
        images: 'id',
        settlements: 'id, tripId, createdAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('trips')
          .toCollection()
          .modify((t: Partial<Trip>) => {
            if (t.archivedAt === undefined) t.archivedAt = null
          })
        // Preserve legacy behavior: existing activities keep their stored splitAmong
        // untouched by defaulting splitMode to 'custom'. New activities default to 'equal'.
        await tx
          .table('activities')
          .toCollection()
          .modify((a: Partial<Activity>) => {
            if (a.splitMode === undefined) a.splitMode = 'custom'
          })
      })
    this.version(5).stores({
      trips: 'id, updatedAt, isTemplate, archivedAt',
      activities: 'id, tripId, [tripId+date], [tripId+date+order]',
      images: 'id',
      settlements: 'id, tripId, createdAt',
      packingItems: 'id, tripId, [tripId+order]',
    })
  }
}

export const db = new TripPlannerDB()
