import { type JSX, useCallback } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Copy, Truck } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { formatVatRatePercent } from "~/src/modules/_core/utils/tax"
import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { getCustomerOrderQuery } from "~/src/modules/customer-account/use-cases/get-customer-order"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"
import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const NO_AMOUNT = 0

const STRIPE_PROVIDER = "stripe"

const useOrderMoney = (currencyCode: string): ((minorUnits: number) => string) => {
  const format = useFormatter()

  return (minorUnits: number) =>
    format.number(centsToDisplayAmount(minorUnits), {
      currency: currencyCode,
      style: "currency",
    })
}

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

const ShipmentBanner = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element | undefined => {
  const t = useTranslations("pages.account.orderDetail")
  const format = useFormatter()

  if (order.deliveredAt === undefined && order.shippedAt === undefined) {
    return undefined
  }

  const headline =
    order.deliveredAt === undefined
      ? t(order.trackingNumber === undefined ? "shippedOn" : "inTransitSince", {
          date: format.dateTime(order.shippedAt ?? order.createdAt, { dateStyle: "medium" }),
        })
      : t("deliveredOn", { date: format.dateTime(order.deliveredAt, { dateStyle: "medium" }) })

  return (
    <div className="mb-10 flex items-center gap-4 bg-muted/50 px-5 py-4">
      <Truck className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.2} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">{headline}</p>
        {order.trackingNumber === undefined ? undefined : (
          <TrackingNumberRow trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
        )}
      </div>
    </div>
  )
}

const OrderTotals = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const format = useFormatter()
  const money = useOrderMoney(order.currencyCode)

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      <TotalsRow label={t("subtotal")} value={money(order.subtotalMinorUnits)} />
      {order.discountMinorUnits > NO_AMOUNT && <TotalsRow label={t("discount")} value={`−${money(order.discountMinorUnits)}`} />}
      <TotalsRow
        label={order.deliveryMethodName ?? t("shipping")}
        value={order.shippingMinorUnits === NO_AMOUNT ? t("free") : money(order.shippingMinorUnits)}
      />
      <Separator className="my-2" />
      <div className="flex justify-between text-[14px]">
        <span>{t("total")}</span>
        <span className="tabular-nums">{money(order.totalMinorUnits)}</span>
      </div>
      <p className="text-right text-[11px] text-muted-foreground">
        {t("vatIncluded", { rate: formatVatRatePercent(order.taxBasisPoints) })} {money(order.taxMinorUnits)}
      </p>
      {order.refund === undefined ? undefined : (
        <div className="flex justify-between border-t border-border pt-3 text-[13px]">
          <span className="text-muted-foreground">
            {order.refund.refundedAt === undefined
              ? t("refunded")
              : t("refundedOn", { date: format.dateTime(order.refund.refundedAt, { dateStyle: "medium" }) })}
          </span>
          <span className="tabular-nums">−{money(order.refund.amountMinorUnits)}</span>
        </div>
      )}
    </div>
  )
}

const TotalsRow = ({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>): JSX.Element => (
  <div className="flex justify-between text-[13px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
)

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
          className="text-[11px] text-muted-foreground tabular-nums underline"
          href={trackingUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {trackingNumber}
        </a>
      )}
      <Button onClick={handleCopy} size="icon-xs" variant="ghost">
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
  const money = useOrderMoney(currencyCode)

  return (
    <div className="flex items-center gap-5 py-5">
      <div className="relative size-20 shrink-0 overflow-hidden bg-muted">
        <Image
          alt={item.name}
          className="absolute inset-0 size-full object-cover"
          height={80}
          src={item.image ?? PLACEHOLDER_IMAGE}
          width={80}
        />
      </div>
      <div className="min-w-0 flex-1">
        <ItemTitle handle={item.handle} name={item.name} />
        {item.variantTitle === undefined || item.variantTitle === "" ? undefined : (
          <p className="mt-1 text-[12px] text-muted-foreground">{item.variantTitle}</p>
        )}
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t("qtyAtPrice", { price: money(item.unitPriceMinorUnits), qty: item.qty })}
        </p>
      </div>
      <p className="text-[14px] tabular-nums">{money(item.lineTotalMinorUnits)}</p>
    </div>
  )
}

const ItemTitle = ({
  handle,
  name,
}: Readonly<{
  handle?: string | undefined
  name: string
}>): JSX.Element => {
  if (handle === undefined) {
    return <p className="text-[14px] tracking-[0.01em]">{name}</p>
  }

  return (
    <LocalizedLink className="text-[14px] tracking-[0.01em] hover:underline" params={{ handle }} to={ROUTES.PRODUCT}>
      {name}
    </LocalizedLink>
  )
}

const ShippingBlock = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const address = order.shippingAddress

  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
        {order.lockerId === undefined ? t("shippingAddress") : t("pickupPoint")}
      </h3>
      <Separator className="mt-3 mb-4" />
      {order.lockerId === undefined ? undefined : (
        <p className="mb-3 text-[13px]">
          {order.lockerId}
          {order.deliveryMethodName === undefined ? undefined : (
            <span className="text-muted-foreground"> · {order.deliveryMethodName}</span>
          )}
        </p>
      )}
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
          {address.phone === undefined ? undefined : <p className="text-muted-foreground tabular-nums">{address.phone}</p>}
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
        <p>{order.paymentProvider === STRIPE_PROVIDER ? t("paidByCard") : (order.paymentProvider ?? EMPTY_VALUE)}</p>
        {billing === undefined ? undefined : (
          <>
            <p className="text-muted-foreground">{billing.name}</p>
            <p className="text-muted-foreground">{billing.line1}</p>
            <p className="text-muted-foreground">
              {billing.postalCode} {billing.city}
            </p>
            <p className="text-muted-foreground">{billing.countryCode}</p>
          </>
        )}
        {order.billingCompanyName === undefined ? undefined : <p className="pt-2 text-muted-foreground">{order.billingCompanyName}</p>}
        {order.billingNip === undefined ? undefined : (
          <p className="text-muted-foreground tabular-nums">{t("nip", { nip: order.billingNip })}</p>
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
          <div className="flex items-start gap-3" key={`${entry.event}-${entry.date.toISOString()}`}>
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

const OrderNoteBlock = ({ note }: Readonly<{ note?: string | undefined }>): JSX.Element | undefined => {
  const t = useTranslations("pages.account.orderDetail")

  if (note === undefined || note.trim() === "") {
    return undefined
  }

  return (
    <div className="mt-10">
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("note")}</h3>
      <Separator className="mt-3 mb-4" />
      <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">{note}</p>
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
