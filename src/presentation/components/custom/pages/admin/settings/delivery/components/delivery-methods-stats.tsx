import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { resolveDeliveryMethodStatus } from "~/src/modules/delivery-method/delivery-method.utils"
import { listAdminDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-admin-delivery-methods"
import { getAdminFreeDeliveryQuery } from "~/src/modules/store-setting/use-cases/get-free-delivery"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { ADMIN_STAT_GRID_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import {
  DELIVERY_METHOD_STAT_CARDS,
  FREE_DELIVERY_STAT_CARD,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-methods-stats.config"
import { useDeliveryMethodsDataGridContext } from "~/src/presentation/components/custom/pages/admin/settings/delivery/hooks/use-delivery-methods-data-grid"
import { SettingsStatCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-stat-card"

const PERCENT_SCALE = 100

export const DeliveryMethodsStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.stats")
  const formatLocale = useFormatLocale()
  const methods = useSuspenseQuery(listAdminDeliveryMethodsQuery())
  const freeDelivery = useSuspenseQuery(getAdminFreeDeliveryQuery())
  const { activeStatus, applyStatusFilter } = useDeliveryMethodsDataGridContext()
  const total = methods.data.methods.length
  const { threshold } = freeDelivery.data

  return (
    <div className={ADMIN_STAT_GRID_CLASS}>
      {DELIVERY_METHOD_STAT_CARDS.map((config) => {
        const count = methods.data.methods.filter((method) => resolveDeliveryMethodStatus(method) === config.status).length
        const pressed = activeStatus === config.status

        return (
          <SettingsStatCard
            caption={t("shareCaption", { percent: total === 0 ? 0 : Math.round((count / total) * PERCENT_SCALE) })}
            config={config}
            key={config.status}
            label={t(`${config.status}.label`)}
            onFilter={() => {
              applyStatusFilter(pressed ? undefined : config.status)
            }}
            pressed={pressed}
            value={count.toLocaleString(formatLocale)}
            valuesPending={methods.isFetching && methods.isStale}
          />
        )
      })}
      <SettingsStatCard
        caption={threshold === undefined ? t("freeDelivery.offCaption") : t("freeDelivery.onCaption")}
        config={FREE_DELIVERY_STAT_CARD}
        label={t("freeDelivery.label")}
        pressed={false}
        value={threshold === undefined ? t("freeDelivery.off") : formatPrice(threshold, STORE_CURRENCY_CODE, formatLocale)}
        valuesPending={freeDelivery.isFetching && freeDelivery.isStale}
      />
    </div>
  )
}
