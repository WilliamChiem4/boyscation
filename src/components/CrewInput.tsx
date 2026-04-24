import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  id?: string
  className?: string
}

export function CrewInput({ value, onChange, placeholder, id, className }: Props) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function commit(raw: string) {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const lower = new Set(value.map((v) => v.toLowerCase()))
    const next = [...value]
    for (const p of parts) {
      if (!lower.has(p.toLowerCase())) {
        next.push(p)
        lower.add(p.toLowerCase())
      }
    }
    if (next.length !== value.length) onChange(next)
    setDraft('')
  }

  function removeAt(i: number) {
    const next = value.filter((_, idx) => idx !== i)
    onChange(next)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      if (draft.trim()) {
        e.preventDefault()
        commit(draft)
      } else if (e.key === 'Enter') {
        // allow form submit if draft is empty
      }
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault()
      removeAt(value.length - 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text')
    if (text.includes(',')) {
      e.preventDefault()
      commit(text)
    }
  }

  function handleBlur() {
    if (draft.trim()) commit(draft)
  }

  return (
    <div
      className={cn(
        'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((name, i) => (
        <span
          key={`${name}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-brand-sand px-2.5 py-0.5 text-sm text-brand-charcoal"
        >
          {name}
          <button
            type="button"
            aria-label={`Remove ${name}`}
            onClick={(e) => {
              e.stopPropagation()
              removeAt(i)
            }}
            className="rounded-full text-brand-charcoal/60 hover:text-brand-sunset focus:outline-none focus:text-brand-sunset"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[8rem] bg-transparent outline-none placeholder:text-muted-foreground py-0.5"
      />
    </div>
  )
}
