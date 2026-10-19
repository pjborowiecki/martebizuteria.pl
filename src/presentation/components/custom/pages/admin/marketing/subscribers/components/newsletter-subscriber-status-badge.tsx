import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { NEWSLETTER_STATUS_BADGE_STYLES, type NewsletterStatus } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const NewsletterSubscriberStatusBadge = ({ status }: Readonly<{ status: NewsletterStatus }>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.subscribers.status")
  const style = NEWSLETTER_STATUS_BADGE_STYLES[status]

  return (
    <Badge className={cn("text-[11px]", style.className)} variant={style.variant}>
      {t(status)}
    </Badge>
  )
}
