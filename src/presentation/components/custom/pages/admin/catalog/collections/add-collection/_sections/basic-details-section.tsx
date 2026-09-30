import { type ChangeEvent, type JSX, useCallback, useMemo, useState } from "react"

import { Info } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { COLLECTION_COLUMN_LENGTH, COLLECTION_FORM_VALIDATION_KEYS } from "~/src/modules/product-collection/product-collection.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"

import { useCollectionForm } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider"
import { CollectionFormSection } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-section"
import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogFormReadOnlyField } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-read-only-field"
import {
  type CatalogLocaleFieldsCopy,
  CollectionCatalogLocaleFormField,
  CollectionCatalogLocaleTextareaFormField,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-fields"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { normalizeSlugInput, slugify } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils"

export const BasicDetailsSection = ({ recordId }: Readonly<BasicDetailsSectionProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  const { collectionId, control, isPending, mode, setValue } = useCollectionForm()
  const displayId = recordId ?? (mode === "edit" ? collectionId : undefined)
  const validationKeySet = useMemo(() => new Set<string>(Object.values(COLLECTION_FORM_VALIDATION_KEYS)), [])
  const { field: handleField, fieldState: handleFieldState } = useController({
    control,
    name: "handle",
  })

  const handleValue = catalogFieldStringValue(handleField.value)
  const [handleLocked, setHandleLocked] = useState(false)
  const titleCopy = useMemo<CatalogLocaleFieldsCopy>(
    () => ({
      hint: (locale) => t(`form.hints.nameLocale.${locale}`),
      label: (locale) => t(`form.nameLocale.${locale}`),
      placeholder: (locale) => t(`form.nameLocalePlaceholder.${locale}`),
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
    <CollectionFormSection icon={Info} title={t("form.sectionBasic")}>
      {displayId !== undefined && displayId !== "" && (
        <CatalogFormReadOnlyField hint={t("form.hints.id")} label={t("form.id")} value={displayId} />
      )}

      <CollectionCatalogLocaleFormField
        control={control}
        copy={titleCopy}
        disabled={isPending}
        maxLength={COLLECTION_COLUMN_LENGTH.title}
        name="titles"
        onDefaultLocaleChange={syncHandleFromTitle}
        required
        translateValidation={t}
        validationKeySet={validationKeySet}
      />

      <Field className="gap-2" data-invalid={handleFieldState.invalid}>
        <CatalogFormFieldLabel
          counter={`${handleValue.length}/${COLLECTION_COLUMN_LENGTH.handle}`}
          hint={t("form.hints.slug")}
          label={t("form.slug")}
          required
        />
        <InputGroup variant="sheet">
          <InputGroupAddon className="border-r border-border pr-3 text-[13px] font-normal text-muted-foreground">
            /collections/
          </InputGroupAddon>
          <InputGroupInput
            {...handleField}
            aria-invalid={handleFieldState.invalid}
            disabled={isPending}
            maxLength={COLLECTION_COLUMN_LENGTH.handle}
            onBlur={handleSlugBlur}
            onChange={handleSlugInputChange}
            placeholder="collection-name"
            value={handleValue}
          />
        </InputGroup>
        <CatalogFormFieldError fieldState={handleFieldState} translate={t} validationKeySet={validationKeySet} />
      </Field>

      <CollectionCatalogLocaleTextareaFormField
        control={control}
        copy={shortDescriptionCopy}
        disabled={isPending}
        maxLength={COLLECTION_COLUMN_LENGTH.shortDescription}
        name="shortDescriptions"
        rows={3}
        translateValidation={t}
        validationKeySet={validationKeySet}
      />

      <CollectionCatalogLocaleTextareaFormField
        control={control}
        copy={descriptionCopy}
        disabled={isPending}
        maxLength={COLLECTION_COLUMN_LENGTH.description}
        name="descriptions"
        rows={6}
        translateValidation={t}
        validationKeySet={validationKeySet}
      />
    </CollectionFormSection>
  )
}

interface BasicDetailsSectionProps {
  readonly recordId?: string | undefined
}
