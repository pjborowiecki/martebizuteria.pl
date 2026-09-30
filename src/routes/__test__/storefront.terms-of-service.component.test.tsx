import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type PageMeta, pageHead } from "~/src/lib/seo"

interface TestQueryClient {
  readonly query: <TData>(options: { readonly queryFn: () => Promise<TData> }) => Promise<TData>
}

interface TermsRouteOptions {
  readonly component?: () => JSX.Element
  readonly head?: unknown
  readonly loader?: (args: Readonly<{ context: { locale: SupportedLocale; queryClient: TestQueryClient } }>) => Promise<PageMeta>
  readonly staticData?: { readonly namespaces?: readonly string[] }
}

const captured = vi.hoisted((): { current?: TermsRouteOptions } => ({}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: TermsRouteOptions) => {
      captured.current = options

      return options
    },
  }
})

await import("~/src/routes/_storefront.terms-of-service")

const route = captured.current ?? {}

const TermsPage = (): JSX.Element => {
  const { component: Component } = route
  if (Component === undefined) {
    throw new Error("the terms of service route registered no component")
  }

  return <Component />
}

const queryClient: TestQueryClient = { query: (options) => options.queryFn() }

afterEach(cleanup)

describe("storefront terms of service page", () => {
  it("titles the page with the storefront copy", () => {
    renderWithProviders(<TermsPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument()
  })

  it("explains that the page is still being written", () => {
    renderWithProviders(<TermsPage />)

    expect(screen.getByText("Page under construction. We look forward to seeing you soon.")).toBeInTheDocument()
  })

  it("offers the way back to the storefront", () => {
    renderWithProviders(<TermsPage />)

    expect(screen.getByRole("link", { name: "Go to home page" })).toHaveAttribute("href", "/")
  })
})

describe("storefront terms of service route", () => {
  it("loads only the terms of service namespace", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.terms-of-service"] })
  })

  it("registers the shared page head builder", () => {
    expect(route.head).toBe(pageHead)
  })

  it("feeds the page title and description into the head from the message catalogue", async () => {
    await expect(route.loader?.({ context: { locale: "en-US", queryClient } })).resolves.toStrictEqual({
      description: "Page under construction. We look forward to seeing you soon.",
      title: "Terms of Service",
    })
  })
})
