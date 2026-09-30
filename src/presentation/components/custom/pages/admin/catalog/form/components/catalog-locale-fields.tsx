import { type ChangeEvent, type JSX, useCallback } from "react"

import { cn } from "cn"
import { type Control, type FieldPath, type UseControllerReturn, useController } from "react-hook-form"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"
import { type Product } from "~/src/modules/product/product.types"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { useCatalogActiveLocale } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"
import {
  CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS,
  CATALOG_SHEET_TEXTAREA_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"

const useCategoryLocaleMapField = (
  control: Control<ProductCategory["formValues"]>,
  name: CategoryLocaleMapFieldName,
  locale: SupportedLocale,
): UseControllerReturn<ProductCategory["formValues"], FieldPath<ProductCategory["formValues"]>> =>
  useController({
    control,
    name: LOCALE_MAP_FIELD_PATHS[name][locale],
  })

const useCollectionLocaleMapField = (
  control: Control<ProductCollection["formValues"]>,
  name: CollectionLocaleMapFieldName,
  locale: SupportedLocale,
): UseControllerReturn<ProductCollection["formValues"], FieldPath<ProductCollection["formValues"]>> =>
  useController({
    control,
    name: LOCALE_MAP_FIELD_PATHS[name][locale],
  })

const useProductLocaleMapField = (
  control: Control<Product["formValues"]>,
  name: ProductLocaleMapFieldName,
  locale: SupportedLocale,
): UseControllerReturn<Product["formValues"], FieldPath<Product["formValues"]>> =>
  useController({
    control,
    name: LOCALE_MAP_FIELD_PATHS[name][locale],
  })

export const CategoryCatalogLocaleFormField = ({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  onDefaultLocaleChange,
  required = false,
  translateValidation,
  validationKeySet,
}: CategoryCatalogLocaleFormFieldProps): JSX.Element => {
  const activeLocale = useCatalogActiveLocale()
  const { field, fieldState } = useCategoryLocaleMapField(control, name, activeLocale)
  const value = catalogFieldStringValue(field.value)
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event)
      onDefaultLocaleChange?.(event.target.value)
    },
    [field, onDefaultLocaleChange],
  )

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
  )
}

export const CollectionCatalogLocaleFormField = ({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  onDefaultLocaleChange,
  required = false,
  translateValidation,
  validationKeySet,
}: CollectionCatalogLocaleFormFieldProps): JSX.Element => {
  const activeLocale = useCatalogActiveLocale()
  const { field, fieldState } = useCollectionLocaleMapField(control, name, activeLocale)
  const value = catalogFieldStringValue(field.value)
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event)
      onDefaultLocaleChange?.(event.target.value)
    },
    [field, onDefaultLocaleChange],
  )

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
  )
}

export const CategoryCatalogLocaleTextareaFormField = ({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  required = false,
  rows = DEFAULT_TEXTAREA_ROWS,
  translateValidation,
  validationKeySet,
}: CategoryCatalogLocaleTextareaFormFieldProps): JSX.Element => {
  const activeLocale = useCatalogActiveLocale()
  const { field, fieldState } = useCategoryLocaleMapField(control, name, activeLocale)
  const value = catalogFieldStringValue(field.value)

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
  )
}

export const CollectionCatalogLocaleTextareaFormField = ({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  required = false,
  rows = DEFAULT_TEXTAREA_ROWS,
  translateValidation,
  validationKeySet,
}: CollectionCatalogLocaleTextareaFormFieldProps): JSX.Element => {
  const activeLocale = useCatalogActiveLocale()
  const { field, fieldState } = useCollectionLocaleMapField(control, name, activeLocale)
  const value = catalogFieldStringValue(field.value)

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
  )
}

export const ProductCatalogLocaleFormField = ({
  control,
  copy,
  disabled = false,
  maxLength,
  name,
  onDefaultLocaleChange,
  required = false,
  translateValidation,
  validationKeySet,
}: ProductCatalogLocaleFormFieldProps): JSX.Element => {
  const activeLocale = useCatalogActiveLocale()
  const { field, fieldState } = useProductLocaleMapField(control, name, activeLocale)
  const value = catalogFieldStringValue(field.value)
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event)
      onDefaultLocaleChange?.(event.target.value)
    },
    [field, onDefaultLocaleChange],
  )

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
  )
}

