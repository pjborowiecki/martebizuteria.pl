import { type JSX, useCallback } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"
import { getCustomerOrderQuery } from "~/src/modules/customer-account/use-cases/get-customer-order"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { OrderItem } from "~/src/presentation/components/custom/pages/account/orders/order-detail-item"
import { OrderNoteBlock } from "~/src/presentation/components/custom/pages/account/orders/order-note-block"
import { PaymentInfoBlock } from "~/src/presentation/components/custom/pages/account/orders/order-payment-block"
import { ShipmentBanner } from "~/src/presentation/components/custom/pages/account/orders/order-shipment-banner"
import { ShippingBlock } from "~/src/presentation/components/custom/pages/account/orders/order-shipping-block"
import { TimelineBlock } from "~/src/presentation/components/custom/pages/account/orders/order-timeline-block"
import { OrderTotals } from "~/src/presentation/components/custom/pages/account/orders/order-totals"

import { ROUTES } from "~/src/routes"

const OrderDetailPage = (): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const format = useFormatter()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: order } = useSuspenseQuery(getCustomerOrderQuery(id))
  const handleBack = useCallback(() => {
    void navigate({
      to: ROUTES.ACCOUNT_ORDERS,
    })
  }, [navigate])

  return (
    <div>
      <Button className="mb-8 flex items-center gap-2" onClick={handleBack} variant="account-ghost">
        <ArrowLeft className="size-3.5" strokeWidth={1.5} />
        {t("backToOrders")}
      </Button>

      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-3xl leading-[0.94] tracking-tight lg:text-4xl">{order.orderNumber}</h1>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          <span>
            {format.dateTime(order.createdAt, {
              dateStyle: "medium",
            })}
          </span>
          <span className="text-border">·</span>
          <span>{t(`status.${order.filterStatus}`)}</span>
        </div>
      </div>

      <ShipmentBanner order={order} />

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("items")}</h2>
        <Separator className="mt-3 mb-0" />
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <OrderItem currencyCode={order.currencyCode} item={item} key={item.id} />
          ))}
        </div>
      </section>

      <OrderTotals order={order} />

      <Separator className="my-10" />

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        <ShippingBlock order={order} />
        <PaymentInfoBlock order={order} />
        <TimelineBlock order={order} />
      </div>

      <OrderNoteBlock note={order.customerNote} />

      <Separator className="my-10" />

      <LocalizedLink
        className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase underline underline-offset-4 hover:text-foreground"
        to={ROUTES.FAQ}
      >
        {t("needHelp")}
      </LocalizedLink>
    </div>
  )
}

export const Route = createFileRoute("/account/orders/$id")({
  component: OrderDetailPage,
  head: pageHead,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...getCustomerOrderQuery(params.id),
      staleTime: "static",
    })

    return accountPageMeta(context.queryClient, context.locale, "orders")
  },
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
})
