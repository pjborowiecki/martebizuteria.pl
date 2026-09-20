import { type ChangeEvent, type JSX, useCallback } from "react"

import { Plus, Trash2 } from "lucide-react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl"

import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils"
import { MAX_PRODUCT_OPTIONS } from "~/src/modules/product-variant/product-variant.utils"
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

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
import { ProductEditorOptionValuesField } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-option-values-field"
export const ProductEditorOptions = ({ embedded = false }: Readonly<ProductEditorOptionsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.options")
  const { control, getValues, setValue } = useFormContext<ProductFormValues>()
  const options = useWatch({
    control,
    defaultValue: [],
    name: "options",
  })
  const handleAddOption = useCallback(() => {
    const current = getValues("options")
    if (current.length >= MAX_PRODUCT_OPTIONS) {
      return
    }
    setValue(
      "options",
      [
        ...current,
        {
          titles: createEmptyProductAttributeLocaleMap(),
          values: [
            {
              labels: createEmptyProductAttributeLocaleMap(),
            },
          ],
        },
      ],
      {
        shouldDirty: true,
      },
    )
  }, [getValues, setValue])
  const handleRemoveOption = useCallback(
    (index: number) => {
      const next = getValues("options").filter((_, optionIndex) => optionIndex !== index)
      setValue("options", next, {
        shouldDirty: true,
      })
    },
    [getValues, setValue],
  )
  const addOptionButton = (
    <Button
      className={embedded ? CATALOG_SHEET_ACTION_BUTTON_CLASS : undefined}
      disabled={options.length >= MAX_PRODUCT_OPTIONS}
      onClick={handleAddOption}
      size={embedded ? undefined : "sm"}
      type="button"
      variant="outline"
    >
      <Plus className="mr-1 size-4" />
      {t("addOption")}
    </Button>
  )
  const content =
    options.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/70 bg-muted/15 px-8 py-10 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{t("empty")}</p>
        {addOptionButton}
      </div>
    ) : (
      <div className="space-y-4">
        {embedded && <div className="flex justify-end">{addOptionButton}</div>}
        {options.map((option, optionIndex) => (
          <OptionEditor
            canRemove={options.length > MIN_OPTIONS && optionIndex >= MIN_OPTIONS}
            key={option.id ?? `option-${String(optionIndex)}`}
            onRemove={handleRemoveOption}
            optionIndex={optionIndex}
          />
        ))}
      </div>
    )
  if (embedded) {
    return content
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        {options.length > 0 && addOptionButton}
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
const OptionEditor = ({
  canRemove,
  onRemove,
  optionIndex,
}: Readonly<{
  canRemove: boolean
  onRemove: (index: number) => void
  optionIndex: number
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.options")
  const tProducts = useTranslations("pages.admin.catalog.products")
  const activeLocale = useCatalogActiveLocale()
  const { control, setValue } = useFormContext<ProductFormValues>()
  const options = useWatch({
    control,
    defaultValue: [],
    name: "options",
  })
  const option = options[optionIndex]
  const optionTitleValue = option?.titles[activeLocale] ?? ""
  const handleTitleChange = useCallback(
    (value: string) => {
      setValue(`options.${optionIndex}.titles.${activeLocale}`, value, {
        shouldDirty: true,
      })
    },
    [activeLocale, optionIndex, setValue],
  )
  const handleTitleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleTitleChange(event.target.value)
    },
    [handleTitleChange],
  )
  const handleValuesChange = useCallback(
    (values: ProductFormValues["options"][number]["values"]) => {
      setValue(`options.${optionIndex}.values`, values, {
        shouldDirty: true,
      })
    },
    [optionIndex, setValue],
  )
  const handleRemoveClick = useCallback(() => {
    onRemove(optionIndex)
  }, [onRemove, optionIndex])
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <CatalogSheetControlsActionRow>
        <div className="grid min-w-0 flex-1 gap-4">
          <Field className={CATALOG_SHEET_FIELD_CLASS}>
            <CatalogFormFieldLabel
              counter={`${optionTitleValue.length}/${PRODUCT_COLUMN_LENGTH.optionTitle}`}
              hint={tProducts("form.hints.optionName")}
              label={t("optionName")}
            />
            <Input
              maxLength={PRODUCT_COLUMN_LENGTH.optionTitle}
              onChange={handleTitleInputChange}
              placeholder={t("optionNamePlaceholder")}
              value={optionTitleValue}
              variant="sheet"
            />
          </Field>
          <ProductEditorOptionValuesField onValuesChange={handleValuesChange} values={option?.values ?? []} />
        </div>
        {canRemove && (
          <CatalogSheetActionColumn>
            <Button
              aria-label={t("removeOption")}
              className="size-10 shrink-0"
              onClick={handleRemoveClick}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </CatalogSheetActionColumn>
        )}
      </CatalogSheetControlsActionRow>
    </div>
  )
}
const MIN_OPTIONS = 1
interface ProductEditorOptionsProps {
  readonly embedded?: boolean
}
