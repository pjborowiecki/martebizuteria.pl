import { type ChangeEvent, type JSX, Suspense, useCallback, useEffect, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { Plus, Trash2 } from "lucide-react"
import { useController, useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl"

import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils"
import { adminProductAttributesQueryOptions } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"
import { PRODUCT_COLUMN_LENGTH, PRODUCT_FORM_VALIDATION_KEYS } from "~/src/modules/product/product.constants"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ImageGalleryUpload } from "~/src/presentation/components/custom/image-upload/components/image-gallery-upload"
import { type GalleryImage } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"
import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogIntegerInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-integer-input"
import { useCatalogActiveLocale } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
import { ProductEditorAttributeListPanel } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-list-panel"
import { useProductForm } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-provider"
import { regenerateVariantRows } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"
import { productImagesToGallery } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-image-form.utils"
import {
  createDraftOptionValueId,
  createImplicitVariantOptionSetup,
  ensureImplicitVariantOptions,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-variant-form.utils"
export const ProductEditorVariantList = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.variants")
  const tLocale = useTranslations("pages.admin.catalog.localePicker")
  const activeLocale = useCatalogActiveLocale()
  const { control, getValues, setValue } = useFormContext<ProductFormValues>()
  const options = useWatch({
    control,
    defaultValue: [],
    name: "options",
  })
  const variants = useWatch({
    control,
    defaultValue: [],
    name: "variants",
  })
  const option = options[0] ?? createImplicitVariantOptionSetup()
  const valueRows =
    option.values.length === 0
      ? [
          {
            labels: createEmptyProductAttributeLocaleMap(),
          },
        ]
      : option.values
  const handleAddVariant = useCallback(() => {
    const [firstOption] = ensureImplicitVariantOptions(getValues("options"))
    const nextOptions = [
      {
        ...firstOption,
        values: [
          ...firstOption.values,
          {
            id: createDraftOptionValueId(),
            labels: createEmptyProductAttributeLocaleMap(),
          },
        ],
      },
    ]
    setValue("options", nextOptions, {
      shouldDirty: true,
    })
    setValue("variants", regenerateVariantRows(nextOptions, getValues("variants")), {
      shouldDirty: true,
    })
  }, [getValues, setValue])
  const handleRemoveVariant = useCallback(
    (index: number) => {
      const [firstOption] = ensureImplicitVariantOptions(getValues("options"))
      const nextValues = firstOption.values.filter((_, rowIndex) => rowIndex !== index)
      const nextOptions = [
        {
          ...firstOption,
          values:
            nextValues.length === 0
              ? [
                  {
                    id: createDraftOptionValueId(),
                    labels: createEmptyProductAttributeLocaleMap(),
                  },
                ]
              : nextValues,
        },
      ]
      setValue("options", nextOptions, {
        shouldDirty: true,
      })
      setValue("variants", regenerateVariantRows(nextOptions, getValues("variants")), {
        shouldDirty: true,
      })
    },
    [getValues, setValue],
  )
  const handleNameChange = useCallback(
    (index: number, nextValue: string) => {
      setValue(`options.0.values.${index}.labels.${activeLocale}`, nextValue, {
        shouldDirty: true,
      })
    },
    [activeLocale, setValue],
  )
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("listHint", {
          locale: tLocale(`localeNames.${activeLocale}`),
        })}
      </p>

      <div className="space-y-5">
        {valueRows.map((valueRow, valueIndex) => (
          <VariantListRow
            index={valueIndex}
            key={valueRow.id ?? `variant-row-${valueIndex}`}
            name={valueRow.labels[activeLocale]}
            onNameChange={handleNameChange}
            onRemove={handleRemoveVariant}
            showFieldLabels={valueIndex === 0}
            showRemove={valueRows.length > MIN_VARIANT_ROWS}
            variant={variants[valueIndex]}
          />
        ))}
      </div>

      <Button onClick={handleAddVariant} type="button" variant="outline">
        <Plus className="mr-1 size-4" />
        {t("addVariant")}
      </Button>
    </div>
  )
}
const VariantListRow = ({
  index,
  name,
  onNameChange,
  onRemove,
  showFieldLabels,
  showRemove,
  variant,
}: Readonly<{
  index: number
  name: string
  onNameChange: (index: number, nextValue: string) => void
  onRemove: (index: number) => void
  showFieldLabels: boolean
  showRemove: boolean
  variant: ProductFormValues["variants"][number] | undefined
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.variants")
  const tProducts = useTranslations("pages.admin.catalog.products")
  const activeLocale = useCatalogActiveLocale()
  const { control, setValue } = useFormContext<ProductFormValues>()
  const validationKeySet = useMemo(() => new Set<string>(Object.values(PRODUCT_FORM_VALIDATION_KEYS)), [])
  const { field: skuField, fieldState: skuFieldState } = useController({
    control,
    name: `variants.${index}.sku`,
  })
  const handleNameInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onNameChange(index, event.target.value)
    },
    [index, onNameChange],
  )
  const handleSkuChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      skuField.onChange(event.target.value)
    },
    [skuField],
  )
  const handlePriceChange = useCallback(
    (value: string) => {
      setValue(`variants.${index}.price`, value, {
        shouldDirty: true,
      })
    },
    [index, setValue],
  )
  const handleStockChange = useCallback(
    (quantity: number) => {
      setValue(`variants.${index}.quantity`, quantity, {
        shouldDirty: true,
      })
    },
    [index, setValue],
  )
  const handleRemoveClick = useCallback(() => {
    onRemove(index)
  }, [index, onRemove])
  const variantLabel = name.trim() === "" ? t("unnamedVariant") : name
  return (
    <section className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <header className="border-b border-border/50 bg-muted/25 px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">
          {t("variantRowTitle", {
            name: variantLabel,
          })}
        </p>
      </header>

      {showFieldLabels && (
        <div className={VARIANT_FIELDS_HEADER_CLASS}>
          <span>{t(`nameLabel.${activeLocale}`)}</span>
          <span>{t("sku")}</span>
          <span>{t("price")}</span>
          <span>{t("stockQuantity")}</span>
          <span className="sr-only">{t("removeVariant")}</span>
        </div>
      )}

      <div className={cn(VARIANT_GRID_CLASS, "border-b border-border/30 px-3 py-2.5")}>
        <Input
          aria-label={t(`nameLabel.${activeLocale}`)}
          maxLength={PRODUCT_COLUMN_LENGTH.optionValue}
          onChange={handleNameInputChange}
          placeholder={t(`namePlaceholder.${activeLocale}`)}
          value={name}
          variant="sheet"
        />
        <Field className="min-w-0 gap-1" data-invalid={skuFieldState.invalid}>
          <Input
            {...skuField}
            aria-invalid={skuFieldState.invalid}
            aria-label={t("sku")}
            className="min-w-0 font-mono"
            onChange={handleSkuChange}
            placeholder="SKU"
            type="text"
            value={variant?.sku ?? ""}
            variant="sheet"
          />
          <CatalogFormFieldError fieldState={skuFieldState} translate={tProducts} validationKeySet={validationKeySet} />
        </Field>
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
        {showRemove ? (
          <Button
            aria-label={t("removeVariant")}
            className="size-10 shrink-0"
            onClick={handleRemoveClick}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <div />
        )}
      </div>

      <VariantListRowGallery index={index} variant={variant} variantLabel={variantLabel} />

      <div className="border-t border-border/40 bg-muted/5 px-3 py-3">
        <Suspense fallback={VARIANT_ATTRIBUTES_FALLBACK}>
          <VariantListRowAttributes index={index} />
        </Suspense>
      </div>
    </section>
  )
}
const VariantListRowAttributes = ({
  index,
}: Readonly<{
  index: number
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.variants")
  const { getValues, setValue } = useFormContext<ProductFormValues>()
  const { data: attributes } = useSuspenseQuery(adminProductAttributesQueryOptions())
  useEffect(() => {
    const fieldName = `variants.${index}.attributeValues` as const
    if (getValues(fieldName) === undefined) {
      setValue(fieldName, [], {
        shouldDirty: false,
      })
    }
  }, [getValues, index, setValue])
  return (
    <ProductEditorAttributeListPanel
      attributes={attributes}
      baseName={`variants.${index}.attributeValues`}
      compact
      emptyHintKey="emptyVariant"
      hint={t("attributesHint")}
      title={t("attributesTitle")}
    />
  )
}
const VariantListRowGallery = ({
  index,
  variant,
  variantLabel,
}: Readonly<{
  index: number
  variant: ProductFormValues["variants"][number] | undefined
  variantLabel: string
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.variants")
  const { setValue } = useFormContext<ProductFormValues>()
  const { isPending, setUploading } = useProductForm()
  const galleryValue = productImagesToGallery(variant?.images ?? [])
  const handleGalleryChange = useCallback(
    (images: readonly GalleryImage[]) => {
      const previous = variant?.images ?? []
      setValue(
        `variants.${index}.images`,
        images.map((image) => ({
          alt: previous.find((row) => row.id === image.id)?.alt ?? "",
          id: image.id,
          url: image.url,
        })),
        {
          shouldDirty: true,
        },
      )
    },
    [index, setValue, variant?.images],
  )
  const handleMainChange = useCallback(
    (id: string | undefined) => {
      setValue(`variants.${index}.mainImageId`, id, {
        shouldDirty: true,
      })
    },
    [index, setValue],
  )
  const handleUploadingChange = useCallback(
    (uploading: boolean) => {
      setUploading(uploading)
    },
    [setUploading],
  )
  return (
    <div className="border-t border-border/40 bg-muted/5 px-3 py-3">
      <Field className="gap-2">
        <CatalogFormFieldLabel
          hint={t("imagesHint")}
          label={t("imagesLabel", {
            name: variantLabel,
          })}
        />
        <ImageGalleryUpload
          className="w-full max-w-none"
          disabled={isPending}
          folder="products"
          mainId={variant?.mainImageId}
          onChange={handleGalleryChange}
          onMainChange={handleMainChange}
          onUploadingChange={handleUploadingChange}
          value={galleryValue}
        />
      </Field>
    </div>
  )
}
const MIN_VARIANT_ROWS = 1
const VARIANT_ATTRIBUTES_FALLBACK = <div className="h-24 rounded-lg bg-muted/20" />
const VARIANT_GRID_CLASS =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(108px,1fr)_minmax(116px,1fr)_minmax(80px,0.85fr)_2.5rem] items-center gap-3"
const VARIANT_FIELDS_HEADER_CLASS = cn(
  VARIANT_GRID_CLASS,
  "border-b border-border/30 bg-muted/15 px-3 py-2 text-[11px] font-medium text-muted-foreground",
)
