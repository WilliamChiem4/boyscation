import type { Activity, Settlement } from './types'

export type Balances = Map<string, number>
export type Transfer = { from: string; to: string; amount: number }

export function effectiveSplitAmong(a: Activity, travelers: string[]): string[] {
  if (a.splitMode === 'equal') return travelers
  if (a.splitMode === 'except-payer') {
    return a.paidBy ? travelers.filter((t) => t !== a.paidBy) : travelers
  }
  return a.splitAmong
}

export function computeBalances(activities: Activity[], travelers: string[]): Balances {
  const balances: Balances = new Map()
  for (const t of travelers) balances.set(t, 0)

  for (const a of activities) {
    if (!a.cost || a.cost <= 0) continue
    if (!a.paidBy) continue
    const split = effectiveSplitAmong(a, travelers)
    if (!split || split.length === 0) continue

    balances.set(a.paidBy, (balances.get(a.paidBy) ?? 0) + a.cost)
    const share = a.cost / split.length
    for (const p of split) {
      balances.set(p, (balances.get(p) ?? 0) - share)
    }
  }
  return balances
}

export function applySettlements(balances: Balances, settlements: Settlement[]): Balances {
  for (const s of settlements) {
    if (!s.amount || s.amount <= 0) continue
    balances.set(s.from, (balances.get(s.from) ?? 0) + s.amount)
    balances.set(s.to, (balances.get(s.to) ?? 0) - s.amount)
  }
  return balances
}

const EPSILON = 0.01

export function minimizeTransfers(balances: Balances): Transfer[] {
  const creditors: Array<{ name: string; amount: number }> = []
  const debtors: Array<{ name: string; amount: number }> = []

  for (const [name, amount] of balances) {
    if (amount > EPSILON) creditors.push({ name, amount })
    else if (amount < -EPSILON) debtors.push({ name, amount: -amount })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < creditors.length && j < debtors.length) {
    const c = creditors[i]
    const d = debtors[j]
    const amount = Math.min(c.amount, d.amount)
    transfers.push({ from: d.name, to: c.name, amount })
    c.amount -= amount
    d.amount -= amount
    if (c.amount < EPSILON) i++
    if (d.amount < EPSILON) j++
  }
  return transfers
}

export function travelerIsActive(name: string, travelers: string[]): boolean {
  return travelers.includes(name)
}

export function collectKnownParties(activities: Activity[]): Set<string> {
  const names = new Set<string>()
  for (const a of activities) {
    if (a.paidBy) names.add(a.paidBy)
    for (const p of a.splitAmong ?? []) names.add(p)
  }
  return names
}
