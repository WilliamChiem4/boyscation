import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CrewInput } from '@/components/CrewInput'
import { queueTripPatch } from '@/lib/autosave'
import { isValidIso } from '@/lib/dates'
import type { Trip } from '@/lib/types'

type Props = {
  trip: Trip
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTripDialog({ trip, open, onOpenChange }: Props) {
  const [name, setName] = useState(trip.name)
  const [destination, setDestination] = useState(trip.destination)
  const [startDate, setStartDate] = useState(trip.startDate)
  const [endDate, setEndDate] = useState(trip.endDate)
  const [travelers, setTravelers] = useState<string[]>(trip.travelers)
  const [notes, setNotes] = useState(trip.notes)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(trip.name)
    setDestination(trip.destination)
    setStartDate(trip.startDate)
    setEndDate(trip.endDate)
    setTravelers(trip.travelers)
    setNotes(trip.notes)
    setError(null)
  }, [open, trip])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (!isValidIso(startDate) || !isValidIso(endDate)) {
      setError('Invalid date.')
      return
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.')
      return
    }
    queueTripPatch(
      trip.id,
      {
        name: name.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        travelers,
        notes,
      },
      true,
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Boyscation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-trip-name">Name</Label>
              <Input
                id="edit-trip-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cabo 2026"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-trip-destination">Destination</Label>
              <Input
                id="edit-trip-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Somewhere with a pool"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-trip-start">Start date</Label>
                <Input
                  id="edit-trip-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-trip-end">End date</Label>
                <Input
                  id="edit-trip-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-trip-travelers">The crew</Label>
              <CrewInput
                id="edit-trip-travelers"
                value={travelers}
                onChange={setTravelers}
                placeholder="Type a name, press Enter"
              />
              <p className="text-xs text-muted-foreground">
                Press Enter or comma to add. Backspace removes the last one.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-trip-notes">Notes</Label>
              <Textarea
                id="edit-trip-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Nevermind
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
