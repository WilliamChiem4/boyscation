import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

export function useObjectURL(imageId: string | null | undefined): string | null {
  const blob = useLiveQuery(async () => {
    if (!imageId) return null
    const record = await db.images.get(imageId)
    return record?.blob ?? null
  }, [imageId])

  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}
