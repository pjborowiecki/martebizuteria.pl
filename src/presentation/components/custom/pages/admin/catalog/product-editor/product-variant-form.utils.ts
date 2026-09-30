import { v7 as uuidv7 } from "uuid"

import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils"
import { type ProductOptionDraft } from "~/src/modules/product-variant/product-variant.utils"
import { type Product } from "~/src/modules/product/product.types"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

export const createImplicitVariantOptionSetup = (): ProductFormOption => ({
  titles: {
    ...IMPLICIT_VARIANT_OPTION_TITLES,
  },
  values: [
    {
      id: uuidv7(),
      labels: createEmptyProductAttributeLocaleMap(),
    },
  ],
})

const cloneOptionDraft = (option: ProductOptionDraft): ProductFormOption => ({
  id: option.id,
  titles: {
    ...option.titles,
  },
  values: option.values.map((value) => ({
    id: value.id,
    labels: {
      ...value.labels,
    },
  })),
})

export const ensureImplicitVariantOptions = (options: readonly ProductOptionDraft[]): [ProductFormOption, ...ProductFormOption[]] => {
  const [firstOption, ...rest] = options
  if (firstOption === undefined) {
    return [createImplicitVariantOptionSetup()]
  }

  if (rest.length > 0) {
    return [cloneOptionDraft(firstOption), ...rest.map((option) => cloneOptionDraft(option))]
  }

  const values =
    firstOption.values.length === 0
      ? [
          {
            id: uuidv7(),
            labels: createEmptyProductAttributeLocaleMap(),
          },
        ]
      : [...firstOption.values]
  return [
    {
      ...firstOption,
      titles: hasAnyOptionTitle(firstOption.titles)
        ? firstOption.titles
        : {
            ...IMPLICIT_VARIANT_OPTION_TITLES,
          },
      values,
    },
  ]
}

const hasAnyOptionTitle = (titles: Product["localeMap"]): boolean => titles["pl-PL"].trim() !== "" || titles["en-US"].trim() !== ""

export const IMPLICIT_VARIANT_OPTION_TITLES: Product["localeMap"] = {
  "en-US": "Variant",
  "pl-PL": "Wariant",
}

type ProductFormOption = ProductFormValues["options"][number]
