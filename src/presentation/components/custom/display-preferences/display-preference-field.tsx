import { type JSX, useCallback, useId } from "react"

import { Label } from "~/src/presentation/components/shadcn/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { type PreferenceChoice } from "~/src/presentation/components/custom/display-preferences/use-display-preference-options"
import {
  type DisplayPreferenceName,
  useSaveDisplayPreference,
} from "~/src/presentation/components/custom/display-preferences/use-save-display-preference"

export const DisplayPreferenceField = ({
  choice,
  className,
  label,
  labelClassName,
  preference,
  triggerClassName,
}: DisplayPreferenceFieldProps): JSX.Element => {
  const fieldId = useId()
  const { isSaving, save } = useSaveDisplayPreference(preference)
  const handleChange = useCallback(
    (value: string | null) => {
      save(value, choice.value)
    },
    [choice.value, save],
  )

  return (
    <div className={className}>
      <Label className={labelClassName} htmlFor={fieldId}>
        {label}
      </Label>
      <Select disabled={isSaving} items={choice.options} onValueChange={handleChange} value={choice.value}>
        <SelectTrigger className={triggerClassName} id={fieldId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choice.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface DisplayPreferenceFieldProps {
  readonly choice: PreferenceChoice
  readonly className: string
  readonly label: string
  readonly labelClassName: string
  readonly preference: DisplayPreferenceName
  readonly triggerClassName: string
}
