import { useEffect, useRef, useState } from 'react'
import { subscribeAvatar } from '@/lib/avatarBus'

const SPEECH_DURATION_MS = 4500

export function AnimeAvatar() {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeAvatar((msg) => {
      setMessage(msg)
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(() => {
        setMessage(null)
        timerRef.current = null
      }, SPEECH_DURATION_MS)
    })
    return () => {
      unsubscribe()
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const talking = message !== null

  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex items-end gap-2 pointer-events-none">
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto relative max-w-[260px] mb-6 rounded-2xl bg-card/95 backdrop-blur-sm border border-border shadow-lg px-4 py-2.5 text-sm text-foreground animate-bubble-in"
        >
          <span className="font-medium leading-snug">{message}</span>
          <span
            aria-hidden
            className="absolute -bottom-2 right-6 w-4 h-4 rotate-45 bg-card/95 border-r border-b border-border"
          />
        </div>
      )}
      <button
        type="button"
        aria-label="Mascot"
        onClick={() => {
          if (timerRef.current != null) window.clearTimeout(timerRef.current)
          setMessage(null)
        }}
        className="pointer-events-auto animate-avatar-bob focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
      >
        <ChibiSvg talking={talking} />
      </button>
    </div>
  )
}

function ChibiSvg({ talking }: { talking: boolean }) {
  const STROKE = '#1F1A1A'
  const SKIN = '#FFD9B0'
  const HAT = '#F2C77E'
  const HAT_SHADOW = '#C99A4A'
  const HAT_BAND = '#C0392B'
  const VEST = '#D62828'
  const VEST_SHADOW = '#9F1F1F'
  const HAIR = '#1A1311'
  const SCAR = '#7A1F1F'

  return (
    <svg
      width="96"
      height="112"
      viewBox="0 0 96 112"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_6px_8px_rgba(31,26,26,0.35)]"
    >
      {/* Vest / body */}
      <path
        d="M22 96 Q48 76 74 96 L74 108 Q48 112 22 108 Z"
        fill={VEST}
        stroke={STROKE}
        strokeWidth="1.5"
      />
      {/* Vest opening (chest V) */}
      <path
        d="M44 78 L48 92 L52 78"
        fill={VEST_SHADOW}
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Neck */}
      <rect x="44" y="72" width="8" height="6" fill={SKIN} stroke={STROKE} strokeWidth="1" />

      {/* Head (round chibi) */}
      <ellipse
        cx="48"
        cy="48"
        rx="30"
        ry="30"
        fill={SKIN}
        stroke={STROKE}
        strokeWidth="1.5"
      />

      {/* Hair — short black tufts peeking under hat */}
      <path
        d="M20 44 Q22 34 30 32 Q34 38 38 36 Q42 30 48 32 Q54 30 58 36 Q62 38 66 32 Q74 34 76 44 Q70 38 60 40 Q54 36 48 38 Q42 36 36 40 Q26 38 20 44 Z"
        fill={HAIR}
        stroke={STROKE}
        strokeWidth="1"
      />
      {/* Side hair sideburns */}
      <path d="M19 46 Q18 56 22 60" stroke={HAIR} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M77 46 Q78 56 74 60" stroke={HAIR} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Straw hat brim — wide ellipse */}
      <ellipse
        cx="48"
        cy="26"
        rx="40"
        ry="6.5"
        fill={HAT}
        stroke={STROKE}
        strokeWidth="1.5"
      />
      {/* Brim shadow under */}
      <path
        d="M10 26 Q48 32 86 26 Q48 30 10 26 Z"
        fill={HAT_SHADOW}
        opacity="0.5"
      />
      {/* Hat dome */}
      <path
        d="M22 26 Q22 6 48 6 Q74 6 74 26 Z"
        fill={HAT}
        stroke={STROKE}
        strokeWidth="1.5"
      />
      {/* Red hat band */}
      <path
        d="M22 22 Q48 28 74 22 L74 26 Q48 32 22 26 Z"
        fill={HAT_BAND}
        stroke={STROKE}
        strokeWidth="1"
      />
      {/* Straw weave hint on dome */}
      <path d="M30 18 Q48 22 66 18" stroke={HAT_SHADOW} strokeWidth="0.8" fill="none" />
      <path d="M28 14 Q48 18 68 14" stroke={HAT_SHADOW} strokeWidth="0.8" fill="none" />
      <path d="M32 10 Q48 13 64 10" stroke={HAT_SHADOW} strokeWidth="0.8" fill="none" />

      {/* Eyes — big and round */}
      <g>
        <ellipse cx="36" cy="52" rx="4.5" ry="5.5" fill={STROKE} />
        <ellipse cx="60" cy="52" rx="4.5" ry="5.5" fill={STROKE} />
        {/* Highlights */}
        <circle cx="37.5" cy="50" r="1.6" fill="#FFFFFF" />
        <circle cx="61.5" cy="50" r="1.6" fill="#FFFFFF" />
      </g>

      {/* Signature scar under left eye (X) */}
      <g stroke={SCAR} strokeWidth="1.4" strokeLinecap="round">
        <line x1="30" y1="60" x2="34" y2="64" />
        <line x1="34" y1="60" x2="30" y2="64" />
      </g>

      {/* Mouth — wide grin, opens when talking */}
      {talking ? (
        <g>
          {/* Open shouting mouth */}
          <path
            d="M38 64 Q48 78 58 64 Q48 70 38 64 Z"
            fill="#7A1F1F"
            stroke={STROKE}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {/* Teeth top row */}
          <path d="M40 65 L56 65" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ) : (
        <path
          d="M38 63 Q48 72 58 63"
          stroke={STROKE}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}
