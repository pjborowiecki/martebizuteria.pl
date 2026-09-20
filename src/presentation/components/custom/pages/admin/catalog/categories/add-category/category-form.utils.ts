import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils"
import { type Category } from "~/src/modules/product-category/product-category.types"
import { coerceCategoryLocaleMap } from "~/src/modules/product-category/product-category.utils"

export const adminListItemToFormValues = (category: Category["adminListItem"]): Category["formValues"] => ({
  descriptions: coerceCategoryLocaleMap(category.descriptions),
  handle: category.handle,
  image: category.image ?? "",
  parentId: category.parentId ?? "",
  shortDescriptions: coerceCategoryLocaleMap(category.shortDescriptions),
  status: category.status,
  subtitles: coerceCategoryLocaleMap(category.subtitles),
  titles: coerceCategoryLocaleMap(category.titles),
})
export const createDefaultCategoryFormValues = (): Category["formValues"] => ({
  descriptions: createEmptyProductAttributeLocaleMap(),
  handle: "",
  image: "",
  parentId: "",
  shortDescriptions: createEmptyProductAttributeLocaleMap(),
  status: "draft",
  subtitles: createEmptyProductAttributeLocaleMap(),
  titles: createEmptyProductAttributeLocaleMap(),
})
export { normalizeSlugInput, slugify } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils"
