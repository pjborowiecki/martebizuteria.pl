import { type JSX, type SyntheticEvent, useCallback } from "react"

import { Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

import { TwoFactorQr } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-qr"

export const TOTP_CODE_LENGTH = 6

export const readSetupKey = (uri: string): string => {
  try {
    return new URL(uri).searchParams.get("secret") ?? ""
  } catch {
    return ""
  }
}

export const TwoFactorScanStep = ({
  code,
  onCancel,
  onChange,
  onSubmit,
  pending,
  totpUri,
}: Readonly<TwoFactorScanStepProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.twoFactorDialog")
  const setupKey = readSetupKey(totpUri)
  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      onSubmit()
    },
    [onSubmit],
  )
  const copySetupKey = useCallback(() => {
    void navigator.clipboard.writeText(setupKey)
    toast.success(t("keyCopied"))
  }, [setupKey, t])

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{t("scanTitle")}</DialogTitle>
        <DialogDescription>{t("scanDescription")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <TwoFactorQr uri={totpUri} />

        <div className="space-y-1.5">
          <Label htmlFor="two-factor-setup-key">{t("manualKey")}</Label>
          <div className="flex gap-2">
            <Input className="font-mono text-xs" id="two-factor-setup-key" readOnly value={setupKey} />
            <Button aria-label={t("copyKey")} onClick={copySetupKey} size="icon" type="button" variant="outline">
              <Copy className="size-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="two-factor-code">{t("codeLabel")}</Label>
          <Input
            autoComplete="one-time-code"
            id="two-factor-code"
            inputMode="numeric"
            maxLength={TOTP_CODE_LENGTH}
            onChange={(event) => {
              onChange(event.target.value.replaceAll(/\D/gu, ""))
            }}
            value={code}
          />
          <p className="text-[11px] text-muted-foreground">{t("codeDescription")}</p>
        </div>
      </div>

      <DialogFooter>
        <Button disabled={pending} onClick={onCancel} type="button" variant="outline">
          {t("cancel")}
        </Button>
        <Button className="gap-1.5" disabled={pending || code.length !== TOTP_CODE_LENGTH} type="submit">
          {pending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          {t("verify")}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface TwoFactorScanStepProps {
  readonly code: string
  readonly onCancel: () => void
  readonly onChange: (code: string) => void
  readonly onSubmit: () => void
  readonly pending: boolean
  readonly totpUri: string
}
