import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { NewsletterField } from "~/src/presentation/components/custom/pages/account/profile/newsletter-field"
import { TimezoneField } from "~/src/presentation/components/custom/pages/account/profile/timezone-field"

export const PreferencesSection = ({ email, timezone }: Readonly<{ email: string; timezone?: string | undefined }>): JSX.Element => {
  const t = useTranslations("pages.account.profile")

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("preferences")}</h2>
      <Separator className="mt-3 mb-0" />
      <div className="divide-y divide-border">
        <TimezoneField timezone={timezone} />
        <NewsletterField email={email} />
      </div>
    </section>
  )
}
