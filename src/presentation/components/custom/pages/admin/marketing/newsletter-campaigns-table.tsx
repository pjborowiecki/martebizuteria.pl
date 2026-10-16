import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { useLocale, useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { NEWSLETTER_CAMPAIGN_STATUS_BADGE_STYLES } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"
import { getAdminNewsletterCampaignsQuery } from "~/src/modules/newsletter-campaign/use-cases/get-admin-newsletter-campaigns"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { useFormatter } from "~/src/hooks/use-display-format"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { ADMIN_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

const HEADER_CLASS = "text-xs font-medium uppercase tracking-wider text-muted-foreground/60"

const DATE_TIME_FORMAT = { dateStyle: "medium", timeStyle: "short" } as const

export const NewsletterCampaignsTable = (): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.campaigns")
  const { data: campaigns } = useSuspenseQuery(getAdminNewsletterCampaignsQuery())

  return (
    <Card className={cn("min-h-0", ADMIN_CARD_CLASS)}>
      <CardContent className="flex min-h-0 flex-col p-0">
        <h2 className="shrink-0 border-b border-border/60 px-4 py-4 text-sm font-semibold tracking-tight lg:px-6">{t("title")}</h2>
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium">{t("empty.title")}</p>
            <p className="max-w-sm text-[13px] text-muted-foreground">{t("empty.description")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`pl-4 lg:pl-6 ${HEADER_CLASS}`}>{t("columns.subject")}</TableHead>
                <TableHead className={HEADER_CLASS}>{t("columns.status")}</TableHead>
                <TableHead className={HEADER_CLASS}>{t("columns.delivered")}</TableHead>
                <TableHead className={HEADER_CLASS}>{t("columns.started")}</TableHead>
                <TableHead className={`pr-4 lg:pr-6 ${HEADER_CLASS}`}>{t("columns.finished")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <NewsletterCampaignRow campaign={campaign} key={campaign.id} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const NewsletterCampaignRow = ({ campaign }: Readonly<{ campaign: NewsletterCampaign["adminListItem"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing")
  const format = useFormatter()
  const locale = useLocale()
  const style = NEWSLETTER_CAMPAIGN_STATUS_BADGE_STYLES[campaign.status]

  return (
    <TableRow>
      <TableCell className="max-w-md pl-4 whitespace-normal max-lg:min-w-52 lg:pl-6">
        <p className="text-[13px] font-medium">{resolveLocalizedString(campaign.subjects, locale)}</p>
        {campaign.failure !== null && <p className="text-[12px] text-destructive">{campaign.failure}</p>}
      </TableCell>
      <TableCell>
        <Badge className={cn("text-[11px]", style.className)} variant={style.variant}>
          {t(`status.${campaign.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-[13px] tabular-nums">
        {t("campaigns.delivered", { sent: campaign.sentCount, total: campaign.recipientCount })}
      </TableCell>
      <TableCell className="text-[13px] text-muted-foreground">{format.dateTime(campaign.createdAt, DATE_TIME_FORMAT)}</TableCell>
      <TableCell className="pr-4 text-[13px] text-muted-foreground lg:pr-6">
        {campaign.completedAt === null ? EMPTY_VALUE : format.dateTime(campaign.completedAt, DATE_TIME_FORMAT)}
      </TableCell>
    </TableRow>
  )
}
