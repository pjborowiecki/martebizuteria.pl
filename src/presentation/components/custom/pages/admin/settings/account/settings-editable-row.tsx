import { type JSX, type SyntheticEvent, useCallback, useId, useState } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"

import { PROFILE_VALIDATION_NAMESPACE } from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-credential"
import { type ProfileFieldName } from "~/src/presentation/components/custom/pages/admin/settings/account/use-save-profile-field"
import { SettingsRow } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

export const SettingsEditableRow = ({ emptyLabel, field, label, onSave, value }: Readonly<SettingsEditableRowProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.account.profile")
  const inputId = useId()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  const startEditing = useCallback(() => {
    setIsEditing(true)
  }, [])

  const stopEditing = useCallback(() => {
    setIsEditing(false)
    setError(undefined)
  }, [])

  const handleSubmit = useCallback(
    async (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      const parsed = customerAccountZodSchemas.profileForm.shape[field].safeParse(new FormData(event.currentTarget).get(field))
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message)

        return
      }
      setIsSaving(true)
      const saved = await onSave(field, parsed.data)
      setIsSaving(false)
      if (saved) {
        stopEditing()
      }
    },
    [field, onSave, stopEditing],
  )

  if (!isEditing) {
    return (
      <SettingsRow
        action={
          <Button className="self-start sm:self-auto" onClick={startEditing} size="sm" variant="outline">
            {t("edit")}
          </Button>
        }
        label={label}
      >
        {value === undefined ? emptyLabel : <span className="text-foreground">{value}</span>}
      </SettingsRow>
    )
  }

  return (
    <form className="space-y-3 px-4 py-4 lg:px-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <label className="block text-[13px] leading-5 font-medium text-foreground" htmlFor={inputId}>
        {label}
      </label>
      <Input aria-invalid={error !== undefined} defaultValue={value} id={inputId} name={field} variant="sheet" />
      <ValidationFieldError message={error} namespace={PROFILE_VALIDATION_NAMESPACE} />
      <div className="flex gap-2">
        <Button className="gap-1.5" disabled={isSaving} size="sm" type="submit">
          {isSaving && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          {t("save")}
        </Button>
        <Button disabled={isSaving} onClick={stopEditing} size="sm" type="button" variant="outline">
          {t("cancel")}
        </Button>
      </div>
    </form>
  )
}

interface SettingsEditableRowProps {
  readonly emptyLabel?: string
  readonly field: ProfileFieldName
  readonly label: string
  readonly onSave: (field: ProfileFieldName, value: string) => Promise<boolean>
  readonly value?: string | undefined
}
