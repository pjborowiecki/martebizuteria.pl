import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const blog = vi.hoisted(() => ({ slugs: [] as string[] }))

vi.mock("~/src/data/blog-posts", () => ({
  get BLOG_POST_SLUGS() {
    return blog.slugs
  },
}))

afterEach(() => {
  blog.slugs = []
  vi.resetModules()
})

describe("STATIC_PAGES", () => {
  it("lists the storefront's own pages and the withdrawal form, and leaves the blog out of the sitemap while it has no articles", async () => {
    const { STATIC_PAGES } = await import("~/src/data/static-pages")

    expect(STATIC_PAGES).toStrictEqual(["/", "/products", "/categories", "/collections", "/withdraw-from-contract"])
  })

  it("lists the blog once it has an article", async () => {
    blog.slugs = ["silver-care"]

    const { STATIC_PAGES } = await import("~/src/data/static-pages")

    expect(STATIC_PAGES).toStrictEqual(["/", "/products", "/categories", "/collections", "/withdraw-from-contract", "/blog"])
  })
})
