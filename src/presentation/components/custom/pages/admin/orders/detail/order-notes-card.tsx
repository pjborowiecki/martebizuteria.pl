import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

export const OrderNotesCard = ({ customerNote }: Readonly<OrderNotesCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-medium">{t("orderDetail.notes.title")}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{customerNote ?? t("orderDetail.notes.empty")}</p>
      </CardContent>
    </Card>
  )
}

interface OrderNotesCardProps {
  readonly customerNote: string | undefined
}
