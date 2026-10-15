import { type JSX } from "react"

import { UserRound } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const NewsletterSubscriberAccountCell = ({ userId }: Readonly<{ userId: string | undefined }>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.subscribers.account")

  if (userId === undefined) {
    return <span className="text-[13px] whitespace-nowrap text-muted-foreground">{t("none")}</span>
  }

  return (
    <LocalizedLink
      className="inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap underline-offset-4 hover:underline"
      params={{ id: userId }}
      to={ROUTES.ADMIN_CUSTOMER}
    >
      <UserRound className="size-3.5" strokeWidth={1.5} />
      {t("open")}
    </LocalizedLink>
  )
}
