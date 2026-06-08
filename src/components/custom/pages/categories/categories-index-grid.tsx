import type { JSX } from "react";

import { StorefrontCategoryCard } from "~/src/components/custom/pages/categories/category-card";

import type { Category } from "~/src/modules/product-category/product-category.types";

const PAIR_SIZE = 2;
const ROW_INDEX_EVEN = 0;
const ROW_INDEX_ODD = 1;
const FIRST_CATEGORY_INDEX = 0;

const WIDE_SIZES = "(max-width: 1024px) 100vw, 62vw";
const SQUARE_SIZES_WIDE_ROW = "(max-width: 1024px) 100vw, 38vw";
const SQUARE_SIZES_NARROW_ROW = "(max-width: 1024px) 50vw, 38vw";

interface CategoryPairRow {
  readonly left: Category["storefrontListItem"];
  readonly right?: Category["storefrontListItem"];
}

function buildCategoryPairRows(categories: readonly Category["storefrontListItem"][]): CategoryPairRow[] {
  const rows: CategoryPairRow[] = [];

  for (let index = FIRST_CATEGORY_INDEX; index < categories.length; index += PAIR_SIZE) {
    rows.push({
      left: categories[index],
      right: categories[index + ROW_INDEX_ODD]
    });
  }

  return rows;
}

function WideLeftRow({
  left,
  priority,
  right
}: Readonly<{
  left: Category["storefrontListItem"];
  priority: boolean;
  right?: Category["storefrontListItem"];
}>): JSX.Element {
  return (
    <div className="reveal grid gap-5 lg:grid-cols-[8fr_5fr] lg:gap-6">
      <StorefrontCategoryCard aspectRatioClass="lg:aspect-8/5" category={left} priority={priority} showDescription sizes={WIDE_SIZES} />
      {right === undefined ? (
        <div className="hidden lg:block" />
      ) : (
        <StorefrontCategoryCard aspectRatioClass="lg:aspect-square" category={right} showDescription sizes={SQUARE_SIZES_WIDE_ROW} />
      )}
    </div>
  );
}

function WideRightRow({
  left,
  right
}: Readonly<{
  left: Category["storefrontListItem"];
  right: Category["storefrontListItem"];
}>): JSX.Element {
  return (
    <div className="reveal grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-[5fr_8fr] lg:gap-6">
      <StorefrontCategoryCard aspectRatioClass="lg:aspect-square" category={left} showDescription sizes={SQUARE_SIZES_NARROW_ROW} />
      <StorefrontCategoryCard aspectRatioClass="lg:aspect-8/5" category={right} showDescription sizes={WIDE_SIZES} />
    </div>
  );
}

export function CategoriesIndexGrid({ categories }: Readonly<{ categories: readonly Category["storefrontListItem"][] }>): JSX.Element {
  const rows = buildCategoryPairRows(categories);

  return (
    <div className="space-y-10 lg:space-y-14">
      {rows.map((row, rowIndex) => {
        const key = row.right === undefined ? row.left.id : `${row.left.id}-${row.right.id}`;
        const isWideLeft = rowIndex % PAIR_SIZE === ROW_INDEX_EVEN;
        const isFirstRow = rowIndex === FIRST_CATEGORY_INDEX;

        if (row.right === undefined) {
          return <WideLeftRow key={key} left={row.left} priority={isFirstRow} />;
        }

        if (isWideLeft) {
          return <WideLeftRow key={key} left={row.left} priority={isFirstRow} right={row.right} />;
        }

        return <WideRightRow key={key} left={row.left} right={row.right} />;
      })}
    </div>
  );
}
