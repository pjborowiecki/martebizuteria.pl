import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { isNotFound } from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type * as I18nMessages from "~/src/integrations/use-intl/i18n.messages"

interface MetaEntry {
  readonly content?: string
  readonly name?: string
  readonly property?: string
  readonly title?: string
}

interface LoaderContext {
  readonly context: {
    readonly locale: string
    readonly queryClient: {
      readonly query: (options: unknown) => Promise<{ readonly posts: Record<string, { description: string; title: string } | undefined> }>
    }
  }
  readonly params: { readonly slug: string }
}

interface BlogRouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (context: LoaderContext) => Promise<{ readonly description: string; readonly title: string }>
  readonly head?: (context: { readonly loaderData?: { readonly description: string; readonly title: string } }) => {
    readonly meta: readonly MetaEntry[]
  }
}

const messages = vi.hoisted(() => ({
  posts: {} as Record<string, { description: string; title: string } | undefined>,
}))

const routing = vi.hoisted(() => ({ slug: "rytual-pielegnacji-bizuterii" }))

const captured: { current: BlogRouteDefinition | undefined } = { current: undefined }

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
    createFileRoute: () => (options: BlogRouteDefinition) => {
      captured.current = options

      return { options, useParams: () => ({ slug: routing.slug }) }
    },
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { BLOG_POST_SLUGS } from "~/src/data/blog-posts"

import { APP_NAME } from "~/src/presentation/branding/app"

await import("~/src/routes/_storefront.blog.$slug")

const route = captured.current

if (route === undefined) {
  throw new Error("the blog post route did not register any options")
}

const renderPost = (slug: string) => {
  routing.slug = slug
  const BlogPostPage = route.component
  if (BlogPostPage === undefined) {
    throw new Error("the blog post route registered no component")
  }

  return renderWithProviders(<BlogPostPage />)
}

beforeEach(() => {
  routing.slug = BLOG_POST_SLUGS.careRitual
})

afterEach(() => {
  cleanup()
})

describe("blog post page", () => {
  it("titles the article from the localized catalogue", () => {
    renderPost(BLOG_POST_SLUGS.careRitual)

    expect(screen.getByRole("heading", { name: "Care ritual: how to properly care for your daily jewelry" })).toBeInTheDocument()
  })

  it("shows the article description below the title", () => {
    renderPost(BLOG_POST_SLUGS.careRitual)

    expect(screen.getByText("Practical tips for everyday care of silver and natural-stone jewelry.")).toBeInTheDocument()
  })

  it("resolves a different article from the same route", () => {
    renderPost(BLOG_POST_SLUGS.mineralGuide)

    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent("Care ritual")
  })

  it("admits the body is not written yet", () => {
    renderPost(BLOG_POST_SLUGS.careRitual)

    expect(screen.getByText("This article is being prepared. The full story will be published soon.")).toBeInTheDocument()
  })

  it("links back to the guide and to the home page", () => {
    renderPost(BLOG_POST_SLUGS.careRitual)

    expect(screen.getByRole("link", { name: "Back to guide" })).toHaveAttribute("href", "/blog")
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/")
  })

  it("renders an empty page for a slug that is not an article", () => {
    const { container } = renderPost("not-an-article")

    expect(container.querySelector("main")).toBeEmptyDOMElement()
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
  })
})

describe("blog post metadata", () => {
  it("uses the loaded article copy for the document and social titles", () => {
    const meta = route.head?.({ loaderData: { description: "Practical tips.", title: "Care ritual" } }).meta

    expect(meta).toStrictEqual([
      { title: "Care ritual" },
      { content: "Practical tips.", name: "description" },
      { content: "Care ritual", property: "og:title" },
      { content: "Practical tips.", property: "og:description" },
    ])
  })

  it("falls back to the store name for an article whose copy never loaded", () => {
    const meta = route.head?.({}).meta

    expect(meta).toStrictEqual([
      { title: APP_NAME },
      { content: "", name: "description" },
      { content: APP_NAME, property: "og:title" },
      { content: "", property: "og:description" },
    ])
  })
})

const loaderContext = (slug: string): LoaderContext => ({
  context: { locale: "en-US", queryClient: { query: () => Promise.resolve({ posts: messages.posts }) } },
  params: { slug },
})

describe("blog post loader", () => {
  beforeEach(() => {
    messages.posts = { "rytual-pielegnacji-bizuterii": { description: "Practical tips.", title: "Care ritual" } }
  })

  it("reads the article copy out of the loaded namespace", async () => {
    await expect(route.loader?.(loaderContext(BLOG_POST_SLUGS.careRitual))).resolves.toStrictEqual({
      description: "Practical tips.",
      title: "Care ritual",
    })
  })

  it("falls back to the store name for an article the catalogue does not carry", async () => {
    await expect(route.loader?.(loaderContext(BLOG_POST_SLUGS.mineralGuide))).resolves.toStrictEqual({
      description: "",
      title: APP_NAME,
    })
  })

  it("reports a slug that is not an article as not found", async () => {
    const caught: { thrown?: unknown } = {}

    await route.loader?.(loaderContext("not-an-article")).catch((error: unknown) => {
      caught.thrown = error
    })

    expect(isNotFound(caught.thrown)).toBe(true)
  })
})
