import { type JSX, useId } from "react"

import { useTranslations } from "use-intl/react"

import { ORDER_TRACKING_NUMBER_MAX_LENGTH, ORDER_TRACKING_URL_MAX_LENGTH } from "~/src/modules/order/order.constants"

import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

export const OrderTrackingFields = ({
  onTrackingNumberChange,
  onTrackingUrlChange,
  trackingNumber,
  trackingNumberRequired,
  trackingUrl,
}: Readonly<OrderTrackingFieldsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.shipDialog")
  const trackingNumberId = useId()
  const trackingUrlId = useId()

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor={trackingNumberId}>{t("trackingNumberLabel")}</Label>
        <Input
          autoComplete="off"
          id={trackingNumberId}
          maxLength={ORDER_TRACKING_NUMBER_MAX_LENGTH}
          onChange={(event) => {
            onTrackingNumberChange(event.target.value)
          }}
          placeholder={t("trackingNumberPlaceholder")}
          required={trackingNumberRequired}
          value={trackingNumber}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={trackingUrlId}>{t("trackingUrlLabel")}</Label>
        <Input
          autoComplete="off"
          id={trackingUrlId}
          maxLength={ORDER_TRACKING_URL_MAX_LENGTH}
          onChange={(event) => {
            onTrackingUrlChange(event.target.value)
          }}
          placeholder={t("trackingUrlPlaceholder")}
          type="url"
          value={trackingUrl}
        />
      </div>
    </div>
  )
}

interface OrderTrackingFieldsProps {
  readonly onTrackingNumberChange: (trackingNumber: string) => void
  readonly onTrackingUrlChange: (trackingUrl: string) => void
  readonly trackingNumber: string
  readonly trackingNumberRequired: boolean
  readonly trackingUrl: string
}
