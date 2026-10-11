import { describe, expect, it } from "vite-plus/test"

import { BLOG_POST_SLUGS } from "~/src/data/blog-posts"

import englishBlog from "~/messages/en-US/pages.blog.json"
import englishLanding from "~/messages/en-US/pages.landing.json"
import polishBlog from "~/messages/pl-PL/pages.blog.json"
import polishLanding from "~/messages/pl-PL/pages.landing.json"

describe("BLOG_POST_SLUGS", () => {
  it("publishes no article until a real one is written", () => {
    expect(BLOG_POST_SLUGS).toStrictEqual([])
  })

  it.each([
    ["pl-PL", polishBlog.posts, polishLanding.archiveSection.articles],
    ["en-US", englishBlog.posts, englishLanding.archiveSection.articles],
  ])("keeps %s copy for exactly the published articles", (_locale, posts, archiveTitles) => {
    const published = BLOG_POST_SLUGS.toSorted()

    expect(Object.keys(posts).toSorted()).toStrictEqual(published)
    expect(Object.keys(archiveTitles).toSorted()).toStrictEqual(published)
  })
})
