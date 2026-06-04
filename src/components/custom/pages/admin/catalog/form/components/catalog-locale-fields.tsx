import { type ChangeEvent, type JSX, useCallback } from "react";

import { type Control, type FieldPath, type UseControllerReturn, useController } from "react-hook-form";

import type { Locale } from "~/src/constants/types";

import { cn } from "~/src/lib/utils";

import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { Textarea } from "~/src/components/shadcn/textarea";

import { CatalogFormFieldError } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-error";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import { useCatalogActiveLocale } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-locale-picker";
import {
  CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS,
  CATALOG_SHEET_TEXTAREA_CLASS
} from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";
import { catalogFieldStringValue } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.utils";

import type { Category } from "~/src/modules/product-category/product-category.types";
import type { Collection } from "~/src/modules/product-collection/product-collection.types";
import type { Product } from "~/src/modules/product/product.types";

const DEFAULT_TEXTAREA_ROWS = 4;

type CatalogLocaleFormValues = Category["formValues"] | Collection["formValues"] | Product["formValues"];

const LOCALE_MAP_FIELD_PATHS = {
  descriptions: { en: "descriptions.en", pl: "descriptions.pl" },
  shortDescriptions: { en: "shortDescriptions.en", pl: "shortDescriptions.pl" },
  subtitles: { en: "subtitles.en", pl: "subtitles.pl" },
  titles: { en: "titles.en", pl: "titles.pl" }
} as const satisfies Record<string, Record<Locale, FieldPath<CatalogLocaleFormValues>>>;

type CategoryLocaleMapFieldName = "titles" | "subtitles" | "shortDescriptions" | "descriptions";
type CollectionLocaleMapFieldName = "titles" | "descriptions";
type ProductLocaleMapFieldName = "titles" | "subtitles" | "descriptions";

function useCategoryLocaleMapField(
  control: Control<Category["formValues"]>,
  name: CategoryLocaleMapFieldName,
  locale: Locale
): UseControllerReturn<Category["formValues"], FieldPath<Category["formValues"]>> {
  return useController({
    control,
    name: LOCALE_MAP_FIELD_PATHS[name][locale]
  });
}

function useCollectionLocaleMapField(
  control: Control<Collection["formValues"]>,
  name: CollectionLocaleMapFieldName,
  locale: Locale
): UseControllerReturn<Collection["formValues"], FieldPath<Collection["formValues"]>> {
  return useController({
    control,
    name: LOCALE_MAP_FIELD_PATHS[name][locale]
  });
}

function useProductLocaleMapField(
  control: Control<Product["formValues"]>,
  name: ProductLocaleMapFieldName,
  locale: Locale
): UseControllerReturn<Product["formValues"], FieldPath<Product["formValues"]>> {
  return useController({
    control,
    name: LOCALE_MAP_FIELD_PATHS[name][locale]
  });
}

export interface CatalogLocaleFieldsCopy {
  readonly hint: (locale: Locale) => string;
  readonly label: (locale: Locale) => string;
  readonly placeholder: (locale: Locale) => string;
}

interface CategoryCatalogLocaleFormFieldProps {
  readonly control: Control<Category["formValues"]>;
  readonly copy: CatalogLocaleFieldsCopy;
  readonly disabled?: boolean;
  readonly maxLength: number;
  readonly name: CategoryLocaleMapFieldName;
  readonly onDefaultLocaleChange?: (value: string) => void;
  readonly required?: boolean;
  readonly translateValidation?: (key: string) => string;
  readonly validationKeySet?: ReadonlySet<string>;
}

interface CollectionCatalogLocaleFormFieldProps {
  readonly control: Control<Collection["formValues"]>;
  readonly copy: CatalogLocaleFieldsCopy;
  readonly disabled?: boolean;
  readonly maxLength: number;
  readonly name: CollectionLocaleMapFieldName;
  readonly onDefaultLocaleChange?: (value: string) => void;
  readonly required?: boolean;
  readonly translateValidation?: (key: string) => string;
  readonly validationKeySet?: ReadonlySet<string>;
}

