import { type JSX, useCallback } from "react"

import { Copy, CreditCard, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type Order } from "~/src/modules/order/order.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

export const OrderPaymentCard = ({ currencyCode, payment }: Readonly<OrderPaymentCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  const transactionId = payment?.transactionId
  const handleCopyTransactionId = useCallback(() => {
    if (transactionId === undefined) {
      return
    }
    void navigator.clipboard.writeText(transactionId)
    toast.success(t("orderDetail.paymentDetails.copied"))
  }, [t, transactionId])

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-medium">{t("orderDetail.paymentDetails.title")}</p>
        {payment === undefined ? (
          <p className="text-[13px] text-muted-foreground">{t("orderDetail.paymentDetails.missing")}</p>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <CreditCard className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="text-muted-foreground capitalize">{payment.provider}</span>
              <span className="ml-auto font-mono text-xs">{formatPrice(payment.amountMinorUnits, currencyCode, locale)}</span>
            </div>
            {transactionId !== undefined && (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground/40">
                  <span className="font-mono text-[10px]">#</span>
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">{transactionId}</span>
                <Button
                  aria-label={t("orderDetail.paymentDetails.copy")}
                  className="ml-auto size-6 shrink-0 text-muted-foreground/40"
                  onClick={handleCopyTransactionId}
                  size="icon"
                  variant="ghost"
                >
                  <Copy className="size-3" strokeWidth={1.5} />
                </Button>
              </div>
            )}
            {payment.refundedAmountMinorUnits > 0 && (
              <div className="flex items-center gap-2.5 text-sm">
                <RotateCcw className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
                <span className="text-muted-foreground">
                  {t("orderDetail.paymentDetails.refunded")}
                  {payment.refundedAt === undefined
                    ? ""
                    : ` · ${format.dateTime(payment.refundedAt, { day: "numeric", month: "short", year: "numeric" })}`}
                </span>
                <span className="ml-auto font-mono text-xs text-red-500">
                  −{formatPrice(payment.refundedAmountMinorUnits, currencyCode, locale)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OrderPaymentCardProps {
  readonly currencyCode: string
  readonly payment: Order["adminOrderDetail"]["payment"]
}
