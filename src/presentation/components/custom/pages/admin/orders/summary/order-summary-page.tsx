import { type JSX, useCallback } from "react"

import { ArrowLeft, Printer } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { useAdminLightTheme } from "~/src/presentation/theme/use-admin-light-theme"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { OrderSummaryLines } from "~/src/presentation/components/custom/pages/admin/orders/summary/order-summary-lines"
import { OrderSummaryParties } from "~/src/presentation/components/custom/pages/admin/orders/summary/order-summary-parties"

import { ROUTES } from "~/src/routes"

export const OrderSummaryPage = ({ order }: Readonly<OrderSummaryPageProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderSummary")
  const format = useFormatter()
  useAdminLightTheme()

  const handlePrint = useCallback(() => {
    globalThis.print()
  }, [])

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-10 px-6 py-10 print:max-w-none print:p-0">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <LocalizedLink
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            params={{ orderId: order.id }}
            to={ROUTES.ADMIN_ORDER}
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            {t("backToOrder")}
          </LocalizedLink>
          <Button onClick={handlePrint} size="sm">
            <Printer className="size-3.5" strokeWidth={1.5} />
            {t("print")}
          </Button>
        </div>

        <header className="space-y-5">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[13px]">
            <dt className="text-muted-foreground">{t("orderNumber")}</dt>
            <dd className="font-medium">{order.displayId}</dd>
            <dt className="text-muted-foreground">{t("orderDate")}</dt>
            <dd>{format.dateTime(order.createdAt, { dateStyle: "long" })}</dd>
          </dl>
          <p className="border border-foreground px-4 py-3 text-[13px] font-medium" role="note">
            {t("notVatInvoice")}
          </p>
        </header>

        <OrderSummaryParties order={order} />
        <OrderSummaryLines order={order} />
      </div>
    </main>
  )
}

interface OrderSummaryPageProps {
  readonly order: Order["adminOrderDetail"]
}
