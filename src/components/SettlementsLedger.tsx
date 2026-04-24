import { useState } from 'react'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addSettlement, deleteSettlement } from '@/lib/autosave'
import { formatMoney } from '@/lib/budget'
import type { Settlement } from '@/lib/types'

type Props = {
  tripId: string
  travelers: string[]
  currency: string
  settlements: Settlement[]
}

export function SettlementsLedger({ tripId, travelers, currency, settlements }: Props) {
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    const n = Number(amount)
    if (!from || !to) {
      setError('Pick who paid whom.')
      return
    }
    if (from === to) {
      setError('From and To must be different.')
      return
    }
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a positive amount.')
      return
    }
    setError(null)
    await addSettlement(tripId, { from, to, amount: n, note: note.trim() })
    setAmount('')
    setNote('')
  }

  const peopleOptions = travelers.filter(Boolean)

  return (
    <div className="mt-8">
      <h3 className="font-heading text-lg font-bold mb-2">💸 Settlements</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Record cash or Venmo handoffs. These adjust the balances above.
      </p>

      {settlements.length > 0 && (
        <ul className="surface divide-y mb-4">
          {settlements.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
            >
              <span className="inline-flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                <span className="font-medium">{s.from}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{s.to}</span>
                {s.note && (
                  <span className="text-muted-foreground italic">· {s.note}</span>
                )}
              </span>
              <span className="tabular-nums font-medium">
                {formatMoney(s.amount, currency)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void deleteSettlement(s.id)}
                title="Remove"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {peopleOptions.length < 2 ? (
        <p className="text-sm text-muted-foreground italic">
          Add at least two people to the crew to record a settlement.
        </p>
      ) : (
        <div className="surface p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_140px]">
            <div className="space-y-1">
              <Label htmlFor="settle-from" className="text-xs uppercase tracking-wide text-muted-foreground">
                From
              </Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger id="settle-from">
                  <SelectValue placeholder="Who paid" />
                </SelectTrigger>
                <SelectContent>
                  {peopleOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-center pb-2 text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="settle-to" className="text-xs uppercase tracking-wide text-muted-foreground">
                To
              </Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger id="settle-to">
                  <SelectValue placeholder="Paid to" />
                </SelectTrigger>
                <SelectContent>
                  {peopleOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="settle-amount" className="text-xs uppercase tracking-wide text-muted-foreground">
                Amount ({currency})
              </Label>
              <Input
                id="settle-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional) — e.g. Venmo 4/22"
            />
            <Button type="button" onClick={() => void handleAdd()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  )
}
