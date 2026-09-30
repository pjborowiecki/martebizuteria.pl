import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { isRedirect } from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

interface RouteDefinition {
  readonly beforeLoad?: () => void
  readonly component?: () => JSX.Element
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

await import("~/src/routes/admin.catalog.index")

const route = captured.current

if (route?.component === undefined) {
  throw new Error("the admin catalog index route registered no component")
}

const AdminCatalogIndexRoute = route.component

const caughtFromBeforeLoad = (): unknown => {
  try {
    route.beforeLoad?.()
  } catch (error: unknown) {
    return error
  }

  return undefined
}

afterEach(cleanup)

describe("admin catalog index route", () => {
  it("sends the bare catalogue URL on to the products table", () => {
    const thrown = caughtFromBeforeLoad()

    expect(isRedirect(thrown)).toBe(true)
    expect(isRedirect(thrown) ? thrown.options.to : undefined).toBe("/admin/catalog/products")
  })

  it("throws the redirect instead of returning it, so nothing below it runs", () => {
    expect(() => route.beforeLoad?.()).toThrow(Response)
  })

  it("renders no catalogue content of its own, so only the redirect is ever seen", () => {
    const { container } = renderWithProviders(<AdminCatalogIndexRoute />)

    expect(container.textContent).toBe("")
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByRole("heading")).toBeNull()
  })
})
