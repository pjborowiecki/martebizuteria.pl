import { type JSX, type ReactNode } from "react"

import { XCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CONTENT_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { FulfillmentStepItem } from "~/src/presentation/components/custom/pages/admin/orders/detail/fulfillment-step-item"
import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

export const OrderFulfillmentTracker = ({ canceledAt, children, steps }: Readonly<OrderFulfillmentTrackerProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className={ADMIN_CARD_CONTENT_CLASS}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">{t("orderDetail.fulfillment.title")}</p>
          {children}
        </div>
        {canceledAt === undefined ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
            {steps.map((step, index) => (
              <FulfillmentStepItem index={index} key={step.key} step={step} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-sm text-red-500">
            <XCircle className="size-4 shrink-0" strokeWidth={1.5} />
            <span>
              {t("orderDetail.fulfillment.cancelledAt", {
                date: format.dateTime(canceledAt, { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short", year: "numeric" }),
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OrderFulfillmentTrackerProps {
  readonly canceledAt: Date | undefined
  readonly children?: ReactNode
  readonly steps: Order["adminOrderDetail"]["fulfillmentSteps"]
}
