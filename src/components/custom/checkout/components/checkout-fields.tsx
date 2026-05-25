"use client";

import { type JSX, useCallback } from "react";

import { type Control, useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Checkbox } from "~/src/components/shadcn/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { RadioGroup, RadioGroupItem } from "~/src/components/shadcn/radio-group";

import type { CheckoutFormSchema } from "~/src/components/custom/checkout/lib/checkout.schema";

const LABEL_CLASS = "font-medium text-[10px] text-muted-foreground uppercase tracking-[0.22em]";

/* ── Text Input Field ─────────────────────────────────────────────── */

interface CheckoutTextFieldProps {
  readonly autoComplete?: string;
  readonly className?: string;
  readonly control: Control<CheckoutFormSchema>;
  readonly disabled?: boolean;
  readonly inputMode?: "numeric" | "text";
  readonly label: string;
  readonly name: keyof CheckoutFormSchema;
  readonly placeholder?: string;
}

export function CheckoutTextField({
  autoComplete,
  className,
  control,
  disabled,
  inputMode,
  label,
  name,
  placeholder
}: CheckoutTextFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const t = useTranslations("checkoutPage.checkoutForm");

  return (
    <Field className={className} data-invalid={fieldState.invalid}>
      <FieldLabel className={LABEL_CLASS} htmlFor={field.name}>
        {label}
      </FieldLabel>
      <Input
        {...field}
        value={typeof field.value === "string" ? field.value : ""}
        autoComplete={autoComplete}
        aria-invalid={fieldState.invalid}
        disabled={disabled}
        id={field.name}
        inputMode={inputMode}
        placeholder={placeholder}
      />
      {fieldState.invalid && fieldState.error?.message !== undefined ? <FieldError>{t(fieldState.error.message)}</FieldError> : undefined}
    </Field>
  );
}

/* ── Text Input Field with trailing addon ─────────────────────────── */

interface CheckoutAddonFieldProps {
  readonly addon: JSX.Element;
  readonly autoComplete?: string;
  readonly className?: string;
  readonly control: Control<CheckoutFormSchema>;
  readonly inputMode?: "numeric" | "text";
  readonly label: string;
  readonly name: keyof CheckoutFormSchema;
}

export function CheckoutAddonField({
  addon,
  autoComplete,
  className,
  control,
  inputMode,
  label,
  name
}: CheckoutAddonFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const t = useTranslations("checkoutPage.checkoutForm");

  return (
    <Field className={className} data-invalid={fieldState.invalid}>
      <FieldLabel className={LABEL_CLASS} htmlFor={field.name}>
        {label}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          {...field}
          value={typeof field.value === "string" ? field.value : ""}
          autoComplete={autoComplete}
          aria-invalid={fieldState.invalid}
          id={field.name}
          inputMode={inputMode}
        />
        <InputGroupAddon align="inline-end">{addon}</InputGroupAddon>
      </InputGroup>
      {fieldState.invalid && fieldState.error?.message !== undefined ? <FieldError>{t(fieldState.error.message)}</FieldError> : undefined}
    </Field>
  );
}

/* ── Radio Group Field ────────────────────────────────────────────── */

interface CheckoutRadioFieldProps {
  readonly children: JSX.Element | JSX.Element[];
  readonly className?: string;
  readonly control: Control<CheckoutFormSchema>;
  readonly name: keyof CheckoutFormSchema;
}

export function CheckoutRadioField({ children, className, control, name }: CheckoutRadioFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const t = useTranslations("checkoutPage.checkoutForm");

  const handleValueChange = useCallback(
    (value: string) => {
      field.onChange(value);
    },
    [field]
  );

  return (
    <FieldGroup>
      <Field className="gap-4" data-invalid={fieldState.invalid}>
        <RadioGroup
          onValueChange={handleValueChange}
          value={typeof field.value === "string" ? field.value : ""}
          className={cn("grid grid-cols-2 gap-4 lg:grid-cols-3", className)}
          aria-invalid={fieldState.invalid}
        >
          {children}
        </RadioGroup>
        {fieldState.invalid && fieldState.error?.message !== undefined ? <FieldError>{t(fieldState.error.message)}</FieldError> : undefined}
      </Field>
    </FieldGroup>
  );
}

/* ── Radio Card (used inside RadioGroup) ──────────────────────────── */

interface RadioCardProps {
  readonly icon: JSX.Element;
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export function RadioCard({ icon, id, label, value }: RadioCardProps): JSX.Element {
  return (
    <div className="relative flex h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-none border border-border/50 bg-background p-5 transition-colors hover:border-border has-aria-checked:border-foreground/30">
      <RadioGroupItem value={value} id={id} className="sr-only" />
      <label htmlFor={id} className="absolute inset-0 cursor-pointer text-transparent">
        {label}
      </label>
      <span className="pointer-events-none mb-1 text-muted-foreground/60">{icon}</span>
      <span className="pointer-events-none text-center text-xs leading-snug font-normal text-foreground">{label}</span>
    </div>
  );
}

/* ── Checkbox Field ───────────────────────────────────────────────── */

interface CheckoutCheckboxFieldProps {
  readonly control: Control<CheckoutFormSchema>;
  readonly label: string;
  readonly name: keyof CheckoutFormSchema;
}

export function CheckoutCheckboxField({ control, label, name }: CheckoutCheckboxFieldProps): JSX.Element {
  const { field } = useController({ control, name });

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      field.onChange(checked);
    },
    [field]
  );

  return (
    <Field className="items-start gap-3 sm:col-span-2" orientation="horizontal">
      <Checkbox id={`checkout-${name}`} checked={field.value === true} onCheckedChange={handleCheckedChange} className="rounded-none" />
      <label htmlFor={`checkout-${name}`} className="cursor-pointer text-xs leading-relaxed text-muted-foreground">
        {label}
      </label>
    </Field>
  );
}
