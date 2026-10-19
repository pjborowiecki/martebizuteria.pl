import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"

import { getNewsletterStatsQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-stats"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { Card } from "~/src/presentation/components/shadcn/card"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
} from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { NewsletterStatCardContent } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-stat-card-content"
import { NEWSLETTER_STATUS_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-stats.config"

import { ROUTES } from "~/src/routes"

export const NewsletterStats = (): JSX.Element => {
  const formatLocale = useFormatLocale()
  const { data: stats } = useSuspenseQuery(getNewsletterStatsQuery())

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 max-sm:[&>:last-child]:col-span-2">
      {NEWSLETTER_STATUS_STAT_CARDS.map((config) => (
        <Card
          className={cn(
            "h-full",
            ADMIN_CARD_CLASS,
            "bg-gradient-to-br from-transparent",
            config.gradient,
            ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
          )}
          key={config.key}
        >
          <LocalizedLink
            className="block h-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            search={{ status: config.status }}
            to={ROUTES.ADMIN_NEWSLETTER_SUBSCRIBERS}
          >
            <NewsletterStatCardContent config={config} value={stats[config.key].toLocaleString(formatLocale)} valuesPending={false} />
          </LocalizedLink>
        </Card>
      ))}
    </div>
  )
}
