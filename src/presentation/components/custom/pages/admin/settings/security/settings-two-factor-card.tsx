import { type JSX, useCallback, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { isAdminTwoFactorRequired } from "~/src/integrations/better-auth/auth.access"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

import { TwoFactorDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-dialog"
import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

export const SettingsTwoFactorCard = ({ enabled, hasPassword }: Readonly<SettingsTwoFactorCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.twoFactor")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const openDialog = useCallback(() => {
    setOpen(true)
  }, [])

  const refresh = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE }),
      queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS }),
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.CURRENT }),
    ])
  }, [queryClient])

  const notes = [isAdminTwoFactorRequired() ? t("requiredNote") : undefined, hasPassword ? undefined : t("needsPassword")].filter(
    (note) => note !== undefined,
  )

  return (
    <>
      <SettingsCard
        action={
          <div className="flex shrink-0 items-center gap-3 self-start">
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? t("on") : t("off")}</Badge>
            <Button disabled={!hasPassword} onClick={openDialog} size="sm" variant="outline">
              {enabled ? t("disable") : t("enable")}
            </Button>
          </div>
        }
        description={t("description")}
        title={t("title")}
      >
        {notes.length > 0 ? (
          <div className="space-y-2 px-4 py-4 text-[13px] leading-relaxed text-muted-foreground lg:px-5">
            {notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        ) : undefined}
      </SettingsCard>
      <TwoFactorDialog
        enabled={enabled}
        key={open ? "open" : "closed"}
        onEnabledChange={refresh}
        onOpenChange={setOpen}
        open={open}
        variant="default"
      />
    </>
  )
}

interface SettingsTwoFactorCardProps {
  readonly enabled: boolean
  readonly hasPassword: boolean
}
