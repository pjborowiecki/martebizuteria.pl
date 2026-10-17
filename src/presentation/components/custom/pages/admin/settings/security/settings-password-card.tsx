import { type JSX, useCallback, useState } from "react"

import { KeyRound } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ChangePasswordDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/change-password-dialog"
import { SetPasswordDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/set-password-dialog"
import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

export const SettingsPasswordCard = ({ hasPassword }: Readonly<{ hasPassword: boolean }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.password")
  const [open, setOpen] = useState(false)

  const openDialog = useCallback(() => {
    setOpen(true)
  }, [])

  return (
    <>
      <SettingsCard
        action={
          <Button className="shrink-0 gap-1.5 self-start" onClick={openDialog} size="sm" variant="outline">
            <KeyRound className="size-3.5" strokeWidth={1.5} />
            {hasPassword ? t("change") : t("set")}
          </Button>
        }
        description={hasPassword ? t("changeDescription") : t("setDescription")}
        title={t("title")}
      />
      {hasPassword ? (
        <ChangePasswordDialog onOpenChange={setOpen} open={open} variant="default" />
      ) : (
        <SetPasswordDialog onOpenChange={setOpen} open={open} variant="default" />
      )}
    </>
  )
}
