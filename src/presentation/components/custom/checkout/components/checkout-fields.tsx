import { type ComponentProps, type JSX, useCallback } from "react"

import { cn } from "cn"
import { type Control, type ControllerFieldState, useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"
import { Label } from "~/src/presentation/components/shadcn/label"
import { RadioGroup, RadioGroupItem } from "~/src/presentation/components/shadcn/radio-group"

import {
  FloatingLabel,
  VALID_INPUT_CLASS,
  ValidCheck,
  isFieldValid,
  toStringValue,
} from "~/src/presentation/components/custom/floating-field"

const LABEL_CLASS = "font-medium text-[10px] text-muted-foreground uppercase tracking-[0.22em]"

const PHONE_PREFIX = "+48"

const FieldErrorMessage = ({ fieldState }: Readonly<{ fieldState: ControllerFieldState }>): JSX.Element | undefined => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const message = fieldState.error?.message

  if (!fieldState.invalid || message === undefined || message === "") {
    return undefined
  }

  return <FieldError>{t(message)}</FieldError>
}

interface CheckoutTextFieldProps extends Omit<ComponentProps<typeof Input>, "name"> {
  readonly control: Control<CheckoutFormSchema>
  readonly label: string
  readonly name: keyof CheckoutFormSchema
  readonly displayValue?: string
  readonly required?: boolean
}

export const CheckoutTextField = ({
  className,
  control,
  label,
  name,
  displayValue,
  required,
  ...rest
}: CheckoutTextFieldProps): JSX.Element => {
  const { field, fieldState } = useController({ control, name })

  const valueStr = displayValue ?? toStringValue(field.value)
  const isReadOnly = rest.readOnly === true
  const showValid = !isReadOnly && isFieldValid(fieldState, valueStr)

  return (
    <Field className={cn("relative", className)} data-invalid={fieldState.invalid}>
      <Input
        {...rest}
        {...field}
        variant="floating"
        value={valueStr}
        placeholder=" "
        id={field.name}
        aria-invalid={fieldState.invalid}
        aria-required={required}
        className={cn("peer", showValid && VALID_INPUT_CLASS)}
      />
      <FloatingLabel htmlFor={field.name} label={label} required={required} />
      <ValidCheck show={showValid} />
      <FieldErrorMessage fieldState={fieldState} />
    </Field>
  )
}

interface CheckoutPhoneFieldProps {
  readonly className?: string
  readonly control: Control<CheckoutFormSchema>
  readonly label: string
  readonly name: keyof CheckoutFormSchema
  readonly required?: boolean
}

export const CheckoutPhoneField = ({ className, control, label, name, required }: CheckoutPhoneFieldProps): JSX.Element => {
  const { field, fieldState } = useController({ control, name })

  const valueStr = toStringValue(field.value)
  const showValid = isFieldValid(fieldState, valueStr)

  let prefixBorderClass = "border-border"
  if (fieldState.invalid) {
    prefixBorderClass = "border-destructive"
  } else if (showValid) {
    prefixBorderClass = "border-success"
  }

  return (
    <Field className={className} data-invalid={fieldState.invalid}>
      <div className="flex items-end gap-2">
        <div
          className={cn(
            "flex h-11 shrink-0 items-center border-0 border-b bg-background px-3 pt-2 text-sm text-foreground dark:bg-input/30",
            prefixBorderClass,
          )}
        >
          {PHONE_PREFIX}
        </div>
        <div className="relative flex-1">
          <Input
            {...field}
            variant="floating"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={valueStr}
            placeholder=" "
            id={field.name}
            aria-invalid={fieldState.invalid}
            aria-required={required}
            className={cn("peer", showValid && VALID_INPUT_CLASS)}
          />
          <FloatingLabel
            htmlFor={field.name}
            label={label}
            required={required}
            className="peer-focus:tracking-[0.05em] peer-[:not(:placeholder-shown)]:tracking-[0.05em]"
          />
          <ValidCheck show={showValid} />
        </div>
      </div>
      <FieldErrorMessage fieldState={fieldState} />
    </Field>
  )
}

