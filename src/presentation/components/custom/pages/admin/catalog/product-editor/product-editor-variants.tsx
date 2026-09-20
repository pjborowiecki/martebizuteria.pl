import { type ChangeEvent, type JSX, useCallback, useMemo } from "react"

import { cn } from "cn"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl"

import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Input } from "~/src/presentation/components/shadcn/input"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogIntegerInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-integer-input"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
export const ProductEditorVariants = ({ embedded = false }: Readonly<ProductEditorVariantsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.variants")
  const tProducts = useTranslations("pages.admin.catalog.products")
  const { control } = useFormContext<ProductFormValues>()
  const variants = useWatch({
    control,
    defaultValue: [],
    name: "variants",
  })
  const table =
    variants.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("generateHint")}</p>
    ) : (
      <div className="overflow-x-auto">
        <div className="min-w-[520px] overflow-hidden rounded-lg ring-1 ring-border/40">
          <div className={cn(VARIANT_GRID_CLASS, "border-b border-border/30 bg-muted/20 px-3 py-2.5")}>
            <CatalogFormFieldLabel label={t("name")} />
            <CatalogFormFieldLabel hint={tProducts("form.hints.variantSku")} label={t("sku")} />
            <CatalogFormFieldLabel hint={tProducts("form.hints.variantPrice")} label={t("price")} />
            <CatalogFormFieldLabel hint={tProducts("form.hints.variantStock")} label={t("stockQuantity")} />
          </div>

          {variants.map((variant, index) => (
            <VariantRow index={index} isLast={index === variants.length - 1} key={variant.id ?? `${variant.title}-${index}`} />
          ))}
        </div>
      </div>
    )
  if (embedded) {
    return table
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>{table}</CardContent>
    </Card>
  )
}
const VariantRow = ({
  index,
  isLast,
}: Readonly<{
  index: number
  isLast: boolean
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.variants")
  const { control, setValue } = useFormContext<ProductFormValues>()
  const variants = useWatch({
    control,
    defaultValue: [],
    name: "variants",
  })
  const variant = variants[index]
  const options = useWatch({
    control,
    defaultValue: [],
    name: "options",
  })
  const optionLabelsById = useMemo(() => {
    const valueLabelById = new Map<string, string>()
    const optionTitleById = new Map<string, string>()
    for (const option of options) {
      if (option.id !== undefined) {
        optionTitleById.set(option.id, resolveProductTitle(option.titles, "pl"))
      }
      for (const value of option.values) {
        if (value.id !== undefined) {
          valueLabelById.set(value.id, resolveProductTitle(value.labels, "pl"))
        }
      }
    }
    return {
      optionTitleById,
      valueLabelById,
    }
  }, [options])
  const updateField = useCallback(
    (field: "sku" | "price", value: string) => {
      setValue(`variants.${index}.${field}`, value, {
        shouldDirty: true,
      })
    },
    [index, setValue],
  )
  const handleSkuChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateField("sku", event.target.value)
    },
    [updateField],
  )
  const handlePriceChange = useCallback(
    (value: string) => {
      updateField("price", value)
    },
    [updateField],
  )
  const handleStockChange = useCallback(
    (quantity: number) => {
      setValue(`variants.${index}.quantity`, quantity, {
        shouldDirty: true,
      })
    },
    [index, setValue],
  )
  const optionEntries = Object.entries(variant?.optionValues ?? {})
  return (
    <div className={cn(VARIANT_GRID_CLASS, "px-3 py-2.5", !isLast && "border-b border-border/20")}>
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium">{variant?.title}</p>
        {optionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {optionEntries.map(([optionId, valueId]) => (
              <Badge key={`${optionId}-${valueId}`} className="text-[10px] font-normal" variant="outline">
                {optionLabelsById.optionTitleById.get(optionId) ?? optionId}: {optionLabelsById.valueLabelById.get(valueId) ?? valueId}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Input
        aria-label={t("sku")}
        variant="sheet"
        className="min-w-0 font-mono"
        onChange={handleSkuChange}
        placeholder="SKU"
        type="text"
        value={variant?.sku ?? ""}
      />
      <div className="relative min-w-0">
        <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-sm text-muted-foreground/40">PLN</span>
        <CatalogMoneyInput aria-label={t("price")} className="pl-12" onValueChange={handlePriceChange} value={variant?.price ?? ""} />
      </div>
      <CatalogIntegerInput
        aria-label={t("stockQuantity")}
        className="min-w-0 text-center"
        min={0}
        onValueChange={handleStockChange}
        placeholder="0"
        value={variant?.quantity ?? 0}
      />
    </div>
  )
}
/** Variant name grows; SKU/price/stock stay compact to avoid dead space between columns. */
const VARIANT_GRID_CLASS = "grid grid-cols-[minmax(0,2fr)_minmax(108px,1fr)_minmax(116px,1fr)_minmax(80px,0.85fr)] items-center gap-3"
interface ProductEditorVariantsProps {
  readonly embedded?: boolean
}
