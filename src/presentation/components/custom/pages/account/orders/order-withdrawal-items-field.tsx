import { type JSX } from "react"

import { type Control, useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"

import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import { FieldLegend, FieldSet } from "~/src/presentation/components/shadcn/field"
import { Label } from "~/src/presentation/components/shadcn/label"

import {
  WITHDRAWAL_LABEL_CLASS,
  WITHDRAWAL_VALIDATION_NAMESPACE,
} from "~/src/presentation/components/custom/pages/withdrawal/withdrawal-fields"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

export const OrderWithdrawalItemsField = ({ control, items }: Readonly<OrderWithdrawalItemsFieldProps>): JSX.Element => {
  const t = useTranslations("pages.withdrawal.account")
  const { field, fieldState } = useController({ control, name: "orderItemIds" })

  return (
    <FieldSet data-invalid={fieldState.invalid}>
      <FieldLegend className={WITHDRAWAL_LABEL_CLASS} variant="label">
        {t("itemsLegend")}
      </FieldLegend>
      {items.map((item) => (
        <Label
          className="cursor-pointer items-start gap-3 text-sm leading-snug font-normal"
          htmlFor={`order-withdrawal-item-${item.id}`}
          key={item.id}
        >
          <Checkbox
            checked={field.value.includes(item.id)}
            id={`order-withdrawal-item-${item.id}`}
            onCheckedChange={(checked) => {
              field.onChange(checked ? [...field.value, item.id] : field.value.filter((chosen) => chosen !== item.id))
            }}
          />
          {item.variantTitle === undefined ? item.name : `${item.name} — ${item.variantTitle}`} × {item.qty}
        </Label>
      ))}
      <ValidationFieldError message={fieldState.error?.message} namespace={WITHDRAWAL_VALIDATION_NAMESPACE} />
    </FieldSet>
  )
}

interface OrderWithdrawalItemsFieldProps {
  readonly control: Control<OrderWithdrawal["customerFormValues"]>
  readonly items: readonly CustomerAccount["orderItem"][]
}