interface CategoryCatalogLocaleTextareaFormFieldProps {
  readonly control: Control<Category["formValues"]>;
  readonly copy: CatalogLocaleFieldsCopy;
  readonly disabled?: boolean;
  readonly maxLength: number;
  readonly name: CategoryLocaleMapFieldName;
  readonly required?: boolean;
  readonly rows?: number;
  readonly translateValidation?: (key: string) => string;
  readonly validationKeySet?: ReadonlySet<string>;
}

interface CollectionCatalogLocaleTextareaFormFieldProps {
  readonly control: Control<Collection["formValues"]>;
  readonly copy: CatalogLocaleFieldsCopy;
  readonly disabled?: boolean;
  readonly maxLength: number;
  readonly name: CollectionLocaleMapFieldName;
  readonly required?: boolean;
  readonly rows?: number;
  readonly translateValidation?: (key: string) => string;
  readonly validationKeySet?: ReadonlySet<string>;
}

interface ProductCatalogLocaleFormFieldProps {
  readonly control: Control<Product["formValues"]>;
  readonly copy: CatalogLocaleFieldsCopy;
  readonly disabled?: boolean;
  readonly maxLength: number;
  readonly name: ProductLocaleMapFieldName;
  readonly onDefaultLocaleChange?: (value: string) => void;
  readonly required?: boolean;
  readonly translateValidation?: (key: string) => string;
  readonly validationKeySet?: ReadonlySet<string>;
}

interface ProductCatalogLocaleTextareaFormFieldProps {
  readonly control: Control<Product["formValues"]>;
  readonly copy: CatalogLocaleFieldsCopy;
  readonly disabled?: boolean;
  readonly fillHeight?: boolean;
  readonly maxLength: number;
  readonly name: ProductLocaleMapFieldName;
  readonly required?: boolean;
  readonly rows?: number;
  readonly translateValidation?: (key: string) => string;
  readonly validationKeySet?: ReadonlySet<string>;
}

export function CategoryCatalogLocaleFormField({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  onDefaultLocaleChange,
  required = false,
  translateValidation,
  validationKeySet
}: CategoryCatalogLocaleFormFieldProps): JSX.Element {
  const activeLocale = useCatalogActiveLocale();
  const { field, fieldState } = useCategoryLocaleMapField(control, name, activeLocale);
  const value = catalogFieldStringValue(field.value);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event);
      onDefaultLocaleChange?.(event.target.value);
    },
    [field, onDefaultLocaleChange]
  );

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel
        counter={`${value.length}/${maxLength}`}
        hint={copy.hint(activeLocale)}
        label={copy.label(activeLocale)}
        required={required}
      />
      <Input
        {...field}
        aria-invalid={fieldState.invalid}
        variant="sheet"
        disabled={disabled}
        maxLength={maxLength}
        onChange={handleChange}
        placeholder={copy.placeholder(activeLocale)}
        value={value}
      />
      <CatalogFormFieldError fieldState={fieldState} translate={translateValidation} validationKeySet={validationKeySet} />
    </Field>
  );
}

export function CollectionCatalogLocaleFormField({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  onDefaultLocaleChange,
  required = false,
  translateValidation,
  validationKeySet
}: CollectionCatalogLocaleFormFieldProps): JSX.Element {
  const activeLocale = useCatalogActiveLocale();
  const { field, fieldState } = useCollectionLocaleMapField(control, name, activeLocale);
  const value = catalogFieldStringValue(field.value);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event);
      onDefaultLocaleChange?.(event.target.value);
    },
    [field, onDefaultLocaleChange]
  );

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel
        counter={`${value.length}/${maxLength}`}
        hint={copy.hint(activeLocale)}
        label={copy.label(activeLocale)}
        required={required}
      />
      <Input
        {...field}
        aria-invalid={fieldState.invalid}
        variant="sheet"
        disabled={disabled}
        maxLength={maxLength}
        onChange={handleChange}
        placeholder={copy.placeholder(activeLocale)}
        value={value}
      />
      <CatalogFormFieldError fieldState={fieldState} translate={translateValidation} validationKeySet={validationKeySet} />
    </Field>
  );
}

