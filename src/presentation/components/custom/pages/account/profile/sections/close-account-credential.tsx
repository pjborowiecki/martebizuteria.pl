import { type JSX } from "react"

import { type Control } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type CloseAccountFormValues } from "~/src/modules/customer-account/customer-account.zod"

import { AuthPasswordField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

export const PROFILE_VALIDATION_NAMESPACE = "pages.account.profile.validation"

export const CloseAccountCredential = ({ control, hasPassword }: Readonly<CloseAccountCredentialProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile")

  if (!hasPassword) {
    return <p className="text-[12px] leading-relaxed text-muted-foreground">{t("closeDialogRecentSignIn")}</p>
  }

  return (
    <AuthPasswordField
      autoComplete="current-password"
      control={control}
      id="close-account-password"
      label={t("closeDialogPassword")}
      name="password"
      validationNamespace={PROFILE_VALIDATION_NAMESPACE}
    />
  )
}

interface CloseAccountCredentialProps {
  readonly control: Control<CloseAccountFormValues>
  readonly hasPassword: boolean
}
