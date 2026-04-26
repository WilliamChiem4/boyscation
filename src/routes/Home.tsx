import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrips } from '@/hooks/useTrips'
import { NewTripDialog } from '@/components/NewTripDialog'
import { TripCard, type TripCardVariant } from '@/components/TripCard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  archiveTrip,
  deleteTrip,
  duplicateTrip,
  setTripTemplate,
  unarchiveTrip,
  useTemplate,
} from '@/lib/autosave'
import { downloadBlob, exportTripToJSON, importTripFromJSON } from '@/lib/export'
import { avatarSay } from '@/lib/avatarBus'
import { cn } from '@/lib/utils'
import { Upload, Anchor } from 'lucide-react'
import type { Trip } from '@/lib/types'

type Tab = 'home' | 'templates' | 'archived'

const TAB_LABELS: Record<Tab, string> = {
  home: 'Home',
  templates: 'Templates',
  archived: 'Archived',
}

const TAB_VARIANT: Record<Tab, TripCardVariant> = {
  home: 'home',
  templates: 'template',
  archived: 'archived',
}

const EMPTY_STATES: Record<Tab, { title: string; sub: string }> = {
  home: { title: 'Nothing on the books.', sub: "Who's driving? 🚗" },
  templates: {
    title: 'No templates yet.',
    sub: "Save a trip as a template from the home tab and it'll live here.",
  },
  archived: {
    title: 'Nothing archived.',
    sub: 'Old trips you archive will hang out here.',
  },
}

export default function Home() {
  const trips = useTrips()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importErrors, setImportErrors] = useState<string[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('home')

  useEffect(() => {
    if (sessionStorage.getItem('avatar-greeted') !== '1') {
      sessionStorage.setItem('avatar-greeted', '1')
      avatarSay("I'm gonna be King of the Pirates! 👒")
    }
  }, [])

  const buckets = useMemo(() => {
    const home: Trip[] = []
    const templates: Trip[] = []
    const archived: Trip[] = []
    for (const t of trips ?? []) {
      if (t.archivedAt) archived.push(t)
      else if (t.isTemplate) templates.push(t)
      else home.push(t)
    }
    return { home, templates, archived }
  }, [trips])

  const list = buckets[tab]

  async function handleExport(id: string) {
    const trip = trips?.find((t) => t.id === id)
    const blob = await exportTripToJSON(id)
    downloadBlob(blob, `${(trip?.name || 'trip').replace(/\s+/g, '-').toLowerCase()}.json`)
  }

  async function handleDuplicate(id: string) {
    const newId = await duplicateTrip(id)
    navigate(`/trips/${newId}`)
  }

  async function handleUseTemplate(id: string) {
    const newId = await useTemplate(id)
    navigate(`/trips/${newId}`)
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return
    await deleteTrip(confirmDelete)
    setConfirmDelete(null)
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    const result = await importTripFromJSON(text)
    if (result.ok) {
      navigate(`/trips/${result.tripId}`)
    } else {
      setImportErrors(result.errors)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 md:px-8">
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-brand-palm/15 text-brand-palm border-2 border-brand-palm/40">
            <Anchor className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-brand-charcoal">
              Boyscation
            </h1>
            <p className="text-sm text-brand-charcoal/70 italic">
              Because the group chat is not a planning tool.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImportFile(f)
              e.target.value = ''
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import JSON
          </Button>
          <NewTripDialog />
        </div>
      </header>

      <div className="mb-6 inline-flex rounded-md border bg-background p-1 text-sm" role="tablist">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          const count = buckets[t].length
          const active = tab === t
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-brand-charcoal/80 hover:bg-accent',
              )}
            >
              {TAB_LABELS[t]}
              {count > 0 && (
                <span
                  className={cn(
                    'ml-1.5 text-xs rounded-full px-1.5 py-0.5',
                    active ? 'bg-primary-foreground/20' : 'bg-brand-sand text-brand-charcoal',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {trips === undefined ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="surface border-dashed py-16 text-center">
          <div className="text-4xl mb-2" aria-hidden>
            🏴‍☠️
          </div>
          <p className="text-lg font-heading font-semibold text-brand-charcoal">
            {EMPTY_STATES[tab].title}
          </p>
          <p className="text-muted-foreground mb-5">{EMPTY_STATES[tab].sub}</p>
          {tab === 'home' && <NewTripDialog />}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              variant={TAB_VARIANT[tab]}
              onDuplicate={handleDuplicate}
              onDelete={setConfirmDelete}
              onExport={handleExport}
              onArchive={(id) => archiveTrip(id)}
              onUnarchive={(id) => unarchiveTrip(id)}
              onSetTemplate={(id, v) => setTripTemplate(id, v)}
              onUseTemplate={handleUseTemplate}
            />
          ))}
        </div>
      )}

      <Dialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Delete this boyscation?</DialogTitle>
            <DialogDescription>
              Gone forever — the trip, its plans, the photos. No take-backs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importErrors !== null} onOpenChange={(v) => !v && setImportErrors(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">That file's not it</DialogTitle>
            <DialogDescription>Doesn't look like a Boyscation export. Details:</DialogDescription>
          </DialogHeader>
          <ul className="max-h-60 overflow-auto text-sm list-disc pl-5 space-y-1">
            {importErrors?.map((err, i) => (
              <li key={i} className="text-destructive">
                {err}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => setImportErrors(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
