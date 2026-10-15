import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ADMIN_STAT_LABEL_CLASS, ADMIN_STAT_VALUE_SLOT_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AdminStatValue } from "~/src/presentation/components/custom/pages/admin/admin-stat-value"
import { type NewsletterStatCardConfig } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-stats.config"

export const NewsletterStatCardContent = ({ config, value, valuesPending }: Readonly<NewsletterStatCardContentProps>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.stats")
  const { icon: Icon, key } = config

  return (
    <CardContent className="flex h-full items-start justify-between gap-4 p-5">
      <div className="min-w-0 flex-1 space-y-2">
        <p className={ADMIN_STAT_LABEL_CLASS}>{t(key)}</p>
        <div className={ADMIN_STAT_VALUE_SLOT_CLASS}>
          {valuesPending ? <Skeleton className="h-8 w-20" /> : <AdminStatValue value={value} />}
        </div>
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary shadow-none">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </CardContent>
  )
}

interface NewsletterStatCardContentProps {
  readonly config: NewsletterStatCardConfig
  readonly value: string
  readonly valuesPending: boolean
}
