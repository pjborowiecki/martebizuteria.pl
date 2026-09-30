import { describe, expect, it } from "vite-plus/test"

import { BLOG_POST_SLUGS, BLOG_POST_SLUG_LIST, LANDING_ARCHIVE_ARTICLES, isBlogPostSlug } from "~/src/data/blog-posts"

describe("isBlogPostSlug", () => {
  it("accepts every declared slug", () => {
    for (const slug of Object.values(BLOG_POST_SLUGS)) {
      expect(isBlogPostSlug(slug)).toBe(true)
    }
  })

  it("rejects an unknown slug", () => {
    expect(isBlogPostSlug("not-a-post")).toBe(false)
  })

  it("rejects an empty slug", () => {
    expect(isBlogPostSlug("")).toBe(false)
  })

  it("rejects a slug key instead of its value", () => {
    expect(isBlogPostSlug("careRitual")).toBe(false)
  })

  it("matches exactly, without trimming", () => {
    expect(isBlogPostSlug(` ${BLOG_POST_SLUGS.careRitual}`)).toBe(false)
  })
})

describe("LANDING_ARCHIVE_ARTICLES", () => {
  it("covers every declared slug exactly once", () => {
    const slugs = LANDING_ARCHIVE_ARTICLES.map((article) => article.slug)

    expect(slugs.toSorted()).toStrictEqual(Object.values(BLOG_POST_SLUGS).toSorted())
  })

  it("gives every article its own title key", () => {
    const titleKeys = LANDING_ARCHIVE_ARTICLES.map((article) => article.titleKey)

    expect(new Set(titleKeys).size).toBe(LANDING_ARCHIVE_ARTICLES.length)
  })
})

describe("BLOG_POST_SLUG_LIST", () => {
  it("keeps the archive order", () => {
    expect(BLOG_POST_SLUG_LIST).toStrictEqual(LANDING_ARCHIVE_ARTICLES.map((article) => article.slug))
  })

  it("holds only recognised slugs", () => {
    for (const slug of BLOG_POST_SLUG_LIST) {
      expect(isBlogPostSlug(slug)).toBe(true)
    }
  })
})
