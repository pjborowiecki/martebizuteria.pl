import { type JSX, useEffect } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Loader2, Package } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { formatVatRatePercent } from "~/src/modules/_core/utils/tax"
import { useCartStore } from "~/src/modules/cart/cart.store"
import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { resetCartAbandonedTracking } from "~/src/modules/customer-activity/customer-activity.tracking"
import { type Order } from "~/src/modules/order/order.types"
import { getOrderConfirmationQuery } from "~/src/modules/order/use-cases/get-order-confirmation"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { clearCheckoutDraft } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"
import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const NO_AMOUNT = 0

const PRIMARY_LINK_CLASS =
  "flex h-12 items-center justify-center bg-foreground px-8 text-xs tracking-[0.2em] text-background uppercase transition-colors hover:bg-foreground/90"

const SECONDARY_LINK_CLASS =
  "flex h-12 items-center justify-center border border-border px-8 text-xs tracking-[0.2em] uppercase transition-colors hover:bg-secondary"

const SummaryRow = ({ label, value }: Readonly<{ label: string; value: string }>): JSX.Element => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
)

const ConfirmationItemImage = ({ imageUrl, title }: Readonly<{ imageUrl?: string | undefined; title: string }>): JSX.Element => {
  if (imageUrl === undefined) {
    return <Package className="size-5 text-muted-foreground/40" strokeWidth={1.5} />
  }

  return <Image alt={title} className="size-14 object-cover" height={56} src={imageUrl} width={56} />
}

const ConfirmationStatusIcon = ({ loading }: Readonly<{ loading: boolean }>): JSX.Element => {
  if (loading) {
    return <Loader2 aria-hidden className="size-12 animate-spin text-muted-foreground/40" strokeWidth={1} />
  }

  return <CheckCircle2 className="size-16 text-success md:size-20" strokeWidth={1} />
}

const ConfirmationItem = ({ currencyCode, item }: Readonly<ConfirmationItemProps>): JSX.Element => {
  const locale = useLocale()

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden bg-secondary">
        <ConfirmationItemImage imageUrl={item.imageUrl} title={item.title} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{item.title}</p>
        {item.variantTitle !== undefined && <p className="text-xs text-muted-foreground">{item.variantTitle}</p>}
        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
      </div>
      <span className="text-sm tabular-nums">{formatPrice(item.totalMinorUnits, currencyCode, locale)}</span>
    </div>
  )
}

