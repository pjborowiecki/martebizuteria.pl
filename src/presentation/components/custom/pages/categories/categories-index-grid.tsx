import { type JSX } from "react"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { StorefrontCategoryCard } from "~/src/presentation/components/custom/pages/categories/category-card"

const buildCategoryPairRows = (categories: readonly ProductCategory["storefrontListItem"][]): CategoryPairRow[] => {
  const rows: CategoryPairRow[] = []
  for (const [index, category] of categories.entries()) {
    if (index % PAIR_SIZE === 0) {
      rows.push({
        left: category,
        right: categories[index + 1],
      })
    }
  }

  return rows
}

const WideLeftRow = ({
  left,
  priority,
  right,
}: Readonly<{
  left: ProductCategory["storefrontListItem"]
  priority: boolean
  right?: ProductCategory["storefrontListItem"]
}>): JSX.Element => (
  <div className="reveal grid gap-5 lg:grid-cols-[8fr_5fr] lg:gap-6">
    <StorefrontCategoryCard aspectRatioClass="lg:aspect-8/5" category={left} priority={priority} showDescription sizes={WIDE_SIZES} />
    {right === undefined ? (
      <div className="hidden lg:block" />
    ) : (
      <StorefrontCategoryCard aspectRatioClass="lg:aspect-square" category={right} showDescription sizes={SQUARE_SIZES_WIDE_ROW} />
    )}
  </div>
)

const WideRightRow = ({
  left,
  right,
}: Readonly<{
  left: ProductCategory["storefrontListItem"]
  right: ProductCategory["storefrontListItem"]
}>): JSX.Element => (
  <div className="reveal grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-[5fr_8fr] lg:gap-6">
    <StorefrontCategoryCard aspectRatioClass="lg:aspect-square" category={left} showDescription sizes={SQUARE_SIZES_NARROW_ROW} />
    <StorefrontCategoryCard aspectRatioClass="lg:aspect-8/5" category={right} showDescription sizes={WIDE_SIZES} />
  </div>
)

export const CategoriesIndexGrid = ({
  categories,
}: Readonly<{
  categories: readonly ProductCategory["storefrontListItem"][]
}>): JSX.Element => {
  const rows = buildCategoryPairRows(categories)

  return (
    <div className="space-y-10 lg:space-y-14">
      {rows.map((row, rowIndex) => {
        const key = row.right === undefined ? row.left.id : `${row.left.id}-${row.right.id}`
        const isWideLeft = rowIndex % PAIR_SIZE === 0
        const isFirstRow = rowIndex === 0
        if (row.right === undefined) {
          return <WideLeftRow key={key} left={row.left} priority={isFirstRow} />
        }

        if (isWideLeft) {
          return <WideLeftRow key={key} left={row.left} priority={isFirstRow} right={row.right} />
        }

        return <WideRightRow key={key} left={row.left} right={row.right} />
      })}
    </div>
  )
}

const PAIR_SIZE = 2

const WIDE_SIZES = "(max-width: 1024px) 100vw, 62vw"

const SQUARE_SIZES_WIDE_ROW = "(max-width: 1024px) 100vw, 38vw"

const SQUARE_SIZES_NARROW_ROW = "(max-width: 1024px) 50vw, 38vw"

interface CategoryPairRow {
  readonly left: ProductCategory["storefrontListItem"]
  readonly right?: ProductCategory["storefrontListItem"] | undefined
}