export const ProductCatalogLocaleTextareaFormField = ({
  control,
  copy,
  disabled = false,
  fillHeight = false,
  maxLength,
  name,
  required = false,
  rows = DEFAULT_TEXTAREA_ROWS,
  translateValidation,
  validationKeySet,
}: ProductCatalogLocaleTextareaFormFieldProps): JSX.Element => {
  const activeLocale = useCatalogActiveLocale()
  const { field, fieldState } = useProductLocaleMapField(control, name, activeLocale)
  const value = catalogFieldStringValue(field.value)

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
        {...(fillHeight
          ? {}
          : {
              rows,
            })}
        value={value}
      />
      <CatalogFormFieldError fieldState={fieldState} translate={translateValidation} validationKeySet={validationKeySet} />
    </Field>
  )
}

const DEFAULT_TEXTAREA_ROWS = 4

type CatalogLocaleFormValues = ProductCategory["formValues"] | ProductCollection["formValues"] | Product["formValues"]

const LOCALE_MAP_FIELD_PATHS = {
  descriptions: {
    "en-US": "descriptions.en-US",
    "pl-PL": "descriptions.pl-PL",
  },
  shortDescriptions: {
    "en-US": "shortDescriptions.en-US",
    "pl-PL": "shortDescriptions.pl-PL",
  },
  subtitles: {
    "en-US": "subtitles.en-US",
    "pl-PL": "subtitles.pl-PL",
  },
  titles: {
    "en-US": "titles.en-US",
    "pl-PL": "titles.pl-PL",
  },
} as const satisfies Record<string, Record<SupportedLocale, FieldPath<CatalogLocaleFormValues>>>

type CategoryLocaleMapFieldName = "titles" | "subtitles" | "shortDescriptions" | "descriptions"

type CollectionLocaleMapFieldName = "titles" | "shortDescriptions" | "descriptions"

type ProductLocaleMapFieldName = "titles" | "subtitles" | "descriptions"

export interface CatalogLocaleFieldsCopy {
  readonly hint: (locale: SupportedLocale) => string
  readonly label: (locale: SupportedLocale) => string
  readonly placeholder: (locale: SupportedLocale) => string
}

interface CategoryCatalogLocaleFormFieldProps {
  readonly control: Control<ProductCategory["formValues"]>
  readonly copy: CatalogLocaleFieldsCopy
  readonly disabled?: boolean
  readonly maxLength: number
  readonly name: CategoryLocaleMapFieldName
  readonly onDefaultLocaleChange?: (value: string) => void
  readonly required?: boolean
  readonly translateValidation?: (key: string) => string
  readonly validationKeySet?: ReadonlySet<string>
}

interface CollectionCatalogLocaleFormFieldProps {
  readonly control: Control<ProductCollection["formValues"]>
  readonly copy: CatalogLocaleFieldsCopy
  readonly disabled?: boolean
  readonly maxLength: number
  readonly name: CollectionLocaleMapFieldName
  readonly onDefaultLocaleChange?: (value: string) => void
  readonly required?: boolean
  readonly translateValidation?: (key: string) => string
  readonly validationKeySet?: ReadonlySet<string>
}

interface CategoryCatalogLocaleTextareaFormFieldProps {
  readonly control: Control<ProductCategory["formValues"]>
  readonly copy: CatalogLocaleFieldsCopy
  readonly disabled?: boolean
  readonly maxLength: number
  readonly name: CategoryLocaleMapFieldName
  readonly required?: boolean
  readonly rows?: number
  readonly translateValidation?: (key: string) => string
  readonly validationKeySet?: ReadonlySet<string>
}

interface CollectionCatalogLocaleTextareaFormFieldProps {
  readonly control: Control<ProductCollection["formValues"]>
  readonly copy: CatalogLocaleFieldsCopy
  readonly disabled?: boolean
  readonly maxLength: number
  readonly name: CollectionLocaleMapFieldName
  readonly required?: boolean
  readonly rows?: number
  readonly translateValidation?: (key: string) => string
  readonly validationKeySet?: ReadonlySet<string>
}

interface ProductCatalogLocaleFormFieldProps {
  readonly control: Control<Product["formValues"]>
  readonly copy: CatalogLocaleFieldsCopy
  readonly disabled?: boolean
  readonly maxLength: number
  readonly name: ProductLocaleMapFieldName
  readonly onDefaultLocaleChange?: (value: string) => void
  readonly required?: boolean
  readonly translateValidation?: (key: string) => string
  readonly validationKeySet?: ReadonlySet<string>
}

interface ProductCatalogLocaleTextareaFormFieldProps {
  readonly control: Control<Product["formValues"]>
  readonly copy: CatalogLocaleFieldsCopy
  readonly disabled?: boolean
  readonly fillHeight?: boolean
  readonly maxLength: number
  readonly name: ProductLocaleMapFieldName
  readonly required?: boolean
  readonly rows?: number
  readonly translateValidation?: (key: string) => string
  readonly validationKeySet?: ReadonlySet<string>
}
