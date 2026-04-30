import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTrip } from '@/hooks/useTrip'
import { usePackingList } from '@/hooks/usePackingList'
import {
  addPackingItem,
  clearPackedItems,
  deletePackingItem,
  queuePackingPatch,
  togglePackingItem,
} from '@/lib/autosave'
import type { PackingItem } from '@/lib/types'
import { ArrowLeft, Plus, Trash2, RotateCcw, Backpack } from 'lucide-react'

const ASSIGNEE_NONE = '__none__'
const FILTER_ALL = '__all__'

const SUGGESTIONS = [
  'Passport',
  'Phone charger',
  'Outlet adapter',
  'Toothbrush',
  'Sunscreen',
  'Headphones',
  'Cash / cards',
  'Reusable bottle',
  'Medication',
  'Swimsuit',
  'Sunglasses',
  'Backup outfit',
]

export default function TripPacking() {
  const { id } = useParams<{ id: string }>()
  const data = useTrip(id)
  const trip = data?.trip
  const items = usePackingList(id) ?? []

  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [assignee, setAssignee] = useState<string>(ASSIGNEE_NONE)
  const [filter, setFilter] = useState<string>(FILTER_ALL)
  const [error, setError] = useState<string | null>(null)

  const travelers = trip?.travelers ?? []

  const knownAssignees = useMemo(() => {
    const set = new Set<string>(travelers)
    for (const i of items) if (i.assignee) set.add(i.assignee)
    return Array.from(set)
  }, [travelers, items])

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return items
    if (filter === ASSIGNEE_NONE) return items.filter((i) => !i.assignee)
    return items.filter((i) => i.assignee === filter)
  }, [items, filter])

  const totalCount = items.length
  const packedCount = items.filter((i) => i.checked).length
  const progress = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0

  const remainingByPerson = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) {
      if (i.checked) continue
      const key = i.assignee ?? ''
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [items])

  async function handleAdd(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give it a name.')
      return
    }
    const n = Math.max(1, Math.floor(Number(qty) || 1))
    setError(null)
    if (!id) return
    await addPackingItem(id, {
      name: trimmed,
      qty: n,
      assignee: assignee === ASSIGNEE_NONE ? null : assignee,
    })
    setName('')
    setQty('1')
  }

  async function handleQuickAdd(suggestion: string) {
    if (!id) return
    if (items.some((i) => i.name.toLowerCase() === suggestion.toLowerCase())) return
    await addPackingItem(id, { name: suggestion, qty: 1, assignee: null })
  }

  if (data === undefined) {
    return <div className="p-8 text-muted-foreground">Loading…</div>
  }
  if (!trip) {
    return (
      <div className="p-8 space-y-4">
        <p>Trip not found.</p>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4 md:px-8">
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/trips/${trip.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to itinerary
          </Link>
        </Button>
        <div className="inline-flex rounded-md border bg-background overflow-hidden text-sm">
          <Link to={`/trips/${trip.id}`} className="px-3 py-1.5 hover:bg-accent">
            📋 Itinerary
          </Link>
          <Link
            to={`/trips/${trip.id}/budget`}
            className="px-3 py-1.5 hover:bg-accent border-l"
          >
            💰 Budget
          </Link>
          <span className="px-3 py-1.5 bg-primary text-primary-foreground border-l">
            🎒 Packing
          </span>
        </div>
      </div>

      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-palm/15 text-brand-palm">
            <Backpack className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-brand-charcoal">
              {trip.name || 'Untitled boyscation'} · Packing
            </h1>
            <p className="text-sm text-brand-charcoal/70 italic">
              The dread of forgetting something, but managed.
            </p>
          </div>
        </div>
        {totalCount > 0 && (
          <div className="surface p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-brand-charcoal">
                {packedCount} / {totalCount} packed
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-brand-sand border">
              <div
                className="h-full bg-brand-palm transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {remainingByPerson.length > 0 && (
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 pt-1">
                {remainingByPerson.map(([who, n]) => (
                  <span key={who || '__unassigned__'}>
                    {who || 'Unassigned'}: {n} left
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <section className="mb-6 surface p-4">
        <h2 className="font-heading text-base font-bold mb-3">Add an item</h2>
        <form
          onSubmit={handleAdd}
          className="grid gap-2 sm:grid-cols-[1fr_90px_180px_auto]"
        >
          <div className="space-y-1">
            <Label htmlFor="pack-name" className="text-xs uppercase tracking-wide text-muted-foreground">
              Name
            </Label>
            <Input
              id="pack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunscreen, the good kind"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pack-qty" className="text-xs uppercase tracking-wide text-muted-foreground">
              Qty
            </Label>
            <Input
              id="pack-qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pack-assignee" className="text-xs uppercase tracking-wide text-muted-foreground">
              For
            </Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="pack-assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ASSIGNEE_NONE}>— anyone —</SelectItem>
                {travelers.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Quick add
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => {
              const already = items.some((i) => i.name.toLowerCase() === s.toLowerCase())
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => void handleQuickAdd(s)}
                  disabled={already}
                  className={`text-xs rounded-full border px-2.5 py-1 transition-colors ${
                    already
                      ? 'bg-brand-sand text-muted-foreground border-transparent line-through'
                      : 'bg-background hover:bg-accent text-brand-charcoal'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {totalCount > 0 && (
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="pack-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
              Show
            </Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger id="pack-filter" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Everyone</SelectItem>
                <SelectItem value={ASSIGNEE_NONE}>Unassigned</SelectItem>
                {knownAssignees.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {packedCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void clearPackedItems(trip.id)}
            >
              <RotateCcw className="h-4 w-4" /> Uncheck all
            </Button>
          )}
        </div>
      )}

      {totalCount === 0 ? (
        <div className="surface rounded-2xl border-dashed py-12 text-center">
          <div className="text-4xl mb-2" aria-hidden>
            🎒
          </div>
          <p className="text-lg font-heading font-semibold text-brand-charcoal">
            Empty bag, empty mind.
          </p>
          <p className="text-muted-foreground">
            Add what you need above, or tap a quick-add suggestion.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-2">
          Nothing matches that filter.
        </p>
      ) : (
        <ul className="surface divide-y">
          {filtered.map((item) => (
            <PackingRow
              key={item.id}
              item={item}
              travelers={travelers}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function PackingRow({
  item,
  travelers,
}: {
  item: PackingItem
  travelers: string[]
}) {
  const [name, setName] = useState(item.name)
  const stale = item.assignee != null && !travelers.includes(item.assignee)

  const assigneeOptions = Array.from(
    new Set([...travelers, ...(item.assignee ? [item.assignee] : [])]),
  )

  return (
    <li className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_64px_140px_auto_auto] gap-x-3 gap-y-1 items-center px-4 py-2.5 text-sm">
      <Checkbox
        checked={item.checked}
        onCheckedChange={(c) => void togglePackingItem(item.id, c === true)}
        aria-label={`Mark ${item.name} as packed`}
      />
      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          queuePackingPatch(item.id, { name: e.target.value })
        }}
        className={`min-w-0 h-8 border-transparent hover:border-input focus:border-input bg-transparent ${
          item.checked ? 'line-through text-muted-foreground' : ''
        }`}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void deletePackingItem(item.id)}
        aria-label="Delete item"
        className="text-destructive hover:text-destructive sm:order-5"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <div className="col-start-2 sm:col-auto sm:order-3 flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={item.qty}
          onChange={(e) => {
            const n = Math.max(1, Math.floor(Number(e.target.value) || 1))
            queuePackingPatch(item.id, { qty: n }, true)
          }}
          className="w-16 h-8 tabular-nums"
          aria-label="Quantity"
        />
        <Select
          value={item.assignee ?? ASSIGNEE_NONE}
          onValueChange={(v) =>
            queuePackingPatch(item.id, { assignee: v === ASSIGNEE_NONE ? null : v }, true)
          }
        >
          <SelectTrigger className="w-[140px] h-8 sm:order-4">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ASSIGNEE_NONE}>— anyone —</SelectItem>
            {assigneeOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
                {!travelers.includes(t) ? ' (off trip)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stale && (
          <span className="text-xs text-brand-sunset" title="Assigned to someone not on this trip">
            ⚠️
          </span>
        )}
      </div>
    </li>
  )
}
