import { type JSX } from "react"

import {
  Clock,
  Eye,
  LogIn,
  LogOut,
  type LucideIcon,
  Mail,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  ShoppingCart,
  Tag,
  UserRound,
} from "lucide-react"
import { useTranslations } from "use-intl"

import { type User } from "~/src/modules/user/user.types"

import { Avatar, AvatarFallback } from "~/src/presentation/components/shadcn/avatar"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"
const resolveTimelineDescription = (
  event: User["adminCustomerDetail"]["timeline"][number],
  t: ReturnType<typeof useTranslations<"pages.admin.customerDetail">>,
): string => {
  if (event.kind === "order_placed") {
    return t("timeline.orderPlaced", {
      id: event.orderId,
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
    return `${event.date}-${event.kind}-${event.orderId}`
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
export const CustomerSidebar = ({ customer }: CustomerSidebarProps): JSX.Element => (
  <div className="space-y-6">
    <CustomerProfileCard customer={customer} />
    <CustomerTagsCard customer={customer} />
    <CustomerNotesCard customer={customer} />
    <CustomerTimelineCard customer={customer} />
  </div>
)

const CustomerProfileCard = ({ customer }: { customer: User["adminCustomerDetail"] }): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const tCustomers = useTranslations("pages.admin.customers")
  return (
    <Card className="shadow-none">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <Avatar size="lg" className="h-16 w-16 rounded-lg after:rounded-lg">
            <AvatarFallback className="rounded-lg bg-foreground text-lg font-semibold text-background">{customer.initials}</AvatarFallback>
          </Avatar>
          <h2 className="mt-3 text-base font-semibold tracking-tight">{customer.name}</h2>
          <p className="mt-0.5 max-w-full truncate font-mono text-[11px] text-muted-foreground" title={customer.id}>
            {customer.id}
          </p>
          <div className="mt-3 flex gap-2">
            <Badge variant="default" className="bg-foreground text-[11px] text-background hover:bg-foreground">
              {customer.roleBadgeKey === "returning" ? t("profile.returningBadge") : tCustomers(customer.roleBadgeKey)}
            </Badge>
            <Badge variant="outline" className="border-border bg-white text-[11px] text-foreground hover:bg-white">
              {t("profile.accountCreated", {
                date: customer.joinDate,
              })}
            </Badge>
          </div>
        </div>

        <Separator className="my-5 bg-border/40" />

        <div className="space-y-3.5">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="truncate text-muted-foreground">{customer.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">{customer.phone?.trim() === "" || customer.phone === null ? "—" : customer.phone}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">{customer.address ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">
              {customer.lastActive === undefined
                ? "—"
                : t("profile.lastActive", {
                    time: customer.lastActive,
                  })}
            </span>
          </div>
        </div>

        <Separator className="my-5 bg-border/40" />

        <div className="space-y-3">
          <p className="text-[12px] font-medium tracking-wider text-muted-foreground/50 uppercase">{t("profile.preferences")}</p>
          <div className="flex items-center gap-3 text-sm">
            <Tag className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">
              {t("profile.preferredCategory")}
              {": "}
              <span className="text-foreground">{customer.preferredCategory ?? "—"}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Package className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">
              {t("profile.preferredCollection")}
              {": "}
              <span className="text-foreground">{customer.preferredCollection ?? "—"}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
const CustomerTagsCard = ({ customer }: { customer: User["adminCustomerDetail"] }): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="mb-1 text-sm font-medium">{t("tags.title")}</p>
        <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">{t("tags.sidebarHint")}</p>
        {customer.tags.length === 0 && customer.customTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("tags.empty")}</p>
        ) : (
          <div className="space-y-3">
            {customer.tags.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">{t("tags.system")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[11px]">
                      {t(`tags.values.${tag}`)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {customer.customTags.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">{t("tags.custom")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.customTags.map((tag) => (
                    <Badge key={`custom-${tag}`} variant="secondary" className="text-[11px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
const CustomerNotesCard = ({ customer }: { customer: User["adminCustomerDetail"] }): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-medium">{t("notes.title")}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{customer.notes ?? t("notes.empty")}</p>
      </CardContent>
    </Card>
  )
}
const CustomerTimelineCard = ({ customer }: { customer: User["adminCustomerDetail"] }): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-medium">{t("timeline.title")}</p>
        {customer.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("timeline.empty")}</p>
        ) : (
          <div className="space-y-0">
            {customer.timeline.map((event, index) => {
              const Icon = TIMELINE_ICONS[event.kind]
              const eventKey = resolveTimelineEventKey(event)
              const description = resolveTimelineDescription(event, t)
              return (
                <div key={eventKey} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < customer.timeline.length - 1 && (
                    <div className="absolute top-6 left-[11px] h-[calc(100%-16px)] w-px bg-border/50" />
                  )}
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon className="size-3 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13px] leading-snug">{description}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/50">{event.date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
interface CustomerSidebarProps {
  readonly customer: User["adminCustomerDetail"]
}
