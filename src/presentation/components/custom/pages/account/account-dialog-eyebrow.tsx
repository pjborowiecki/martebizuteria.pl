import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

export const AccountDialogEyebrow = ({ children, destructive = false }: Readonly<AccountDialogEyebrowProps>): JSX.Element => (
  <p className={cn("text-[11px] tracking-[0.2em] uppercase", destructive ? "text-destructive" : "text-muted-foreground")}>{children}</p>
)

interface AccountDialogEyebrowProps {
  readonly children: ReactNode
  readonly destructive?: boolean
}
