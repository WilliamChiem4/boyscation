import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { listIdeas, submitIdea, updateIdeaStatus } from '@/lib/sync'
import { addActivity } from '@/lib/autosave'
import type { Idea, Trip } from '@/lib/types'
import type { SyncContext } from '@/hooks/useSyncContext'
import { Lightbulb, Check, X, Loader2, Plus } from 'lucide-react'

type Props = {
  trip: Trip
  ctx: SyncContext
}

export function IdeasPanel({ trip, ctx }: Props) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = ctx.token
  const guestName = ctx.guestName

  async function refresh() {
    if (!token) return
    try {
      setIdeas(await listIdeas(trip.id, token))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!guestName) {
      setError('Please set your name first.')
      return
    }
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await submitIdea(trip.id, token, {
        authorName: guestName,
        title: title.trim(),
        notes: notes.trim(),
      })
      setTitle('')
      setNotes('')
      setShowForm(false)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleAccept(idea: Idea) {
    if (!token) return
    try {
      const activityId = await addActivity(trip.id, idea.suggestedDate ?? trip.startDate, {
        title: idea.title,
        notes: idea.notes,
        status: 'idea',
      })
      await updateIdeaStatus(idea.id, token, 'accepted', activityId)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleReject(idea: Idea) {
    if (!token) return
    try {
      await updateIdeaStatus(idea.id, token, 'rejected')
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const pending = ideas?.filter((i) => i.status === 'pending') ?? []

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4" /> Ideas
          {pending.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal">
              {pending.length}
            </span>
          )}
        </h3>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Suggest
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="idea-title" className="text-xs">Title</Label>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pasta Bar near the hotel"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="idea-notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="idea-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Heard they're great"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!showForm && pending.length === 0 && (
        <p className="text-xs text-muted-foreground">No ideas yet.</p>
      )}

      <ul className="space-y-2">
        {pending.map((idea) => (
          <li key={idea.id} className="rounded-md border bg-muted/30 p-2 text-sm space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium">{idea.title}</p>
                <p className="text-xs text-muted-foreground">— {idea.authorName}</p>
                {idea.notes && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                    {idea.notes}
                  </p>
                )}
              </div>
              {ctx.canEdit && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleAccept(idea)} title="Accept into itinerary">
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleReject(idea)} title="Reject">
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
