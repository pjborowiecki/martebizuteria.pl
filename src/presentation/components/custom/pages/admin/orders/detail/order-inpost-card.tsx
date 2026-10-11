import { type JSX, useCallback, useState } from "react"

import { FileDown, Loader2, PackagePlus, RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { INPOST_CANCELED_SHIPMENT_STATUS, type InpostParcelTemplate } from "~/src/integrations/inpost/inpost.constants"

import { canCreateAdminOrderInpostShipment, isInpostDeliveryType } from "~/src/modules/order/order.admin-actions.utils"
import { type InpostDeliveryType } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"
import { OrderInpostShipmentDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-inpost-shipment-dialog"
import {
  useCreateInpostShipment,
  useDownloadInpostLabel,
  useRefreshInpostShipment,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-inpost-shipment-actions"

const NAMED_SHIPMENT_STATUSES: ReadonlySet<string> = new Set([
  "canceled",
  "collected_from_sender",
  "confirmed",
  "created",
  "delivered",
  "dispatched_by_sender",
  "offer_selected",
  "offers_prepared",
  "out_for_delivery",
  "pickup_time_expired",
  "ready_to_pickup",
  "returned_to_sender",
  "taken_by_courier",
])

const InpostShipmentDetails = ({ configured, orderId, shipment }: Readonly<InpostShipmentDetailsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.inpost")
  const refreshShipment = useRefreshInpostShipment()
  const downloadLabel = useDownloadInpostLabel()
  const isPending = refreshShipment.isPending || downloadLabel.isPending
  const status =
    shipment.status === undefined || !NAMED_SHIPMENT_STATUSES.has(shipment.status) ? shipment.status : t(`statuses.${shipment.status}`)

  return (
    <>
      <dl className="space-y-1.5 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{t("shipmentLabel")}</dt>
          <dd className="font-mono text-xs">{shipment.id}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{t("statusLabel")}</dt>
          <dd>{status ?? t("statusUnknown")}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          className="gap-1.5"
          disabled={!configured || isPending}
          onClick={() => {
            refreshShipment.mutate({ orderId })
          }}
          size="sm"
          variant="outline"
        >
          {refreshShipment.isPending ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" strokeWidth={1.5} />
          )}
          {t("refresh")}
        </Button>
        <Button
          className="gap-1.5"
          disabled={!configured || isPending}
          onClick={() => {
            downloadLabel.mutate({ orderId })
          }}
          size="sm"
          variant="outline"
        >
          {downloadLabel.isPending ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <FileDown className="size-3.5" strokeWidth={1.5} />
          )}
          {t("label")}
        </Button>
      </div>
    </>
  )
}

const InpostShipmentCreator = ({ deliveryType, orderId }: Readonly<InpostShipmentCreatorProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.inpost")
  const createShipment = useCreateInpostShipment()
  const [dialogOpen, setDialogOpen] = useState(false)
  const handleConfirm = useCallback(
    (parcel: { readonly parcelTemplate: InpostParcelTemplate; readonly weightKg: number | undefined }) => {
      createShipment.mutate(
        { orderId, ...parcel },
        {
          onSuccess: () => {
            setDialogOpen(false)
          },
        },
      )
    },
    [createShipment, orderId],
  )

  return (
    <>
      <p className="text-[13px] text-muted-foreground">{t("createHint")}</p>
      <Button
        className="mt-4 gap-1.5"
        disabled={createShipment.isPending}
        onClick={() => {
          setDialogOpen(true)
        }}
        size="sm"
      >
        <PackagePlus className="size-3.5" strokeWidth={1.5} />
        {t("create")}
      </Button>
      <OrderInpostShipmentDialog
        deliveryType={deliveryType}
        isPending={createShipment.isPending}
        onConfirm={handleConfirm}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </>
  )
}

const InpostShipmentStart = ({ order }: Readonly<OrderInpostCardProps>): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.orderDetail.inpost")
  const deliveryType = order.delivery?.type

  if (!order.inpostConfigured) {
    return undefined
  }

  if (
    !isInpostDeliveryType(deliveryType) ||
    !canCreateAdminOrderInpostShipment({
      deliveryType,
      fulfillmentStatus: order.fulfillmentStatus,
      inpostShipmentId: order.inpostShipment?.id,
      inpostShipmentStatus: order.inpostShipment?.status,
      status: order.status,
    })
  ) {
    return <p className="text-[13px] text-muted-foreground">{t("notAvailable")}</p>
  }

  return <InpostShipmentCreator deliveryType={deliveryType} orderId={order.id} />
}

export const OrderInpostCard = ({ order }: Readonly<OrderInpostCardProps>): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.orderDetail.inpost")

  if (order.inpostShipment === undefined && !isInpostDeliveryType(order.delivery?.type)) {
    return undefined
  }

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-medium">{t("title")}</p>
        {order.inpostShipment === undefined ? (
          <InpostShipmentStart order={order} />
        ) : (
          <InpostShipmentDetails configured={order.inpostConfigured} orderId={order.id} shipment={order.inpostShipment} />
        )}
        {order.inpostConfigured && order.inpostShipment?.status === INPOST_CANCELED_SHIPMENT_STATUS && (
          <>
            <Separator className="my-4 bg-border/40" />
            <InpostShipmentStart order={order} />
          </>
        )}
        {!order.inpostConfigured && <p className="mt-3 text-[13px] text-muted-foreground">{t("notConfigured")}</p>}
      </CardContent>
    </Card>
  )
}

interface OrderInpostCardProps {
  readonly order: Order["adminOrderDetail"]
}

interface InpostShipmentDetailsProps {
  readonly configured: boolean
  readonly orderId: string
  readonly shipment: NonNullable<Order["adminOrderDetail"]["inpostShipment"]>
}

interface InpostShipmentCreatorProps {
  readonly deliveryType: InpostDeliveryType
  readonly orderId: string
}
