import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

interface SignUpRouteDefinition {
  readonly head?: unknown
  readonly loader?: (context: {
    readonly context: { readonly locale: "en-US" | "pl-PL"; readonly queryClient: QueryClient }
  }) => Promise<{ readonly description: string; readonly title: string }>
}

const captured: { current: SignUpRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: SignUpRouteDefinition) => {
      captured.current = options

      return { options }
    },
  }
})

import { pageHead } from "~/src/lib/seo"

await import("~/src/routes/auth.sign-up")

const route = captured.current

if (route === undefined) {
  throw new Error("the sign up route did not register any options")
}

const runLoader = (locale: "en-US" | "pl-PL") => {
  const { loader } = route
  if (loader === undefined) {
    throw new Error("the sign up route registered no loader")
  }

  return loader({ context: { locale, queryClient: new QueryClient() } })
}

describe("auth sign up loader", () => {
  it("titles the page and describes it from the English catalogue", async () => {
    await expect(runLoader("en-US")).resolves.toStrictEqual({
      description: "Join M'Arte to discover handcrafted jewelry and exclusive collections.",
      title: "Create an Account | M'Arte",
    })
  })

  it("titles the page from the Polish catalogue when the visitor reads Polish", async () => {
    const meta = await runLoader("pl-PL")

    expect(meta.title).toBe("Utwórz konto | M'Arte")
  })

  it("hands the metadata to the shared page head builder", () => {
    expect(route.head).toBe(pageHead)
  })
})
