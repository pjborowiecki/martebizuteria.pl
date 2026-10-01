import { type JSX, useCallback } from "react"

import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/src/presentation/components/shadcn/button"

import { TrackingNumberText } from "~/src/presentation/components/custom/pages/account/orders/order-tracking-number-text"

export const TrackingNumberRow = ({
  trackingNumber,
  trackingUrl,
}: Readonly<{
  trackingNumber: string
  trackingUrl?: string | undefined
}>): JSX.Element => {
  const handleCopy = useCallback(() => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(trackingNumber)
        toast.success(trackingNumber)
      } catch {
        toast.error(trackingNumber)
      }
    })()
  }, [trackingNumber])

  return (
    <div className="mt-0.5 flex items-center gap-2">
      <TrackingNumberText trackingNumber={trackingNumber} trackingUrl={trackingUrl} />
      <Button onClick={handleCopy} size="icon-xs" variant="ghost">
        <Copy className="size-3" strokeWidth={1.5} />
      </Button>
    </div>
  )
}
