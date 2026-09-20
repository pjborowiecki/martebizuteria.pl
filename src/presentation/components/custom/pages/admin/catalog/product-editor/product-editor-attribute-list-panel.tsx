import { type JSX, useCallback, useEffect, useMemo, useState } from "react"

import { useFieldArray, useFormContext } from "react-hook-form"
import { useLocale, useTranslations } from "use-intl"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { resolveProductAttributeTitle } from "~/src/modules/product-attribute/product-attribute.utils"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import {
  CatalogSheetActionColumn,
  CatalogSheetControlColumn,
  CatalogSheetControlsActionRow,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-sheet-field-layout"
import { CATALOG_SHEET_ACTION_BUTTON_CLASS } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"
import { ProductEditorAttributeFields } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-fields"
import { ProductEditorAttributeValueInput } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value-input"
import {
  isProductAttributeValueComplete,
  toProductEditorAttributeDefinition,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value.utils"

import { ROUTES } from "~/src/routes"
export const ProductEditorAttributeListPanel = ({
  attributes,
  baseName,
  compact = false,
  emptyHintKey = "empty",
  hint,
  title,
}: ProductEditorAttributeListPanelProps): JSX.Element => {
  const locale = useLocale()
  const { control } = useFormContext<ProductFormValues>()
  const { append, fields, remove } = useFieldArray({
    control,
    name: baseName,
  })
  const [draftAttributeId, setDraftAttributeId] = useState(EMPTY_DRAFT)
  const [draftValue, setDraftValue] = useState(EMPTY_DRAFT)
  const attributesById = useMemo(() => new Map(attributes.map((attribute) => [attribute.id, attribute])), [attributes])
  const attributeOptions = useMemo(
    (): AttributeOption[] =>
      attributes.map((attribute) => ({
        label: resolveProductAttributeTitle(attribute.titles, locale),
        value: attribute.id,
      })),
    [attributes, locale],
  )
  const draftDefinition = useMemo(
    () => toProductEditorAttributeDefinition(attributesById.get(draftAttributeId)),
    [attributesById, draftAttributeId],
  )
  const hasCatalogAttributes = attributeOptions.length > 0
  const hasRows = fields.length > 0
  const canAddDraft = isProductAttributeValueComplete(draftDefinition, draftValue) && draftAttributeId !== EMPTY_DRAFT
  const handleAddRow = useCallback(() => {
    const attributeId = draftAttributeId.trim()
    const value = draftValue.trim()
    if (!isProductAttributeValueComplete(toProductEditorAttributeDefinition(attributesById.get(attributeId)), value)) {
      return
    }
    append({
      attributeId,
      value,
    })
    setDraftAttributeId(EMPTY_DRAFT)
    setDraftValue(EMPTY_DRAFT)
  }, [append, attributesById, draftAttributeId, draftValue])
  useEffect(() => {
    setDraftValue(EMPTY_DRAFT)
  }, [draftAttributeId])
  const listSpacing = compact ? "space-y-3" : "space-y-4"
  let listPadding = ""
  if (hasRows) {
    listPadding = compact ? "border-t border-border/40 pt-3" : "border-t border-border/60 pt-4"
  }
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {title !== undefined && title !== "" && <p className="text-sm font-medium text-foreground">{title}</p>}
      {hint !== undefined && hint !== "" && <p className="text-sm text-muted-foreground">{hint}</p>}
      <AttributeComposerRow
        attributeId={draftAttributeId}
        attributeOptions={attributeOptions}
        canAdd={canAddDraft}
        definition={draftDefinition}
        hasCatalogAttributes={hasCatalogAttributes}
        onAdd={handleAddRow}
        onAttributeIdChange={setDraftAttributeId}
        onValueChange={setDraftValue}
        value={draftValue}
      />
      {hasRows ? (
        <div className={`${listSpacing} ${listPadding}`}>
          {fields.map((field, index) => (
            <ProductEditorAttributeFields
              attributeOptions={attributeOptions}
              attributesById={attributesById}
              baseName={baseName}
              index={index}
              key={field.id}
              onRemove={remove}
            />
          ))}
        </div>
      ) : (
        <AttributesEmptyState emptyHintKey={emptyHintKey} hasCatalogAttributes={hasCatalogAttributes} />
      )}
    </div>
  )
}
const AttributesEmptyState = ({
  emptyHintKey,
  hasCatalogAttributes,
}: Readonly<{
  emptyHintKey: "empty" | "emptyVariant"
  hasCatalogAttributes: boolean
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.attributes")
  const createAttributeLink = useMemo(() => <LocalizedLink search={ATTRIBUTES_CREATE_SEARCH} to={ROUTES.ADMIN_ATTRIBUTES} />, [])
  const emptyMessage = hasCatalogAttributes ? t(emptyHintKey) : t("emptyNoCatalogAttributes")
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center">
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      {!hasCatalogAttributes && (
        <Button className={`${CATALOG_SHEET_ACTION_BUTTON_CLASS} mt-4`} render={createAttributeLink} variant="outline">
          {t("createInCatalog")}
        </Button>
      )}
    </div>
  )
}
const AttributeComposerRow = ({
  attributeId,
  attributeOptions,
  canAdd,
  definition,
  hasCatalogAttributes,
  onAdd,
  onAttributeIdChange,
  onValueChange,
  value,
}: Readonly<AttributeComposerRowProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.attributes")
  const tForm = useTranslations("pages.admin.catalog.products.form.hints")
  const handleDraftAttributeChange = useCallback(
    (nextValue: string | null) => {
      onAttributeIdChange(nextValue ?? EMPTY_DRAFT)
    },
    [onAttributeIdChange],
  )
  return (
    <CatalogSheetControlsActionRow>
      <CatalogSheetControlColumn hint={tForm("attributeProperty")} label={t("attribute")}>
        <Select disabled={!hasCatalogAttributes} items={attributeOptions} onValueChange={handleDraftAttributeChange} value={attributeId}>
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
          disabled={!hasCatalogAttributes || attributeId === EMPTY_DRAFT}
          onChange={onValueChange}
          value={value}
        />
      </CatalogSheetControlColumn>
      <CatalogSheetActionColumn>
        <Button className={CATALOG_SHEET_ACTION_BUTTON_CLASS} disabled={!canAdd} onClick={onAdd} type="button" variant="outline">
          {t("add")}
        </Button>
      </CatalogSheetActionColumn>
    </CatalogSheetControlsActionRow>
  )
}
const EMPTY_DRAFT = ""
const ATTRIBUTES_CREATE_SEARCH = {
  create: "1",
} as const
export type ProductAttributeFieldArrayName = "attributeValues" | `variants.${number}.attributeValues`
interface AttributeOption {
  readonly label: string
  readonly value: string
}
interface ProductEditorAttributeListPanelProps {
  readonly attributes: readonly ProductAttribute["select"][]
  readonly baseName: ProductAttributeFieldArrayName
  readonly compact?: boolean
  readonly emptyHintKey?: "empty" | "emptyVariant"
  readonly hint?: string
  readonly title?: string
}
interface AttributeComposerRowProps {
  readonly attributeId: string
  readonly attributeOptions: readonly AttributeOption[]
  readonly canAdd: boolean
  readonly definition: ReturnType<typeof toProductEditorAttributeDefinition>
  readonly hasCatalogAttributes: boolean
  readonly onAdd: () => void
  readonly onAttributeIdChange: (attributeId: string) => void
  readonly onValueChange: (value: string) => void
  readonly value: string
}
