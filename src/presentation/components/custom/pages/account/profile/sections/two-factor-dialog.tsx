import { type JSX, useCallback, useState } from "react"

import { Dialog, DialogContent } from "~/src/presentation/components/shadcn/dialog"

import { TwoFactorBackupStep } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-backup-step"
import { TwoFactorPasswordStep } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-password-step"
import { TwoFactorScanStep } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-scan-step"
import {
  TWO_FACTOR_STEP,
  useTwoFactorSetup,
} from "~/src/presentation/components/custom/pages/account/profile/sections/use-two-factor-setup"

export const TwoFactorDialog = ({ enabled, onEnabledChange, onOpenChange, open }: Readonly<TwoFactorDialogProps>): JSX.Element => {
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const setup = useTwoFactorSetup({
    onEnabled: () => {
      onEnabledChange(true)
    },
  })

  const close = useCallback(() => {
    setPassword("")
    setCode("")
    setup.reset()
    onOpenChange(false)
  }, [onOpenChange, setup])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (setup.pending) {
        return
      }

      if (nextOpen) {
        onOpenChange(true)

        return
      }
      close()
    },
    [close, onOpenChange, setup.pending],
  )

  const submitPassword = useCallback(() => {
    if (!enabled) {
      void setup.submitPassword(password)

      return
    }

    void setup.submitDisable(password).then((disabled) => {
      if (disabled) {
        onEnabledChange(false)
        close()
      }
    })
  }, [close, enabled, onEnabledChange, password, setup])

  const submitCode = useCallback(() => {
    void setup.submitCode(code)
  }, [code, setup])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {setup.step === TWO_FACTOR_STEP.PASSWORD && (
          <TwoFactorPasswordStep
            disabling={enabled}
            onCancel={close}
            onChange={setPassword}
            onSubmit={submitPassword}
            password={password}
            pending={setup.pending}
          />
        )}

        {setup.step === TWO_FACTOR_STEP.SCAN && setup.totpUri !== undefined && (
          <TwoFactorScanStep
            code={code}
            onCancel={close}
            onChange={setCode}
            onSubmit={submitCode}
            pending={setup.pending}
            totpUri={setup.totpUri}
          />
        )}

        {setup.step === TWO_FACTOR_STEP.BACKUP && <TwoFactorBackupStep backupCodes={setup.backupCodes} onAcknowledge={close} />}
      </DialogContent>
    </Dialog>
  )
}

interface TwoFactorDialogProps {
  readonly enabled: boolean
  readonly onEnabledChange: (enabled: boolean) => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
