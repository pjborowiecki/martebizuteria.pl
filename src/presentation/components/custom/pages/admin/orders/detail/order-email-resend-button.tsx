import { type JSX } from "react"

import { Loader2, RotateCw } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { useResendOrderEmail } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

export const OrderEmailResendButton = ({ eventId, orderId }: Readonly<OrderEmailResendButtonProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.timeline")
  const resendEmail = useResendOrderEmail()

  return (
    <Button
      className="mt-1.5 h-7 gap-1.5 px-2.5 text-[12px]"
      disabled={resendEmail.isPending}
      onClick={() => {
        resendEmail.mutate({ eventId, orderId })
      }}
      size="sm"
      variant="outline"
    >
      {resendEmail.isPending ? (
        <Loader2 aria-hidden className="size-3 animate-spin" />
      ) : (
        <RotateCw aria-hidden className="size-3" strokeWidth={1.5} />
      )}
      {t("resendEmail")}
    </Button>
  )
}

interface OrderEmailResendButtonProps {
  readonly eventId: string
  readonly orderId: string
}
