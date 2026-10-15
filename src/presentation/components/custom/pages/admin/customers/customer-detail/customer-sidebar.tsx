import { type JSX, useMemo } from "react"

import { cn } from "cn"
import { Clock, Info, Mail, MapPin, Package, Phone, Tag } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type User } from "~/src/modules/user/user.types"

import { Avatar, AvatarFallback } from "~/src/presentation/components/shadcn/avatar"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/presentation/components/shadcn/tooltip"

import { ADMIN_CARD_CONTENT_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import {
  CUSTOMER_DETAIL_CARD_CLASS,
  CUSTOMER_DETAIL_COLUMN_CLASS,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-detail.styles"
import { CustomerTimelineCard } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-timeline-card"

export const CustomerSidebar = ({ customer }: CustomerSidebarProps): JSX.Element => (
  <div className={CUSTOMER_DETAIL_COLUMN_CLASS}>
    <Card className={cn("shrink-0", CUSTOMER_DETAIL_CARD_CLASS)}>
      <CardContent className={ADMIN_CARD_CONTENT_CLASS}>
        <CustomerIdentity customer={customer} />
        <Separator className={SECTION_SEPARATOR_CLASS} />
        <CustomerFacts customer={customer} />
        <Separator className={SECTION_SEPARATOR_CLASS} />
        <CustomerTags customTags={customer.customTags} tags={customer.tags} />
        <Separator className={SECTION_SEPARATOR_CLASS} />
        <CustomerNotes notes={customer.notes} />
      </CardContent>
    </Card>
    <CustomerTimelineCard timeline={customer.timeline} />
  </div>
)

const CustomerIdentity = ({ customer }: CustomerSidebarProps): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const tCustomers = useTranslations("pages.admin.customers")

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar size="lg" className="size-12 rounded-lg after:rounded-lg">
          <AvatarFallback className="rounded-lg bg-foreground text-base font-semibold text-background">{customer.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight">{customer.name}</h2>
          <p className="truncate font-mono text-[11px] text-muted-foreground" title={customer.id}>
            {customer.id}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="default" className="bg-foreground text-[11px] text-background hover:bg-foreground">
          {customer.roleBadgeKey === "returning" ? t("profile.returningBadge") : tCustomers(customer.roleBadgeKey)}
        </Badge>
        <Badge variant="outline" className="border-border bg-white text-[11px] text-foreground hover:bg-white">
          {t("profile.accountCreated", {
            date: customer.joinDate,
          })}
        </Badge>
      </div>
    </>
  )
}

const CustomerFacts = ({ customer }: CustomerSidebarProps): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 text-sm">
        <Mail className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
        <span className="truncate text-muted-foreground" title={customer.email}>
          {customer.email}
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Phone className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
        <span className="text-muted-foreground">
          {customer.phone?.trim() === "" || customer.phone === null ? EMPTY_VALUE : customer.phone}
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <MapPin className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
        <span className="text-muted-foreground">{customer.address ?? EMPTY_VALUE}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Clock className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
        <span className="text-muted-foreground">
          {customer.lastActive === undefined
            ? EMPTY_VALUE
            : t("profile.lastActive", {
                time: customer.lastActive,
              })}
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Tag className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
        <span className="text-muted-foreground">
          {t("profile.preferredCategory")}
          {": "}
          <span className="text-foreground">{customer.preferredCategory ?? EMPTY_VALUE}</span>
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Package className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
        <span className="text-muted-foreground">
          {t("profile.preferredCollection")}
          {": "}
          <span className="text-foreground">{customer.preferredCollection ?? EMPTY_VALUE}</span>
        </span>
      </div>
    </div>
  )
}

const CustomerTags = ({ customTags, tags }: Readonly<Pick<User["adminCustomerDetail"], "customTags" | "tags">>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")

  return (
    <section>
      <div className="mb-2 flex items-center gap-1">
        <h3 className={SECTION_HEADING_CLASS}>{t("tags.title")}</h3>
        <CustomerTagsHint hint={t("tags.sidebarHint")} />
      </div>
      {tags.length === 0 && customTags.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tags.empty")}</p>
      ) : (
        <div className="space-y-2">
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <p className={TAG_GROUP_LABEL_CLASS}>{t("tags.system")}</p>
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[11px]">
                  {t(`tags.values.${tag}`)}
                </Badge>
              ))}
            </div>
          )}
          {customTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <p className={TAG_GROUP_LABEL_CLASS}>{t("tags.custom")}</p>
              {customTags.map((tag) => (
                <Badge key={`custom-${tag}`} variant="secondary" className="text-[11px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

const CustomerTagsHint = ({ hint }: Readonly<{ hint: string }>): JSX.Element => {
  const trigger = useMemo(
    () => (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="size-5 text-muted-foreground/60 hover:text-foreground"
        aria-label={hint}
      >
        <Info className="size-3.5" strokeWidth={1.75} />
      </Button>
    ),
    [hint],
  )

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="bottom" className="max-w-xs text-left">
        {hint}
      </TooltipContent>
    </Tooltip>
  )
}

const CustomerNotes = ({ notes }: Readonly<Pick<User["adminCustomerDetail"], "notes">>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")

  return (
    <section>
      <h3 className={cn("mb-2", SECTION_HEADING_CLASS)}>{t("notes.title")}</h3>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{notes ?? t("notes.empty")}</p>
    </section>
  )
}

const SECTION_SEPARATOR_CLASS = "my-4 bg-border/40"

const SECTION_HEADING_CLASS = "text-[12px] font-medium tracking-wider text-muted-foreground/50 uppercase"

const TAG_GROUP_LABEL_CLASS = "mr-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase"

interface CustomerSidebarProps {
  readonly customer: User["adminCustomerDetail"]
}
