import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"

import { getNewsletterStatsQuery } from "~/src/modules/newsletter/use-cases/get-newsletter-stats"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { Card } from "~/src/presentation/components/shadcn/card"

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
  ADMIN_STAT_GRID_CLASS,
} from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { NewsletterStatCardContent } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-stat-card-content"
import {
  NEWSLETTER_STATUS_STAT_CARDS,
  NEWSLETTER_TOTAL_STAT_CARD,
} from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-stats.config"
import { useNewsletterSubscribersDataGridContext } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/hooks/use-newsletter-subscribers-data-grid"

export const NewsletterSubscribersStats = (): JSX.Element => {
  const formatLocale = useFormatLocale()
  const { data: stats, isFetching, isStale } = useSuspenseQuery(getNewsletterStatsQuery())
  const valuesPending = isFetching && isStale
  const { activeStatus, applyStatusFilter } = useNewsletterSubscribersDataGridContext()

  return (
    <div className={ADMIN_STAT_GRID_CLASS}>
      {[NEWSLETTER_TOTAL_STAT_CARD, ...NEWSLETTER_STATUS_STAT_CARDS].map((config) => {
        const pressed = config.status === activeStatus

        return (
          <Card
            className={cn(
              "h-full",
              ADMIN_CARD_CLASS,
              "bg-gradient-to-br from-transparent",
              config.gradient,
              !valuesPending && ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
              pressed && ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
            )}
            key={config.key}
          >
            <button
              aria-busy={valuesPending}
              aria-pressed={pressed}
              className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left shadow-none outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default"
              disabled={valuesPending}
              onClick={() => {
                applyStatusFilter(pressed ? undefined : config.status)
              }}
              type="button"
            >
              <NewsletterStatCardContent
                config={config}
                value={stats[config.key].toLocaleString(formatLocale)}
                valuesPending={valuesPending}
              />
            </button>
          </Card>
        )
      })}
    </div>
  )
}
