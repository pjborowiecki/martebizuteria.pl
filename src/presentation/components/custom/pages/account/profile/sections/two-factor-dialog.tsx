import { type JSX, useCallback } from "react"

import { Dialog, DialogContent } from "~/src/presentation/components/shadcn/dialog"

import { TwoFactorBackupStep } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-backup-step"
import { TwoFactorPasswordStep } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-password-step"
import { TwoFactorScanStep } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-scan-step"
import {
  TWO_FACTOR_STEP,
  useTwoFactorSetup,
} from "~/src/presentation/components/custom/pages/account/profile/sections/use-two-factor-setup"

export const TwoFactorDialog = ({ enabled, onEnabledChange, onOpenChange, open }: Readonly<TwoFactorDialogProps>): JSX.Element => {
  const setup = useTwoFactorSetup({
    onEnabled: () => {
      onEnabledChange(true)
    },
  })

  const close = useCallback(() => {
    setup.reset()
    onOpenChange(false)
  }, [onOpenChange, setup])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true)

        return
      }
      close()
    },
    [close, onOpenChange],
  )

  const submitPassword = useCallback(
    async (password: string) => {
      if (!enabled) {
        await setup.submitPassword(password)

        return
      }

      const disabled = await setup.submitDisable(password)
      if (disabled) {
        onEnabledChange(false)
        close()
      }
    },
    [close, enabled, onEnabledChange, setup],
  )

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        {setup.step === TWO_FACTOR_STEP.PASSWORD && (
          <TwoFactorPasswordStep disabling={enabled} onCancel={close} onSubmit={submitPassword} />
        )}

        {setup.step === TWO_FACTOR_STEP.SCAN && setup.totpUri !== undefined && (
          <TwoFactorScanStep onCancel={close} onSubmit={setup.submitCode} totpUri={setup.totpUri} />
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
