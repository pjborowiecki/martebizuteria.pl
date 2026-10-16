import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { DisplayPreferenceField } from "~/src/presentation/components/custom/display-preferences/display-preference-field"
import { useDisplayPreferenceOptions } from "~/src/presentation/components/custom/display-preferences/use-display-preference-options"
import { NewsletterField } from "~/src/presentation/components/custom/pages/account/profile/newsletter-field"

const PREFERENCE_LABEL_CLASS = "text-[11px] tracking-widest text-muted-foreground uppercase"

const PREFERENCE_TRIGGER_CLASS =
  "mt-1.5 flex h-auto w-full items-center justify-between rounded-none border-0 border-b border-border bg-transparent p-0 pb-2 text-[14px] shadow-none transition-colors outline-none hover:bg-transparent focus:border-foreground focus:ring-0 focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-foreground"

export const PreferencesSection = ({ email }: Readonly<{ email: string }>): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const tPreferences = useTranslations("components.custom.displayPreferences")
  const options = useDisplayPreferenceOptions()

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("preferences")}</h2>
      <Separator className="mt-3 mb-0" />
      <div className="divide-y divide-border">
        <DisplayPreferenceField
          choice={options.timeZone}
          className="py-4"
          label={tPreferences("timeZone")}
          labelClassName={PREFERENCE_LABEL_CLASS}
          preference="timeZone"
          triggerClassName={PREFERENCE_TRIGGER_CLASS}
        />
        <DisplayPreferenceField
          choice={options.formatLocale}
          className="py-4"
          label={tPreferences("formatLocale")}
          labelClassName={PREFERENCE_LABEL_CLASS}
          preference="formatLocale"
          triggerClassName={PREFERENCE_TRIGGER_CLASS}
        />
        <NewsletterField email={email} />
      </div>
    </section>
  )
}
