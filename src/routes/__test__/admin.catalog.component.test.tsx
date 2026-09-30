import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return { ...actual, Outlet: (): JSX.Element => <section data-testid="outlet">catalog child route</section> }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/admin.catalog"

const renderLayout = () => {
  const CatalogLayout = Route.options.component
  if (CatalogLayout === undefined) {
    throw new Error("the admin catalog route registered no component")
  }

  return renderWithProviders(<CatalogLayout />)
}

afterEach(() => {
  cleanup()
})

describe("admin catalog layout route", () => {
  it("renders the nested catalogue route and no chrome of its own", () => {
    const { container } = renderLayout()

    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(container.firstChild).toBe(screen.getByTestId("outlet"))
  })

  it("preloads the catalogue and locale picker copy for every nested page", () => {
    expect(Route.options.staticData).toStrictEqual({
      namespaces: ["pages.admin.catalog", "pages.admin.catalog.localePicker"],
    })
  })
})
