import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type PageMeta, pageHead } from "~/src/lib/seo"

interface MessagesQueryStub<TMessages> {
  readonly queryFn: () => Promise<TMessages>
  readonly queryKey: readonly unknown[]
}

interface WithdrawalRouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: unknown
  readonly loader?: (context: {
    readonly context: {
      readonly locale: SupportedLocale
      readonly queryClient: { readonly query: <TMessages>(options: MessagesQueryStub<TMessages>) => Promise<TMessages> }
    }
  }) => Promise<PageMeta>
  readonly staticData?: { readonly namespaces?: readonly string[] }
  readonly validateSearch?: { readonly parse: (search: unknown) => unknown }
}

const route = vi.hoisted((): { options?: WithdrawalRouteDefinition; search: { order?: string } } => ({ search: {} }))

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  createFileRoute: () => (options: WithdrawalRouteDefinition) => {
    route.options = options

    return { options, useSearch: () => route.search }
  },
}))
vi.mock("~/src/modules/order-withdrawal/use-cases/withdraw-from-guest-order", () => ({
  withdrawFromGuestOrderMutation: { mutationFn: vi.fn(), mutationKey: ["order-withdrawal", "withdrawFromGuestOrder"] },
}))

await import("~/src/routes/_storefront.withdraw-from-contract")

const definition = (): WithdrawalRouteDefinition => {
  if (route.options === undefined) {
    throw new Error("the withdrawal route registered no options")
  }

  return route.options
}

const renderPage = (search: { order?: string }) => {
  route.search = search
  const Page = definition().component
  if (Page === undefined) {
    throw new Error("the withdrawal route renders no component")
  }

  return renderWithProviders(<Page />)
}

const loadMeta = (locale: SupportedLocale): Promise<PageMeta> => {
  const { loader } = definition()
  if (loader === undefined) {
    throw new Error("the withdrawal route registered no loader")
  }

  return loader({ context: { locale, queryClient: { query: (options) => options.queryFn() } } })
}

afterEach(cleanup)

describe("withdraw from the contract page", () => {
  it("names the function and explains it before the form", () => {
    renderPage({})

    expect(screen.getByRole("heading", { level: 1, name: "Withdraw from the contract" })).toBeInTheDocument()
    expect(screen.getByText(/you may withdraw from a contract concluded in our shop within 14 days/u)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Confirm withdrawal" })).toBeInTheDocument()
  })

  it("fills in the order number the confirmation email linked to", () => {
    renderPage({ order: "MRT-2026-00042" })

    expect(screen.getByLabelText(/Order number/u)).toHaveValue("MRT-2026-00042")
  })

  it("points account holders at their orders", () => {
    renderPage({})

    expect(screen.getByRole("link", { name: "your orders" })).toHaveAttribute("href", "/account/orders")
  })
})

describe("withdraw from the contract route", () => {
  it("titles the page in the visitor's language with the shared page head", async () => {
    expect(definition().head).toBe(pageHead)
    expect(definition().staticData).toStrictEqual({ namespaces: ["pages.withdrawal"] })
    await expect(loadMeta("pl-PL")).resolves.toStrictEqual({
      description: "Odstąp online od umowy zawartej w sklepie M'Arte w ciągu 14 dni od otrzymania zamówienia.",
      title: "Odstąp od umowy | M'Arte",
    })
  })

  it("accepts an order number in the link and refuses an overlong one", () => {
    const { validateSearch } = definition()

    expect(validateSearch?.parse({ order: " MRT-2026-00042 " })).toStrictEqual({ order: "MRT-2026-00042" })
    expect(validateSearch?.parse({})).toStrictEqual({})
    expect(() => validateSearch?.parse({ order: "M".repeat(33) })).toThrow()
  })
})
