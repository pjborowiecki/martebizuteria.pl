import "@tanstack/react-start/server-only"

import { listContentPages } from "~/src/modules/content-page/content-page.accessors"
import { CONTENT_PAGE_PATHS } from "~/src/modules/content-page/content-page.constants"
import { getStorefrontCategoryHandlesQuery } from "~/src/modules/product-category/product-category.server"
import { getStorefrontCollectionsQuery } from "~/src/modules/product-collection/product-collection.server"
import { getPublishedInStockProductHandlesQuery } from "~/src/modules/product/product.accessors"

import { STATIC_PAGES } from "~/src/data/static-pages"

import { type SitemapPage } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

const handlePages = (route: string, rows: readonly { readonly handle: string; readonly updatedAt: Date }[]): SitemapPage[] =>
  rows.map(({ handle, updatedAt }) => ({ lastModified: updatedAt, path: route.replace("$handle", handle) }))

export const listSitemapPages = async (): Promise<SitemapPage[]> => {
  const [contentPages, categories, collections, products] = await Promise.all([
    listContentPages(),
    getStorefrontCategoryHandlesQuery.execute(),
    getStorefrontCollectionsQuery.execute(),
    getPublishedInStockProductHandlesQuery.execute(),
  ])

  return [
    ...STATIC_PAGES.map((path) => ({ path })),
    ...contentPages.map(({ handle, updatedAt }) => ({ lastModified: updatedAt, path: CONTENT_PAGE_PATHS[handle] })),
    ...handlePages(ROUTES.CATEGORY, categories),
    ...handlePages(ROUTES.COLLECTION, collections),
    ...handlePages(ROUTES.PRODUCT, products),
  ]
}
