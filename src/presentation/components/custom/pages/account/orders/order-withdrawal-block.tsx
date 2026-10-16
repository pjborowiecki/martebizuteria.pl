import { type JSX, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { ORDER_WITHDRAWAL_SCOPE } from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { getCustomerOrderWithdrawalQuery } from "~/src/modules/order-withdrawal/use-cases/get-customer-order-withdrawal"

import { useFormatter } from "~/src/hooks/use-display-format"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { OrderWithdrawalDialog } from "~/src/presentation/components/custom/pages/account/orders/order-withdrawal-dialog"

export const OrderWithdrawalBlock = ({ order }: Readonly<{ order: CustomerAccount["orderDetail"] }>): JSX.Element | undefined => {
  const t = useTranslations("pages.withdrawal")
  const format = useFormatter()
  const { data: withdrawal } = useSuspenseQuery(getCustomerOrderWithdrawalQuery(order.id))
  const [open, setOpen] = useState(false)

  if (!withdrawal.canWithdraw && withdrawal.statements.length === 0) {
    return undefined
  }

  const openDialog = (): void => {
    setOpen(true)
  }

  return (
    <section className="mt-10">
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("account.title")}</h3>
      <Separator className="mt-3 mb-4" />
      {withdrawal.statements.map((statement) => (
        <div className="mb-4 space-y-1 text-[13px] leading-relaxed" key={statement.id}>
          <p>{t("account.statement", { date: format.dateTime(statement.submittedAt, { dateStyle: "long", timeStyle: "short" }) })}</p>
          <p className="whitespace-pre-line text-muted-foreground">
            {statement.scope === ORDER_WITHDRAWAL_SCOPE.ORDER ? t("form.scope.order") : statement.items}
          </p>
        </div>
      ))}
      {withdrawal.canWithdraw ? (
        <>
          <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">{t("account.description")}</p>
          <Button className="mt-4" onClick={openDialog} size="account-sm" variant="account-outline">
            {t("account.action")}
          </Button>
          <OrderWithdrawalDialog onOpenChange={setOpen} open={open} order={order} withdrawal={withdrawal} />
        </>
      ) : undefined}
    </section>
  )
}
