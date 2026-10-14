import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { Hourglass, type LucideIcon, MailCheck, MailX } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getNewsletterStatsQuery } from "~/src/modules/newsletter/use-cases/get-newsletter-stats"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_LABEL_CLASS,
  ADMIN_STAT_VALUE_SLOT_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AdminStatValue } from "~/src/presentation/components/custom/pages/admin/admin-stat-value"

export const NewsletterStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.stats")
  const { data: stats } = useSuspenseQuery(getNewsletterStatsQuery())

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-3">
      {NEWSLETTER_STAT_CARDS.map(({ gradient, icon: Icon, key }) => (
        <Card key={key} className={cn("h-full", ADMIN_CARD_CLASS, "bg-gradient-to-br from-transparent", gradient)}>
          <CardContent className="flex h-full items-start justify-between gap-4 p-5">
            <div className="min-w-0 flex-1 space-y-2">
              <p className={ADMIN_STAT_LABEL_CLASS}>{t(key)}</p>
              <div className={ADMIN_STAT_VALUE_SLOT_CLASS}>
                <AdminStatValue value={stats[key]} />
              </div>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary shadow-none">
              <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const NEWSLETTER_STAT_CARDS: readonly NewsletterStatCardConfig[] = [
  {
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: MailCheck,
    key: "confirmed",
  },
  {
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: Hourglass,
    key: "pending",
  },
  {
    gradient: "from-red-500/20 via-rose-500/6 to-transparent",
    icon: MailX,
    key: "unsubscribed",
  },
]

interface NewsletterStatCardConfig {
  readonly gradient: string
  readonly icon: LucideIcon
  readonly key: "confirmed" | "pending" | "unsubscribed"
}
