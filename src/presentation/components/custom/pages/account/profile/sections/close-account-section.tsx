import { type JSX, useState } from "react"

import { AlertTriangle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { CloseAccountDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-dialog"

export const CloseAccountSection = ({ hasPassword }: Readonly<{ hasPassword: boolean }>): JSX.Element => {
  const [open, setOpen] = useState(false)

  const openDialog = (): void => {
    setOpen(true)
  }

  const t = useTranslations("pages.account.profile")

  return (
    <>
      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-destructive/70 uppercase">{t("closeAccount")}</h2>
        <Separator className="mt-3 mb-0" />
        <div className="py-5">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive/60" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px]">{t("closeAccountTitle")}</p>
              <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-muted-foreground">{t("closeAccountDesc")}</p>
              <Button className="mt-4" onClick={openDialog} size="account-sm" variant="account-destructive">
                {t("closeAccountAction")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <CloseAccountDialog hasPassword={hasPassword} onOpenChange={setOpen} open={open} />
    </>
  )
}
