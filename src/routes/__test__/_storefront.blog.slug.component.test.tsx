import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { isNotFound } from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type * as I18nMessages from "~/src/integrations/use-intl/i18n.messages"

interface MetaEntry {
  readonly content?: string
  readonly name?: string
  readonly property?: string
  readonly title?: string
}

interface PostCopy {
  readonly description: string
  readonly title: string
}

interface LoaderContext {
  readonly context: {
    readonly locale: string
    readonly queryClient: {
      readonly query: (options: unknown) => Promise<{ readonly posts: Readonly<Record<string, PostCopy>> }>
    }
  }
  readonly params: { readonly slug: string }
}

interface BlogRouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (context: LoaderContext) => Promise<PostCopy>
  readonly head?: (context: { readonly loaderData?: PostCopy }) => {
    readonly meta: readonly MetaEntry[]
  }
}

const blog = vi.hoisted(() => ({ slugs: [] as string[] }))

const requested = vi.hoisted(() => ({ options: [] as unknown[] }))

const routing = vi.hoisted(() => ({ slug: "silver-care" }))

const captured: { current: BlogRouteDefinition | undefined } = { current: undefined }

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
    createFileRoute: () => (options: BlogRouteDefinition) => {
      captured.current = options

      return { options, useParams: () => ({ slug: routing.slug }) }
    },
  }
})

import { TEST_LOCALE } from "~/src/platform/testing/lib/messages"
import { renderWithProviders } from "~/src/platform/testing/lib/render"

import blogMessages from "~/messages/en-US/pages.blog.json"

await import("~/src/routes/_storefront.blog.$slug")

const route = captured.current

if (route === undefined) {
  throw new Error("the blog post route did not register any options")
}

const POSTS = {
  "layering-chains": { description: "Two chains, one neckline.", title: "Layering chains" },
  "silver-care": { description: "Keeping silver bright.", title: "Caring for silver" },
}

const MESSAGES_WITH_POSTS = { pages: { blog: { ...blogMessages, posts: POSTS } } }

const renderPost = (slug: string) => {
  routing.slug = slug
  const BlogPostPage = route.component
  if (BlogPostPage === undefined) {
    throw new Error("the blog post route registered no component")
  }

  return renderWithProviders(
    <IntlProvider locale={TEST_LOCALE} messages={MESSAGES_WITH_POSTS}>
      <BlogPostPage />
    </IntlProvider>,
  )
}

const loaderContext = (slug: string): LoaderContext => ({
  context: {
    locale: "en-US",
    queryClient: {
      query: (options: unknown) => {
        requested.options.push(options)

        return Promise.resolve({ posts: { "silver-care": POSTS["silver-care"] } })
      },
    },
  },
  params: { slug },
})

const notFoundFrom = async (slug: string): Promise<boolean> => {
  const caught: { thrown?: unknown } = {}

  await route.loader?.(loaderContext(slug)).catch((error: unknown) => {
    caught.thrown = error
  })

  return isNotFound(caught.thrown)
}

beforeEach(() => {
  blog.slugs = Object.keys(POSTS)
})

afterEach(() => {
  cleanup()
  requested.options = []
  blog.slugs = []
})

describe("blog post page", () => {
  it("titles the article from the localized catalogue", () => {
    renderPost("silver-care")

    expect(screen.getByRole("heading", { level: 1, name: "Caring for silver" })).toBeInTheDocument()
  })

  it("shows the article description below the title", () => {
    renderPost("silver-care")

    expect(screen.getByText("Keeping silver bright.")).toBeInTheDocument()
  })

  it("resolves a different article from the same route", () => {
    renderPost("layering-chains")

    expect(screen.getByRole("heading", { level: 1, name: "Layering chains" })).toBeInTheDocument()
  })

  it("links back to the guide and to the home page", () => {
    renderPost("silver-care")

    expect(screen.getByRole("link", { name: "Back to guide" })).toHaveAttribute("href", "/blog")
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/")
  })
})

describe("blog post metadata", () => {
  it("uses the loaded article copy for the document and social titles", () => {
    const meta = route.head?.({ loaderData: { description: "Keeping silver bright.", title: "Caring for silver" } }).meta

    expect(meta).toStrictEqual([
      { title: "Caring for silver" },
      { content: "Keeping silver bright.", name: "description" },
      { content: "Caring for silver", property: "og:title" },
      { content: "Keeping silver bright.", property: "og:description" },
    ])
  })
})

describe("blog post loader", () => {
  it("reads the article copy out of the blog namespace in the request locale", async () => {
    await expect(route.loader?.(loaderContext("silver-care"))).resolves.toStrictEqual(POSTS["silver-care"])
    expect(requested.options).toStrictEqual([{ queryKey: ["messages", "en-US", "pages.blog"] }])
  })

  it("answers not found for a published article whose copy is missing in this locale", async () => {
    await expect(notFoundFrom("layering-chains")).resolves.toBe(true)
  })

  it("answers not found for a slug that is not a published article, without loading any copy", async () => {
    await expect(notFoundFrom("not-an-article")).resolves.toBe(true)
    expect(requested.options).toStrictEqual([])
  })

  it("answers not found for every slug while the guide has no articles", async () => {
    blog.slugs = []

    await expect(notFoundFrom("silver-care")).resolves.toBe(true)
  })
})
