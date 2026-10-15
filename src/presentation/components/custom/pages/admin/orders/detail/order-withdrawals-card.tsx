import { type JSX } from "react"

import { cn } from "cn"
import { Undo2 } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { ORDER_WITHDRAWAL_SCOPE } from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { type Order } from "~/src/modules/order/order.types"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CONTENT_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

export const OrderWithdrawalsCard = ({ withdrawals }: Readonly<OrderWithdrawalsCardProps>): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.orderDetail.withdrawals")
  const format = useFormatter()

  if (withdrawals.length === 0) {
    return undefined
  }

  return (
    <Card className={cn(ORDER_DETAIL_CARD_CLASS, "border-amber-500/40")}>
      <CardContent className={ADMIN_CARD_CONTENT_CLASS}>
        <div className="mb-3 flex items-center gap-2">
          <Undo2 aria-hidden className="size-4 text-amber-600" strokeWidth={1.75} />
          <p className="text-sm font-medium">{t("title")}</p>
        </div>
        <ul className="space-y-4 text-[13px]">
          {withdrawals.map((withdrawal) => (
            <li className="space-y-1" key={withdrawal.id}>
              <p className="font-medium">{withdrawal.scope === ORDER_WITHDRAWAL_SCOPE.ORDER ? t("wholeOrder") : t("someItems")}</p>
              {withdrawal.items === undefined ? undefined : <p className="whitespace-pre-line">{withdrawal.items}</p>}
              <p className="text-muted-foreground">
                {t("submittedAt", { date: format.dateTime(withdrawal.submittedAt, { dateStyle: "medium", timeStyle: "short" }) })}
              </p>
              <p className="text-muted-foreground">{t("consumer", { email: withdrawal.email, name: withdrawal.consumerName })}</p>
              <p className="text-muted-foreground">
                {withdrawal.reason === undefined ? t("noReason") : t("reason", { reason: withdrawal.reason })}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

interface OrderWithdrawalsCardProps {
  readonly withdrawals: Order["adminOrderDetail"]["withdrawals"]
}