interface CheckoutAddonFieldProps extends Omit<ComponentProps<typeof InputGroupInput>, "name"> {
  readonly addon: JSX.Element
  readonly control: Control<CheckoutFormSchema>
  readonly label: string
  readonly name: keyof CheckoutFormSchema
}

export const CheckoutAddonField = ({ addon, className, control, label, name, ...rest }: CheckoutAddonFieldProps): JSX.Element => {
  const { field, fieldState } = useController({ control, name })

  return (
    <Field className={className} data-invalid={fieldState.invalid}>
      <FieldLabel className={LABEL_CLASS} htmlFor={field.name}>
        {label}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput {...rest} {...field} value={toStringValue(field.value)} aria-invalid={fieldState.invalid} id={field.name} />
        <InputGroupAddon align="inline-end">{addon}</InputGroupAddon>
      </InputGroup>
      <FieldErrorMessage fieldState={fieldState} />
    </Field>
  )
}

interface CheckoutRadioFieldProps extends Omit<ComponentProps<typeof RadioGroup>, "defaultValue" | "name" | "onValueChange" | "value"> {
  readonly children: JSX.Element | JSX.Element[]
  readonly control: Control<CheckoutFormSchema>
  readonly name: keyof CheckoutFormSchema
  readonly onValueChange?: (value: string) => void
}

export const CheckoutRadioField = ({
  children,
  className,
  control,
  name,
  onValueChange,
  ...rest
}: CheckoutRadioFieldProps): JSX.Element => {
  const { field, fieldState } = useController({ control, name })

  const handleValueChange = useCallback(
    (value: string) => {
      field.onChange(value)
      onValueChange?.(value)
    },
    [field, onValueChange],
  )

  return (
    <FieldGroup>
      <Field className="gap-4" data-invalid={fieldState.invalid}>
        <RadioGroup
          {...rest}
          onValueChange={handleValueChange}
          value={toStringValue(field.value)}
          className={cn("flex flex-col gap-3", className)}
          aria-invalid={fieldState.invalid}
        >
          {children}
        </RadioGroup>
        <FieldErrorMessage fieldState={fieldState} />
      </Field>
    </FieldGroup>
  )
}

interface OptionCardProps extends Omit<ComponentProps<typeof RadioGroupItem>, "children" | "id" | "value"> {
  readonly icon: JSX.Element
  readonly id: string
  readonly label: string
  readonly value: string
  readonly description?: string | JSX.Element | undefined
}

export const OptionCard = ({ className, icon, id, label, value, description, ...rest }: OptionCardProps): JSX.Element => (
  <Label
    htmlFor={id}
    className={cn(
      "flex cursor-pointer items-center gap-4 rounded-none border border-border/50 bg-background px-5 py-4 font-normal text-foreground transition-colors hover:border-border has-aria-checked:border-foreground/40",
      className,
    )}
  >
    <RadioGroupItem {...rest} value={value} id={id} className="size-4 shrink-0 rounded-full border-muted-foreground/40 text-foreground" />
    <span className="pointer-events-none shrink-0 text-muted-foreground/70">{icon}</span>
    <span className="pointer-events-none flex-1 text-sm leading-snug font-medium">{label}</span>
    {description !== undefined && <span className="pointer-events-none shrink-0 text-xs text-muted-foreground">{description}</span>}
  </Label>
)

interface CheckoutCheckboxFieldProps extends Omit<ComponentProps<typeof Checkbox>, "name"> {
  readonly control: Control<CheckoutFormSchema>
  readonly label: string
  readonly name: keyof CheckoutFormSchema
}

export const CheckoutCheckboxField = ({ control, label, name, ...rest }: CheckoutCheckboxFieldProps): JSX.Element => {
  const { field } = useController({ control, name })

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      field.onChange(checked)
    },
    [field],
  )

  return (
    <Field className="items-start gap-3 sm:col-span-2" orientation="horizontal">
      <Checkbox
        {...rest}
        id={`checkout-${name}`}
        checked={Boolean(field.value)}
        onCheckedChange={handleCheckedChange}
        className={cn("rounded-none", rest.className)}
      />
      <Label htmlFor={`checkout-${name}`} className="cursor-pointer text-xs leading-relaxed font-normal text-muted-foreground">
        {label}
      </Label>
    </Field>
  )
}
