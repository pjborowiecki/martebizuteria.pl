import { type ChangeEvent, type ComponentProps, type JSX, useCallback } from "react";

import { type Control, type ControllerFieldState, type FieldPath, useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Field, FieldError } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { Label } from "~/src/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";
import { Textarea } from "~/src/components/shadcn/textarea";

import {
  COLLECTION_SHEET_INPUT_CLASS,
  COLLECTION_SHEET_INPUT_GROUP_CLASS,
  COLLECTION_SHEET_SELECT_CLASS,
  COLLECTION_SHEET_TEXTAREA_CLASS
} from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-sheet.styles";

import { COLLECTION_FORM_VALIDATION_KEYS } from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";

type FieldName = FieldPath<Collection["formValues"]>;

const COLLECTION_FORM_VALIDATION_KEY_SET = new Set<string>(Object.values(COLLECTION_FORM_VALIDATION_KEYS));

function FieldErrorMessage({ fieldState }: Readonly<{ fieldState: ControllerFieldState }>): JSX.Element | undefined {
  const t = useTranslations("admin");
  const rawMessage = fieldState.error?.message;
  if (rawMessage === undefined || rawMessage === "") {
    return undefined;
  }
  const message = COLLECTION_FORM_VALIDATION_KEY_SET.has(rawMessage) ? t(rawMessage) : rawMessage;
  return <FieldError>{message}</FieldError>;
}

function LabelRow({ children, counter }: Readonly<{ children: string; counter?: string }>): JSX.Element {
  if (counter === undefined) {
    return <Label className="text-[13px] font-medium text-foreground">{children}</Label>;
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-[13px] font-medium text-foreground">{children}</Label>
      <span className="text-[12px] text-muted-foreground tabular-nums">{counter}</span>
    </div>
  );
}

/* ── Text field ───────────────────────────────────────────────────── */

interface CollectionTextFieldProps extends Omit<ComponentProps<typeof Input>, "name"> {
  readonly control: Control<Collection["formValues"]>;
  readonly label: string;
  readonly name: FieldName;
  readonly counterMax?: number;
  readonly onValueChange?: (value: string) => void;
}

export function CollectionTextField({ control, label, name, counterMax, onValueChange, ...rest }: CollectionTextFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const { value } = field;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      field.onChange(e);
      onValueChange?.(e.target.value);
    },
    [field, onValueChange]
  );

  const counter = counterMax === undefined ? undefined : `${value.length}/${counterMax}`;

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <LabelRow counter={counter}>{label}</LabelRow>
      <Input
        {...rest}
        {...field}
        value={value}
        onChange={handleChange}
        aria-invalid={fieldState.invalid}
        className={COLLECTION_SHEET_INPUT_CLASS}
      />
      <FieldErrorMessage fieldState={fieldState} />
    </Field>
  );
}

/* ── Slug field (prefixed, normalized on input) ───────────────────── */

interface CollectionSlugFieldProps {
  readonly control: Control<Collection["formValues"]>;
  readonly disabled?: boolean;
  readonly hint?: string;
  readonly label: string;
  readonly name: FieldName;
  readonly normalize: (value: string) => string;
  readonly onManualEdit?: () => void;
}

export function CollectionSlugField({
  control,
  disabled,
  hint,
  label,
  name,
  normalize,
  onManualEdit
}: CollectionSlugFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onManualEdit?.();
      field.onChange(normalize(e.target.value));
    },
    [field, normalize, onManualEdit]
  );

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <Label className="text-[13px] font-medium text-foreground">{label}</Label>
      <InputGroup className={COLLECTION_SHEET_INPUT_GROUP_CLASS}>
        <InputGroupAddon className="border-r border-border pr-3 text-[13px] font-normal text-muted-foreground">
          /collections/
        </InputGroupAddon>
        <InputGroupInput
          {...field}
          value={field.value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="collection-name"
          aria-invalid={fieldState.invalid}
        />
      </InputGroup>
      {hint !== undefined && <p className="text-[12px] leading-relaxed text-muted-foreground">{hint}</p>}
      <FieldErrorMessage fieldState={fieldState} />
    </Field>
  );
}

/* ── Textarea field ───────────────────────────────────────────────── */

interface CollectionTextareaFieldProps extends Omit<ComponentProps<typeof Textarea>, "name"> {
  readonly control: Control<Collection["formValues"]>;
  readonly label: string;
  readonly name: FieldName;
  readonly counterMax?: number;
}

export function CollectionTextareaField({
  control,
  label,
  name,
  counterMax,
  className,
  ...rest
}: CollectionTextareaFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const { value } = field;

  const counter = counterMax === undefined ? undefined : `${value.length}/${counterMax}`;

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <LabelRow counter={counter}>{label}</LabelRow>
      <Textarea
        {...rest}
        {...field}
        value={value}
        aria-invalid={fieldState.invalid}
        className={cn(COLLECTION_SHEET_TEXTAREA_CLASS, className)}
      />
      <FieldErrorMessage fieldState={fieldState} />
    </Field>
  );
}

/* ── Select field ─────────────────────────────────────────────────── */

interface SelectOption {
  readonly label: string;
  readonly value: string;
}

interface CollectionSelectFieldProps {
  readonly ariaLabel: string;
  readonly control: Control<Collection["formValues"]>;
  readonly disabled?: boolean;
  readonly name: FieldName;
  readonly options: readonly SelectOption[];
}

export function CollectionSelectField({ ariaLabel, control, disabled, name, options }: CollectionSelectFieldProps): JSX.Element {
  const { field } = useController({ control, name });

  const handleValueChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        field.onChange(value);
      }
    },
    [field]
  );

  return (
    <Select items={options} value={field.value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className={COLLECTION_SHEET_SELECT_CLASS}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
