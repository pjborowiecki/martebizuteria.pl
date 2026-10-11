import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/presentation/components/shadcn/tooltip"

import { ADMIN_HEADER_SECONDARY_BUTTON_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

export const OrderActionButton = ({ blockedReason, children, isPending, onClick }: Readonly<OrderActionButtonProps>): JSX.Element => {
  const button = (
    <Button
      className={cn(ADMIN_HEADER_SECONDARY_BUTTON_CLASS, "data-disabled:opacity-50")}
      disabled={isPending || blockedReason !== undefined}
      focusableWhenDisabled
      onClick={onClick}
      size="sm"
      variant="outline"
    >
      {children}
    </Button>
  )

  if (blockedReason === undefined) {
    return button
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="bottom">{blockedReason}</TooltipContent>
    </Tooltip>
  )
}

interface OrderActionButtonProps {
  readonly blockedReason: string | undefined
  readonly children: ReactNode
  readonly isPending: boolean
  readonly onClick: () => void
}
