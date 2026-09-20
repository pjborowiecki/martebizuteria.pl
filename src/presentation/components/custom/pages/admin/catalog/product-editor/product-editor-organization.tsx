import { type JSX, useCallback, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useController, useFormContext } from "react-hook-form"
import { useLocale, useTranslations } from "use-intl"

import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { adminCategoriesQueryOptions } from "~/src/modules/product-category/use-cases/get-admin-categories"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { adminCollectionsQueryOptions } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { PRODUCT_FORM_VALIDATION_KEYS } from "~/src/modules/product/product.constants"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { CatalogEntityMultiSelect } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-entity-multi-select"
import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import {
  CATALOG_SHEET_CARD_CONTENT_CLASS,
  CATALOG_SHEET_FIELD_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"
export const ProductEditorOrganization = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const locale = useLocale()
  const { control } = useFormContext<ProductFormValues>()
  const validationKeySet = useMemo(() => new Set<string>(Object.values(PRODUCT_FORM_VALIDATION_KEYS)), [])
  const { field: primaryCategoryField, fieldState: primaryCategoryFieldState } = useController({
    control,
    name: "primaryCategoryId",
  })
  const { field: additionalCategoriesField } = useController({
    control,
    name: "additionalCategoryIds",
  })
  const { field: collectionsField } = useController({
    control,
    name: "collectionIds",
  })
  const { data: categories } = useSuspenseQuery(adminCategoriesQueryOptions())
  const { data: collections } = useSuspenseQuery(adminCollectionsQueryOptions())
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: resolveCategoryTitle(category.titles, locale),
        value: category.id,
      })),
    [categories, locale],
  )
  const additionalCategoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.id !== primaryCategoryField.value)
        .map((category) => ({
          id: category.id,
          label: resolveCategoryTitle(category.titles, locale),
        })),
    [categories, locale, primaryCategoryField.value],
  )
  const collectionOptions = useMemo(
    () =>
      collections.map((collection) => ({
        id: collection.id,
        label: resolveCollectionTitle(collection.titles, locale),
      })),
    [collections, locale],
  )
  const primaryCategorySelectValue = typeof primaryCategoryField.value === "string" ? primaryCategoryField.value : ""
  const handlePrimaryCategoryChange = useCallback(
    (resolvedPrimary: string | null = "") => {
      primaryCategoryField.onChange(resolvedPrimary)
      additionalCategoriesField.onChange(additionalCategoriesField.value.filter((categoryId) => categoryId !== resolvedPrimary))
    },
    [additionalCategoriesField, primaryCategoryField],
  )
  const handleAdditionalCategoriesChange = useCallback(
    (ids: readonly string[]) => {
      additionalCategoriesField.onChange([...ids])
    },
    [additionalCategoriesField],
  )
  const handleCollectionsChange = useCallback(
    (ids: readonly string[]) => {
      collectionsField.onChange([...ids])
    },
    [collectionsField],
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("organization.title")}</CardTitle>
      </CardHeader>
      <CardContent className={CATALOG_SHEET_CARD_CONTENT_CLASS}>
        <Field className={CATALOG_SHEET_FIELD_CLASS} data-invalid={primaryCategoryFieldState.invalid}>
          <CatalogFormFieldLabel hint={t("form.hints.primaryCategory")} label={t("organization.primaryCategory")} required />
          <Select items={categoryOptions} onValueChange={handlePrimaryCategoryChange} value={primaryCategorySelectValue}>
            <SelectTrigger aria-invalid={primaryCategoryFieldState.invalid} aria-label={t("organization.primaryCategory")} size="sheet">
              <SelectValue placeholder={t("organization.selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CatalogFormFieldError fieldState={primaryCategoryFieldState} translate={t} validationKeySet={validationKeySet} />
        </Field>

        <Field className={CATALOG_SHEET_FIELD_CLASS}>
          <CatalogFormFieldLabel hint={t("form.hints.additionalCategories")} label={t("organization.additionalCategories")} />
          <CatalogEntityMultiSelect
            ariaLabel={t("organization.additionalCategories")}
            onChange={handleAdditionalCategoriesChange}
            options={additionalCategoryOptions}
            placeholder={t("organization.selectCategories")}
            selectedIds={additionalCategoriesField.value}
          />
        </Field>

        <Field className={CATALOG_SHEET_FIELD_CLASS}>
          <CatalogFormFieldLabel hint={t("form.hints.collections")} label={t("organization.collections")} />
          <CatalogEntityMultiSelect
            ariaLabel={t("organization.collections")}
            onChange={handleCollectionsChange}
            options={collectionOptions}
            placeholder={t("organization.selectCollections")}
            selectedIds={collectionsField.value}
          />
        </Field>
      </CardContent>
    </Card>
  )
}
