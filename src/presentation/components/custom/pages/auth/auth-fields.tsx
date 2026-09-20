import { type ComponentProps, type JSX, useCallback, useState } from "react"

import { cn } from "cn"
import { Check } from "lucide-react"
import { type Control, type FieldPath, type FieldValues, useController } from "react-hook-form"

import { Field, FieldError } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"

import {
  FloatingLabel,
  VALID_INPUT_CLASS,
  ValidCheck,
  isFieldValid,
  toStringValue,
} from "~/src/presentation/components/custom/floating-field"
import { PasswordToggle } from "~/src/presentation/components/custom/pages/auth/password-toggle"
export const AuthTextField = <TFieldValues extends FieldValues>({
  className,
  control,
  id,
  label,
  name,
  required,
  ...rest
}: AuthTextFieldProps<TFieldValues>): JSX.Element => {
  const { field, fieldState } = useController({
    control,
    name,
  })
  const valueStr = toStringValue(field.value)
  const showValid = isFieldValid(fieldState, valueStr)
  return (
    <Field className="relative" data-invalid={fieldState.invalid}>
      <Input
        {...rest}
        {...field}
        value={valueStr}
        id={id}
        variant="floating"
        placeholder=" "
        aria-invalid={fieldState.invalid}
        aria-required={required}
        className={cn("peer", showValid && VALID_INPUT_CLASS, className)}
      />
      <FloatingLabel htmlFor={id} label={label} required={required} />
      <ValidCheck show={showValid} />
      {fieldState.error?.message !== undefined && <FieldError>{fieldState.error.message}</FieldError>}
    </Field>
  )
}
export const AuthPasswordField = <TFieldValues extends FieldValues>({
  className,
  control,
  id,
  label,
  name,
  required,
  ...rest
}: AuthPasswordFieldProps<TFieldValues>): JSX.Element => {
  const { field, fieldState } = useController({
    control,
    name,
  })
  const [show, setShow] = useState(false)
  const valueStr = toStringValue(field.value)
  const showValid = isFieldValid(fieldState, valueStr)
  const toggle = useCallback(() => {
    setShow((prev) => !prev)
  }, [])
  return (
    <Field className="relative" data-invalid={fieldState.invalid}>
      <InputGroup className={cn(showValid && "border-success focus-within:border-success")}>
        <InputGroupInput
          {...rest}
          {...field}
          value={valueStr}
          id={id}
          type={show ? "text" : "password"}
          placeholder=" "
          aria-invalid={fieldState.invalid}
          aria-required={required}
          className={cn("peer placeholder:text-transparent", className)}
        />
        <FloatingLabel htmlFor={id} label={label} required={required} />
        {showValid && (
          <InputGroupAddon align="inline-end">
            <Check aria-hidden strokeWidth={1.75} className="size-4 text-success" />
          </InputGroupAddon>
        )}
        <InputGroupAddon align="inline-end">
          <PasswordToggle show={show} onToggle={toggle} />
        </InputGroupAddon>
      </InputGroup>
      {fieldState.error?.message !== undefined && <FieldError>{fieldState.error.message}</FieldError>}
    </Field>
  )
}
interface AuthTextFieldProps<TFieldValues extends FieldValues> extends Omit<ComponentProps<typeof Input>, "name"> {
  readonly control: Control<TFieldValues>
  readonly id: string
  readonly label: string
  readonly name: FieldPath<TFieldValues>
  readonly required?: boolean
}
interface AuthPasswordFieldProps<TFieldValues extends FieldValues> extends Omit<ComponentProps<typeof InputGroupInput>, "name" | "type"> {
  readonly control: Control<TFieldValues>
  readonly id: string
  readonly label: string
  readonly name: FieldPath<TFieldValues>
  readonly required?: boolean
}
