import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

export const SecuritySection = (): JSX.Element => {
  const t = useTranslations("pages.account.profile")

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("security")}</h2>
      <Separator className="mt-3 mb-0" />
      <div className="divide-y divide-border">
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-[14px]">{t("changePassword")}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{t("changePasswordDesc")}</p>
          </div>
          <Button variant="account-ghost">{t("update")}</Button>
        </div>
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-[14px]">{t("twoFactor")}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{t("twoFactorDesc")}</p>
          </div>
          <Button variant="account-ghost">{t("enable")}</Button>
        </div>
      </div>
    </section>
  )
}