export function CategoryCatalogLocaleTextareaFormField({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  required = false,
  rows = DEFAULT_TEXTAREA_ROWS,
  translateValidation,
  validationKeySet
}: CategoryCatalogLocaleTextareaFormFieldProps): JSX.Element {
  const activeLocale = useCatalogActiveLocale();
  const { field, fieldState } = useCategoryLocaleMapField(control, name, activeLocale);
  const value = catalogFieldStringValue(field.value);

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel
        counter={`${value.length}/${maxLength}`}
        hint={copy.hint(activeLocale)}
        label={copy.label(activeLocale)}
        required={required}
      />
      <Textarea
        {...field}
        aria-invalid={fieldState.invalid}
        className={CATALOG_SHEET_TEXTAREA_CLASS}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={copy.placeholder(activeLocale)}
        rows={rows}
        value={value}
      />
      <CatalogFormFieldError fieldState={fieldState} translate={translateValidation} validationKeySet={validationKeySet} />
    </Field>
  );
}

export function CollectionCatalogLocaleTextareaFormField({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  required = false,
  rows = DEFAULT_TEXTAREA_ROWS,
  translateValidation,
  validationKeySet
}: CollectionCatalogLocaleTextareaFormFieldProps): JSX.Element {
  const activeLocale = useCatalogActiveLocale();
  const { field, fieldState } = useCollectionLocaleMapField(control, name, activeLocale);
  const value = catalogFieldStringValue(field.value);

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel
        counter={`${value.length}/${maxLength}`}
        hint={copy.hint(activeLocale)}
        label={copy.label(activeLocale)}
        required={required}
      />
      <Textarea
        {...field}
        aria-invalid={fieldState.invalid}
        className={CATALOG_SHEET_TEXTAREA_CLASS}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={copy.placeholder(activeLocale)}
        rows={rows}
        value={value}
      />
      <CatalogFormFieldError fieldState={fieldState} translate={translateValidation} validationKeySet={validationKeySet} />
    </Field>
  );
}

export function ProductCatalogLocaleFormField({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  onDefaultLocaleChange,
  required = false,
  translateValidation,
  validationKeySet
}: ProductCatalogLocaleFormFieldProps): JSX.Element {
  const activeLocale = useCatalogActiveLocale();
  const { field, fieldState } = useProductLocaleMapField(control, name, activeLocale);
  const value = catalogFieldStringValue(field.value);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event);
      onDefaultLocaleChange?.(event.target.value);
    },
    [field, onDefaultLocaleChange]
  );

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel
        counter={`${value.length}/${maxLength}`}
        hint={copy.hint(activeLocale)}
        label={copy.label(activeLocale)}
        required={required}
      />
      <Input
        {...field}
        aria-invalid={fieldState.invalid}
        variant="sheet"
        disabled={disabled}
        maxLength={maxLength}
        onChange={handleChange}
        placeholder={copy.placeholder(activeLocale)}
        value={value}
      />
      <CatalogFormFieldError fieldState={fieldState} translate={translateValidation} validationKeySet={validationKeySet} />
    </Field>
  );
}

export function ProductCatalogLocaleTextareaFormField({
  control,
  copy,
  disabled = false,
  fillHeight = false,
  maxLength,
  name,
  required = false,
  rows = DEFAULT_TEXTAREA_ROWS,
  translateValidation,
  validationKeySet
}: ProductCatalogLocaleTextareaFormFieldProps): JSX.Element {
  const activeLocale = useCatalogActiveLocale();
  const { field, fieldState } = useProductLocaleMapField(control, name, activeLocale);
  const value = catalogFieldStringValue(field.value);

  return (
    <Field className={cn("gap-2", fillHeight && "flex min-h-0 flex-1 flex-col")} data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel
        counter={`${value.length}/${maxLength}`}
        hint={copy.hint(activeLocale)}
        label={copy.label(activeLocale)}
        required={required}
      />
      <Textarea
        {...field}
        aria-invalid={fieldState.invalid}
        className={cn(CATALOG_SHEET_TEXTAREA_CLASS, fillHeight && cn(CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS, "min-h-0 flex-1"))}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={copy.placeholder(activeLocale)}
        {...(fillHeight ? {} : { rows })}
        value={value}
      />
      <CatalogFormFieldError fieldState={fieldState} translate={translateValidation} validationKeySet={validationKeySet} />
    </Field>
  );
}
