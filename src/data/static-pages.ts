import { BLOG_POST_SLUGS } from "~/src/data/blog-posts"

import { ROUTES } from "~/src/routes"

export const STATIC_PAGES: readonly string[] = [
  ROUTES.HOME,
  ROUTES.PRODUCTS,
  ROUTES.CATEGORIES,
  ROUTES.COLLECTIONS,
  ROUTES.WITHDRAW_FROM_CONTRACT,
  ...(BLOG_POST_SLUGS.length === 0 ? [] : [ROUTES.BLOG]),
]
