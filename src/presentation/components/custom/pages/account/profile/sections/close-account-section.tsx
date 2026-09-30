import { type ChangeEvent, type JSX, useCallback, useState } from "react"

import { AlertTriangle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"
import { Separator } from "~/src/presentation/components/shadcn/separator"

const CloseAccountDialog = ({
  canConfirmClose,
  closeConfirmation,
  onCancel,
  onCloseAccount,
  setCloseConfirmation,
}: Readonly<{
  canConfirmClose: boolean
  closeConfirmation: string
  onCancel: () => void
  onCloseAccount: () => void
  setCloseConfirmation: (val: string) => void
}>): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setCloseConfirmation(event.target.value)
    },
    [setCloseConfirmation],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 mx-4 w-full max-w-md bg-background p-8 shadow-lg ring-1 ring-border/50">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-destructive" strokeWidth={1.5} />
            <h3 className="text-[14px]">{t("closeDialogTitle")}</h3>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{t("closeDialogDesc")}</p>
          <ul className="space-y-1.5 pl-4 text-[12px] leading-relaxed text-muted-foreground">
            <li className="list-disc">{t("closeDialogPoint1")}</li>
            <li className="list-disc">{t("closeDialogPoint2")}</li>
            <li className="list-disc">{t("closeDialogPoint3")}</li>
          </ul>
          <div className="mt-4">
            <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{t("closeDialogConfirm")}</Label>
            <Input
              variant="account"
              type="text"
              value={closeConfirmation}
              onChange={handleChange}
              placeholder="DELETE"
              className="mt-1.5"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="destructive"
              size="account-sm"
              disabled={!canConfirmClose}
              onClick={onCloseAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-30"
            >
              {t("closeAccountAction")}
            </Button>
            <Button variant="account-ghost" onClick={onCancel}>
              {t("closeDialogCancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const CloseAccountSection = (): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [closeConfirmation, setCloseConfirmation] = useState("")
  const canConfirmClose = closeConfirmation.toLowerCase() === "delete"
  const handleOpenDialog = useCallback(() => {
    setShowCloseDialog(true)
  }, [])

  const handleCancelDialog = useCallback(() => {
    setShowCloseDialog(false)
    setCloseConfirmation("")
  }, [])

  const handleCloseAccount = useCallback(() => {
    if (canConfirmClose) {
      setShowCloseDialog(false)
      setCloseConfirmation("")
    }
  }, [canConfirmClose])

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
              <Button variant="account-destructive" size="account-sm" className="mt-4" onClick={handleOpenDialog}>
                {t("closeAccountAction")}
              </Button>
            </div>
          </div>
        </div>
      </section>
      {showCloseDialog ? (
        <CloseAccountDialog
          canConfirmClose={canConfirmClose}
          closeConfirmation={closeConfirmation}
          onCancel={handleCancelDialog}
          onCloseAccount={handleCloseAccount}
          setCloseConfirmation={setCloseConfirmation}
        />
      ) : undefined}
    </>
  )
}
