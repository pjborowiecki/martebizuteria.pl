import { type ComponentProps, type JSX, useCallback } from "react";

import { type Control, type ControllerFieldState, useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Checkbox } from "~/src/components/shadcn/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { Label } from "~/src/components/shadcn/label";
import { RadioGroup, RadioGroupItem } from "~/src/components/shadcn/radio-group";

import { FloatingLabel, isFieldValid, toStringValue, VALID_INPUT_CLASS, ValidCheck } from "~/src/components/custom/floating-field";

import type { CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod";

const LABEL_CLASS = "font-medium text-[10px] text-muted-foreground uppercase tracking-[0.22em]";

const PHONE_PREFIX = "+48";

// Validation messages are stored as translation keys (e.g. "validation.emailRequired"),
// so the single place they're rendered also resolves them.
function FieldErrorMessage({ fieldState }: Readonly<{ fieldState: ControllerFieldState }>): JSX.Element | undefined {
  const t = useTranslations("pages.checkout.checkoutForm");
  const message = fieldState.error?.message;

  if (!fieldState.invalid || message === undefined || message === "") {
    return undefined;
  }
  return <FieldError>{t(message)}</FieldError>;
}

/* ── Text Input Field ─────────────────────────────────────────────── */

interface CheckoutTextFieldProps extends Omit<ComponentProps<typeof Input>, "name"> {
  readonly control: Control<CheckoutFormSchema>;
  readonly label: string;
  readonly name: keyof CheckoutFormSchema;
  readonly displayValue?: string;
  readonly required?: boolean;
}

export function CheckoutTextField({
  className,
  control,
  label,
  name,
  displayValue,
  required,
  ...rest
}: CheckoutTextFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });

  const valueStr = displayValue ?? toStringValue(field.value);
  const isReadOnly = rest.readOnly === true;
  const showValid = !isReadOnly && isFieldValid(fieldState, valueStr);

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
  );
}

/* ── Phone Field (country selector + national number) ─────────────── */

interface CheckoutPhoneFieldProps {
  readonly className?: string;
  readonly control: Control<CheckoutFormSchema>;
  readonly label: string;
  readonly name: keyof CheckoutFormSchema;
  readonly required?: boolean;
}

export function CheckoutPhoneField({ className, control, label, name, required }: CheckoutPhoneFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });

  const valueStr = toStringValue(field.value);
  const showValid = isFieldValid(fieldState, valueStr);

  let prefixBorderClass = "border-border";
  if (fieldState.invalid) {
    prefixBorderClass = "border-destructive";
  } else if (showValid) {
    prefixBorderClass = "border-success";
  }

  return (
    <Field className={className} data-invalid={fieldState.invalid}>
      <div className="flex items-end gap-2">
        {/* pt-2 + h-11 drops the prefix to the input's (bottom-weighted) value
            baseline, and the border mirrors the input's state so the underline
            stays continuous across the prefix and the number. */}
        <div
          className={cn(
            "flex h-11 shrink-0 items-center border-0 border-b bg-background px-3 pt-2 text-sm text-foreground dark:bg-input/30",
            prefixBorderClass
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
          {/* The mobile-phone label is long; tighten the floated letter-spacing
              (vs the global 0.22em) so the full label fits this narrow field. */}
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
  );
}

/* ── Text Input Field with trailing addon ─────────────────────────── */

interface CheckoutAddonFieldProps extends Omit<ComponentProps<typeof InputGroupInput>, "name"> {
  readonly addon: JSX.Element;
  readonly control: Control<CheckoutFormSchema>;
  readonly label: string;
  readonly name: keyof CheckoutFormSchema;
}

export function CheckoutAddonField({ addon, className, control, label, name, ...rest }: CheckoutAddonFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });

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
  );
}

/* ── Radio Group Field ────────────────────────────────────────────── */

interface CheckoutRadioFieldProps extends Omit<ComponentProps<typeof RadioGroup>, "defaultValue" | "name" | "onValueChange" | "value"> {
  readonly children: JSX.Element | JSX.Element[];
  readonly control: Control<CheckoutFormSchema>;
  readonly name: keyof CheckoutFormSchema;
  readonly onValueChange?: (value: string) => void;
}

export function CheckoutRadioField({ children, className, control, name, onValueChange, ...rest }: CheckoutRadioFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });

  const handleValueChange = useCallback(
    (value: string) => {
      field.onChange(value);
      onValueChange?.(value);
    },
    [field, onValueChange]
  );

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
  );
}

/* ── Radio Card (used inside RadioGroup) ──────────────────────────── */

interface OptionCardProps extends Omit<ComponentProps<typeof RadioGroupItem>, "children" | "id" | "value"> {
  readonly icon: JSX.Element;
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly description?: string | JSX.Element;
}

export function OptionCard({ className, icon, id, label, value, description, ...rest }: OptionCardProps): JSX.Element {
  // A bordered row (radio · icon · label · trailing price) that mirrors the
  // Stripe Payment Element's accordion items, so delivery and payment selection
  // look identical.
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-none border border-border/50 bg-background px-5 py-4 font-normal text-foreground transition-colors hover:border-border has-aria-checked:border-foreground/40",
        className
      )}
    >
      <RadioGroupItem {...rest} value={value} id={id} className="size-4 shrink-0 rounded-full border-muted-foreground/40 text-foreground" />
      <span className="pointer-events-none shrink-0 text-muted-foreground/70">{icon}</span>
      <span className="pointer-events-none flex-1 text-sm leading-snug font-medium">{label}</span>
      {description !== undefined && <span className="pointer-events-none shrink-0 text-xs text-muted-foreground">{description}</span>}
    </Label>
  );
}

/* ── Checkbox Field ───────────────────────────────────────────────── */

interface CheckoutCheckboxFieldProps extends Omit<ComponentProps<typeof Checkbox>, "name"> {
  readonly control: Control<CheckoutFormSchema>;
  readonly label: string;
  readonly name: keyof CheckoutFormSchema;
}

export function CheckoutCheckboxField({ control, label, name, ...rest }: CheckoutCheckboxFieldProps): JSX.Element {
  const { field } = useController({ control, name });

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      field.onChange(checked);
    },
    [field]
  );

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
  );
}
