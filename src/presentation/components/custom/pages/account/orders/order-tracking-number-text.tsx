import { type JSX } from "react"

export const TrackingNumberText = ({
  trackingNumber,
  trackingUrl,
}: Readonly<{
  trackingNumber: string
  trackingUrl?: string | undefined
}>): JSX.Element => {
  if (trackingUrl === undefined) {
    return <p className="text-[11px] text-muted-foreground tabular-nums">{trackingNumber}</p>
  }

  return (
    <a className="text-[11px] text-muted-foreground tabular-nums underline" href={trackingUrl} rel="noopener noreferrer" target="_blank">
      {trackingNumber}
    </a>
  )
}
