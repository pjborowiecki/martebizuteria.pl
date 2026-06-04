import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils";
import type { Collection } from "~/src/modules/product-collection/product-collection.types";
import { coerceCollectionLocaleMap } from "~/src/modules/product-collection/product-collection.utils";

export function adminListItemToFormValues(collection: Collection["adminListItem"]): Collection["formValues"] {
  return {
    descriptions: coerceCollectionLocaleMap(collection.descriptions),
    handle: collection.handle,
    image: collection.image ?? "",
    status: collection.status,
    titles: coerceCollectionLocaleMap(collection.titles)
  };
}

export function createDefaultCollectionFormValues(): Collection["formValues"] {
  return {
    descriptions: createEmptyProductAttributeLocaleMap(),
    handle: "",
    image: "",
    status: "draft",
    titles: createEmptyProductAttributeLocaleMap()
  };
}

export { slugify } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils";
