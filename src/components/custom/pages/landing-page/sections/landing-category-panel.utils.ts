import { getProductImageUrl } from "~/src/lib/_utils/image";

import type { Category } from "~/src/modules/product-category/product-category.types";
import {
  resolveCategoryShortDescription,
  resolveCategorySubtitle,
  resolveCategoryTitle
} from "~/src/modules/product-category/product-category.utils";

export type LandingCategoryPanel = Pick<Category["select"], "handle" | "id" | "image" | "shortDescriptions" | "subtitles" | "titles">;

export interface LandingCategoryPanelCopy {
  readonly handle: string;
  readonly image: string;
  readonly subtitle: string;
  readonly tag: string;
  readonly title: string;
}

export function resolveLandingCategoryPanelCopy(category: LandingCategoryPanel, locale: string): LandingCategoryPanelCopy {
  return {
    handle: category.handle,
    image: getProductImageUrl(category.image),
    subtitle: resolveCategoryShortDescription(category.shortDescriptions, locale),
    tag: resolveCategoryTitle(category.titles, locale),
    title: resolveCategorySubtitle(category.subtitles, locale)
  };
}
