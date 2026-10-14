import { type JSX } from "react"

export const CouponCodeCell = ({ code, description }: Readonly<{ code: string; description: string | undefined }>): JSX.Element => (
  <div className="flex h-9 min-w-0 flex-col justify-center gap-1">
    <span className="truncate font-mono text-xs leading-none font-medium">{code}</span>
    {description !== undefined && <span className="truncate text-[11px] leading-none text-muted-foreground">{description}</span>}
  </div>
)
