import { BLOG_POST_SLUGS } from "~/src/data/blog-posts"

export const STATIC_PAGES: readonly string[] = BLOG_POST_SLUGS.length === 0 ? ["/", "/about"] : ["/", "/about", "/blog"]
