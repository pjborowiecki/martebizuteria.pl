import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"

export const flattenStorefrontCategoryFilters = (
  roots: readonly CategoryWithChildren[],
  locale: string,
): StorefrontCategoryFilterOption[] => {
  const options: StorefrontCategoryFilterOption[] = []
  const visit = (nodes: readonly CategoryWithChildren[], depth: number): void => {
    for (const node of nodes) {
      options.push({
        depth,
        handle: node.handle,
        id: node.id,
        title: resolveCategoryTitle(node.titles, locale),
      })

      const children = node.children ?? []
      if (children.length > 0) {
        visit(children, depth + 1)
      }
    }
  }
  visit(roots, 0)

  return options
}

export const mapStorefrontCollectionFilters = (
  collections: readonly ProductCollection["select"][],
  locale: string,
): readonly {
  readonly handle: string
  readonly id: string
  readonly title: string
}[] =>
  collections.map((collection) => ({
    handle: collection.handle,
    id: collection.id,
    title: resolveCollectionTitle(collection.titles, locale),
  }))

export interface StorefrontCategoryFilterOption {
  readonly depth: number
  readonly handle: string
  readonly id: string
  readonly title: string
}

type CategoryWithChildren = ProductCategory["select"] & {
  readonly children?: readonly ProductCategory["select"][]
}
