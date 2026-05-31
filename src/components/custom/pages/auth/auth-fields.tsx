import { type ComponentProps, type JSX, useCallback, useState } from "react";

import { Check } from "lucide-react";
import { type Control, type FieldPath, type FieldValues, useController } from "react-hook-form";

import { cn } from "~/src/lib/utils";

import { Field, FieldError } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";

import { FloatingLabel, isFieldValid, toStringValue, VALID_INPUT_CLASS, ValidCheck } from "~/src/components/custom/floating-field";
import { PasswordToggle } from "~/src/components/custom/pages/auth/password-toggle";

/* ── Text / email field with floating label ───────────────────────── */

interface AuthTextFieldProps<T extends FieldValues> extends Omit<ComponentProps<typeof Input>, "name"> {
  readonly control: Control<T>;
  readonly id: string;
  readonly label: string;
  readonly name: FieldPath<T>;
  readonly required?: boolean;
}

export function AuthTextField<T extends FieldValues>({
  className,
  control,
  id,
  label,
  name,
  required,
  ...rest
}: AuthTextFieldProps<T>): JSX.Element {
  const { field, fieldState } = useController({ control, name });

  const valueStr = toStringValue(field.value);
  const showValid = isFieldValid(fieldState, valueStr);

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
  );
}

/* ── Password field with floating label + visibility toggle ────────── */

interface AuthPasswordFieldProps<T extends FieldValues> extends Omit<ComponentProps<typeof InputGroupInput>, "name" | "type"> {
  readonly control: Control<T>;
  readonly id: string;
  readonly label: string;
  readonly name: FieldPath<T>;
  readonly required?: boolean;
}

export function AuthPasswordField<T extends FieldValues>({
  className,
  control,
  id,
  label,
  name,
  required,
  ...rest
}: AuthPasswordFieldProps<T>): JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const [show, setShow] = useState(false);

  const valueStr = toStringValue(field.value);
  const showValid = isFieldValid(fieldState, valueStr);

  const toggle = useCallback(() => {
    setShow((prev) => !prev);
  }, []);

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
  );
}
