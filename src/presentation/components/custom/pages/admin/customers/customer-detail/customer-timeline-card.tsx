import { type JSX } from "react"

import { cn } from "cn"
import { Eye, LogIn, LogOut, type LucideIcon, ShoppingBag, ShoppingCart, UserRound } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type User } from "~/src/modules/user/user.types"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CONTENT_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CUSTOMER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-detail.styles"

const resolveTimelineDescription = (
  event: User["adminCustomerDetail"]["timeline"][number],
  t: ReturnType<typeof useTranslations<"pages.admin.customerDetail">>,
): string => {
  if (event.kind === "order_placed") {
    return t("timeline.orderPlaced", {
      id: event.orderNumber,
      total: event.total,
    })
  }

  if (event.kind === "signed_in") {
    return t("timeline.signedIn")
  }

  if (event.kind === "signed_out") {
    return t("timeline.signedOut")
  }

  if (event.kind === "cart_item_added") {
    return t("timeline.cartItemAdded", {
      product: event.productTitle,
      quantity: event.quantity ?? DEFAULT_CART_QUANTITY,
    })
  }

  if (event.kind === "cart_abandoned") {
    return t("timeline.cartAbandoned", {
      count: event.itemCount,
    })
  }

  if (event.kind === "page_viewed") {
    return t("timeline.pageViewed", {
      path: event.path,
    })
  }

  return t("timeline.accountCreated")
}

const resolveTimelineEventKey = (event: User["adminCustomerDetail"]["timeline"][number]): string => {
  if (event.kind === "order_placed") {
    return `${event.date}-${event.kind}-${event.orderNumber}`
  }

  if (event.kind === "cart_item_added") {
    return `${event.date}-${event.kind}-${event.productTitle}-${event.quantity ?? DEFAULT_CART_QUANTITY}`
  }

  if (event.kind === "cart_abandoned") {
    return `${event.date}-${event.kind}-${event.itemCount}`
  }

  if (event.kind === "page_viewed") {
    return `${event.date}-${event.kind}-${event.path}`
  }

  return `${event.date}-${event.kind}`
}
export const CustomerTimelineCard = ({ timeline }: Readonly<CustomerTimelineCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")

  return (
    <section className="flex flex-col 2xl:[@media(min-height:57rem)]:min-h-44 2xl:[@media(min-height:57rem)]:flex-1">
      <Card className={CUSTOMER_DETAIL_CARD_CLASS}>
        <CardContent className={cn("flex min-h-0 flex-col", ADMIN_CARD_CONTENT_CLASS)}>
          <p className="mb-4 shrink-0 text-sm font-medium">{t("timeline.title")}</p>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("timeline.empty")}</p>
          ) : (
            <ol
              className="max-h-[min(60vh,30rem)] min-h-0 overflow-y-auto 2xl:[@media(min-height:57rem)]:max-h-none"
              data-slot="customer-timeline"
            >
              {timeline.map((event, index) => {
                const Icon = TIMELINE_ICONS[event.kind]
                const eventKey = resolveTimelineEventKey(event)
                const description = resolveTimelineDescription(event, t)

                return (
                  <li key={eventKey} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < timeline.length - 1 && <div className="absolute top-6 left-[11px] h-[calc(100%-16px)] w-px bg-border/50" />}
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <Icon className="size-3 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13px] leading-snug">{description}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/50">{event.date}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

const DEFAULT_CART_QUANTITY = 1

const TIMELINE_ICONS: Record<User["adminCustomerDetail"]["timeline"][number]["kind"], LucideIcon> = {
  account_created: UserRound,
  cart_abandoned: ShoppingBag,
  cart_item_added: ShoppingCart,
  order_placed: ShoppingBag,
  page_viewed: Eye,
  signed_in: LogIn,
  signed_out: LogOut,
}

interface CustomerTimelineCardProps {
  readonly timeline: User["adminCustomerDetail"]["timeline"]
}
