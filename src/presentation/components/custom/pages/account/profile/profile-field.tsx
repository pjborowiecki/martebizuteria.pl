import { type JSX } from "react"

import { cn } from "cn"
import { Pencil, Save, X } from "lucide-react"
import { type Control, useController } from "react-hook-form"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

import { type EditableField } from "~/src/presentation/components/custom/pages/account/profile/profile-form.types"

const FieldActions = ({
  editing,
  field,
  onCancel,
  onEdit,
  onSave,
}: Readonly<{
  editing: boolean
  field: EditableField
  onCancel: (field: EditableField) => void
  onEdit: (field: EditableField) => void
  onSave: (field: EditableField) => Promise<void>
}>): JSX.Element => {
  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => {
          onEdit(field)
        }}
      >
        <Pencil className="size-3.5" strokeWidth={1.5} />
      </Button>
    )
  }

  return (
    <div className="flex shrink-0 gap-1">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => {
          void onSave(field)
        }}
        className="text-foreground hover:text-foreground"
      >
        <Save className="size-3.5" strokeWidth={1.5} />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => {
          onCancel(field)
        }}
        className="text-muted-foreground hover:text-destructive"
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
  const { field: controlled, fieldState } = useController({
    control,
    name: field,
  })

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="min-w-0 flex-1">
        <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</Label>
        <Input
          {...controlled}
          variant="account-inline"
          type={type}
          readOnly={!editing}
          aria-invalid={fieldState.invalid}
          className={cn("mt-1 block", editing ? "cursor-text text-foreground" : "pointer-events-none cursor-default text-foreground")}
        />
      </div>
      <FieldActions editing={editing} field={field} onCancel={onCancel} onEdit={onEdit} onSave={onSave} />
    </div>
  )
}
