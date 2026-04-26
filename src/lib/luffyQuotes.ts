export const LUFFY_QUOTES = [
  "I'm gonna be King of the Pirates! 👒",
  'Shishishi! 🏴‍☠️',
  'I want MEAT! 🍖',
  "If I die tryin', then at least I tried!",
  "I don't wanna conquer anything — I just think the Pirate King has the most freedom!",
  "Let's go on an adventure!",
  "Power isn't determined by your size, but by the size of your dreams!",
  'Yosh! Set sail! ⚓',
  'I refuse!',
  'Nakama! 🤝',
] as const

export function pickLuffyQuote(prev?: string | null): string {
  if (LUFFY_QUOTES.length <= 1) return LUFFY_QUOTES[0]
  const pool = prev ? LUFFY_QUOTES.filter((q) => q !== prev) : LUFFY_QUOTES
  return pool[Math.floor(Math.random() * pool.length)]
}
