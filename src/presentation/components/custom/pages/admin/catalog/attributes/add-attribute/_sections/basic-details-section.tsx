import { type ChangeEvent, type JSX, useCallback, useMemo, useState } from "react"

import { Info } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl"

import { type ProductAttributeLocaleCode } from "~/src/modules/product-attribute/product-attribute.types"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { AttributeTitleLocaleFields } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/attribute-title-locale-fields"
import { useAttributeForm } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider"
import { AttributeFormSection } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-section"
import { PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form.utils"
import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogFormReadOnlyField } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-read-only-field"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { normalizeSlugInput, slugify } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils"

const TITLE_MAX_LENGTH = 255

interface BasicDetailsSectionProps {
  readonly recordId?: string | undefined
}

export const BasicDetailsSection = ({ recordId }: Readonly<BasicDetailsSectionProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const validationKeySet = useMemo(() => new Set<string>(Object.values(PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS)), [])
  const { attributeId, control, isPending, mode, setValue } = useAttributeForm()
  const displayId = recordId ?? (mode === "edit" ? attributeId : undefined)

  const titleCopy = useMemo(
    () => ({
      hint: (locale: ProductAttributeLocaleCode) => t(`form.hints.titleLocale.${locale}`),
      label: (locale: ProductAttributeLocaleCode) => t(`form.titleLocale.${locale}`),
      placeholder: (locale: ProductAttributeLocaleCode) => t(`form.titleLocalePlaceholder.${locale}`),
    }),
    [t],
  )

  const { field: handleField, fieldState: handleFieldState } = useController({
    control,
    name: "handle",
  })

  const handleValue = catalogFieldStringValue(handleField.value)

  const [handleLocked, setHandleLocked] = useState(false)

  const syncHandleFromTitle = useCallback(
    (value: string) => {
      if (!handleLocked) {
        setValue("handle", slugify(value), { shouldValidate: false })
      }
    },
    [handleLocked, setValue],
  )

  const lockHandle = useCallback(() => {
    setHandleLocked(true)
  }, [])

  const handleSlugInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      lockHandle()
      handleField.onChange(normalizeSlugInput(event.target.value))
    },
    [handleField, lockHandle],
  )

  const handleSlugBlur = useCallback(() => {
    handleField.onChange(slugify(handleValue))
  }, [handleField, handleValue])

  return (
    <AttributeFormSection icon={Info} title={t("form.sectionBasic")}>
      {displayId !== undefined && displayId !== "" && (
        <CatalogFormReadOnlyField hint={t("form.hints.id")} label={t("form.id")} value={displayId} />
      )}

      <AttributeTitleLocaleFields
        copy={titleCopy}
        disabled={isPending}
        onDefaultLocaleChange={syncHandleFromTitle}
        required
        translateValidation={t}
        validationKeySet={validationKeySet}
      />

      <Field className="gap-2" data-invalid={handleFieldState.invalid}>
        <CatalogFormFieldLabel
          counter={`${handleValue.length}/${TITLE_MAX_LENGTH}`}
          hint={t("form.hints.slug")}
          label={t("form.slug")}
          required
        />
        <Input
          {...handleField}
          aria-invalid={handleFieldState.invalid}
          variant="sheet"
          disabled={isPending}
          maxLength={TITLE_MAX_LENGTH}
          onBlur={handleSlugBlur}
          onChange={handleSlugInputChange}
          placeholder={t("form.slugPlaceholder")}
          value={handleValue}
        />
        <CatalogFormFieldError fieldState={handleFieldState} translate={t} validationKeySet={validationKeySet} />
      </Field>
    </AttributeFormSection>
  )
}
