import { type JSX, type SyntheticEvent, useCallback, useState } from "react"

import { createClientOnlyFn } from "@tanstack/react-start"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"

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
  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [useBackup, setUseBackup] = useState(false)
  const [pending, setPending] = useState(false)

  const verify = useCallback(async () => {
    setPending(true)
    const { error } = useBackup ? await verifyBackupCode(code, trustDevice) : await verifyTotp(code, trustDevice)
    if (error !== null) {
      setPending(false)
      toast.error(t(useBackup ? "wrongBackupCode" : "wrongCode"))
      setCode("")

      return
    }

    await redirectAfterAuth()
    setPending(false)
  }, [code, redirectAfterAuth, t, trustDevice, useBackup])

  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void verify()
    },
    [verify],
  )

  const toggleBackup = useCallback(() => {
    setUseBackup((previous) => !previous)
    setCode("")
  }, [])

  const canSubmit = useBackup ? code.trim() !== "" : code.length === TOTP_CODE_LENGTH

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="two-factor-challenge-code">{useBackup ? t("backupLabel") : t("codeLabel")}</Label>
        <Input
          autoComplete="one-time-code"
          autoFocus
          id="two-factor-challenge-code"
          inputMode={useBackup ? "text" : "numeric"}
          maxLength={useBackup ? undefined : TOTP_CODE_LENGTH}
          onChange={(event) => {
            setCode(useBackup ? event.target.value : event.target.value.replaceAll(/\D/gu, ""))
          }}
          value={code}
        />
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          checked={trustDevice}
          id="two-factor-trust-device"
          onCheckedChange={(checked) => {
            setTrustDevice(checked)
          }}
        />
        <Label htmlFor="two-factor-trust-device">{t("trustDevice")}</Label>
      </div>

      <Button className="w-full gap-2" disabled={pending || !canSubmit} type="submit">
        {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {t("verify")}
        {!pending && <ArrowRight aria-hidden className="size-4" />}
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
