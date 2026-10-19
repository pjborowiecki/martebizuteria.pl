import { type JSX, useEffect } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, Loader2, Package } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { formatInpostLockerAddress } from "~/src/integrations/inpost/inpost.utils"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { formatVatRatePercent } from "~/src/modules/_core/utils/tax"
import { useCartStore } from "~/src/modules/cart/cart.store"
import { resetCartAbandonedTracking } from "~/src/modules/customer-activity/customer-activity.tracking"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { getOrderConfirmationQuery } from "~/src/modules/order/use-cases/get-order-confirmation"

import { useFormatLocale, useFormatter } from "~/src/hooks/use-display-format"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { clearCheckoutDraft, isCheckoutSessionHeldForCart } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"
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

const ConfirmationStatusIcon = ({ isPending, order }: Readonly<ConfirmationQueryState>): JSX.Element => {
  if (order !== undefined) {
    return <CheckCircle2 className="size-16 text-success md:size-20" strokeWidth={1} />
  }

  if (isPending) {
    return <Loader2 aria-hidden className="size-12 animate-spin text-muted-foreground/40" strokeWidth={1} />
  }

  return <AlertCircle aria-hidden className="size-12 text-muted-foreground/60" strokeWidth={1} />
}

const ConfirmationItem = ({ currencyCode, item }: Readonly<ConfirmationItemProps>): JSX.Element => {
  const formatLocale = useFormatLocale()

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
      <span className="text-sm tabular-nums">{formatPrice(item.totalMinorUnits, currencyCode, formatLocale)}</span>
    </div>
  )
}

const ConfirmationDestination = ({ order }: Readonly<{ order: Order["confirmation"] }>): JSX.Element | undefined => {
  const t = useTranslations("pages.checkout.checkoutSuccess")

  if (order.locker !== undefined) {
    return (
      <div>
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("lockerLabel")}</p>
        <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
          <p className="text-foreground">{order.locker.code}</p>
          {order.locker.point?.description !== undefined && <p>{order.locker.point.description}</p>}
          {(order.locker.point === undefined ? [] : formatInpostLockerAddress(order.locker.point)).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    )
  }

  if (order.shippingAddress === undefined) {
    return undefined
  }

  return (
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
  )
}

const ConfirmationDetails = ({ order }: Readonly<{ order: Order["confirmation"] }>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutSuccess")
  const format = useFormatter()
  const formatLocale = useFormatLocale()

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 text-left">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4 border-y border-border py-4">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{t("orderNumberLabel")}</p>
          <p className="mt-1 font-mono text-base">{order.orderNumber}</p>
        </div>
        <div className="sm:text-right">
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
        <SummaryRow label={t("subtotalLabel")} value={formatPrice(order.subtotalMinorUnits, order.currencyCode, formatLocale)} />
        {order.discountTotalMinorUnits > NO_AMOUNT && (
          <SummaryRow
            label={t("discountLabel")}
            value={`−${formatPrice(order.discountTotalMinorUnits, order.currencyCode, formatLocale)}`}
          />
        )}
        <SummaryRow
          label={order.deliveryMethodName ?? t("shippingLabel")}
          value={formatPrice(order.shippingTotalMinorUnits, order.currencyCode, formatLocale)}
        />
        <Separator />
        <div className="flex justify-between pt-1">
          <span className="text-sm font-medium">{t("totalLabel")}</span>
          <span className="text-base font-medium tabular-nums">{formatPrice(order.totalMinorUnits, order.currencyCode, formatLocale)}</span>
        </div>
        <p className="text-right text-[11px] text-muted-foreground">
          {t("vatIncludedLabel", { rate: formatVatRatePercent(order.taxBasisPoints) })}{" "}
          {formatPrice(order.taxTotalMinorUnits, order.currencyCode, formatLocale)}
        </p>
      </div>

      <ConfirmationDestination order={order} />
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
  const cart = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const queryClient = useQueryClient()
  const { data: order, isPending } = useQuery(getOrderConfirmationQuery(sessionId))

  useEffect(() => {
    if (!isCheckoutSessionHeldForCart(sessionId, cart)) {
      return
    }

    clearCart()
    clearCheckoutDraft()
    resetCartAbandonedTracking()
  }, [cart, clearCart, sessionId])

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.CUSTOMER.ORDERS })
    void queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.CUSTOMER.OVERVIEW })
  }, [queryClient])

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12 text-center md:py-20">
      <ConfirmationStatusIcon isPending={isPending} order={order} />

      <div role="status" className="space-y-2">
        <h2 className="font-serif text-3xl md:text-4xl">{resolveTitle({ isPending, order, t })}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">{resolveDescription({ isPending, order, t })}</p>
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

const resolveTitle = ({ isPending, order, t }: ConfirmationCopyInput): string => {
  if (order !== undefined) {
    return t("title")
  }

  return isPending ? t("pendingTitle") : t("unavailableTitle")
}

const resolveDescription = ({ isPending, order, t }: ConfirmationCopyInput): string => {
  if (order !== undefined) {
    return t("description", { email: order.email })
  }

  return isPending ? t("pendingDescription") : t("unavailableDescription")
}

interface ConfirmationQueryState {
  readonly isPending: boolean
  readonly order: Order["confirmation"] | undefined
}

interface ConfirmationCopyInput extends ConfirmationQueryState {
  readonly t: ConfirmationCopy
}

interface ConfirmationItemProps {
  readonly currencyCode: string
  readonly item: Order["adminOrderDetailItem"]
}

interface CheckoutSuccessProps {
  readonly sessionId: string
}
