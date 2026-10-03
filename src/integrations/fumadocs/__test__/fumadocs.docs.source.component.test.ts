import { createElement } from "react"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { getRequest } = vi.hoisted(() => ({ getRequest: vi.fn(() => new Request("https://martebizuteria.pl/docs")) }))

vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest }
})

import {
  buildDocsNavigation,
  docsSlugsOf,
  docsSource,
  docsSplatOf,
  loadDocsNavigation,
  loadDocsPage,
} from "~/src/integrations/fumadocs/fumadocs.docs"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ROUTES } from "~/src/routes"

beforeEach(() => {
  getRequest.mockReturnValue(new Request("https://martebizuteria.pl/docs"))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("the docs collection", () => {
  it("serves every page under the documentation route", () => {
    expect(docsSource.getPage([], I18N.DEFAULT_LOCALE)?.url).toBe(ROUTES.DOCS)
  })

  it.each(I18N.SUPPORTED_LOCALES)("carries a root page in %s", (locale) => {
    expect(docsSource.getPage([], locale)?.data.title).toBeTypeOf("string")
  })

  it("titles the root page from its own frontmatter rather than the fallback locale", () => {
    expect(docsSource.getPage([], "pl-PL")?.data.title).toBe("Dokumentacja")
    expect(docsSource.getPage([], "en-US")?.data.title).toBe("Documentation")
  })

  it("reports no page for a slug that was never written", () => {
    expect(docsSource.getPage(["nowhere"], "en-US")).toBeUndefined()
  })
})

describe("the documentation page tree", () => {
  it.each(I18N.SUPPORTED_LOCALES)("names the tree after the localized root meta title in %s", (locale) => {
    expect(docsSource.getPageTree(locale).name).toBe(locale === "pl-PL" ? "Dokumentacja" : "Documentation")
  })

  it("names every section and every page it lists", () => {
    const sections = buildDocsNavigation("en-US")

    expect(sections.every((section) => section.title.length > 0)).toBe(true)
    expect(sections.flatMap((section) => section.links).every((link) => link.splat.length > 0)).toBe(true)
  })

  it("turns each folder into a section, putting the folder index page first", () => {
    vi.spyOn(docsSource, "getPageTree").mockReturnValue({
      children: [
        {
          children: [
            { name: "Routing", type: "page", url: `${ROUTES.DOCS}/architecture/routing` },
            { name: "Sections", type: "separator" },
          ],
          index: { name: "Architecture", type: "page", url: `${ROUTES.DOCS}/architecture` },
          name: "Architecture",
          type: "folder",
        },
        { name: "Overview", type: "page", url: ROUTES.DOCS },
      ],
      name: "Documentation",
    })

    expect(buildDocsNavigation("en-US")).toStrictEqual([
      {
        links: [
          { splat: "architecture", title: "Architecture" },
          { splat: "architecture/routing", title: "Routing" },
        ],
        title: "Architecture",
      },
    ])
  })

  it("leaves a title blank when the tree names a node with markup instead of text", () => {
    vi.spyOn(docsSource, "getPageTree").mockReturnValue({
      children: [
        {
          children: [{ name: createElement("strong", null, "Routing"), type: "page", url: `${ROUTES.DOCS}/architecture/routing` }],
          name: createElement("em", null, "Architecture"),
          type: "folder",
        },
      ],
      name: "Documentation",
    })

    expect(buildDocsNavigation("en-US")).toStrictEqual([{ links: [{ splat: "architecture/routing", title: "" }], title: "" }])
  })
})

describe("loadDocsNavigation", () => {
  it("builds the sidebar for the locale of the request", async () => {
    getRequest.mockReturnValue(new Request("https://martebizuteria.pl/en-US/docs"))

    await expect(loadDocsNavigation()).resolves.toStrictEqual({ sections: buildDocsNavigation("en-US") })
  })

  it("builds the Polish sidebar for an unprefixed url, since Polish is the default locale", async () => {
    const { sections } = await loadDocsNavigation()

    expect(sections).toStrictEqual(buildDocsNavigation("pl-PL"))
    expect(sections.map((section) => section.title)).not.toStrictEqual(buildDocsNavigation("en-US").map((section) => section.title))
  })
})

describe("docsSplatOf", () => {
  it("strips the documentation base url so the splat route can link to a page", () => {
    expect(docsSplatOf(`${ROUTES.DOCS}/architecture/routing`)).toBe("architecture/routing")
  })

  it("yields an empty splat for the documentation root and for foreign urls", () => {
    expect(docsSplatOf(ROUTES.DOCS)).toBe("")
    expect(docsSplatOf("/blog/first-post")).toBe("")
  })
})

describe("docsSlugsOf", () => {
  it("treats a missing or empty splat as the root page", () => {
    expect(docsSlugsOf(undefined)).toStrictEqual([])
    expect(docsSlugsOf("")).toStrictEqual([])
  })

  it("splits a nested splat into slug segments and drops empty ones", () => {
    expect(docsSlugsOf("architecture/routing")).toStrictEqual(["architecture", "routing"])
    expect(docsSlugsOf("architecture//routing/")).toStrictEqual(["architecture", "routing"])
  })
})

describe("loadDocsPage", () => {
  it("resolves the Polish root page for an unprefixed url, since Polish is the default locale", async () => {
    const page = await loadDocsPage()

    expect(page.title).toBe("Dokumentacja")
    expect(page.path).toBe("index.pl-PL.mdx")
  })

  it("resolves the English root page for an English url", async () => {
    getRequest.mockReturnValue(new Request("https://martebizuteria.pl/en-US/docs"))

    const page = await loadDocsPage()

    expect(page.title).toBe("Documentation")
    expect(page.path).toBe("index.en-US.mdx")
  })

  it("carries the description the document head needs", async () => {
    getRequest.mockReturnValue(new Request("https://martebizuteria.pl/en-US/docs"))

    const page = await loadDocsPage()

    expect(page.description).toBe("Architecture, guides, features and reference for the M'Arte jewellery storefront and admin console.")
  })

  it("signals not found for a page that does not exist", async () => {
    await expect(loadDocsPage("architecture/nowhere")).rejects.toMatchObject({ isNotFound: true })
  })

  it("provides an empty head description when optional frontmatter is omitted", async () => {
    const existing = docsSource.getPage([], "pl-PL")
    if (existing === undefined) {
      throw new Error("Documentation root fixture is missing")
    }
    vi.spyOn(docsSource, "getPage").mockReturnValue({ ...existing, data: { ...existing.data, description: undefined } })

    const page = await loadDocsPage()

    expect(page.description).toBe("")
    expect(page.path).toBe(existing.path)
    expect(page.title).toBe(existing.data.title)
  })
})
