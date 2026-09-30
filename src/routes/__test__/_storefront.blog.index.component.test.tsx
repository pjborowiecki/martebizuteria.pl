import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import type * as I18nMessages from "~/src/integrations/use-intl/i18n.messages"

interface BlogIndexMessages {
  readonly index: {
    readonly description: string
    readonly title: string
  }
}

interface LoaderContext {
  readonly context: {
    readonly locale: string
    readonly queryClient: {
      readonly query: (options: unknown) => Promise<BlogIndexMessages>
    }
  }
}

interface BlogIndexRouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: unknown
  readonly loader?: (context: LoaderContext) => Promise<{ readonly description: string; readonly title: string }>
  readonly staticData?: unknown
}

const requested = vi.hoisted(() => ({ options: [] as unknown[] }))

const captured: { current: BlogIndexRouteDefinition | undefined } = { current: undefined }

vi.mock("~/src/integrations/use-intl/i18n.messages", async (importOriginal) => {
  const actual = await importOriginal<typeof I18nMessages>()

  return {
    ...actual,
    messagesQueryOptions: (input: { locale: string; namespace: string }) => ({ queryKey: ["messages", input.locale, input.namespace] }),
  }
})
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: BlogIndexRouteDefinition) => {
      captured.current = options

      return { options }
    },
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { BLOG_POST_SLUGS } from "~/src/data/blog-posts"

import { pageHead } from "~/src/lib/seo"

await import("~/src/routes/_storefront.blog.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the blog index route did not register any options")
}

const renderIndex = () => {
  const BlogIndexPage = route.component
  if (BlogIndexPage === undefined) {
    throw new Error("the blog index route registered no component")
  }

  return renderWithProviders(<BlogIndexPage />)
}

const loaderContext = (messages: BlogIndexMessages): LoaderContext => ({
  context: {
    locale: "en-US",
    queryClient: {
      query: (options: unknown) => {
        requested.options.push(options)

        return Promise.resolve(messages)
      },
    },
  },
})

afterEach(() => {
  cleanup()
  requested.options = []
})

describe("blog index page", () => {
  it("titles the guide from the localized catalogue", () => {
    renderIndex()

    expect(screen.getByRole("heading", { level: 1, name: "M'Arte Guide" })).toBeInTheDocument()
    expect(screen.getByText("Tips, inspiration, and jewelry know-how — from care rituals to layered styling.")).toBeInTheDocument()
  })

  it("lists every article the guide carries", () => {
    renderIndex()

    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByText("Care ritual: how to properly care for your daily jewelry")).toBeInTheDocument()
    expect(screen.getByText("The art of proportion: how to build layered compositions")).toBeInTheDocument()
    expect(screen.getByText("Mineral guide: meaning and choosing natural stones")).toBeInTheDocument()
  })

  it("links each entry to its own article", () => {
    renderIndex()

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toStrictEqual([
      `/blog/${BLOG_POST_SLUGS.careRitual}`,
      `/blog/${BLOG_POST_SLUGS.layeredCompositions}`,
      `/blog/${BLOG_POST_SLUGS.mineralGuide}`,
    ])
  })

  it("invites the reader into every article with the same call to action", () => {
    renderIndex()

    expect(screen.getAllByText("Read article")).toHaveLength(3)
  })
})

describe("blog index route wiring", () => {
  it("registers the shared page head builder", () => {
    expect(route.head).toBe(pageHead)
  })

  it("loads only the blog namespace", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.blog"] })
  })
})

describe("blog index loader", () => {
  it("takes the document title and description from the loaded namespace", async () => {
    await expect(
      route.loader?.(loaderContext({ index: { description: "Care, styling and stones.", title: "M'Arte Guide" } })),
    ).resolves.toStrictEqual({ description: "Care, styling and stones.", title: "M'Arte Guide" })
  })

  it("asks for the blog namespace in the locale the router resolved", async () => {
    await route.loader?.(loaderContext({ index: { description: "Care, styling and stones.", title: "M'Arte Guide" } }))

    expect(requested.options).toStrictEqual([{ queryKey: ["messages", "en-US", "pages.blog"] }])
  })
})
