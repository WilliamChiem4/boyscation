import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { provisionTrip, type ProvisionResult } from '@/lib/sync'
import { isSupabaseConfigured } from '@/lib/supabase'
import { rememberSyncedTrip } from '@/lib/syncedTrips'
import { Copy, Check, Loader2, Share2 } from 'lucide-react'
import type { Trip } from '@/lib/types'

type Props = {
  trip: Trip
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildShareUrl(token: string): string {
  // Base path comes from Vite's `base` config; hash route handles everything after /#/
  const base = import.meta.env.BASE_URL || '/'
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${base}#/s/${token}`
}

export function ShareDialog({ trip, open, onOpenChange }: Props) {
  const [result, setResult] = useState<ProvisionResult | null>(() => {
    if (trip.syncedRole === 'admin' && trip.syncToken) {
      // Already synced — can't re-derive editor/viewer tokens without server call
      // For v1, show admin URL only (editor/viewer require going through Supabase dashboard or re-sharing from another device).
      return null
    }
    return null
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const alreadySynced = trip.syncedRole === 'admin' && trip.syncToken != null

  async function handleProvision() {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. See SUPABASE_SETUP.md.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const r = await provisionTrip(trip.id)
      setResult(r)
      rememberSyncedTrip({
        tripId: r.tripId,
        name: trip.name,
        role: 'admin',
        token: r.adminToken,
        addedAt: Date.now(),
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Share & sync
          </DialogTitle>
        </DialogHeader>
        {!isSupabaseConfigured && (
          <p className="text-sm text-destructive">
            Supabase isn't configured yet. Follow the steps in{' '}
            <code className="font-mono">SUPABASE_SETUP.md</code> to enable sharing.
          </p>
        )}
        {isSupabaseConfigured && !result && !alreadySynced && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload this trip to the cloud and get three shareable links. Friends don't need an
              account — the link is the key.
            </p>
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <p><strong>Admin</strong> — full control. Keep this for yourself.</p>
              <p><strong>Editor</strong> — can add & change activities.</p>
              <p><strong>Viewer</strong> — read-only, can submit ideas.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        {isSupabaseConfigured && alreadySynced && !result && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This trip is already synced. Your admin link:
            </p>
            <LinkRow
              label="Admin"
              url={buildShareUrl(trip.syncToken!)}
              copied={copied === 'Admin'}
              onCopy={() => copy('Admin', buildShareUrl(trip.syncToken!))}
            />
            <p className="text-xs text-muted-foreground">
              To get editor/viewer links, re-share from the Supabase dashboard or re-open the share
              dialog on another device.
            </p>
          </div>
        )}
        {result && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Done! Share these links with your crew.
            </p>
            <LinkRow
              label="Admin"
              url={buildShareUrl(result.adminToken)}
              warning
              copied={copied === 'Admin'}
              onCopy={() => copy('Admin', buildShareUrl(result.adminToken))}
            />
            <LinkRow
              label="Editor"
              url={buildShareUrl(result.editorToken)}
              copied={copied === 'Editor'}
              onCopy={() => copy('Editor', buildShareUrl(result.editorToken))}
            />
            <LinkRow
              label="Viewer"
              url={buildShareUrl(result.viewerToken)}
              copied={copied === 'Viewer'}
              onCopy={() => copy('Viewer', buildShareUrl(result.viewerToken))}
            />
            <p className="text-xs text-muted-foreground">
              Treat the admin link like a password. Anyone with it has full control.
            </p>
          </div>
        )}
        <DialogFooter>
          {!result && !alreadySynced && (
            <Button onClick={handleProvision} disabled={busy || !isSupabaseConfigured}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? 'Syncing…' : 'Sync to cloud'}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LinkRow({
  label,
  url,
  copied,
  onCopy,
  warning,
}: {
  label: string
  url: string
  copied: boolean
  onCopy: () => void
  warning?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className={warning ? 'text-destructive' : ''}>
        {label}
        {warning && ' (keep private!)'}
      </Label>
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
