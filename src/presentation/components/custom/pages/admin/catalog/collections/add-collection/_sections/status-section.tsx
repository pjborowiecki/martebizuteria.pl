import { type JSX, useCallback, useMemo } from "react"

import { CircleDot } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import {
  COLLECTION_FORM_VALIDATION_KEYS,
  COLLECTION_STATUSES,
  COLLECTION_STATUS_LABEL_KEYS,
} from "~/src/modules/product-collection/product-collection.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useCollectionForm } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider"
import { CollectionFormSection } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-section"
import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"

export const StatusSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  const { control, isPending } = useCollectionForm()
  const validationKeySet = useMemo(() => new Set<string>(Object.values(COLLECTION_FORM_VALIDATION_KEYS)), [])
  const { field, fieldState } = useController({
    control,
    name: "status",
  })

  const statusOptions = useMemo(
    () =>
      COLLECTION_STATUSES.map((status) => ({
        label: t(COLLECTION_STATUS_LABEL_KEYS[status]),
        value: status,
      })),
    [t],
  )

  const handleStatusChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        field.onChange(value)
      }
    },
    [field],
  )

  return (
    <CollectionFormSection icon={CircleDot} title={t("form.displayOptions")}>
      <Field className="gap-2" data-invalid={fieldState.invalid}>
        <CatalogFormFieldLabel hint={t("form.hints.status")} label={t("form.status")} required />
        <Select disabled={isPending} items={statusOptions} onValueChange={handleStatusChange} value={field.value}>
          <SelectTrigger aria-invalid={fieldState.invalid} aria-label={t("form.status")} size="sheet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CatalogFormFieldError fieldState={fieldState} translate={t} validationKeySet={validationKeySet} />
      </Field>
    </CollectionFormSection>
  )
}
