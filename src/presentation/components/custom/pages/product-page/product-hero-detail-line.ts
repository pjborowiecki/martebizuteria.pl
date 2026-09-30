import { formatProductAttributeValueForDisplay } from "~/src/modules/product-attribute/product-attribute.utils"
import { type Product } from "~/src/modules/product/product.types"

export const resolveProductHeroDetailLine = (
  subtitle: string,
  specifications: readonly Product["specification"][],
  locale: string,
): string | undefined => {
  if (subtitle.trim() !== "") {
    return subtitle
  }

  const materialSpec = specifications.find((spec) => spec.handle === MATERIAL_ATTRIBUTE_HANDLE)
  if (materialSpec === undefined || materialSpec.value.trim() === "") {
    return
  }

  return formatProductAttributeValueForDisplay(materialSpec.type, materialSpec.value, {
    allowedValues: materialSpec.allowedValues,
    locale,
    unit: materialSpec.unit,
  })
}

const MATERIAL_ATTRIBUTE_HANDLE = "material"
