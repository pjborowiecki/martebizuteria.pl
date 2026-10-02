import { type JSX } from "react"

import { cn } from "cn"
import { RotateCcw } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type AdminOrderRefundBlocker } from "~/src/modules/order/order.constants"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/presentation/components/shadcn/tooltip"

import { ADMIN_HEADER_SECONDARY_BUTTON_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

export const OrderRefundButton = ({ blocker, isPending, onClick }: Readonly<OrderRefundButtonProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail")
  const button = (
    <Button
      className={cn(ADMIN_HEADER_SECONDARY_BUTTON_CLASS, "data-disabled:opacity-50")}
      disabled={isPending || blocker !== undefined}
      focusableWhenDisabled
      onClick={onClick}
      size="sm"
      variant="outline"
    >
      <RotateCcw className="size-3.5" strokeWidth={1.5} />
      {t("actions.refund")}
    </Button>
  )

  if (blocker === undefined) {
    return button
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="bottom">{t(`refundBlocked.${blocker}`)}</TooltipContent>
    </Tooltip>
  )
}

interface OrderRefundButtonProps {
  readonly blocker: AdminOrderRefundBlocker | undefined
  readonly isPending: boolean
  readonly onClick: () => void
}
