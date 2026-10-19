import { type JSX, useCallback, useState } from "react"

import { Undo2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { INPOST_CANCELED_SHIPMENT_STATUS } from "~/src/integrations/inpost/inpost.constants"

import { ADMIN_ORDER_FULFILLMENT_LABEL_KEYS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { resolveAdminOrderStepBack } from "~/src/modules/order/order.utils"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { OrderStepConfirmDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-step-confirm-dialog"
import { useStepBackOrder } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

const OrderStepBackControl = ({ order, stepBack }: Readonly<OrderStepBackControlProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const stepBackOrder = useStepBackOrder()
  const [open, setOpen] = useState(false)
  const keepsInpostShipment =
    stepBack.from === "shipped" && order.inpostShipment !== undefined && order.inpostShipment.status !== INPOST_CANCELED_SHIPMENT_STATUS

  const handleOpen = useCallback(() => {
    setOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    stepBackOrder.mutate(
      { fromStep: stepBack.from, orderId: order.id },
      {
        onSuccess: () => {
          setOpen(false)
        },
      },
    )
  }, [order.id, stepBack.from, stepBackOrder])

  return (
    <>
      <Button className="h-7 gap-1.5 px-2 text-[12px]" disabled={stepBackOrder.isPending} onClick={handleOpen} size="sm" variant="ghost">
        <Undo2 className="size-3.5" strokeWidth={1.5} />
        {t("orderDetail.stepBack.action")}
      </Button>
      <OrderStepConfirmDialog
        cancelLabel={t("orderDetail.stepBack.cancel")}
        confirmLabel={t("orderDetail.stepBack.confirm")}
        description={
          <>
            <span className="block">
              {t("orderDetail.stepBack.description", {
                from: t(`orders.${ADMIN_ORDER_FULFILLMENT_LABEL_KEYS[stepBack.from]}`),
                id: order.displayId,
                to: t(`orders.${ADMIN_ORDER_FULFILLMENT_LABEL_KEYS[stepBack.to]}`),
              })}
            </span>
            <AdminDialogNote kind="email">{t("orderDetail.stepBack.emailNote")}</AdminDialogNote>
            {keepsInpostShipment && <AdminDialogNote kind="warning">{t("orderDetail.stepBack.inpostWarning")}</AdminDialogNote>}
          </>
        }
        icon={Undo2}
        isPending={stepBackOrder.isPending}
        onConfirm={handleConfirm}
        onOpenChange={setOpen}
        open={open}
        title={t("orderDetail.stepBack.title")}
      />
    </>
  )
}

export const OrderStepBackAction = ({ order }: Readonly<OrderStepBackActionProps>): JSX.Element | undefined => {
  const stepBack = resolveAdminOrderStepBack(order)

  return stepBack === undefined ? undefined : <OrderStepBackControl order={order} stepBack={stepBack} />
}

interface OrderStepBackActionProps {
  readonly order: Order["adminOrderDetail"]
}

interface OrderStepBackControlProps extends OrderStepBackActionProps {
  readonly stepBack: Order["stepBack"]
}
