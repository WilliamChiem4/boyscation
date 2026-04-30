import { useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setGuestName } from '@/lib/guestName'

type Props = {
  tripId: string
  tripName: string
  onDone: (name: string) => void
}

export function GuestNamePrompt({ tripId, tripName, onDone }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a name.')
      return
    }
    setGuestName(tripId, trimmed)
    onDone(trimmed)
  }

  return (
    <Dialog open={true}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-heading">Welcome to {tripName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            What should we call you? Your name shows up next to changes you make.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">Your name</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sam"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit">Continue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
