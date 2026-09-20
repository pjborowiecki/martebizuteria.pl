import { type categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
export const resolvePrimaryCategoryId = (
  assignments: readonly {
    readonly categoryId: string
    readonly isPrimary: boolean
  }[],
): string | undefined => {
  const primary = assignments.find((row) => row.isPrimary)
  if (primary !== undefined) {
    return primary.categoryId
  }
  return assignments[0]?.categoryId
}
export const resolveAdditionalCategoryIds = (
  assignments: readonly {
    readonly categoryId: string
    readonly isPrimary: boolean
  }[],
): string[] => {
  const primaryId = resolvePrimaryCategoryId(assignments)
  return assignments.filter((row) => row.categoryId !== primaryId).map((row) => row.categoryId)
}
export const buildCategoryOnProductRows = (
  productId: string,
  primaryCategoryId: string,
  additionalCategoryIds: readonly string[],
): (typeof categoryOnProduct.$inferInsert)[] => {
  const additionalSet = new Set(additionalCategoryIds.filter((id) => id !== primaryCategoryId))
  return [
    {
      categoryId: primaryCategoryId,
      isPrimary: true,
      productId,
    },
    ...[...additionalSet].map((categoryId) => ({
      categoryId,
      isPrimary: false,
      productId,
    })),
  ]
}
