import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { deleteWishlistItemQuery, getPublishedProductForCustomerQuery, insertWishlistItem } from "~/src/modules/wishlist/wishlist.accessors"
import { WISHLIST_ERROR_CODES, WISHLIST_MAX_ITEMS, WISHLIST_MUTATION_KEYS } from "~/src/modules/wishlist/wishlist.constants"
import { type Wishlist } from "~/src/modules/wishlist/wishlist.types"
import { wishlistZodSchemas } from "~/src/modules/wishlist/wishlist.zod"

export const toggleWishlistItem = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof wishlistZodSchemas.productIdInput>) => wishlistZodSchemas.productIdInput.parse(input))
  .handler(async ({ context, data: { productId } }): Promise<Wishlist["toggleResult"]> => {
    const userId = context.auth.user.id
    const [[removed], [published]] = await db.batch([
      deleteWishlistItemQuery(userId, productId),
      getPublishedProductForCustomerQuery(userId, productId),
    ])

    if (removed !== undefined) {
      return { wishlisted: false }
    }

    if (published === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    if (published.wishlistCount >= WISHLIST_MAX_ITEMS) {
      throw new AppError(ERROR_CODES.VALIDATION, WISHLIST_ERROR_CODES.FULL)
    }

    await insertWishlistItem(userId, productId)

    return { wishlisted: true }
  })

export const toggleWishlistItemMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof toggleWishlistItem>[0]["data"]) => toggleWishlistItem({ data }),
  mutationKey: WISHLIST_MUTATION_KEYS.TOGGLE,
})
