import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Hourglass, MailCheck, MailX } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getNewsletterStatsQuery } from "~/src/modules/newsletter/use-cases/get-newsletter-stats"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

export const NewsletterStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.stats")
  const { data: stats } = useSuspenseQuery(getNewsletterStatsQuery())

  return (
    <div className="grid shrink-0 gap-5 sm:grid-cols-3">
      <NewsletterStatCard icon={<MailCheck className={ICON_CLASS} strokeWidth={1.5} />} label={t("confirmed")} value={stats.confirmed} />
      <NewsletterStatCard icon={<Hourglass className={ICON_CLASS} strokeWidth={1.5} />} label={t("pending")} value={stats.pending} />
      <NewsletterStatCard icon={<MailX className={ICON_CLASS} strokeWidth={1.5} />} label={t("unsubscribed")} value={stats.unsubscribed} />
    </div>
  )
}

const NewsletterStatCard = ({ icon, label, value }: Readonly<NewsletterStatCardProps>): JSX.Element => (
  <Card className="overflow-hidden shadow-none">
    <CardContent className="flex items-start justify-between p-5">
      <div>
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      </div>
      {icon}
    </CardContent>
  </Card>
)

const ICON_CLASS = "size-5 text-muted-foreground/40"

interface NewsletterStatCardProps {
  readonly icon: JSX.Element
  readonly label: string
  readonly value: number
}
