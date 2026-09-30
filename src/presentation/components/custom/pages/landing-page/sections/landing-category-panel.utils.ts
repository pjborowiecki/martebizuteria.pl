import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import {
  resolveCategoryShortDescription,
  resolveCategorySubtitle,
  resolveCategoryTitle,
} from "~/src/modules/product-category/product-category.utils"

import { getProductImageUrl } from "~/src/lib/image"

export const resolveLandingCategoryPanelCopy = (category: LandingCategoryPanel, locale: string): LandingCategoryPanelCopy => ({
  handle: category.handle,
  image: getProductImageUrl(category.image),
  subtitle: resolveCategoryShortDescription(category.shortDescriptions, locale),
  tag: resolveCategoryTitle(category.titles, locale),
  title: resolveCategorySubtitle(category.subtitles, locale),
})

export type LandingCategoryPanel = Pick<ProductCategory["select"], "handle" | "id" | "image" | "shortDescriptions" | "subtitles" | "titles">

export interface LandingCategoryPanelCopy {
  readonly handle: string
  readonly image: string
  readonly subtitle: string
  readonly tag: string
  readonly title: string
}
