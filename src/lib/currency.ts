// Rates relative to USD as of early 2026. Display-only estimates; update periodically.
export const RATES_PER_USD: Record<string, number> = {
  USD: 1,
  VND: 25000,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 150,
  CAD: 1.36,
  AUD: 1.51,
  MXN: 17.5,
  CHF: 0.88,
  THB: 35,
  SGD: 1.34,
  KRW: 1350,
}

export const CURRENCY_CODES = Object.keys(RATES_PER_USD)

export function canConvert(from: string, to: string): boolean {
  const f = normalize(from)
  const t = normalize(to)
  return f in RATES_PER_USD && t in RATES_PER_USD && f !== t
}

export function convert(amount: number, from: string, to: string): number {
  const f = normalize(from)
  const t = normalize(to)
  const fromRate = RATES_PER_USD[f]
  const toRate = RATES_PER_USD[t]
  if (!fromRate || !toRate) return amount
  const inUsd = amount / fromRate
  return inUsd * toRate
}

function normalize(code: string): string {
  return (code || 'USD').trim().toUpperCase()
}
