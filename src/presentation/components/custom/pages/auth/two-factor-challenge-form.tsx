import { type JSX, type SyntheticEvent, useCallback, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { createClientOnlyFn } from "@tanstack/react-start"
import { ArrowRight, Loader2 } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { type TwoFactorChallengeFormValues, twoFactorChallengeSchema } from "~/src/integrations/better-auth/auth.zod"

import { usePostAuthRedirect } from "~/src/hooks/use-post-auth-redirect"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

const TOTP_CODE_LENGTH = 6

const verifyTotp = createClientOnlyFn((code: string, trustDevice: boolean) => authClient.twoFactor.verifyTotp({ code, trustDevice }))

const verifyBackupCode = createClientOnlyFn((code: string, trustDevice: boolean) =>
  authClient.twoFactor.verifyBackupCode({ code, trustDevice }),
)

export const TwoFactorChallengeForm = ({ onCancel }: Readonly<TwoFactorChallengeFormProps>): JSX.Element => {
  const t = useTranslations("pages.auth.sign-in.twoFactor")
  const redirectAfterAuth = usePostAuthRedirect()
  const [useBackup, setUseBackup] = useState(false)
  const form = useForm<TwoFactorChallengeFormValues>({
    defaultValues: { code: "", trustDevice: false },
    resolver: zodResolver(twoFactorChallengeSchema),
  })
  const code = useWatch({ control: form.control, name: "code" })
  const { isSubmitting } = form.formState

  const verify = useCallback(
    async ({ code: submitted, trustDevice }: TwoFactorChallengeFormValues) => {
      const { error } = useBackup ? await verifyBackupCode(submitted, trustDevice) : await verifyTotp(submitted, trustDevice)
      if (error !== null) {
        toast.error(t(useBackup ? "wrongBackupCode" : "wrongCode"))
        form.setValue("code", "")

        return
      }

      await redirectAfterAuth()
    },
    [form, redirectAfterAuth, t, useBackup],
  )

  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      void form.handleSubmit(verify)(event)
    },
    [form, verify],
  )

  const toggleBackup = useCallback(() => {
    setUseBackup((previous) => !previous)
    form.setValue("code", "")
  }, [form])

  const canSubmit = useBackup ? code.trim() !== "" : code.length === TOTP_CODE_LENGTH

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="two-factor-challenge-code">{useBackup ? t("backupLabel") : t("codeLabel")}</Label>
        <Controller
          control={form.control}
          name="code"
          render={({ field }) => (
            <Input
              autoComplete="one-time-code"
              autoFocus
              id="two-factor-challenge-code"
              inputMode={useBackup ? "text" : "numeric"}
              maxLength={useBackup ? undefined : TOTP_CODE_LENGTH}
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => {
                field.onChange(useBackup ? event.target.value : event.target.value.replaceAll(/\D/gu, ""))
              }}
              ref={field.ref}
              value={field.value}
            />
          )}
        />
      </div>

      <div className="flex items-center gap-3">
        <Controller
          control={form.control}
          name="trustDevice"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              id="two-factor-trust-device"
              onCheckedChange={(checked) => {
                field.onChange(checked)
              }}
            />
          )}
        />
        <Label htmlFor="two-factor-trust-device">{t("trustDevice")}</Label>
      </div>

      <Button className="w-full gap-2" disabled={isSubmitting || !canSubmit} type="submit">
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {t("verify")}
        {!isSubmitting && <ArrowRight aria-hidden className="size-4" />}
      </Button>

      <div className="flex flex-col gap-2 text-center text-[13px]">
        <button className="text-muted-foreground underline-offset-4 hover:underline" onClick={toggleBackup} type="button">
          {useBackup ? t("useAuthenticator") : t("useBackup")}
        </button>
        <button className="text-muted-foreground underline-offset-4 hover:underline" onClick={onCancel} type="button">
          {t("backToSignIn")}
        </button>
      </div>
    </form>
  )
}

interface TwoFactorChallengeFormProps {
  readonly onCancel: () => void
}
