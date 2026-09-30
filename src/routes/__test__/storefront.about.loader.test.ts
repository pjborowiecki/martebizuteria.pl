import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import type * as I18nMessages from "~/src/integrations/use-intl/i18n.messages"

import { pageHead } from "~/src/lib/seo"

interface AboutMessages {
  readonly about: string
  readonly description: string
}

interface LoaderContext {
  readonly context: {
    readonly locale: string
    readonly queryClient: {
      readonly query: (options: unknown) => Promise<AboutMessages>
    }
  }
}

interface AboutRouteDefinition {
  readonly head?: unknown
  readonly loader?: (context: LoaderContext) => Promise<{ readonly description: string; readonly title: string }>
}

const requested = vi.hoisted(() => ({ options: [] as unknown[] }))

const captured: { current: AboutRouteDefinition | undefined } = { current: undefined }

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
    createFileRoute: () => (options: AboutRouteDefinition) => {
      captured.current = options

      return { options }
    },
  }
})

await import("~/src/routes/_storefront.about")

const route = captured.current

if (route === undefined) {
  throw new Error("the about route did not register any options")
}

const loaderContext = (messages: AboutMessages): LoaderContext => ({
  context: {
    locale: "pl-PL",
    queryClient: {
      query: (options: unknown) => {
        requested.options.push(options)

        return Promise.resolve(messages)
      },
    },
  },
})

describe("storefront about loader", () => {
  it("names the document after the about heading and describes it with the page copy", async () => {
    await expect(route.loader?.(loaderContext({ about: "O M'Arte", description: "Strona w budowie." }))).resolves.toStrictEqual({
      description: "Strona w budowie.",
      title: "O M'Arte",
    })
  })

  it("asks for the about namespace in the locale the router resolved", async () => {
    requested.options = []

    await route.loader?.(loaderContext({ about: "O M'Arte", description: "Strona w budowie." }))

    expect(requested.options).toStrictEqual([{ queryKey: ["messages", "pl-PL", "pages.about"] }])
  })
})

describe("storefront about head metadata", () => {
  it("registers the shared page head builder", () => {
    expect(route.head).toBe(pageHead)
  })
})
