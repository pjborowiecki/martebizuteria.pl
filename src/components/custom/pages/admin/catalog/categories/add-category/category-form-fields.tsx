import { type ChangeEvent, type ComponentProps, type JSX, useCallback } from "react";

import { type Control, type ControllerFieldState, type FieldPath, useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Field, FieldError } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";
import { Textarea } from "~/src/components/shadcn/textarea";

import {
  CATEGORY_SHEET_INPUT_CLASS,
  CATEGORY_SHEET_INPUT_GROUP_CLASS,
  CATEGORY_SHEET_SELECT_CLASS,
  CATEGORY_SHEET_TEXTAREA_CLASS
} from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-sheet.styles";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/components/catalog-form-field-label";

import { CATEGORY_FORM_VALIDATION_KEYS } from "~/src/modules/category/category.constants";
import type { Category } from "~/src/modules/category/category.types";

type FieldName = FieldPath<Category["formValues"]>;

const CATEGORY_FORM_VALIDATION_KEY_SET = new Set<string>(Object.values(CATEGORY_FORM_VALIDATION_KEYS));

function FieldErrorMessage({ fieldState }: Readonly<{ fieldState: ControllerFieldState }>): JSX.Element | undefined {
  const t = useTranslations("pages.admin.catalog.categories");
  const rawMessage = fieldState.error?.message;
  if (rawMessage === undefined || rawMessage === "") {
    return undefined;
  }
  const message = CATEGORY_FORM_VALIDATION_KEY_SET.has(rawMessage) ? t(rawMessage) : rawMessage;
  return <FieldError>{message}</FieldError>;
}

/* ── Text field ───────────────────────────────────────────────────── */

interface CategoryTextFieldProps extends Omit<ComponentProps<typeof Input>, "name"> {
  readonly control: Control<Category["formValues"]>;
  readonly label: string;
  readonly labelHint?: string;
  readonly name: FieldName;
  readonly counterMax?: number;
  readonly onValueChange?: (value: string) => void;
}

export function CategoryTextField({
  control,
  label,
  labelHint,
  name,
  counterMax,
  onValueChange,
  ...rest
}: CategoryTextFieldProps): JSX.Element {
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
      <CatalogFormFieldLabel counter={counter} hint={labelHint} label={label} />
      <Input
        {...rest}
        {...field}
        value={value}
        onChange={handleChange}
        maxLength={counterMax}
        aria-invalid={fieldState.invalid}
        className={CATEGORY_SHEET_INPUT_CLASS}
      />
      <FieldErrorMessage fieldState={fieldState} />
    </Field>
  );
}

/* ── Slug field (prefixed, normalized on input) ───────────────────── */

interface CategorySlugFieldProps {
  readonly control: Control<Category["formValues"]>;
  readonly counterMax?: number;
  readonly disabled?: boolean;
  readonly label: string;
  readonly labelHint?: string;
  readonly name: FieldName;
  readonly normalize: (value: string) => string;
  readonly onManualEdit?: () => void;
}

export function CategorySlugField({
  control,
  counterMax,
  disabled,
  label,
  labelHint,
  name,
  normalize,
  onManualEdit
}: CategorySlugFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const { value } = field;

  const counter = counterMax === undefined ? undefined : `${value.length}/${counterMax}`;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onManualEdit?.();
      field.onChange(normalize(e.target.value));
    },
    [field, normalize, onManualEdit]
  );

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel counter={counter} hint={labelHint} label={label} />
      <InputGroup className={CATEGORY_SHEET_INPUT_GROUP_CLASS}>
        <InputGroupAddon className="border-r border-border pr-3 text-[13px] font-normal text-muted-foreground">
          /categories/
        </InputGroupAddon>
        <InputGroupInput
          {...field}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          maxLength={counterMax}
          placeholder="category-slug"
          aria-invalid={fieldState.invalid}
        />
      </InputGroup>
      <FieldErrorMessage fieldState={fieldState} />
    </Field>
  );
}

/* ── Textarea field ───────────────────────────────────────────────── */

interface CategoryTextareaFieldProps extends Omit<ComponentProps<typeof Textarea>, "name"> {
  readonly control: Control<Category["formValues"]>;
  readonly label: string;
  readonly labelHint?: string;
  readonly name: FieldName;
  readonly counterMax?: number;
}

export function CategoryTextareaField({
  control,
  label,
  labelHint,
  name,
  counterMax,
  className,
  ...rest
}: CategoryTextareaFieldProps): JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const { value } = field;

  const counter = counterMax === undefined ? undefined : `${value.length}/${counterMax}`;

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel counter={counter} hint={labelHint} label={label} />
      <Textarea
        {...rest}
        {...field}
        value={value}
        maxLength={counterMax}
        aria-invalid={fieldState.invalid}
        className={cn(CATEGORY_SHEET_TEXTAREA_CLASS, className)}
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

interface CategorySelectFieldProps {
  readonly ariaLabel: string;
  readonly control: Control<Category["formValues"]>;
  readonly disabled?: boolean;
  readonly name: FieldName;
  readonly options: readonly SelectOption[];
}

export function CategorySelectField({ ariaLabel, control, disabled, name, options }: CategorySelectFieldProps): JSX.Element {
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
      <SelectTrigger aria-label={ariaLabel} className={CATEGORY_SHEET_SELECT_CLASS}>
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
