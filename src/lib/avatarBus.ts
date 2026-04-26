type Listener = (msg: string) => void

const listeners = new Set<Listener>()

export function avatarSay(msg: string) {
  listeners.forEach((l) => l(msg))
}

export function subscribeAvatar(l: Listener): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
