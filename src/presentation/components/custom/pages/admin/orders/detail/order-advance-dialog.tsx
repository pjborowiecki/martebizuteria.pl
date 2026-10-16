import { type JSX } from "react"

import { CheckCheck, type LucideIcon, Package } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type AdminOrderAdvancedStep } from "~/src/modules/order/order.constants"

import { OrderCustomerEmailNote } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-customer-email-note"
import { OrderStepConfirmDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-step-confirm-dialog"

const STEP_ICONS: Readonly<Record<OrderAdvanceDialogProps["step"], LucideIcon>> = { delivered: CheckCheck, processing: Package }

export const OrderAdvanceDialog = ({
  displayId,
  emailedSteps,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  step,
}: Readonly<OrderAdvanceDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.advanceDialog")

  return (
    <OrderStepConfirmDialog
      cancelLabel={t("cancel")}
      confirmLabel={t(`${step}.confirm`)}
      description={
        <>
          <span className="block">{t(`${step}.description`, { id: displayId })}</span>
          <OrderCustomerEmailNote emailedSteps={emailedSteps} step={step} />
        </>
      }
      icon={STEP_ICONS[step]}
      isPending={isPending}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={open}
      title={t(`${step}.title`)}
    />
  )
}

interface OrderAdvanceDialogProps {
  readonly displayId: string
  readonly emailedSteps: readonly AdminOrderAdvancedStep[]
  readonly isPending: boolean
  readonly onConfirm: () => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly step: Exclude<AdminOrderAdvancedStep, "shipped">
}
