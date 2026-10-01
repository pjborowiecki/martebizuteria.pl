import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  countWishlistItems,
  deleteWishlistItem,
  getPublishedProductById,
  getWishlistItem,
  insertWishlistItem,
} from "~/src/modules/wishlist/wishlist.accessors"
import { WISHLIST_ERROR_CODES, WISHLIST_MAX_ITEMS, WISHLIST_MUTATION_KEYS } from "~/src/modules/wishlist/wishlist.constants"
import { type Wishlist } from "~/src/modules/wishlist/wishlist.types"
import { wishlistZodSchemas } from "~/src/modules/wishlist/wishlist.zod"

export const toggleWishlistItem = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof wishlistZodSchemas.productIdInput>) => wishlistZodSchemas.productIdInput.parse(input))
  .handler(async ({ context, data: { productId } }): Promise<Wishlist["toggleResult"]> => {
    const userId = context.auth.user.id
    const existing = await getWishlistItem(userId, productId)

    if (existing !== undefined) {
      await deleteWishlistItem(userId, productId)

      return { wishlisted: false }
    }

    const [published, saved] = await Promise.all([getPublishedProductById(productId), countWishlistItems(userId)])
    if (published === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    if (saved >= WISHLIST_MAX_ITEMS) {
      throw new AppError(ERROR_CODES.VALIDATION, WISHLIST_ERROR_CODES.FULL)
    }

    await insertWishlistItem(userId, productId)

    return { wishlisted: true }
  })

export const toggleWishlistItemMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof toggleWishlistItem>[0]["data"]) => toggleWishlistItem({ data }),
  mutationKey: WISHLIST_MUTATION_KEYS.TOGGLE,
})
