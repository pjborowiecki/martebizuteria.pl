import { useCallback, useMemo, useState } from "react"

import { getVariantQuantityAvailable } from "~/src/modules/inventory/inventory.availability.utils"
import { type StorefrontProduct, type StorefrontProductVariant } from "~/src/modules/product/product.types"
const variantsMatchSelection = (variant: StorefrontProductVariant, selection: Readonly<Record<string, string>>): boolean =>
  Object.entries(selection).every(([optionId, valueId]) => variant.optionValueIds[optionId] === valueId)

const findVariantForSelection = (
  product: StorefrontProduct,
  selection: Readonly<Record<string, string>>,
): StorefrontProductVariant | undefined => product.variants.find((variant) => variantsMatchSelection(variant, selection))

const buildInitialSelection = (product: StorefrontProduct): Record<string, string> => {
  const purchasableVariant = product.variants.find((variant) => getVariantQuantityAvailable(variant) >= MIN_STOCK) ?? product.variants[0]
  if (purchasableVariant === undefined) {
    return {}
  }
  return {
    ...purchasableVariant.optionValueIds,
  }
}
export const useSelectedProductVariant = (product: StorefrontProduct): UseSelectedProductVariantResult => {
  const [selectedValueIds, setSelectedValueIds] = useState<Record<string, string>>(() => buildInitialSelection(product))
  const selectedVariant = useMemo(
    () => findVariantForSelection(product, selectedValueIds) ?? product.variants[0],
    [product, selectedValueIds],
  )
  const selectOptionValue = useCallback(
    (optionId: string, valueId: string) => {
      const nextSelection = {
        ...selectedValueIds,
        [optionId]: valueId,
      }
      const nextVariant = findVariantForSelection(product, nextSelection)
      if (nextVariant === undefined) {
        return
      }
      setSelectedValueIds(nextSelection)
    },
    [product, selectedValueIds],
  )
  return {
    selectOptionValue,
    selectedValueIds,
    selectedVariant: product.variants.length === 0 ? undefined : selectedVariant,
  }
}
const MIN_STOCK = 1
export interface UseSelectedProductVariantResult {
  readonly selectOptionValue: (optionId: string, valueId: string) => void
  readonly selectedValueIds: Readonly<Record<string, string>>
  readonly selectedVariant: StorefrontProductVariant | undefined
}
