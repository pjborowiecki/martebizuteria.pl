import zod from "zod/v4"

import { idField } from "~/src/modules/_core/utils/zod-fields"

export const wishlistZodSchemas = {
  productIdInput: zod.object({
    productId: idField,
  }),
}
