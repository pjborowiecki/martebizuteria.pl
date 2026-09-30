import { describe, expect, it } from "vite-plus/test"

import { CONTENT_TYPES, PAGES } from "~/src/data/content"

describe("CONTENT_TYPES", () => {
  it("lists each content kind once", () => {
    expect(CONTENT_TYPES.map((type) => type.key)).toStrictEqual(["pages", "banners", "articles"])
  })

  it("counts the pages it declares against the page list", () => {
    const pagesType = CONTENT_TYPES.find((type) => type.key === "pages")

    expect(pagesType?.count).toBe(PAGES.length)
  })

  it("keeps every count a non negative integer", () => {
    for (const type of CONTENT_TYPES) {
      expect(Number.isInteger(type.count)).toBe(true)
      expect(type.count).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("PAGES", () => {
  it("gives every page its own id, path and title", () => {
    const ids = PAGES.map((page) => page.id)
    const paths = PAGES.map((page) => page.path)
    const titles = PAGES.map((page) => page.title)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it("roots every path at a slash", () => {
    for (const page of PAGES) {
      expect(page.path.startsWith("/")).toBe(true)
    }
  })

  it("uses only published and draft statuses", () => {
    for (const page of PAGES) {
      expect(["draft", "published"]).toContain(page.status)
    }
  })

  it("gives every page at least one section", () => {
    for (const page of PAGES) {
      expect(page.sections).toBeGreaterThan(0)
    }
  })
})
