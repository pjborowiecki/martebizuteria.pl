import { useCallback, useState } from "react"

import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"

const enableTwoFactor = createClientOnlyFn((password: string) => authClient.twoFactor.enable({ password }))

const verifyTotp = createClientOnlyFn((code: string) => authClient.twoFactor.verifyTotp({ code }))

const disableTwoFactor = createClientOnlyFn((password: string) => authClient.twoFactor.disable({ password }))

export const TWO_FACTOR_STEP = {
  BACKUP: "backup",
  PASSWORD: "password",
  SCAN: "scan",
} as const

export type TwoFactorStep = (typeof TWO_FACTOR_STEP)[keyof typeof TWO_FACTOR_STEP]

export const useTwoFactorSetup = ({ onEnabled }: Readonly<{ onEnabled: () => void }>): UseTwoFactorSetupResult => {
  const t = useTranslations("pages.account.profile.twoFactorDialog")
  const [step, setStep] = useState<TwoFactorStep>(TWO_FACTOR_STEP.PASSWORD)
  const [totpUri, setTotpUri] = useState<string | undefined>(undefined)
  const [backupCodes, setBackupCodes] = useState<readonly string[]>([])
  const [pending, setPending] = useState(false)

  const reset = useCallback(() => {
    setStep(TWO_FACTOR_STEP.PASSWORD)
    setTotpUri(undefined)
    setBackupCodes([])
    setPending(false)
  }, [])

  const submitPassword = useCallback(
    async (password: string) => {
      setPending(true)
      const { data, error } = await enableTwoFactor(password)
      setPending(false)

      if (error !== null || data.method !== "totp") {
        toast.error(t("errorTitle"), { description: t("wrongPassword") })

        return
      }

      setTotpUri(data.totpURI)
      setBackupCodes(data.backupCodes)
      setStep(TWO_FACTOR_STEP.SCAN)
    },
    [t],
  )

  const submitCode = useCallback(
    async (code: string) => {
      setPending(true)
      const { error } = await verifyTotp(code)
      setPending(false)

      if (error !== null) {
        toast.error(t("errorTitle"), { description: t("wrongCode") })

        return
      }

      setStep(TWO_FACTOR_STEP.BACKUP)
      onEnabled()
      toast.success(t("enabledTitle"), { description: t("enabledDescription") })
    },
    [onEnabled, t],
  )

  const submitDisable = useCallback(
    async (password: string) => {
      setPending(true)
      const { error } = await disableTwoFactor(password)
      setPending(false)

      if (error !== null) {
        toast.error(t("errorTitle"), { description: t("wrongPassword") })

        return false
      }

      toast.success(t("disabledTitle"), { description: t("disabledDescription") })

      return true
    },
    [t],
  )

  return { backupCodes, pending, reset, step, submitCode, submitDisable, submitPassword, totpUri }
}

interface UseTwoFactorSetupResult {
  readonly backupCodes: readonly string[]
  readonly pending: boolean
  readonly reset: () => void
  readonly step: TwoFactorStep
  readonly submitCode: (code: string) => Promise<void>
  readonly submitDisable: (password: string) => Promise<boolean>
  readonly submitPassword: (password: string) => Promise<void>
  readonly totpUri: string | undefined
}
