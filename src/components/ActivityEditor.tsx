import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ImageUpload, ImageLightbox } from '@/components/ImageUpload'
import { queueActivityPatch, deleteActivity, flush } from '@/lib/autosave'
import type {
  Activity,
  ActivityCategory,
  ActivityStatus,
  SplitMode,
  TransportMode,
} from '@/lib/types'
import { effectiveSplitAmong } from '@/lib/settlement'
import { formatDayHeader, isValidIso } from '@/lib/dates'
import { CATEGORY_EMOJI, CATEGORY_LABELS, TRANSPORT_EMOJI, TRANSPORT_LABELS } from '@/lib/budget'
import { Trash2 } from 'lucide-react'

const PAID_BY_NONE = '__none__'

type Props = {
  activity: Activity
  availableDates: string[]
  travelers: string[]
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivityEditor({
  activity,
  availableDates,
  travelers,
  currency,
  open,
  onOpenChange,
}: Props) {
  const [title, setTitle] = useState(activity.title)
  const [time, setTime] = useState(activity.time)
  const [location, setLocation] = useState(activity.location)
  const [mapLink, setMapLink] = useState(activity.mapLink)
  const [cost, setCost] = useState(String(activity.cost || ''))
  const [status, setStatus] = useState<ActivityStatus>(activity.status)
  const [category, setCategory] = useState<ActivityCategory>(activity.category ?? 'other')
  const [paidBy, setPaidBy] = useState<string | null>(activity.paidBy ?? null)
  const [splitAmong, setSplitAmong] = useState<string[]>(activity.splitAmong ?? [])
  const [splitMode, setSplitMode] = useState<SplitMode>(activity.splitMode ?? 'equal')
  const [notes, setNotes] = useState(activity.notes)
  const [date, setDate] = useState(activity.date)
  const [transportMode, setTransportMode] = useState<TransportMode | null>(
    activity.transportMode ?? null,
  )
  const [carrier, setCarrier] = useState(activity.carrier ?? '')
  const [flightNumber, setFlightNumber] = useState(activity.flightNumber ?? '')
  const [arriveTime, setArriveTime] = useState(activity.arriveTime ?? '')
  const [arriveLocation, setArriveLocation] = useState(activity.arriveLocation ?? '')
  const [confirmationCode, setConfirmationCode] = useState(activity.confirmationCode ?? '')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTitle(activity.title)
      setTime(activity.time)
      setLocation(activity.location)
      setMapLink(activity.mapLink)
      setCost(String(activity.cost || ''))
      setStatus(activity.status)
      setCategory(activity.category ?? 'other')
      setPaidBy(activity.paidBy ?? null)
      setSplitAmong(activity.splitAmong ?? [])
      setSplitMode(activity.splitMode ?? 'equal')
      setNotes(activity.notes)
      setDate(activity.date)
      setTransportMode(activity.transportMode ?? null)
      setCarrier(activity.carrier ?? '')
      setFlightNumber(activity.flightNumber ?? '')
      setArriveTime(activity.arriveTime ?? '')
      setArriveLocation(activity.arriveLocation ?? '')
      setConfirmationCode(activity.confirmationCode ?? '')
    }
  }, [activity, open])

  function patch<K extends keyof Activity>(key: K, value: Activity[K], immediate = false) {
    queueActivityPatch(activity.id, { [key]: value } as Partial<Activity>, immediate)
  }

  const dateChoices = availableDates.includes(activity.date)
    ? availableDates
    : [activity.date, ...availableDates]

  const splitOptions = Array.from(new Set([...travelers, ...splitAmong]))
  const paidByOptions = Array.from(
    new Set([...travelers, ...(paidBy ? [paidBy] : [])]),
  )

  function toggleSplit(name: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...splitAmong, name]))
      : splitAmong.filter((n) => n !== name)
    setSplitAmong(next)
    patch('splitAmong', next, true)
  }

  async function handleDelete() {
    await deleteActivity(activity.id)
    onOpenChange(false)
  }

  async function handleClose(v: boolean) {
    if (!v) await flush()
    onOpenChange(v)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit thing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="act-title">Title</Label>
              <Input
                id="act-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  patch('title', e.target.value)
                }}
                placeholder="Dinner. Drinks. Questionable decisions."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="act-time">Time</Label>
                <Input
                  id="act-time"
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value)
                    patch('time', e.target.value, true)
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="act-date">Date</Label>
                <Select
                  value={date}
                  onValueChange={(v) => {
                    if (isValidIso(v)) {
                      setDate(v)
                      patch('date', v, true)
                    }
                  }}
                >
                  <SelectTrigger id="act-date">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateChoices.map((d) => (
                      <SelectItem key={d} value={d}>
                        {formatDayHeader(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="act-location">
                {category === 'transport' ? 'From' : 'Location'}
              </Label>
              <Input
                id="act-location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value)
                  patch('location', e.target.value)
                }}
                placeholder={
                  category === 'transport' ? 'HAN · Hanoi airport' : 'Hoan Kiem District'
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="act-map">Map link</Label>
              <Input
                id="act-map"
                type="url"
                value={mapLink}
                onChange={(e) => {
                  setMapLink(e.target.value)
                  patch('mapLink', e.target.value)
                }}
                placeholder="https://maps.google.com/…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="act-cost">Cost ({currency})</Label>
                <Input
                  id="act-cost"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={cost}
                  onChange={(e) => {
                    setCost(e.target.value)
                    patch('cost', Number(e.target.value) || 0)
                  }}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="act-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    const next = v as ActivityStatus
                    setStatus(next)
                    patch('status', next, true)
                  }}
                >
                  <SelectTrigger id="act-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="idea">Idea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="act-category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    const next = v as ActivityCategory
                    setCategory(next)
                    patch('category', next, true)
                  }}
                >
                  <SelectTrigger id="act-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="act-paidby">Paid by</Label>
                <Select
                  value={paidBy ?? PAID_BY_NONE}
                  onValueChange={(v) => {
                    const next = v === PAID_BY_NONE ? null : v
                    setPaidBy(next)
                    patch('paidBy', next, true)
                  }}
                >
                  <SelectTrigger id="act-paidby">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PAID_BY_NONE}>—</SelectItem>
                    {paidByOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                        {!travelers.includes(t) ? ' (not on trip)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {category === 'transport' && (
              <div className="rounded-lg border border-brand-ocean/40 bg-brand-ocean/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {transportMode ? TRANSPORT_EMOJI[transportMode] : '🧳'}
                  </span>
                  <Label className="font-heading text-base font-bold m-0">Travel details</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="act-mode">Mode</Label>
                    <Select
                      value={transportMode ?? ''}
                      onValueChange={(v) => {
                        const next = (v || null) as TransportMode | null
                        setTransportMode(next)
                        patch('transportMode', next, true)
                      }}
                    >
                      <SelectTrigger id="act-mode">
                        <SelectValue placeholder="Pick a mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TRANSPORT_LABELS) as TransportMode[]).map((m) => (
                          <SelectItem key={m} value={m}>
                            {TRANSPORT_EMOJI[m]} {TRANSPORT_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="act-carrier">
                      {transportMode === 'plane'
                        ? 'Airline'
                        : transportMode === 'train'
                          ? 'Operator'
                          : 'Carrier'}
                    </Label>
                    <Input
                      id="act-carrier"
                      value={carrier}
                      onChange={(e) => {
                        setCarrier(e.target.value)
                        patch('carrier', e.target.value)
                      }}
                      placeholder={
                        transportMode === 'plane'
                          ? 'Vietnam Airlines'
                          : transportMode === 'train'
                            ? 'Vietnam Railways'
                            : 'Greyhound'
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="act-flight">
                      {transportMode === 'plane' ? 'Flight #' : 'Number'}
                    </Label>
                    <Input
                      id="act-flight"
                      value={flightNumber}
                      onChange={(e) => {
                        setFlightNumber(e.target.value)
                        patch('flightNumber', e.target.value)
                      }}
                      placeholder={transportMode === 'plane' ? 'VN123' : 'SE1'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="act-conf">Confirmation</Label>
                    <Input
                      id="act-conf"
                      value={confirmationCode}
                      onChange={(e) => {
                        setConfirmationCode(e.target.value)
                        patch('confirmationCode', e.target.value)
                      }}
                      placeholder="ABC123"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="act-arrive-time">Arrives at</Label>
                    <Input
                      id="act-arrive-time"
                      type="time"
                      value={arriveTime}
                      onChange={(e) => {
                        setArriveTime(e.target.value)
                        patch('arriveTime', e.target.value, true)
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="act-arrive-loc">To</Label>
                    <Input
                      id="act-arrive-loc"
                      value={arriveLocation}
                      onChange={(e) => {
                        setArriveLocation(e.target.value)
                        patch('arriveLocation', e.target.value)
                      }}
                      placeholder="SGN · Saigon airport"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Depart time and "From" come from the fields above.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="act-splitmode">Split mode</Label>
              <Select
                value={splitMode}
                onValueChange={(v) => {
                  const next = v as SplitMode
                  // When switching to 'custom', pre-fill splitAmong with what the
                  // previous mode was effectively splitting, so the user doesn't
                  // start from an empty grid.
                  if (next === 'custom' && splitMode !== 'custom') {
                    const preset = effectiveSplitAmong(
                      { ...activity, splitMode, paidBy, splitAmong },
                      travelers,
                    )
                    setSplitAmong(preset)
                    queueActivityPatch(
                      activity.id,
                      { splitMode: next, splitAmong: preset },
                      true,
                    )
                  } else {
                    patch('splitMode', next, true)
                  }
                  setSplitMode(next)
                }}
              >
                <SelectTrigger id="act-splitmode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Split equally among everyone</SelectItem>
                  <SelectItem value="except-payer">Everyone except the payer</SelectItem>
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>

              {splitMode !== 'custom' ? (
                (() => {
                  const effective = effectiveSplitAmong(
                    { ...activity, splitMode, paidBy, splitAmong },
                    travelers,
                  )
                  if (effective.length === 0) {
                    return (
                      <p className="text-xs text-brand-sunset">
                        {splitMode === 'except-payer' && travelers.length > 0
                          ? "Everyone except the payer leaves nobody — it won't appear in the settlement."
                          : 'Add travelers to the trip to split costs.'}
                      </p>
                    )
                  }
                  return (
                    <p className="text-xs text-muted-foreground">
                      Split among {effective.join(', ')} ({effective.length}{' '}
                      {effective.length === 1 ? 'person' : 'people'}).
                    </p>
                  )
                })()
              ) : splitOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Add travelers to the trip to split costs.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {splitOptions.map((t) => {
                      const checked = splitAmong.includes(t)
                      const stale = !travelers.includes(t)
                      return (
                        <label
                          key={t}
                          className="flex items-center gap-2 text-sm cursor-pointer py-1"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => toggleSplit(t, c === true)}
                          />
                          <span className={stale ? 'text-muted-foreground italic' : ''}>
                            {t}
                            {stale ? ' (not on trip)' : ''}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {splitAmong.length === 0 && (
                    <p className="text-xs text-brand-sunset">
                      No one is splitting this — it won't appear in the settlement.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="act-notes">Notes</Label>
              <Textarea
                id="act-notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  patch('notes', e.target.value)
                }}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Image</Label>
              <ImageUpload
                activityId={activity.id}
                imageId={activity.imageId}
                onExpand={setLightboxUrl}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <Button type="button" onClick={() => handleClose(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </>
  )
}
