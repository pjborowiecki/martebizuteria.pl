import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

export const OrderTagsCard = ({ tags }: Readonly<OrderTagsCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-medium">{t("orderDetail.tags.title")}</p>
        {tags.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("orderDetail.tags.empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge className="text-[11px]" key={tag} variant="secondary">
                {t(`orderDetail.tags.labels.${tag}`)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OrderTagsCardProps {
  readonly tags: Order["adminOrderDetail"]["tags"]
}
