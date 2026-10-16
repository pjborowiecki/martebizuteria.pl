import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type AdminOrderAdvancedStep, ORDER_EMAIL_KIND_BY_ADVANCED_STEP } from "~/src/modules/order/order.constants"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"

export const OrderCustomerEmailNote = ({ emailedSteps, step }: Readonly<OrderCustomerEmailNoteProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const email = t(`audit.details.emails.${ORDER_EMAIL_KIND_BY_ADVANCED_STEP[step]}`)
  const alreadySent = emailedSteps.includes(step)

  return (
    <AdminDialogNote kind="email">
      {t(alreadySent ? "orderDetail.customerEmail.alreadySent" : "orderDetail.customerEmail.willSend", { email })}
      {alreadySent && step === "shipped" && ` ${t("orderDetail.customerEmail.trackingUpdate")}`}
    </AdminDialogNote>
  )
}

interface OrderCustomerEmailNoteProps {
  readonly emailedSteps: readonly AdminOrderAdvancedStep[]
  readonly step: AdminOrderAdvancedStep
}