const ConfirmationDetails = ({ order }: Readonly<{ order: Order["confirmation"] }>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutSuccess")
  const format = useFormatter()
  const locale = useLocale()

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 text-left">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-y border-border py-4">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("orderNumberLabel")}</p>
          <p className="mt-1 font-mono text-base">{order.orderNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("placedOnLabel")}</p>
          <p className="mt-1 text-sm">{format.dateTime(order.createdAt, { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("itemsLabel")}</p>
        <div className="mt-2 divide-y divide-border">
          {order.items.map((item) => (
            <ConfirmationItem currencyCode={order.currencyCode} item={item} key={item.id} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SummaryRow label={t("subtotalLabel")} value={formatPrice(order.subtotalMinorUnits, order.currencyCode, locale)} />
        {order.discountTotalMinorUnits > NO_AMOUNT && (
          <SummaryRow label={t("discountLabel")} value={`−${formatPrice(order.discountTotalMinorUnits, order.currencyCode, locale)}`} />
        )}
        <SummaryRow
          label={order.deliveryMethodName ?? t("shippingLabel")}
          value={formatPrice(order.shippingTotalMinorUnits, order.currencyCode, locale)}
        />
        <Separator />
        <div className="flex justify-between pt-1">
          <span className="text-sm font-medium">{t("totalLabel")}</span>
          <span className="text-base font-medium tabular-nums">{formatPrice(order.totalMinorUnits, order.currencyCode, locale)}</span>
        </div>
        <p className="text-right text-[11px] text-muted-foreground">
          {t("vatIncludedLabel", { rate: formatVatRatePercent(order.taxBasisPoints) })}{" "}
          {formatPrice(order.taxTotalMinorUnits, order.currencyCode, locale)}
        </p>
      </div>

      {order.shippingAddress !== undefined && (
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("shippingToLabel")}</p>
          <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
            <p className="text-foreground">{order.shippingAddress.name}</p>
            <p>{order.shippingAddress.line1}</p>
            {order.shippingAddress.line2 !== undefined && <p>{order.shippingAddress.line2}</p>}
            <p>
              {order.shippingAddress.postalCode === undefined
                ? order.shippingAddress.city
                : `${order.shippingAddress.postalCode} ${order.shippingAddress.city}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const ConfirmationActions = ({ order }: Readonly<{ order: Order["confirmation"] }>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutSuccess")

  if (order.isOwnOrder) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <LocalizedLink className={PRIMARY_LINK_CLASS} params={{ id: order.id }} to={ROUTES.ACCOUNT_ORDER}>
          {t("viewOrder")}
        </LocalizedLink>
        <LocalizedLink className={SECONDARY_LINK_CLASS} to={ROUTES.HOME}>
          {t("continueShopping")}
        </LocalizedLink>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {order.isGuestOrder && <p className="text-sm text-muted-foreground">{t("guestPrompt", { email: order.email })}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        {order.isGuestOrder && (
          <LocalizedLink className={PRIMARY_LINK_CLASS} to={ROUTES.AUTH_SIGN_UP}>
            {t("createAccount")}
          </LocalizedLink>
        )}
        <LocalizedLink className={order.isGuestOrder ? SECONDARY_LINK_CLASS : PRIMARY_LINK_CLASS} to={ROUTES.HOME}>
          {t("continueShopping")}
        </LocalizedLink>
      </div>
    </div>
  )
}

export const CheckoutSuccess = ({ sessionId }: Readonly<CheckoutSuccessProps>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutSuccess")
  const clearCart = useCartStore((state) => state.clearCart)
  const queryClient = useQueryClient()
  const { data: order, isPending } = useQuery(getOrderConfirmationQuery(sessionId))

  useEffect(() => {
    clearCart()
    clearCheckoutDraft()
    resetCartAbandonedTracking()
    void queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS })
    void queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.OVERVIEW })
  }, [clearCart, queryClient])

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12 text-center md:py-20">
      <ConfirmationStatusIcon loading={isPending && sessionId !== ""} />

      <div className="space-y-2">
        <h2 className="font-serif text-3xl md:text-4xl">{resolveTitle({ isPending, order, sessionId, t })}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">
          {resolveDescription({ isPending, order, sessionId, t })}
        </p>
      </div>

      {order === undefined ? undefined : (
        <>
          <ConfirmationDetails order={order} />
          <ConfirmationActions order={order} />
        </>
      )}

      {order === undefined && !isPending && (
        <LocalizedLink className={PRIMARY_LINK_CLASS} to={ROUTES.HOME}>
          {t("continueShopping")}
        </LocalizedLink>
      )}
    </div>
  )
}

type ConfirmationCopy = ReturnType<typeof useTranslations<"pages.checkout.checkoutSuccess">>

const resolveTitle = ({ isPending, order, sessionId, t }: ConfirmationCopyInput): string => {
  if (order !== undefined) {
    return t("title")
  }

  if (isPending && sessionId !== "") {
    return t("pendingTitle")
  }

  return sessionId === "" ? t("title") : t("unavailableTitle")
}

const resolveDescription = ({ isPending, order, sessionId, t }: ConfirmationCopyInput): string => {
  if (order !== undefined) {
    return t("description", { email: order.email })
  }

  if (isPending && sessionId !== "") {
    return t("pendingDescription")
  }

  return t("unavailableDescription")
}

interface ConfirmationCopyInput {
  readonly isPending: boolean
  readonly order: Order["confirmation"] | undefined
  readonly sessionId: string
  readonly t: ConfirmationCopy
}

interface ConfirmationItemProps {
  readonly currencyCode: string
  readonly item: Order["adminOrderDetailItem"]
}

interface CheckoutSuccessProps {
  readonly sessionId: string
}
