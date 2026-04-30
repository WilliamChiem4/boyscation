const STORAGE_KEY = 'boyscation.guestNames'

type GuestNameMap = Record<string, string>

function read(): GuestNameMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as GuestNameMap
  } catch {
    return {}
  }
}

function write(map: GuestNameMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getGuestName(tripId: string): string | null {
  return read()[tripId] ?? null
}

export function setGuestName(tripId: string, name: string): void {
  const map = read()
  map[tripId] = name
  write(map)
}

export function clearGuestName(tripId: string): void {
  const map = read()
  delete map[tripId]
  write(map)
}
