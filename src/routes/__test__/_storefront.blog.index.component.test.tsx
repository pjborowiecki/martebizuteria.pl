import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { isNotFound } from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
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

const blog = vi.hoisted(() => ({ slugs: [] as string[] }))

const captured: { current: BlogIndexRouteDefinition | undefined } = { current: undefined }

vi.mock("~/src/data/blog-posts", () => ({
  get BLOG_POST_SLUGS() {
    return blog.slugs
  },
}))
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

import { TEST_LOCALE } from "~/src/platform/testing/lib/messages"
import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { pageHead } from "~/src/lib/seo"

import blogMessages from "~/messages/en-US/pages.blog.json"

await import("~/src/routes/_storefront.blog.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the blog index route did not register any options")
}

const POSTS = {
  "layering-chains": { description: "Two chains, one neckline.", title: "Layering chains" },
  "silver-care": { description: "Keeping silver bright.", title: "Caring for silver" },
}

const MESSAGES_WITH_POSTS = { pages: { blog: { ...blogMessages, posts: POSTS } } }

const renderIndex = () => {
  const BlogIndexPage = route.component
  if (BlogIndexPage === undefined) {
    throw new Error("the blog index route registered no component")
  }
  blog.slugs = Object.keys(POSTS)

  return renderWithProviders(
    <IntlProvider locale={TEST_LOCALE} messages={MESSAGES_WITH_POSTS}>
      <BlogIndexPage />
    </IntlProvider>,
  )
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

const GUIDE_MESSAGES = { index: { description: "Care, styling and stones.", title: "M'Arte Guide" } }

afterEach(() => {
  cleanup()
  requested.options = []
  blog.slugs = []
})

describe("blog index page", () => {
  it("titles the guide from the localized catalogue", () => {
    renderIndex()

    expect(screen.getByRole("heading", { level: 1, name: "M'Arte Guide" })).toBeInTheDocument()
    expect(screen.getByText("Tips, inspiration, and jewelry know-how — from care rituals to layered styling.")).toBeInTheDocument()
  })

  it("lists every published article by its title", () => {
    renderIndex()

    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByText("Layering chains")).toBeInTheDocument()
    expect(screen.getByText("Caring for silver")).toBeInTheDocument()
  })

  it("links each entry to its own article", () => {
    renderIndex()

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toStrictEqual([
      "/blog/layering-chains",
      "/blog/silver-care",
    ])
  })

  it("invites the reader into every article with the same call to action", () => {
    renderIndex()

    expect(screen.getAllByText("Read article")).toHaveLength(2)
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
  it("answers not found while the guide has no articles, without loading its copy", async () => {
    const caught: { thrown?: unknown } = {}

    await route.loader?.(loaderContext(GUIDE_MESSAGES)).catch((error: unknown) => {
      caught.thrown = error
    })

    expect(isNotFound(caught.thrown)).toBe(true)
    expect(requested.options).toStrictEqual([])
  })

  it("takes the document title and description from the loaded namespace once an article is published", async () => {
    blog.slugs = ["silver-care"]

    await expect(route.loader?.(loaderContext(GUIDE_MESSAGES))).resolves.toStrictEqual({
      description: "Care, styling and stones.",
      title: "M'Arte Guide",
    })
    expect(requested.options).toStrictEqual([{ queryKey: ["messages", "en-US", "pages.blog"] }])
  })
})
