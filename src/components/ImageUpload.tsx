import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useObjectURL } from '@/hooks/useObjectURL'
import { downscaleAndStore } from '@/lib/images'
import { setActivityImage } from '@/lib/autosave'
import { ImagePlus, X, Loader2 } from 'lucide-react'

type Props = {
  activityId: string
  imageId: string | null
  onExpand?: (url: string) => void
}

export function ImageUpload({ activityId, imageId, onExpand }: Props) {
  const url = useObjectURL(imageId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setLoading(true)
    try {
      const newId = await downscaleAndStore(file)
      await setActivityImage(activityId, newId)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    await setActivityImage(activityId, null)
  }

  if (url) {
    return (
      <div className="relative group w-full">
        <button
          type="button"
          className="block w-full"
          onClick={() => onExpand?.(url)}
          aria-label="Expand image"
        >
          <img
            src={url}
            alt=""
            className="w-full h-40 object-cover rounded-md border"
            loading="lazy"
          />
        </button>
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove image"
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <label
      className={`flex flex-col items-center justify-center h-32 w-full rounded-md border-2 border-dashed cursor-pointer transition-colors ${
        dragOver ? 'border-primary bg-accent' : 'border-border hover:border-foreground/30'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) void handleFile(file)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ''
        }}
      />
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-1">Processing…</span>
        </>
      ) : (
        <>
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-1">
            Drop image or click to upload
          </span>
        </>
      )}
    </label>
  )
}

export function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
      onClick={onClose}
    >
      <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  )
}
