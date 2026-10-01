import { type JSX, useCallback, useId } from "react"

import { cn } from "cn"
import { Pencil, Save, X } from "lucide-react"
import { type Control, useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

import { type EditableField } from "~/src/presentation/components/custom/pages/account/profile/profile-form.types"

const FieldActions = ({
  editing,
  field,
  label,
  onCancel,
  onEdit,
  onSave,
}: Readonly<{
  editing: boolean
  field: EditableField
  label: string
  onCancel: (field: EditableField) => void
  onEdit: (field: EditableField) => void
  onSave: (field: EditableField) => Promise<void>
}>): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const handleEdit = useCallback(() => {
    onEdit(field)
  }, [field, onEdit])

  const handleSave = useCallback(() => {
    void onSave(field)
  }, [field, onSave])

  const handleCancel = useCallback(() => {
    onCancel(field)
  }, [field, onCancel])

  if (!editing) {
    return (
      <Button aria-label={t("editField", { field: label })} onClick={handleEdit} size="icon-xs" variant="ghost">
        <Pencil className="size-3.5" strokeWidth={1.5} />
      </Button>
    )
  }

  return (
    <div className="flex shrink-0 gap-1">
      <Button
        aria-label={t("saveField", { field: label })}
        className="text-foreground hover:text-foreground"
        onClick={handleSave}
        size="icon-xs"
        variant="ghost"
      >
        <Save className="size-3.5" strokeWidth={1.5} />
      </Button>
      <Button
        aria-label={t("cancelField", { field: label })}
        className="text-muted-foreground hover:text-destructive"
        onClick={handleCancel}
        size="icon-xs"
        variant="ghost"
      >
        <X className="size-3.5" strokeWidth={1.5} />
      </Button>
    </div>
  )
}

export const ProfileField = ({
  control,
  editing,
  field,
  label,
  onCancel,
  onEdit,
  onSave,
  type,
}: Readonly<{
  control: Control<CustomerAccount["profileForm"]>
  editing: boolean
  field: EditableField
  label: string
  onCancel: (field: EditableField) => void
  onEdit: (field: EditableField) => void
  onSave: (field: EditableField) => Promise<void>
  type: string
}>): JSX.Element => {
  const validation = useTranslations("pages.account.profile.validation")
  const fieldId = useId()
  const errorId = `${fieldId}-error`
  const { field: controlled, fieldState } = useController({
    control,
    name: field,
  })
  const error = fieldState.error?.message

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="min-w-0 flex-1">
        <Label className="text-[11px] tracking-widest text-muted-foreground uppercase" htmlFor={fieldId}>
          {label}
        </Label>
        <Input
          {...controlled}
          aria-describedby={error === undefined ? undefined : errorId}
          aria-invalid={fieldState.invalid}
          className={cn(
            "mt-1 block",
            editing ? "cursor-text text-foreground" : "pointer-events-none cursor-default text-foreground",
            fieldState.invalid && "border-b border-destructive",
          )}
          id={fieldId}
          readOnly={!editing}
          type={type}
          variant="account-inline"
        />
        {error === undefined ? undefined : (
          <p className="mt-1.5 text-[12px] text-destructive" id={errorId}>
            {validation.has(error) ? validation(error) : validation("saveError")}
          </p>
        )}
      </div>
      <FieldActions editing={editing} field={field} label={label} onCancel={onCancel} onEdit={onEdit} onSave={onSave} />
    </div>
  )
}
