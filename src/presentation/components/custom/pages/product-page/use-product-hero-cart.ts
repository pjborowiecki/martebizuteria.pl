import { useCallback, useEffect, useState } from "react"

import { getVariantQuantityAvailable, isVariantPurchasable } from "~/src/modules/inventory/inventory.availability.utils"
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils"
import { type StorefrontProduct, type StorefrontProductVariant } from "~/src/modules/product/product.types"

import { trackCartItemAdded } from "~/src/lib/customer-activity/customer-activity.tracking"
import { getProductImageUrl } from "~/src/lib/image"

import { useCartStore } from "~/src/stores/cart.store"
export const useProductHeroCart = ({ heroImage, price, product, selectedVariant, variantPrice }: UseProductHeroCartInput) => {
  const [quantity, setQuantity] = useState(MIN_QUANTITY)
  const [isAdded, setIsAdded] = useState(false)
  const { addItem } = useCartStore()
  const availableQuantity = getVariantQuantityAvailable(selectedVariant)
  const isOutOfStock = availableQuantity < MIN_QUANTITY
  const canPurchase = isVariantPurchasable(selectedVariant, quantity)
  useEffect(() => {
    if (quantity > availableQuantity && availableQuantity >= MIN_QUANTITY) {
      setQuantity(availableQuantity)
    }
  }, [availableQuantity, quantity])
  useEffect(() => {
    setQuantity(MIN_QUANTITY)
  }, [selectedVariant?.id])
  const handleAddToCart = useCallback(() => {
    if (selectedVariant === undefined || variantPrice === undefined || !isVariantPurchasable(selectedVariant, quantity)) {
      return
    }
    const variantTitle = selectedVariant.title === DEFAULT_VARIANT_TITLE ? "" : selectedVariant.title
    const addQuantity = Math.max(MIN_QUANTITY, quantity)
    addItem({
      id: selectedVariant.id,
      image: getProductImageUrl(heroImage),
      price,
      qty: addQuantity,
      rawPrice: variantPrice,
      slug: product.handle,
      title: product.title,
      variantId: selectedVariant.id,
      variantTitle,
    })
    trackCartItemAdded({
      productTitle: product.title,
      quantity: addQuantity,
      variantId: selectedVariant.id,
      variantTitle,
    })
    setIsAdded(true)
  }, [addItem, heroImage, price, product, quantity, selectedVariant, variantPrice])
  useEffect(() => {
    if (!isAdded) {
      return
    }
    const timer = setTimeout(() => {
      setIsAdded(false)
    }, RESET_ADDED_TIMEOUT)
    return () => {
      clearTimeout(timer)
    }
  }, [isAdded])
  return {
    availableQuantity,
    canPurchase,
    handleAddToCart,
    isAdded,
    isOutOfStock,
    quantity,
    setQuantity,
  }
}
const MIN_QUANTITY = 1
const RESET_ADDED_TIMEOUT = 2000
interface UseProductHeroCartInput {
  readonly heroImage: string | null
  readonly price: string
  readonly product: StorefrontProduct
  readonly selectedVariant: StorefrontProductVariant | undefined
  readonly variantPrice: number | undefined
}
