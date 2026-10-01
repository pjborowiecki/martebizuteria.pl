import { type JSX, type SyntheticEvent, useCallback } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Copy, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type TotpCodeFormValues, totpCodeSchema } from "~/src/integrations/better-auth/auth.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

import { TwoFactorQr } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-qr"
import { AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

export const TOTP_CODE_LENGTH = 6

export const readSetupKey = (uri: string): string => {
  try {
    return new URL(uri).searchParams.get("secret") ?? ""
  } catch {
    return ""
  }
}

export const TwoFactorScanStep = ({ onCancel, onSubmit, totpUri }: Readonly<TwoFactorScanStepProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.twoFactorDialog")
  const setupKey = readSetupKey(totpUri)
  const form = useForm<TotpCodeFormValues>({
    defaultValues: { code: "" },
    mode: "onChange",
    resolver: zodResolver(totpCodeSchema),
  })

  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void form.handleSubmit(async (values) => {
        await onSubmit(values.code)
      })(event)
    },
    [form, onSubmit],
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
          <AuthTextField
            autoComplete="one-time-code"
            control={form.control}
            id="two-factor-code"
            inputMode="numeric"
            label={t("codeLabel")}
            maxLength={TOTP_CODE_LENGTH}
            name="code"
          />
          <p className="text-[11px] text-muted-foreground">{t("codeDescription")}</p>
        </div>
      </div>

      <DialogFooter>
        <Button disabled={form.formState.isSubmitting} onClick={onCancel} type="button" variant="outline">
          {t("cancel")}
        </Button>
        <Button className="gap-1.5" disabled={!form.formState.isValid || form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          {t("verify")}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface TwoFactorScanStepProps {
  readonly onCancel: () => void
  readonly onSubmit: (code: string) => Promise<void>
  readonly totpUri: string
}
