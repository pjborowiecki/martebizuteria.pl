import { type JSX, useCallback, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { ChangePasswordDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/change-password-dialog"
import { TwoFactorDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-dialog"

export const SecuritySection = ({ twoFactorEnabled }: Readonly<{ twoFactorEnabled: boolean }>): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const queryClient = useQueryClient()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [twoFactorOpen, setTwoFactorOpen] = useState(false)

  const openPassword = useCallback(() => {
    setPasswordOpen(true)
  }, [])

  const openTwoFactor = useCallback(() => {
    setTwoFactorOpen(true)
  }, [])

  const refreshTwoFactor = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE }),
      queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS }),
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.CURRENT }),
    ])
  }, [queryClient])

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
          <Button onClick={openPassword} variant="account-ghost">
            {t("update")}
          </Button>
        </div>
        <div className="flex items-center justify-between py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px]">{t("twoFactor")}</p>
              <Badge className="text-[10px]" variant={twoFactorEnabled ? "default" : "secondary"}>
                {twoFactorEnabled ? t("twoFactorOn") : t("twoFactorOff")}
              </Badge>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{t("twoFactorDesc")}</p>
          </div>
          <Button onClick={openTwoFactor} variant="account-ghost">
            {twoFactorEnabled ? t("disable") : t("enable")}
          </Button>
        </div>
      </div>

      <ChangePasswordDialog onOpenChange={setPasswordOpen} open={passwordOpen} />
      <TwoFactorDialog
        enabled={twoFactorEnabled}
        key={twoFactorOpen ? "open" : "closed"}
        onEnabledChange={refreshTwoFactor}
        onOpenChange={setTwoFactorOpen}
        open={twoFactorOpen}
      />
    </section>
  )
}
