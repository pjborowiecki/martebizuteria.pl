import type { Category } from "~/src/modules/product-category/product-category.types";
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils";
import type { Collection } from "~/src/modules/product-collection/product-collection.types";
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";

const FIRST_DEPTH = 0;
const DEPTH_STEP = 1;

export interface StorefrontCategoryFilterOption {
  readonly depth: number;
  readonly handle: string;
  readonly id: string;
  readonly title: string;
}

type CategoryWithChildren = Category["select"] & {
  readonly children?: readonly Category["select"][];
};

export function flattenStorefrontCategoryFilters(roots: readonly CategoryWithChildren[], locale: string): StorefrontCategoryFilterOption[] {
  const options: StorefrontCategoryFilterOption[] = [];

  const visit = (nodes: readonly CategoryWithChildren[], depth: number): void => {
    for (const node of nodes) {
      options.push({
        depth,
        handle: node.handle,
        id: node.id,
        title: resolveCategoryTitle(node.titles, locale)
      });

      const children = node.children ?? [];
      if (children.length > FIRST_DEPTH) {
        visit(children, depth + DEPTH_STEP);
      }
    }
  };

  visit(roots, FIRST_DEPTH);
  return options;
}

export function mapStorefrontCollectionFilters(
  collections: readonly Collection["select"][],
  locale: string
): readonly { readonly handle: string; readonly id: string; readonly title: string }[] {
  return collections.map((collection) => ({
    handle: collection.handle,
    id: collection.id,
    title: resolveCollectionTitle(collection.titles, locale)
  }));
}
