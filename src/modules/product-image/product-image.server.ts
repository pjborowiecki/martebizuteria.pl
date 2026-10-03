import { eq, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { productImage } from "~/src/modules/product-image/product-image.schema"

export const getProductImagesQuery = db.query.productImage
  .findMany({
    orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
    where: eq(productImage.productId, sql.placeholder("productId")),
  })
  .prepare()
