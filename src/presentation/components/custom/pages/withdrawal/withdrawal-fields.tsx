import { type JSX } from "react"

import { type Control, type FieldPath, type FieldValues, useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { ORDER_WITHDRAWAL_SCOPES } from "~/src/modules/order-withdrawal/order-withdrawal.constants"

import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "~/src/presentation/components/shadcn/field"
import { Label } from "~/src/presentation/components/shadcn/label"
import { RadioGroup, RadioGroupItem } from "~/src/presentation/components/shadcn/radio-group"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { toStringValue } from "~/src/presentation/components/custom/floating-field"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

export const WITHDRAWAL_VALIDATION_NAMESPACE = "pages.withdrawal.validation"

export const WITHDRAWAL_LABEL_CLASS = "text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase"

export const WithdrawalScopeField = <TFieldValues extends FieldValues>({
  control,
  idPrefix,
  name,
}: Readonly<WithdrawalFieldProps<TFieldValues> & { idPrefix: string }>): JSX.Element => {
  const t = useTranslations("pages.withdrawal.form")
  const { field } = useController({ control, name })

  return (
    <FieldSet>
      <FieldLegend className={WITHDRAWAL_LABEL_CLASS} variant="label">
        {t("scopeLegend")}
      </FieldLegend>
      <RadioGroup className="gap-3" onValueChange={field.onChange} value={toStringValue(field.value)}>
        {ORDER_WITHDRAWAL_SCOPES.map((scope) => (
          <Label className="cursor-pointer gap-3 text-sm font-normal" htmlFor={`${idPrefix}-${scope}`} key={scope}>
            <RadioGroupItem id={`${idPrefix}-${scope}`} value={scope} />
            {t(`scope.${scope}`)}
          </Label>
        ))}
      </RadioGroup>
    </FieldSet>
  )
}

export const WithdrawalTextAreaField = <TFieldValues extends FieldValues>({
  control,
  hint,
  id,
  label,
  name,
}: Readonly<WithdrawalFieldProps<TFieldValues> & { hint: string; id: string; label: string }>): JSX.Element => {
  const { field, fieldState } = useController({ control, name })

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel className={WITHDRAWAL_LABEL_CLASS} htmlFor={id}>
        {label}
      </FieldLabel>
      <Textarea {...field} aria-invalid={fieldState.invalid} id={id} rows={3} value={toStringValue(field.value)} />
      <FieldDescription>{hint}</FieldDescription>
      <ValidationFieldError message={fieldState.error?.message} namespace={WITHDRAWAL_VALIDATION_NAMESPACE} />
    </Field>
  )
}

interface WithdrawalFieldProps<TFieldValues extends FieldValues> {
  readonly control: Control<TFieldValues>
  readonly name: FieldPath<TFieldValues>
}
