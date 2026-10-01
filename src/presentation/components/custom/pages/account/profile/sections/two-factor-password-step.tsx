import { type JSX, type SyntheticEvent, useCallback } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

export const TwoFactorPasswordStep = ({
  disabling,
  onCancel,
  onChange,
  onSubmit,
  password,
  pending,
}: Readonly<TwoFactorPasswordStepProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.twoFactorDialog")
  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      onSubmit()
    },
    [onSubmit],
  )

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{disabling ? t("disableTitle") : t("enableTitle")}</DialogTitle>
        <DialogDescription>{disabling ? t("disableDescription") : t("enableDescription")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-2 py-4">
        <Label htmlFor="two-factor-password">{t("password")}</Label>
        <Input
          autoComplete="current-password"
          autoFocus
          id="two-factor-password"
          onChange={(event) => {
            onChange(event.target.value)
          }}
          type="password"
          value={password}
        />
      </div>

      <DialogFooter>
        <Button disabled={pending} onClick={onCancel} type="button" variant="outline">
          {t("cancel")}
        </Button>
        <Button className="gap-1.5" disabled={pending || password === ""} type="submit" variant={disabling ? "destructive" : "default"}>
          {pending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          {disabling ? t("confirmDisable") : t("continue")}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface TwoFactorPasswordStepProps {
  readonly disabling: boolean
  readonly onCancel: () => void
  readonly onChange: (password: string) => void
  readonly onSubmit: () => void
  readonly password: string
  readonly pending: boolean
}
