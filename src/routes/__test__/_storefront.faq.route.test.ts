import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type PageMeta, pageHead } from "~/src/lib/seo"

interface MessagesQueryStub<TMessages> {
  readonly queryFn: () => Promise<TMessages>
  readonly queryKey: readonly unknown[]
}

interface LoaderContext {
  readonly context: {
    readonly locale: SupportedLocale
    readonly queryClient: {
      readonly query: <TMessages>(options: MessagesQueryStub<TMessages>) => Promise<TMessages>
    }
  }
}

interface FaqRouteDefinition {
  readonly head?: unknown
  readonly loader?: (context: LoaderContext) => Promise<PageMeta>
  readonly staticData?: { readonly namespaces?: readonly string[] }
}

const captured: { current: FaqRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: FaqRouteDefinition) => {
      captured.current = options

      return options
    },
  }
})

await import("~/src/routes/_storefront.faq")

const route = captured.current

if (route === undefined) {
  throw new Error("the faq route registered no options")
}

const seenQueryKeys: unknown[][] = []

const loadMeta = (locale: SupportedLocale = "en-US"): Promise<PageMeta> => {
  const { loader } = route
  if (loader === undefined) {
    throw new Error("the faq route registered no loader")
  }
  seenQueryKeys.length = 0

  return loader({
    context: {
      locale,
      queryClient: {
        query: <TMessages>(options: MessagesQueryStub<TMessages>) => {
          seenQueryKeys.push([...options.queryKey])

          return options.queryFn()
        },
      },
    },
  })
}

describe("faq route metadata", () => {
  it("builds its document head with the shared page head helper", () => {
    expect(route.head).toBe(pageHead)
  })

  it("loads only the faq namespace", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.faq"] })
  })

  it("takes the document title and description from the English faq copy", async () => {
    await expect(loadMeta("en-US")).resolves.toStrictEqual({
      description: "Page under construction. We look forward to seeing you soon.",
      title: "FAQ",
    })
  })

  it("asks for the faq messages of the locale it was given", async () => {
    await loadMeta("pl-PL")

    expect(seenQueryKeys).toStrictEqual([["messages", "pl-PL", "pages.faq"]])
  })
})
