import { Hourglass, type LucideIcon, MailCheck, MailX, Mails } from "lucide-react"

import { NEWSLETTER_STATUS, type NewsletterStatus } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

export interface NewsletterStatCardConfig {
  readonly gradient: string
  readonly icon: LucideIcon
  readonly key: "confirmed" | "pending" | "total" | "unsubscribed"
  readonly status: NewsletterStatus | undefined
}

export const NEWSLETTER_TOTAL_STAT_CARD: NewsletterStatCardConfig = {
  gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
  icon: Mails,
  key: "total",
  status: undefined,
}

export const NEWSLETTER_STATUS_STAT_CARDS: readonly NewsletterStatCardConfig[] = [
  {
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: MailCheck,
    key: "confirmed",
    status: NEWSLETTER_STATUS.CONFIRMED,
  },
  {
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: Hourglass,
    key: "pending",
    status: NEWSLETTER_STATUS.PENDING,
  },
  {
    gradient: "from-red-500/20 via-rose-500/6 to-transparent",
    icon: MailX,
    key: "unsubscribed",
    status: NEWSLETTER_STATUS.UNSUBSCRIBED,
  },
]
