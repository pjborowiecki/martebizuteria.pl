import { type ChangeEvent, type JSX, useCallback, useMemo, useState } from "react"

import { Info } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl"

import { CATEGORY_COLUMN_LENGTH, CATEGORY_FORM_VALIDATION_KEYS } from "~/src/modules/product-category/product-category.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"

import { useCategoryForm } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider"
import { CategoryFormSection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-section"
import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogFormReadOnlyField } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-read-only-field"
import {
  type CatalogLocaleFieldsCopy,
  CategoryCatalogLocaleFormField,
  CategoryCatalogLocaleTextareaFormField,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-fields"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { normalizeSlugInput, slugify } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils"
export const BasicDetailsSection = ({ recordId }: Readonly<BasicDetailsSectionProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const { categoryId, control, isPending, mode, setValue } = useCategoryForm()
  const displayId = recordId ?? (mode === "edit" ? categoryId : undefined)
  const validationKeySet = useMemo(() => new Set<string>(Object.values(CATEGORY_FORM_VALIDATION_KEYS)), [])
  const { field: handleField, fieldState: handleFieldState } = useController({
    control,
    name: "handle",
  })
  const handleValue = catalogFieldStringValue(handleField.value)
  const [handleLocked, setHandleLocked] = useState(false)
  const titleCopy = useMemo<CatalogLocaleFieldsCopy>(
    () => ({
      hint: (locale) => t(`form.hints.titleLocale.${locale}`),
      label: (locale) => t(`form.titleLocale.${locale}`),
      placeholder: (locale) => t(`form.titleLocalePlaceholder.${locale}`),
    }),
    [t],
  )
  const subtitleCopy = useMemo<CatalogLocaleFieldsCopy>(
    () => ({
      hint: (locale) => t(`form.hints.subtitleLocale.${locale}`),
      label: (locale) => t(`form.subtitleLocale.${locale}`),
      placeholder: (locale) => t(`form.subtitleLocalePlaceholder.${locale}`),
    }),
    [t],
  )
  const shortDescriptionCopy = useMemo<CatalogLocaleFieldsCopy>(
    () => ({
      hint: (locale) => t(`form.hints.shortDescriptionLocale.${locale}`),
      label: (locale) => t(`form.shortDescriptionLocale.${locale}`),
      placeholder: (locale) => t(`form.shortDescriptionLocalePlaceholder.${locale}`),
    }),
    [t],
  )
  const descriptionCopy = useMemo<CatalogLocaleFieldsCopy>(
    () => ({
      hint: (locale) => t(`form.hints.descriptionLocale.${locale}`),
      label: (locale) => t(`form.descriptionLocale.${locale}`),
      placeholder: (locale) => t(`form.descriptionLocalePlaceholder.${locale}`),
    }),
    [t],
  )
  const syncHandleFromTitle = useCallback(
    (value: string) => {
      if (!handleLocked) {
        setValue("handle", slugify(value), {
          shouldValidate: false,
        })
      }
    },
    [handleLocked, setValue],
  )
  const handleSlugInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setHandleLocked(true)
      handleField.onChange(normalizeSlugInput(event.target.value))
    },
    [handleField],
  )
  const handleSlugBlur = useCallback(() => {
    handleField.onChange(slugify(handleValue))
  }, [handleField, handleValue])
  return (
    <CategoryFormSection icon={Info} title={t("form.sectionBasic")}>
      {displayId !== undefined && displayId !== "" && (
        <CatalogFormReadOnlyField hint={t("form.hints.id")} label={t("form.id")} value={displayId} />
      )}

      <CategoryCatalogLocaleFormField
        control={control}
        copy={titleCopy}
        disabled={isPending}
        maxLength={CATEGORY_COLUMN_LENGTH.title}
        name="titles"
        onDefaultLocaleChange={syncHandleFromTitle}
        required
        translateValidation={t}
        validationKeySet={validationKeySet}
      />

      <Field className="gap-2" data-invalid={handleFieldState.invalid}>
        <CatalogFormFieldLabel
          counter={`${handleValue.length}/${CATEGORY_COLUMN_LENGTH.handle}`}
          hint={t("form.hints.slug")}
          label={t("form.slug")}
          required
        />
        <InputGroup variant="sheet">
          <InputGroupAddon className="border-r border-border pr-3 text-[13px] font-normal text-muted-foreground">
            /categories/
          </InputGroupAddon>
          <InputGroupInput
            {...handleField}
            aria-invalid={handleFieldState.invalid}
            disabled={isPending}
            maxLength={CATEGORY_COLUMN_LENGTH.handle}
            onBlur={handleSlugBlur}
            onChange={handleSlugInputChange}
            placeholder="category-name"
            value={handleValue}
          />
        </InputGroup>
        <CatalogFormFieldError fieldState={handleFieldState} translate={t} validationKeySet={validationKeySet} />
      </Field>

      <CategoryCatalogLocaleFormField
        control={control}
        copy={subtitleCopy}
        disabled={isPending}
        maxLength={CATEGORY_COLUMN_LENGTH.subtitle}
        name="subtitles"
        translateValidation={t}
        validationKeySet={validationKeySet}
      />

      <CategoryCatalogLocaleTextareaFormField
        control={control}
        copy={shortDescriptionCopy}
        disabled={isPending}
        maxLength={CATEGORY_COLUMN_LENGTH.shortDescription}
        name="shortDescriptions"
        rows={3}
        translateValidation={t}
        validationKeySet={validationKeySet}
      />

      <CategoryCatalogLocaleTextareaFormField
        control={control}
        copy={descriptionCopy}
        disabled={isPending}
        maxLength={CATEGORY_COLUMN_LENGTH.description}
        name="descriptions"
        rows={7}
        translateValidation={t}
        validationKeySet={validationKeySet}
      />
    </CategoryFormSection>
  )
}
interface BasicDetailsSectionProps {
  readonly recordId?: string | undefined
}
