import { type JSX, useCallback } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Copy, Truck } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { formatCustomerOrderDisplayId } from "~/src/modules/customer-account/customer-account.utils"
import { getCustomerOrderQuery } from "~/src/modules/customer-account/use-cases/get-customer-order"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { Image } from "~/src/presentation/components/custom/image"

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

  const displayId = formatCustomerOrderDisplayId(order.id)
  const formatMoney = (amount: number) =>
    format.number(centsToDisplayAmount(amount), {
      currency: order.currencyCode,
      style: "currency",
    })
  return (
    <div>
      <Button variant="account-ghost" onClick={handleBack} className="mb-8 flex items-center gap-2">
        <ArrowLeft className="size-3.5" strokeWidth={1.5} />
        {t("backToOrders")}
      </Button>

      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-3xl leading-[0.94] tracking-tight lg:text-4xl">{displayId}</h1>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          <span>
            {format.dateTime(order.createdAt, {
              dateStyle: "medium",
            })}
          </span>
          <span className="text-border">·</span>
          <span className="capitalize">{t(`status.${order.filterStatus}`)}</span>
        </div>
      </div>

      {order.deliveredAt !== undefined || order.trackingNumber !== undefined ? (
        <div className="mb-10 flex items-center gap-4 bg-muted/50 px-5 py-4">
          <Truck className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.2} />
          <div className="min-w-0 flex-1">
            {order.deliveredAt === undefined ? (
              <p className="text-[13px]">{t("trackingUnavailable")}</p>
            ) : (
              <p className="text-[13px]">
                {t("deliveredOn", {
                  date: format.dateTime(order.deliveredAt, {
                    dateStyle: "medium",
                  }),
                })}
              </p>
            )}
            {order.trackingNumber === undefined ? undefined : (
              <TrackingNumberRow trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
            )}
          </div>
        </div>
      ) : undefined}

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("items")}</h2>
        <Separator className="mt-3 mb-0" />
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <OrderItem key={`${item.name}-${String(item.qty)}`} item={item} currencyCode={order.currencyCode} />
          ))}
        </div>
      </section>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span className="tabular-nums">{formatMoney(order.subtotalMinorUnits)}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">{t("shipping")}</span>
          <span className="tabular-nums">{order.shippingMinorUnits === 0 ? t("free") : formatMoney(order.shippingMinorUnits)}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">{t("tax")}</span>
          <span className="tabular-nums">{formatMoney(order.taxMinorUnits)}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between text-[14px]">
          <span>{t("total")}</span>
          <span className="tabular-nums">{formatMoney(order.totalMinorUnits)}</span>
        </div>
      </div>

      <Separator className="my-10" />

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        <ShippingAddressBlock order={order} />
        <PaymentInfoBlock order={order} />
        <TimelineBlock order={order} />
      </div>
    </div>
  )
}

const TrackingNumberRow = ({
  trackingNumber,
  trackingUrl,
}: Readonly<{
  trackingNumber: string
  trackingUrl?: string | undefined
}>): JSX.Element => {
  const handleCopy = useCallback(() => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(trackingNumber)
        toast.success(trackingNumber)
      } catch {
        toast.error(trackingNumber)
      }
    })()
  }, [trackingNumber])

  return (
    <div className="mt-0.5 flex items-center gap-2">
      {trackingUrl === undefined ? (
        <p className="text-[11px] text-muted-foreground tabular-nums">{trackingNumber}</p>
      ) : (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground tabular-nums underline"
        >
          {trackingNumber}
        </a>
      )}
      <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
        <Copy className="size-3" strokeWidth={1.5} />
      </Button>
    </div>
  )
}

const OrderItem = ({
  currencyCode,
  item,
}: Readonly<{
  currencyCode: string
  item: CustomerAccount["orderItem"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const format = useFormatter()
  const priceLabel = format.number(centsToDisplayAmount(item.priceMinorUnits), {
    currency: currencyCode,
    style: "currency",
  })

  return (
    <div className="flex items-center gap-5 py-5">
      <div className="relative size-20 shrink-0 overflow-hidden bg-muted">
        <Image
          src={item.image ?? PLACEHOLDER_IMAGE}
          alt={item.name}
          width={80}
          height={80}
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] tracking-[0.01em]">{item.name}</p>
        {item.variantTitle === undefined ? undefined : <p className="mt-1 text-[12px] text-muted-foreground">{item.variantTitle}</p>}
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t("qty")}
          {": "}
          {item.qty}
        </p>
      </div>
      <p className="text-[14px] tabular-nums">{priceLabel}</p>
    </div>
  )
}

const ShippingAddressBlock = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const address = order.shippingAddress

  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("shippingAddress")}</h3>
      <Separator className="mt-3 mb-4" />
      {address === undefined ? (
        <p className="text-[13px] text-muted-foreground">{EMPTY_VALUE}</p>
      ) : (
        <div className="space-y-1 text-[13px] leading-relaxed">
          <p>{address.name}</p>
          <p className="text-muted-foreground">{address.line1}</p>
          {address.line2 === undefined ? undefined : <p className="text-muted-foreground">{address.line2}</p>}
          <p className="text-muted-foreground">
            {address.postalCode} {address.city}
          </p>
          <p className="text-muted-foreground">{address.countryCode}</p>
        </div>
      )}
    </div>
  )
}

const PaymentInfoBlock = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const billing = order.billingAddress

  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("paymentInfo")}</h3>
      <Separator className="mt-3 mb-4" />
      <div className="space-y-1 text-[13px] leading-relaxed">
        <p>{order.paymentProvider ?? EMPTY_VALUE}</p>
        {billing === undefined ? undefined : (
          <>
            <p className="text-muted-foreground">{billing.line1}</p>
            <p className="text-muted-foreground">
              {billing.postalCode} {billing.city}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const TimelineBlock = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const format = useFormatter()

  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("timeline")}</h3>
      <Separator className="mt-3 mb-4" />
      <div className="space-y-3">
        {order.timeline.map((entry, index) => (
          <div key={`${entry.event}-${entry.date.toISOString()}`} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`mt-1 size-1.5 rounded-full ${index === 0 ? "bg-foreground" : "bg-muted-foreground/30"}`} />
              {index < order.timeline.length - 1 ? <div className="mt-1 h-4 w-px bg-border" /> : undefined}
            </div>
            <div className="min-w-0">
              <p className="text-[12px]">{t(`events.${entry.event}`)}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {format.dateTime(entry.date, {
                  dateStyle: "medium",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/account/orders/$id")({
  component: OrderDetailPage,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...getCustomerOrderQuery(params.id),
      staleTime: "static",
    })
  },
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
})

const PLACEHOLDER_IMAGE = "/placeholder-product.svg"
