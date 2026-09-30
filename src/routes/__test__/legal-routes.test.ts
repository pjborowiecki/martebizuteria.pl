import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type * as FumadocsLegal from "~/src/integrations/fumadocs/fumadocs.legal"

interface LegalRouteDefinition {
  readonly component?: () => unknown
  readonly head?: unknown
  readonly loader?: () => Promise<PageMeta & { path: string }>
}

const captured = vi.hoisted(() => ({ path: "", routes: [] as LegalRouteDefinition[], useContent: vi.fn() }))

const { loadLegalPage } = vi.hoisted(() => ({
  loadLegalPage: vi.fn(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: LegalRouteDefinition) => {
      captured.routes.push(options)

      return { ...options, useLoaderData: () => ({ path: captured.path }) }
    },
  }
})
vi.mock("~/src/integrations/fumadocs/fumadocs.legal", async (importOriginal) => {
  const actual = await importOriginal<typeof FumadocsLegal>()

  return { ...actual, loadLegalPage }
})
vi.mock("~/src/presentation/components/custom/legal-content", () => ({ legalContent: { useContent: captured.useContent } }))

import { type PageMeta, pageHead } from "~/src/lib/seo"

await import("~/src/routes/_storefront.privacy-policy")
await import("~/src/routes/_storefront.exchanges-and-returns")

const [privacyRoute, exchangesRoute] = captured.routes

if (privacyRoute === undefined || exchangesRoute === undefined) {
  throw new Error("the legal routes did not register their options")
}

const DOCUMENTS = [
  { route: privacyRoute, slug: "privacy-policy" },
  { route: exchangesRoute, slug: "exchanges-and-returns" },
] as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe("the legal routes", () => {
  it.each(DOCUMENTS)("renders the loaded $slug document path", ({ route, slug }) => {
    captured.path = `${slug}.en-US.mdx`
    captured.useContent.mockReturnValue("Document body")

    expect(route.component?.()).toBe("Document body")
    expect(captured.useContent).toHaveBeenCalledWith(captured.path)
  })

  it.each(DOCUMENTS)("registers the shared page head builder for $slug", ({ route }) => {
    expect(route.head).toBe(pageHead)
  })

  it.each(DOCUMENTS)("loads the $slug document and hands its title and description to the head", async ({ route, slug }) => {
    loadLegalPage.mockResolvedValue({
      description: "What we do with your data.",
      path: `${slug}.en-US.mdx`,
      title: "A legal document",
      updated: "2026-09-29",
    })

    const loaded = await route.loader?.()

    expect(loadLegalPage).toHaveBeenCalledWith(slug)
    expect(loaded).toStrictEqual({
      description: "What we do with your data.",
      path: `${slug}.en-US.mdx`,
      title: "A legal document",
    })
  })
})
