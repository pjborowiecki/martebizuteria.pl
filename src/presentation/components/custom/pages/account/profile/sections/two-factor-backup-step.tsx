import { type JSX, useCallback } from "react"

import { Copy } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"

export const TwoFactorBackupStep = ({ backupCodes, onAcknowledge }: Readonly<TwoFactorBackupStepProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.twoFactorDialog")
  const copyBackupCodes = useCallback(() => {
    void navigator.clipboard.writeText(backupCodes.join("\n"))
    toast.success(t("backupCodesCopied"))
  }, [backupCodes, t])

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("backupTitle")}</DialogTitle>
        <DialogDescription>{t("backupDescription")}</DialogDescription>
      </DialogHeader>

      <div className="py-4">
        <ul className="grid grid-cols-2 gap-2 border border-border/60 p-4 font-mono text-[13px]">
          {backupCodes.map((backupCode) => (
            <li key={backupCode}>{backupCode}</li>
          ))}
        </ul>
        <Button className="mt-3 w-full gap-2" onClick={copyBackupCodes} type="button" variant="outline">
          <Copy className="size-3.5" strokeWidth={1.5} />
          {t("copyBackupCodes")}
        </Button>
      </div>

      <DialogFooter>
        <Button onClick={onAcknowledge} type="button">
          {t("backupAcknowledge")}
        </Button>
      </DialogFooter>
    </>
  )
}

interface TwoFactorBackupStepProps {
  readonly backupCodes: readonly string[]
  readonly onAcknowledge: () => void
}
