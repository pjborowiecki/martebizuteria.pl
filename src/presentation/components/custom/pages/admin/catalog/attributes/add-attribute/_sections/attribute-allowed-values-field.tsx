import { type ChangeEvent, type JSX, useCallback, useMemo } from "react"

import { Plus, Trash2 } from "lucide-react"
import { useController, useFieldArray, useFormState } from "react-hook-form"
import { useTranslations } from "use-intl"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"

import { type ProductAttributeAllowedValue } from "~/src/modules/product-attribute/product-attribute.types"
import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { allowedValueLabelFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-validation"
import { useAttributeForm } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider"
import { PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form.utils"
import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { useCatalogActiveLocale } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"
import {
  CatalogSheetActionColumn,
  CatalogSheetControlsActionRow,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-sheet-field-layout"
import {
  CATALOG_SHEET_ACTION_BUTTON_CLASS,
  CATALOG_SHEET_FIELD_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { slugify } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils"
const nextAllowedValueDraftKey = (existing: readonly ProductAttributeAllowedValue[]): string => {
  const used = new Set(existing.map((entry) => entry.value))
  let index = existing.length + 1
  while (used.has(`${DRAFT_VALUE_KEY_PREFIX}${index}`)) {
    index += 1
  }
  return `${DRAFT_VALUE_KEY_PREFIX}${index}`
}
const createEmptyAllowedValueRow = (existing: readonly ProductAttributeAllowedValue[]): ProductAttributeAllowedValue => ({
  labels: createEmptyProductAttributeLocaleMap(),
  value: nextAllowedValueDraftKey(existing),
})
const resolvePrimaryLabelValueKey = (primaryLabel: string, rowIndex: number, rows: readonly ProductAttributeAllowedValue[]): string => {
  const slug = slugify(primaryLabel)
  if (slug === "") {
    return rows[rowIndex]?.value ?? nextAllowedValueDraftKey(rows)
  }
  const taken = rows.some((entry, index) => index !== rowIndex && entry.value === slug)
  if (taken) {
    return rows[rowIndex]?.value ?? nextAllowedValueDraftKey(rows)
  }
  return slug
}
export const AttributeAllowedValuesField = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const validationKeySet = useMemo(() => new Set<string>(Object.values(PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS)), [])
  const { clearErrors, control, getValues, isPending } = useAttributeForm()
  const { append, fields, remove } = useFieldArray({
    control,
    name: "allowedValues",
  })
  const { errors } = useFormState({
    control,
  })
  const showRootArrayError = errors.allowedValues?.message === PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.allowedValuesRequired
  const handleAddRow = useCallback(() => {
    const current = getValues("allowedValues")
    append(createEmptyAllowedValueRow(current))
  }, [append, getValues])
  const handleRemoveRow = useCallback(
    (index: number) => {
      remove(index)
      clearErrors("allowedValues")
    },
    [clearErrors, remove],
  )
  return (
    <Field className={CATALOG_SHEET_FIELD_CLASS} data-invalid={showRootArrayError}>
      <CatalogFormFieldLabel hint={t("form.hints.allowedValues")} label={t("form.allowedValues")} required />

      <div className="space-y-3">
        {fields.map((fieldRow, index) => (
          <AllowedValueRow disabled={isPending} index={index} key={fieldRow.id} onRemove={handleRemoveRow} />
        ))}

        <Button className={CATALOG_SHEET_ACTION_BUTTON_CLASS} disabled={isPending} onClick={handleAddRow} type="button" variant="outline">
          <Plus className="size-4" strokeWidth={1.5} />
          {t("form.allowedValueAdd")}
        </Button>
      </div>

      {showRootArrayError && (
        <CatalogFormFieldError fieldState={ROOT_ARRAY_ERROR_FIELD_STATE} translate={t} validationKeySet={validationKeySet} />
      )}
    </Field>
  )
}
const AllowedValueRow = ({
  disabled,
  index,
  onRemove,
}: Readonly<{
  disabled: boolean
  index: number
  onRemove: (index: number) => void
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const validationKeySet = useMemo(() => new Set<string>(Object.values(PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS)), [])
  const activeLocale = useCatalogActiveLocale()
  const { clearErrors, control, getValues, setValue, trigger } = useAttributeForm()
  const { errors } = useFormState({
    control,
  })
  const labelPath = `allowedValues.${index}.labels.${activeLocale}` as const
  const { field } = useController({
    control,
    name: labelPath,
  })
  const labelValue = catalogFieldStringValue(field.value)
  const labelError = allowedValueLabelFieldError(errors, index, activeLocale)
  const showLabelError = labelError !== undefined
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextLabel = event.target.value
      const path = `allowedValues.${index}.labels.${activeLocale}` as const
      field.onChange(nextLabel)
      clearErrors(path)
      if (activeLocale === DEFAULT_LOCALE) {
        const rows = getValues("allowedValues")
        const nextValueKey = resolvePrimaryLabelValueKey(nextLabel, index, rows)
        if (rows[index]?.value !== nextValueKey) {
          setValue(`allowedValues.${index}.value`, nextValueKey, {
            shouldDirty: true,
          })
        }
      }
      void trigger(path)
    },
    [activeLocale, clearErrors, field, getValues, index, setValue, trigger],
  )
  const handleRemove = useCallback(() => {
    onRemove(index)
  }, [index, onRemove])
  const handleBlur = useCallback(() => {
    field.onBlur()
  }, [field])
  const labelFieldState = useMemo(
    () =>
      labelError === undefined
        ? undefined
        : {
            error: labelError,
            invalid: true as const,
          },
    [labelError],
  )
  return (
    <div className="rounded-lg border border-border/80 bg-muted/10 p-3">
      <CatalogSheetControlsActionRow>
        <Field className={CATALOG_SHEET_FIELD_CLASS} data-invalid={showLabelError}>
          <CatalogFormFieldLabel
            counter={`${labelValue.length}/${LABEL_MAX_LENGTH}`}
            hint={t(`form.hints.allowedValueLocale.${activeLocale}`)}
            label={t(`form.allowedValueLabel.${activeLocale}`)}
            required
          />
          <Input
            variant="sheet"
            aria-invalid={showLabelError}
            aria-label={t(`form.allowedValueLabel.${activeLocale}`)}
            disabled={disabled}
            maxLength={LABEL_MAX_LENGTH}
            name={field.name}
            onBlur={handleBlur}
            onChange={handleChange}
            placeholder={t(`form.allowedValuePlaceholder.${activeLocale}`)}
            ref={field.ref}
            value={labelValue}
          />
          {labelFieldState !== undefined && (
            <CatalogFormFieldError fieldState={labelFieldState} translate={t} validationKeySet={validationKeySet} />
          )}
        </Field>
        <CatalogSheetActionColumn>
          <Button
            aria-label={t("form.allowedValueRemove")}
            className="size-10 shrink-0"
            disabled={disabled}
            onClick={handleRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </CatalogSheetActionColumn>
      </CatalogSheetControlsActionRow>
    </div>
  )
}
const LABEL_MAX_LENGTH = 255
const DRAFT_VALUE_KEY_PREFIX = "opcja-"
const ROOT_ARRAY_ERROR_FIELD_STATE = {
  error: {
    message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.allowedValuesRequired,
    type: "custom" as const,
  },
  invalid: true as const,
}
