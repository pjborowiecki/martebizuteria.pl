import { type JSX } from "react"

import { ArrowDown, ArrowUp, Package, Store, Truck } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

const TYPE_ICONS: Record<DeliveryMethodType, typeof Truck> = { courier: Truck, in_store: Store, locker: Package }

export const DeliveryMethodRow = ({
  canMoveDown,
  canMoveUp,
  isMoving,
  method,
  onEdit,
  onMove,
}: Readonly<DeliveryMethodRowProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.methods")
  const locale = useLocale()
  const formatLocale = useFormatLocale()
  const name = resolveLocalizedString(method.names, locale)
  const Icon = TYPE_ICONS[method.type]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-5" data-slot="settings-row">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] leading-5 font-medium text-foreground">{name}</p>
        <p className="text-[12px] text-muted-foreground">
          {t(`types.${method.type}`)} · {method.courier.name}
        </p>
      </div>
      {!method.isActive && <Badge variant="secondary">{t("hidden")}</Badge>}
      {method.isActive && !method.courier.isActive && <Badge variant="secondary">{t("hiddenCarrier")}</Badge>}
      <span className="text-[13px] text-foreground tabular-nums">
        {method.price === 0 ? t("free") : formatPrice(method.price, STORE_CURRENCY_CODE, formatLocale)}
      </span>
      <div className="flex items-center gap-1">
        <Button
          aria-label={t("moveUp", { name })}
          disabled={!canMoveUp || isMoving}
          onClick={() => {
            onMove(-1)
          }}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ArrowUp aria-hidden />
        </Button>
        <Button
          aria-label={t("moveDown", { name })}
          disabled={!canMoveDown || isMoving}
          onClick={() => {
            onMove(1)
          }}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ArrowDown aria-hidden />
        </Button>
        <Button onClick={onEdit} size="sm" type="button" variant="outline">
          {t("edit")}
        </Button>
      </div>
    </div>
  )
}

interface DeliveryMethodRowProps {
  readonly canMoveDown: boolean
  readonly canMoveUp: boolean
  readonly isMoving: boolean
  readonly method: DeliveryMethod["adminMethod"]
  readonly onEdit: () => void
  readonly onMove: (offset: -1 | 1) => void
}
