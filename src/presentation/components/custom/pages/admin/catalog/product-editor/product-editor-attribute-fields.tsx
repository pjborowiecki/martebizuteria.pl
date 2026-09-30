import { type JSX, useCallback, useMemo } from "react"

import { type UseFieldArrayRemove, useController, useFormContext } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import {
  CatalogSheetActionColumn,
  CatalogSheetControlColumn,
  CatalogSheetControlsActionRow,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-sheet-field-layout"
import { CATALOG_SHEET_ACTION_BUTTON_CLASS } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { type ProductAttributeFieldArrayName } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-list-panel"
import { ProductEditorAttributeValueInput } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value-input"
import { toProductEditorAttributeDefinition } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value.utils"

export const ProductEditorAttributeFields = ({
  attributeOptions,
  attributesById,
  baseName,
  index,
  onRemove,
}: ProductEditorAttributeFieldsProps): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.attributes")
  const tForm = useTranslations("pages.admin.catalog.products.form.hints")
  const { control } = useFormContext<ProductFormValues>()
  const { field: attributeIdField } = useController({
    control,
    name: `${baseName}.${index}.attributeId`,
  })

  const { field: valueField } = useController({
    control,
    name: `${baseName}.${index}.value`,
  })

  const selectValue = catalogFieldStringValue(attributeIdField.value)
  const attributeValue = catalogFieldStringValue(valueField.value)
  const attributeId = catalogFieldStringValue(attributeIdField.value)
  const definition = useMemo(() => toProductEditorAttributeDefinition(attributesById.get(attributeId)), [attributeId, attributesById])
  const handleAttributeChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        attributeIdField.onChange(value)
        valueField.onChange("")
      }
    },
    [attributeIdField, valueField],
  )

  const handleValueChange = useCallback(
    (value: string) => {
      valueField.onChange(value)
    },
    [valueField],
  )

  const handleRemove = useCallback((): void => {
    onRemove(index)
  }, [index, onRemove])

  return (
    <CatalogSheetControlsActionRow>
      <CatalogSheetControlColumn hint={tForm("attributeProperty")} label={t("attribute")}>
        <Select items={attributeOptions} onValueChange={handleAttributeChange} value={selectValue}>
          <SelectTrigger size="sheet">
            <SelectValue placeholder={t("selectAttribute")} />
          </SelectTrigger>
          <SelectContent>
            {attributeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CatalogSheetControlColumn>
      <CatalogSheetControlColumn hint={tForm("attributeValue")} label={t("value")}>
        <ProductEditorAttributeValueInput
          definition={definition}
          disabled={selectValue === ""}
          onChange={handleValueChange}
          value={attributeValue}
        />
      </CatalogSheetControlColumn>
      <CatalogSheetActionColumn>
        <Button
          aria-label={t("remove")}
          className={CATALOG_SHEET_ACTION_BUTTON_CLASS}
          onClick={handleRemove}
          type="button"
          variant="outline"
        >
          {t("remove")}
        </Button>
      </CatalogSheetActionColumn>
    </CatalogSheetControlsActionRow>
  )
}

interface ProductEditorAttributeFieldsProps {
  readonly attributeOptions: readonly {
    label: string
    value: string
  }[]
  readonly attributesById: ReadonlyMap<string, ProductAttribute["select"]>
  readonly baseName: ProductAttributeFieldArrayName
  readonly index: number
  readonly onRemove: UseFieldArrayRemove
}
