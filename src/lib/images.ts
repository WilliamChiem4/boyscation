import { nanoid } from 'nanoid'
import { db } from './db'
import type { StoredImage, TripExportImage } from './types'

const MAX_DIMENSION = 1600
const OUTPUT_MIME = 'image/webp'
const OUTPUT_QUALITY = 0.85

export async function downscaleAndStore(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION)
  const blob = await encodeBitmap(bitmap, width, height)
  bitmap.close()

  const id = nanoid()
  const record: StoredImage = { id, blob, mimeType: OUTPUT_MIME }
  await db.images.put(record)
  return id
}

function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h }
  const scale = Math.min(max / w, max / h)
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

async function encodeBitmap(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await canvas.convertToBlob({ type: OUTPUT_MIME, quality: OUTPUT_QUALITY })
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
      OUTPUT_MIME,
      OUTPUT_QUALITY,
    )
  })
}

export async function deleteImage(id: string): Promise<void> {
  await db.images.delete(id)
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return await res.blob()
}

export async function exportImagesForTrip(imageIds: string[]): Promise<TripExportImage[]> {
  const unique = [...new Set(imageIds)]
  const results: TripExportImage[] = []
  for (const id of unique) {
    const record = await db.images.get(id)
    if (!record) continue
    const dataUrl = await blobToDataUrl(record.blob)
    results.push({ id: record.id, mimeType: record.mimeType, dataUrl })
  }
  return results
}

export async function importImages(images: TripExportImage[]): Promise<Map<string, string>> {
  const idMap = new Map<string, string>()
  for (const img of images) {
    const blob = await dataUrlToBlob(img.dataUrl)
    const newId = nanoid()
    await db.images.put({ id: newId, blob, mimeType: img.mimeType })
    idMap.set(img.id, newId)
  }
  return idMap
}
