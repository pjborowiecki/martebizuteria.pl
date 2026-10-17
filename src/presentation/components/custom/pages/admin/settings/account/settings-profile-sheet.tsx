import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { UserRound } from "lucide-react"
import { useTranslations } from "use-intl/react"

import {
  CUSTOMER_ACCOUNT_NAME_MAX_LENGTH,
  CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH,
} from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { PROFILE_VALIDATION_NAMESPACE } from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-credential"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { useSaveProfile } from "~/src/presentation/components/custom/pages/admin/settings/account/use-save-profile"
import { SettingsFormSection } from "~/src/presentation/components/custom/pages/admin/settings/settings-form-section"
import {
  SettingsSheet,
  SettingsSheetCancelButton,
  SettingsSheetSubmitButton,
} from "~/src/presentation/components/custom/pages/admin/settings/settings-sheet"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const PROFILE_FORM_ID = "profile-form"

export const SettingsProfileSheet = ({ onClose, profile }: Readonly<SettingsProfileSheetProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.account.profile")
  const { isPending, save } = useSaveProfile(profile)
  const [nameLength, setNameLength] = useState(profile.name.length)
  const [phoneLength, setPhoneLength] = useState(profile.phone?.length ?? 0)
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone", string>>>({})

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const parsed = customerAccountZodSchemas.profileForm.safeParse({ name: data.get("name"), phone: data.get("phone") })
      if (!parsed.success) {
        setErrors(Object.fromEntries(parsed.error.issues.toReversed().map((issue) => [String(issue.path[0]), issue.message])))

        return
      }

      setErrors({})
      void save(parsed.data).then((saved) => {
        if (saved) {
          onClose()
        }
      })
    },
    [onClose, save],
  )

  return (
    <SettingsSheet
      description={t("description")}
      footer={
        <>
          <SettingsSheetCancelButton disabled={isPending} label={t("cancel")} onClick={onClose} />
          <SettingsSheetSubmitButton formId={PROFILE_FORM_ID} isPending={isPending} label={t("save")} />
        </>
      }
      formId={PROFILE_FORM_ID}
      isPending={isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t("edit")}
    >
      <SettingsFormSection icon={UserRound} title={t("title")}>
        <Field className="gap-2" data-invalid={errors.name !== undefined}>
          <CatalogFormFieldLabel counter={`${String(nameLength)}/${String(CUSTOMER_ACCOUNT_NAME_MAX_LENGTH)}`} label={t("name")} required />
          <Input
            aria-invalid={errors.name !== undefined}
            aria-label={t("name")}
            autoComplete="name"
            defaultValue={profile.name}
            disabled={isPending}
            maxLength={CUSTOMER_ACCOUNT_NAME_MAX_LENGTH}
            name="name"
            onChange={(event) => {
              setNameLength(event.target.value.length)
            }}
            variant="sheet"
          />
          <ValidationFieldError message={errors.name} namespace={PROFILE_VALIDATION_NAMESPACE} />
        </Field>
        <Field className="gap-2" data-invalid={errors.phone !== undefined}>
          <CatalogFormFieldLabel counter={`${String(phoneLength)}/${String(CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH)}`} label={t("phone")} />
          <Input
            aria-invalid={errors.phone !== undefined}
            aria-label={t("phone")}
            autoComplete="tel"
            defaultValue={profile.phone}
            disabled={isPending}
            maxLength={CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH}
            name="phone"
            onChange={(event) => {
              setPhoneLength(event.target.value.length)
            }}
            type="tel"
            variant="sheet"
          />
          <ValidationFieldError message={errors.phone} namespace={PROFILE_VALIDATION_NAMESPACE} />
        </Field>
      </SettingsFormSection>
    </SettingsSheet>
  )
}

interface SettingsProfileSheetProps {
  readonly onClose: () => void
  readonly profile: CustomerAccount["profile"]
}
