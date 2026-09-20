import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils"
import { type Collection } from "~/src/modules/product-collection/product-collection.types"
import { coerceCollectionLocaleMap } from "~/src/modules/product-collection/product-collection.utils"
export const adminListItemToFormValues = (collection: Collection["adminListItem"]): Collection["formValues"] => ({
  descriptions: coerceCollectionLocaleMap(collection.descriptions),
  handle: collection.handle,
  image: collection.image ?? "",
  status: collection.status,
  titles: coerceCollectionLocaleMap(collection.titles),
})
export const createDefaultCollectionFormValues = (): Collection["formValues"] => ({
  descriptions: createEmptyProductAttributeLocaleMap(),
  handle: "",
  image: "",
  status: "draft",
  titles: createEmptyProductAttributeLocaleMap(),
})
export { slugify } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils"
