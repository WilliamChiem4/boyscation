import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CrewInput } from '@/components/CrewInput'
import { createTrip } from '@/lib/autosave'
import { todayIso, addDaysIso, isValidIso } from '@/lib/dates'
import { avatarSay } from '@/lib/avatarBus'
import { Plus } from 'lucide-react'

export function NewTripDialog() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(addDaysIso(todayIso(), 6))
  const [travelers, setTravelers] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setDestination('')
    setStartDate(todayIso())
    setEndDate(addDaysIso(todayIso(), 6))
    setTravelers([])
    setNotes('')
    setError(null)
  }

  async function handleCreate(e: React.FormEvent) {
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
    const id = await createTrip({
      name: name.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      travelers,
      notes,
    })
    reset()
    setOpen(false)
    avatarSay("Shishishi! A new adventure! 🏴‍☠️")
    navigate(`/trips/${id}`)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New trip
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-heading">New Boyscation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="trip-name">Name</Label>
              <Input
                id="trip-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cabo 2026"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-destination">Destination</Label>
              <Input
                id="trip-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Somewhere with a pool"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="trip-start">Start date</Label>
                <Input
                  id="trip-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trip-end">End date</Label>
                <Input
                  id="trip-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-travelers">The crew</Label>
              <CrewInput
                id="trip-travelers"
                value={travelers}
                onChange={setTravelers}
                placeholder="Type a name, press Enter"
              />
              <p className="text-xs text-muted-foreground">
                Press Enter or comma to add. Backspace removes the last one.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-notes">Notes</Label>
              <Textarea
                id="trip-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Nevermind
            </Button>
            <Button type="submit">Let's go</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
